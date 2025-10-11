const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.split(' ')[1]; // "Bearer <token>"
    if (!token) return res.status(401).json({ error: 'Missing token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.auth = { userId: decoded.userId };
    next();
  } catch (err) {
    // renvoyer l'erreur telle quelle (exigence P7)
    res.status(401).json(err);
  }
};
