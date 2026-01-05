const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/user');
const Candidate = require('../src/models/candidate');
const connectDB = require('../src/congfig/database');
require('dotenv').config();

const seedData = async () => {
  try {
    await connectDB();
    
    // Clear existing data
    await User.deleteMany({});
    await Candidate.deleteMany({});
    
    console.log('🗑️  Cleared existing data');
    
    // Seed Candidates
    const candidates = [
      {
        name: 'Rajesh Kumar',
        party: 'National Democratic Party',
        constituency: 'Delhi Central',
        candidateNumber: 1,
        description: 'Experienced leader with 15 years of political service',
        colorCode: '#4A6FA5',
        votes: Math.floor(Math.random() * 1000)
      },
      {
        name: 'Priya Sharma',
        party: 'United Progressive Front',
        constituency: 'Delhi Central',
        candidateNumber: 2,
        description: 'Youth icon and social reformer',
        colorCode: '#FF6B6B',
        votes: Math.floor(Math.random() * 800)
      },
      {
        name: 'Amit Patel',
        party: 'National Democratic Party',
        constituency: 'Mumbai North',
        candidateNumber: 1,
        description: 'Business leader turned politician',
        colorCode: '#4ECDC4',
        votes: Math.floor(Math.random() * 1200)
      },
      {
        name: 'Sneha Singh',
        party: 'United Progressive Front',
        constituency: 'Mumbai North',
        candidateNumber: 2,
        description: 'Women empowerment activist',
        colorCode: '#FFD166',
        votes: Math.floor(Math.random() * 900)
      },
      {
        name: 'Vikram Reddy',
        party: 'National Democratic Party',
        constituency: 'Bangalore South',
        candidateNumber: 1,
        description: 'Tech entrepreneur and innovator',
        colorCode: '#06D6A0',
        votes: Math.floor(Math.random() * 1500)
      },
      {
        name: 'Anjali Desai',
        party: 'United Progressive Front',
        constituency: 'Bangalore South',
        candidateNumber: 2,
        description: 'Environmental activist',
        colorCode: '#118AB2',
        votes: Math.floor(Math.random() * 1100)
      }
    ];
    
    const insertedCandidates = await Candidate.insertMany(candidates);
    console.log(`✅ Seeded ${insertedCandidates.length} candidates`);
    
    // Seed Sample Voters
    const voters = [];
    const constituencies = [
      'Delhi Central',
      'Mumbai North',
      'Bangalore South',
      'Chennai Central',
      'Kolkata North',
      'Hyderabad'
    ];
    
    for (let i = 1; i <= 50; i++) {
      const constituency = constituencies[Math.floor(Math.random() * constituencies.length)];
      const hasVoted = Math.random() > 0.7;
      
      voters.push({
        fullName: `Voter ${i}`,
        phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
        aadhaarNumber: `${Math.floor(1000 + Math.random() * 9000)}${Math.floor(1000 + Math.random() * 9000)}${Math.floor(1000 + Math.random() * 9000)}`,
        constituency,
        isVerified: true,
        isFaceVerified: Math.random() > 0.3,
        votingStatus: {
          hasVoted,
          votedAt: hasVoted ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
          candidateId: hasVoted ? insertedCandidates[Math.floor(Math.random() * insertedCandidates.length)]._id : null
        },
        location: {
          type: 'Point',
          coordinates: [
            77 + Math.random() * 10, // Indian longitude range
            8 + Math.random() * 20   // Indian latitude range
          ]
        }
      });
    }
    
    await User.insertMany(voters);
    console.log(`✅ Seeded ${voters.length} voters`);
    
    // Create Admin User
    const adminPhone = '9999999999';
    const adminAadhaar = '999988887777';
    
    const adminExists = await User.findOne({ phone: adminPhone });
    
    if (!adminExists) {
      const admin = await User.create({
        fullName: 'System Administrator',
        phone: adminPhone,
        aadhaarNumber: adminAadhaar,
        constituency: 'Delhi Central',
        isVerified: true,
        isFaceVerified: true,
        role: 'admin',
        location: {
          type: 'Point',
          coordinates: [77.2090, 28.6139] // Delhi coordinates
        }
      });
      
      console.log('✅ Admin user created');
      console.log(`📱 Phone: ${adminPhone}`);
      console.log(`🆔 Aadhaar: ${adminAadhaar}`);
      console.log('🔑 Password: Not required (OTP based)');
    }
    
    console.log('\n🎉 Database seeding completed!');
    console.log('\n📊 Sample Data Overview:');
    console.log(`   Candidates: ${candidates.length}`);
    console.log(`   Voters: ${voters.length}`);
    console.log(`   Verified Voters: ${voters.filter(v => v.isVerified).length}`);
    console.log(`   Voted Voters: ${voters.filter(v => v.votingStatus.hasVoted).length}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

// Run seeding
if (require.main === module) {
  seedData();
}

module.exports = seedData;