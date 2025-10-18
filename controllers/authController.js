const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.signup = async (req, res) => {
  try {
    const { email, password } = req.body || {}; //on déstructure avec fallback {} pour éviter une erreur si req.body est undefined.
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const hash = await bcrypt.hash(password, 10); // 10 = nombre de salages + élevé = plus sécurisé mais plus lent
    const user = new User({ email, password: hash });

    await user.save();
    return res.status(201).json({ message: 'User created!' });
  } catch (err) {
    // Email déjà pris (index unique Mongo)
    if (err && err.code === 11000) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    return res.status(400).json(err);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' }); //on embete pas db si les champs sont vides
    }

    const user = await User.findOne({ email }).lean(); // lean() pour retourner un objet JS simple au lieu d'un document Mongoose
    if (!user) return res.status(401).json({ error: 'User not found' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Incorrect password' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '24h',
    });
    return res.status(200).json({ userId: user._id, token });
  } catch (err) {
    return res.status(500).json(err);
  }
};
