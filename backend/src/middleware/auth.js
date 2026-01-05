const jwt = require('jsonwebtoken');
const winston = require('winston');

exports.protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  // Check for token in cookies
  else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.id).select('-faceData -otp');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        error: 'Please verify your account first'
      });
    }

    // Check if user has voted
    if (user.votingStatus.hasVoted) {
      return res.status(403).json({
        success: false,
        error: 'You have already voted'
      });
    }

    // Add user to request
    req.user = user;
    next();
  } catch (error) {
    winston.error(`Auth Error: ${error.message}`);
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

exports.adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  next();
};

exports.generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id,
      phone: user.phone,
      constituency: user.constituency
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Rate limiting by IP and user
exports.rateLimitByIP = (req, res, next) => {
  const rateLimitStore = new Map();
  const ip = req.ip;
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 10;

  const now = Date.now();
  const windowStart = now - windowMs;

  // Clean old entries
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.timestamp < windowStart) {
      rateLimitStore.delete(key);
    }
  }

  const userRequests = rateLimitStore.get(ip) || { count: 0, timestamp: now };
  
  if (userRequests.count >= maxRequests) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later'
    });
  }

  userRequests.count++;
  userRequests.timestamp = now;
  rateLimitStore.set(ip, userRequests);

  // Add headers
  res.setHeader('X-RateLimit-Limit', maxRequests);
  res.setHeader('X-RateLimit-Remaining', maxRequests - userRequests.count);
  res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

  next();
};