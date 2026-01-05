const Vote = require('../models/Vote');
const BlockchainService = require('../services/blockchain.service');
const winston = require('winston');

exports.getLiveStats = async (req, res) => {
  try {
    // Get real-time statistics
    const [
      activeVoters,
      totalVotes,
      todayVerified,
      candidates
    ] = await Promise.all([
      User.countDocuments({ isVerified: true, 'votingStatus.hasVoted': false }),
      Vote.countDocuments(),
      User.countDocuments({ 
        isVerified: true,
        updatedAt: { $gte: new Date().setHours(0, 0, 0, 0) }
      }),
      Candidate.aggregate([
        {
          $group: {
            _id: '$constituency',
            candidates: {
              $push: {
                name: '$name',
                party: '$party',
                votes: '$votes',
                percentage: '$votePercentage',
                color: '$colorCode'
              }
            },
            totalVotes: { $sum: '$votes' }
          }
        }
      ])
    ]);
    
    // Get recent votes for live feed
    const recentVotes = await Vote.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('voter', 'fullName')
      .populate('candidate', 'name party')
      .select('constituency metadata.votingTime');
    
    // Get blockchain stats
    const blockchainStats = BlockchainService.getChainStats();
    
    // Calculate time until voting ends (demo: 48 hours from now)
    const votingEnds = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const hoursRemaining = Math.ceil((votingEnds - new Date()) / (60 * 60 * 1000));
    
    res.status(200).json({
      success: true,
      data: {
        liveStats: {
          activeVoters,
          totalVotes,
          todayVerified,
          hoursRemaining: Math.max(0, hoursRemaining),
          votingEnds: votingEnds.toISOString()
        },
        candidates,
        recentActivity: recentVotes,
        blockchain: blockchainStats,
        lastUpdated: new Date().toISOString()
      }
    });
    
  } catch (error) {
    winston.error(`Live Stats Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch live statistics'
    });
  }
};

exports.getConstituencyResults = async (req, res) => {
  try {
    const { constituency } = req.params;
    
    if (!constituency) {
      return res.status(400).json({
        success: false,
        error: 'Constituency is required'
      });
    }
    
    const results = await Candidate.getConstituencyResults(constituency);
    
    // Get voting progress
    const totalVoters = await User.countDocuments({ constituency });
    const votedVoters = await Vote.countDocuments({ constituency });
    const votingPercentage = totalVoters > 0 ? (votedVoters / totalVoters) * 100 : 0;
    
    res.status(200).json({
      success: true,
      data: {
        constituency,
        results,
        progress: {
          totalVoters,
          votedVoters,
          votingPercentage: votingPercentage.toFixed(2),
          pendingVoters: totalVoters - votedVoters
        },
        leadingCandidate: results[0] || null,
        lastUpdated: new Date().toISOString()
      }
    });
    
  } catch (error) {
    winston.error(`Constituency Results Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch constituency results'
    });
  }
};

exports.getVotingTrends = async (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;
    
    let timeFilter;
    switch (timeframe) {
      case '1h':
        timeFilter = new Date(Date.now() - 60 * 60 * 1000);
        break;
      case '6h':
        timeFilter = new Date(Date.now() - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        timeFilter = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        timeFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        timeFilter = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }
    
    // Get voting trends by hour
    const hourlyTrends = await Vote.aggregate([
      {
        $match: {
          createdAt: { $gte: timeFilter }
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$createdAt' },
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1, '_id.hour': 1 } }
    ]);
    
    // Get constituency-wise trends
    const constituencyTrends = await Vote.aggregate([
      {
        $match: {
          createdAt: { $gte: timeFilter }
        }
      },
      {
        $group: {
          _id: {
            constituency: '$constituency',
            hour: { $hour: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.constituency': 1, '_id.hour': 1 } }
    ]);
    
    // Get verification trends
    const verificationTrends = await User.aggregate([
      {
        $match: {
          updatedAt: { $gte: timeFilter },
          isVerified: true
        }
      },
      {
        $group: {
          _id: { $hour: '$updatedAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        timeframe,
        hourlyTrends,
        constituencyTrends,
        verificationTrends,
        peakHour: hourlyTrends.reduce((max, item) => 
          item.count > max.count ? item : max, { count: 0 }
        ),
        totalInPeriod: hourlyTrends.reduce((sum, item) => sum + item.count, 0)
      }
    });
    
  } catch (error) {
    winston.error(`Voting Trends Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch voting trends'
    });
  }
};

exports.getSystemHealth = async (req, res) => {
  try {
    const healthChecks = {
      database: await checkDatabaseHealth(),
      blockchain: await checkBlockchainHealth(),
      otpService: await checkOTPServiceHealth(),
      faceVerification: await checkFaceVerificationHealth(),
      api: 'healthy'
    };
    
    const allHealthy = Object.values(healthChecks).every(status => status === 'healthy');
    
    res.status(200).json({
      success: true,
      data: {
        status: allHealthy ? 'healthy' : 'degraded',
        checks: healthChecks,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version
      }
    });
    
  } catch (error) {
    winston.error(`System Health Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to check system health'
    });
  }
};

async function checkDatabaseHealth() {
  try {
    await User.findOne().limit(1);
    return 'healthy';
  } catch (error) {
    return 'unhealthy';
  }
}

async function checkBlockchainHealth() {
  try {
    const stats = BlockchainService.getChainStats();
    return stats.chainValid ? 'healthy' : 'degraded';
  } catch (error) {
    return 'unhealthy';
  }
}

async function checkOTPServiceHealth() {
  try {
    const OTPService = require('../services/otp.service');
    // Test OTP generation
    const testPhone = '9999999999';
    const result = await OTPService.generateOTP(testPhone);
    return result.success ? 'healthy' : 'degraded';
  } catch (error) {
    return 'unhealthy';
  }
}

async function checkFaceVerificationHealth() {
  try {
    const AadhaarService = require('../services/aadhaar.service');
    // Test verification
    await AadhaarService.simulateNetworkDelay();
    return 'healthy';
  } catch (error) {
    return 'unhealthy';
  }
}