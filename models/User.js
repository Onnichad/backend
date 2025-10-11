const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

// Assure la création de l'index au démarrage si besoin
userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
