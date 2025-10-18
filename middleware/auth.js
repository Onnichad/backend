const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    const header = req.headers.authorization || ''; //on met une chaîne vide pour éviter une erreur quand on fera split() juste après.
    const token = header.split(' ')[1]; // "c’est la convention standard HTTP Le mot “Bearer” est ignoré, seul le token compte."
    if (!token) return res.status(401).json({ error: 'Missing token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.auth = { userId: decoded.userId };
    next();
  } catch (err) {
    // renvoyer l'erreur telle quelle
    res.status(401).json(err);
  }
};
