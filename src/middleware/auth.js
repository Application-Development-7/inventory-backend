const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token' });
  }
  try {
    const user = jwt.verify(authorization.slice(7), process.env.JWT_SECRET);
    if (
      typeof user !== 'object' ||
      user === null ||
      !Number.isSafeInteger(Number(user.id)) ||
      Number(user.id) <= 0
    ) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    req.user = { ...user, id: Number(user.id) };
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};