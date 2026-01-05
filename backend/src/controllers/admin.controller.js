

const winston = require('winston');
const crypto = require('crypto');

exports.getDashboardStats = async (req, res) => {
  try {
    // Get total statistics
    const [
      totalVoters,
      totalVotes,
      verifiedVoters,
      faceVerifiedVoters,
      constituencyStats,
      candidateStats
    ] = await Promise.all([
      User.countDocuments(),
      Vote.countDocuments(),
      User.countDocuments({ isVerified: true }),
      User.countDocuments({ isFaceVerified: true }),
      Vote.aggregate([
        {
          $group: {
            _id: '$constituency',
            totalVotes: { $sum: 1 },
            lastVote: { $max: '$createdAt' }
          }
        }
      ]),
      Candidate.aggregate([
        {
          $group: {
            _id: '$party',
            candidates: { $sum: 1 },
            totalVotes: { $sum: '$votes' }
          }
        },
        { $sort: { totalVotes: -1 } }
      ])
    ]);
    
    // Get recent votes
    const recentVotes = await Vote.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('voter', 'fullName phone')
      .populate('candidate', 'name party');
    
    // Get voting activity by hour
    const hourlyActivity = await Vote.aggregate([
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalVoters,
          totalVotes,
          verificationRate: ((verifiedVoters / totalVoters) * 100).toFixed(2),
          faceVerificationRate: ((faceVerifiedVoters / verifiedVoters) * 100).toFixed(2),
          votingPercentage: ((totalVotes / totalVoters) * 100).toFixed(2)
        },
        constituencies: constituencyStats,
        partyPerformance: candidateStats,
        recentVotes,
        hourlyActivity,
        systemHealth: {
          database: 'connected',
          blockchain: 'operational',
          otpService: 'active',
          timestamp: new Date().toISOString()
        }
      }
    });
    
  } catch (error) {
    winston.error(`Dashboard Stats Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics'
    });
  }
};

exports.manageCandidates = async (req, res) => {
  try {
    const { action, candidateData } = req.body;
    
    switch (action) {
      case 'add':
        const newCandidate = await Candidate.create(candidateData);
        res.status(201).json({
          success: true,
          message: 'Candidate added successfully',
          data: newCandidate
        });
        break;
        
      case 'update':
        const updatedCandidate = await Candidate.findByIdAndUpdate(
          candidateData._id,
          candidateData,
          { new: true }
        );
        res.status(200).json({
          success: true,
          message: 'Candidate updated successfully',
          data: updatedCandidate
        });
        break;
        
      case 'delete':
        await Candidate.findByIdAndDelete(candidateData._id);
        res.status(200).json({
          success: true,
          message: 'Candidate deleted successfully'
        });
        break;
        
      default:
        res.status(400).json({
          success: false,
          error: 'Invalid action'
        });
    }
    
  } catch (error) {
    winston.error(`Manage Candidates Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to manage candidates'
    });
  }
};

exports.getVoterAnalytics = async (req, res) => {
  try {
    const { constituency, verificationStatus, hasVoted } = req.query;
    
    const query = {};
    if (constituency) query.constituency = constituency;
    if (verificationStatus) query.isVerified = verificationStatus === 'verified';
    if (hasVoted) query['votingStatus.hasVoted'] = hasVoted === 'true';
    
    const voters = await User.find(query)
      .select('fullName phone constituency isVerified isFaceVerified votingStatus createdAt')
      .sort({ createdAt: -1 })
      .limit(100);
    
    // Get analytics
    const analytics = await User.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          verified: { $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] } },
          faceVerified: { $sum: { $cond: [{ $eq: ['$isFaceVerified', true] }, 1, 0] } },
          voted: { $sum: { $cond: [{ $eq: ['$votingStatus.hasVoted', true] }, 1, 0] } },
          avgVerificationTime: { $avg: { $subtract: ['$updatedAt', '$createdAt'] } }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      count: voters.length,
      analytics: analytics[0] || {},
      data: voters
    });
    
  } catch (error) {
    winston.error(`Voter Analytics Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch voter analytics'
    });
  }
};

exports.exportVoteData = async (req, res) => {
  try {
    const { format } = req.query;
    
    // Get all votes with details
    const votes = await Vote.find()
      .populate('voter', 'fullName phone constituency')
      .populate('candidate', 'name party constituency')
      .lean();
    
    let data;
    switch (format) {
      case 'csv':
        // Convert to CSV
        const headers = ['Vote ID', 'Voter Name', 'Voter Phone', 'Candidate', 'Party', 'Constituency', 'Timestamp', 'Blockchain TX'];
        const csvRows = votes.map(vote => [
          vote._id,
          vote.voter.fullName,
          vote.voter.phone,
          vote.candidate.name,
          vote.candidate.party,
          vote.constituency,
          vote.createdAt,
          vote.blockchainData?.transactionId || 'N/A'
        ].join(','));
        
        data = [headers.join(','), ...csvRows].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=votes.csv');
        break;
        
      case 'json':
      default:
        data = JSON.stringify(votes, null, 2);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=votes.json');
    }
    
    res.send(data);
    
  } catch (error) {
    winston.error(`Export Data Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to export vote data'
    });
  }
};

exports.resetSystem = async (req, res) => {
  try {
    const { confirm, scope } = req.body;
    
    if (!confirm || confirm !== 'RESET_ALL_DATA') {
      return res.status(400).json({
        success: false,
        error: 'Confirmation required'
      });
    }
    
    switch (scope) {
      case 'votes':
        await Vote.deleteMany({});
        await User.updateMany({}, { 
          'votingStatus.hasVoted': false,
          'votingStatus.votedAt': null,
          'votingStatus.candidateId': null
        });
        await Candidate.updateMany({}, { votes: 0, votePercentage: 0 });
        break;
        
      case 'voters':
        await User.deleteMany({ role: { $ne: 'admin' } });
        break;
        
      case 'all':
        await Vote.deleteMany({});
        await User.deleteMany({ role: { $ne: 'admin' } });
        await Candidate.deleteMany({});
        // Reset blockchain (simulated)
        require('../services/blockchain.service').constructor();
        break;
        
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid scope'
        });
    }
    
    res.status(200).json({
      success: true,
      message: `System reset successful for scope: ${scope}`
    });
    
  } catch (error) {
    winston.error(`System Reset Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to reset system'
    });
  }
};