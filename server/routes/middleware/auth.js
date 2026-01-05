// Simple placeholder auth middleware for local testing
module.exports = function(req, res, next) {
  // Expect a header 'Authorization: Bearer <userId>' for simulated auth
  const authHeader = req.header('authorization');
  if (!authHeader) {
    return res.status(401).json({ msg: 'No authorization header provided (use "Authorization: Bearer <userId>")' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ msg: 'Invalid authorization format' });
  }

  const userId = parts[1];
  req.user = { id: userId };
  next();
};
