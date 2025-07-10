// backend/middleware/verifyToken.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer xxx

  if (!token) {
    return res.status(401).json({ message: '未提供 token' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'token 无效' });
    }

    req.user = user; // 附带 username、role 等
    next();
  });
};
