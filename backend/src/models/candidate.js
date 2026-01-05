const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide candidate name'],
    trim: true
  },
  
  party: {
    type: String,
    required: [true, 'Please provide party name'],
    trim: true
  },
  
  partySymbol: {
    type: String,
    default: 'default_symbol.png'
  },
  
  constituency: {
    type: String,
    required: true,
    enum: [
      'Delhi Central',
      'Mumbai North',
      'Bangalore South',
      'Chennai Central',
      'Kolkata North',
      'Hyderabad'
    ],
    index: true
  },
  
  candidateNumber: {
    type: Number,
    required: true,
    min: 1
  },
  
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  campaignPromise: [{
    title: String,
    description: String
  }],
  
  contactInfo: {
    email: String,
    phone: String,
    website: String
  },
  
  media: {
    photo: String,
    videoUrl: String
  },
  
  status: {
    type: String,
    enum: ['active', 'suspended', 'withdrawn'],
    default: 'active'
  },
  
  votes: {
    type: Number,
    default: 0
  },
  
  votePercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  colorCode: {
    type: String,
    default: '#4A6FA5'
  }
  
}, {
  timestamps: true
});

// Index for compound queries
candidateSchema.index({ constituency: 1, candidateNumber: 1 }, { unique: true });

// Pre-save middleware to update vote percentage
candidateSchema.pre('save', async function(next) {
  if (this.isModified('votes')) {
    const Vote = require('./Vote');
    const totalVotesInConstituency = await Vote.countDocuments({ 
      constituency: this.constituency 
    });
    
    if (totalVotesInConstituency > 0) {
      this.votePercentage = (this.votes / totalVotesInConstituency) * 100;
    } else {
      this.votePercentage = 0;
    }
  }
  next();
});

// Static method to get constituency results
candidateSchema.statics.getConstituencyResults = async function(constituency) {
  return this.aggregate([
    { $match: { constituency, status: 'active' } },
    { $sort: { votes: -1 } },
    {
      $lookup: {
        from: 'votes',
        localField: '_id',
        foreignField: 'candidate',
        as: 'voteDetails'
      }
    },
    {
      $project: {
        name: 1,
        party: 1,
        candidateNumber: 1,
        votes: 1,
        votePercentage: 1,
        colorCode: 1,
        totalVoters: { $size: '$voteDetails' }
      }
    }
  ]);
};

const Candidate = mongoose.model('Candidate', candidateSchema);

module.exports = Candidate;