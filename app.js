require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');

const app = express();

// Connexion MongoDB (URI stockée dans .env)
mongoose
  .connect(process.env.MONGODB_URI, {})
  .then(() => console.log('Connexion à MongoDB réussie !'))
  .catch((err) => console.error('Connexion à MongoDB échouée !', err));

app.use(express.json());

// CORS (autorise ton front, par défaut localhost:3000)
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN?.split(',') || '*',
    credentials: true,
  })
);

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);

// Dossier statique pour les images uploadées
app.use('/images', express.static(path.join(__dirname, 'images')));

module.exports = app;
