const Vote = require('../models/Vote');
const BlockchainService = require('../services/blockchain.service');
const winston = require('winston');
const crypto = require('crypto');

exports.getCandidates = async (req, res) => {
  try {
    const { constituency } = req.query;
    
    if (!constituency) {
      return res.status(400).json({
        success: false,
        error: 'Constituency is required'
      });
    }
    
    const candidates = await Candidate.find({ 
      constituency,
      status: 'active'
    }).select('-__v');
    
    res.status(200).json({
      success: true,
      count: candidates.length,
      data: candidates
    });
    
  } catch (error) {
    winston.error(`Get Candidates Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch candidates'
    });
  }
};

exports.castVote = async (req, res) => {
  try {
    const user = req.user;
    const { candidateId, sessionId, deviceFingerprint, location } = req.body;
    
    // Double-check user can vote
    if (!user.canVote()) {
      return res.status(403).json({
        success: false,
        error: 'User cannot vote at this time'
      });
    }
    
    // Verify candidate exists and is in same constituency
    const candidate = await Candidate.findOne({
      _id: candidateId,
      constituency: user.constituency,
      status: 'active'
    });
    
    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found or not eligible'
      });
    }
    
    // Check for duplicate voting attempt
    const existingVote = await Vote.findOne({
      voter: user._id,
      constituency: user.constituency
    });
    
    if (existingVote) {
      return res.status(409).json({
        success: false,
        error: 'You have already voted'
      });
    }
    
    // Record vote in database
    const vote = await Vote.create({
      voter: user._id,
      candidate: candidateId,
      constituency: user.constituency,
      verificationData: {
        otpVerified: user.isVerified,
        faceVerified: user.isFaceVerified,
        locationVerified: !!location,
        deviceFingerprint: deviceFingerprint || req.headers['user-agent'],
        ipAddress: req.ip
      },
      metadata: {
        votingTime: new Date(),
        deviceType: req.headers['user-agent'],
        browser: req.headers['user-agent'],
        sessionId
      }
    });
    
    // Record vote on blockchain
    const blockchainResult = await BlockchainService.addVote({
      voterId: user._id.toString(),
      candidateId: candidate._id.toString(),
      constituency: user.constituency,
      timestamp: vote.metadata.votingTime,
      verificationHash: crypto.createHash('sha256').update(
        user._id.toString() + candidateId + sessionId
      ).digest('hex')
    });
    
    // Update vote with blockchain data
    vote.blockchainData = {
      transactionId: blockchainResult.transactionId,
      blockNumber: blockchainResult.blockNumber,
      timestamp: blockchainResult.timestamp,
      smartContractAddress: '0x' + crypto.randomBytes(20).toString('hex')
    };
    vote.status = 'confirmed';
    await vote.save();
    
    // Update candidate vote count
    candidate.votes += 1;
    await candidate.save();
    
    // Add security log
    await user.addSecurityLog('VOTE_CAST', req.ip, req.headers['user-agent']);
    
    // Send real-time update via Socket.io
    req.io.emit('voteCast', {
      constituency: user.constituency,
      candidateId: candidate._id,
      candidateName: candidate.name,
      voteCount: candidate.votes,
      timestamp: new Date()
    });
    
    // Prepare vote receipt
    const voteReceipt = vote.getReceipt();
    
    res.status(201).json({
      success: true,
      message: 'Vote cast successfully',
      data: {
        voteReceipt,
        blockchain: blockchainResult,
        candidate: {
          id: candidate._id,
          name: candidate.name,
          party: candidate.party
        },
        nextElection: '2024-05-15'
      }
    });
    
  } catch (error) {
    winston.error(`Cast Vote Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to cast vote'
    });
  }
};

exports.getVoteReceipt = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const vote = await Vote.findOne({ voter: userId })
      .populate('candidate', 'name party')
      .populate('voter', 'fullName constituency');
    
    if (!vote) {
      return res.status(404).json({
        success: false,
        error: 'Vote not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        receipt: vote.getReceipt(),
        candidate: vote.candidate,
        timestamp: vote.metadata.votingTime,
        verificationStatus: vote.verificationData,
        blockchainConfirmation: vote.blockchainData
      }
    });
    
  } catch (error) {
    winston.error(`Get Vote Receipt Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vote receipt'
    });
  }
};

exports.verifyVote = async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    // Check in database
    const vote = await Vote.findOne({ 'blockchainData.transactionId': transactionId })
      .populate('candidate', 'name party')
      .populate('voter', 'fullName');
    
    if (!vote) {
      return res.status(404).json({
        success: false,
        error: 'Vote transaction not found'
      });
    }
    
    // Check on blockchain (simulated)
    const blockchainStats = BlockchainService.getChainStats();
    const isConfirmed = vote.blockchainData?.blockNumber <= blockchainStats.latestBlock;
    
    res.status(200).json({
      success: true,
      data: {
        voteExists: true,
        isConfirmed,
        voteDetails: {
          voter: vote.voter?.fullName,
          candidate: vote.candidate?.name,
          constituency: vote.constituency,
          timestamp: vote.metadata.votingTime,
          status: vote.status
        },
        blockchain: {
          blockNumber: vote.blockchainData?.blockNumber,
          transactionId: vote.blockchainData?.transactionId,
          latestBlock: blockchainStats.latestBlock,
          chainValid: blockchainStats.chainValid
        }
      }
    });
    
  } catch (error) {
    winston.error(`Verify Vote Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to verify vote'
    });
  }
};