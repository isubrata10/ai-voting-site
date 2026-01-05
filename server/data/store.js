// Simple in-memory store for demo purposes
const { randomBytes } = require('crypto');

const usersById = new Map();
const usersByPhone = new Map();
const candidates = [
  { id: 1, name: 'Rahul Sharma', party: 'National Progressive Party', symbol: 'Lotus', votes: 0, electionId: 'default' },
  { id: 2, name: 'Priya Patel', party: 'Democratic Alliance', symbol: 'Hand', votes: 0, electionId: 'default' },
  { id: 3, name: 'Amit Kumar', party: "People's Welfare Party", symbol: 'Clock', votes: 0, electionId: 'default' },
  { id: 4, name: 'Sunita Reddy', party: 'Unity Front', symbol: 'Elephant', votes: 0, electionId: 'default' }
];

function createUser({ name, phone, location, aadhaar }) {
  const id = randomBytes(8).toString('hex');
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const user = {
    id,
    name,
    phone,
    location,
    aadhaar,
    isVerified: false,
    hasVoted: false,
    otp: { code: otp, expiresAt: Date.now() + 2 * 60 * 1000 }
  };
  usersById.set(id, user);
  usersByPhone.set(phone, user);
  return user;
}

function getUserByPhone(phone) {
  return usersByPhone.get(phone);
}

function getUserById(id) {
  return usersById.get(id);
}

function verifyUserOTP(phone, code) {
  const user = getUserByPhone(phone);
  if (!user) return { ok: false, reason: 'User not found' };
  if (!user.otp || Date.now() > user.otp.expiresAt) return { ok: false, reason: 'OTP expired' };
  if (user.otp.code !== code) return { ok: false, reason: 'Invalid OTP' };
  user.isVerified = true;
  user.otp = null;
  return { ok: true, user };
}

function listCandidates() {
  return candidates;
}

function findCandidateById(id) {
  return candidates.find(c => String(c.id) === String(id));
}

function recordVote(userId, candidateId) {
  const user = getUserById(userId);
  if (!user) return { ok: false, reason: 'User not found' };
  if (!user.isVerified) return { ok: false, reason: 'User not verified' };
  if (user.hasVoted) return { ok: false, reason: 'User already voted' };
  const candidate = findCandidateById(candidateId);
  if (!candidate) return { ok: false, reason: 'Candidate not found' };
  candidate.votes += 1;
  user.hasVoted = true;
  const voteId = randomBytes(6).toString('hex');
  user.voteId = voteId;
  return { ok: true, voteId, candidate };
}

module.exports = {
  createUser,
  getUserByPhone,
  getUserById,
  verifyUserOTP,
  listCandidates,
  recordVote
};
