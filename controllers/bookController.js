const fs = require('fs'); // pour gérer les fichiers images sur le serveur
const path = require('path');
const Book = require('../models/Book');

// Helper: construit l'URL publique de l'image
function makeImageUrl(req, filename) {
  return `${req.protocol}://${req.get('host')}/images/${filename}`;
}

exports.getAll = async (req, res) => {
  try {
    const books = await Book.find().lean();
    return res.status(200).json(books);
  } catch (e) {
    return res.status(400).json(e);
  }
};

exports.getOne = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).lean();
    if (!book) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json(book);
  } catch (e) {
    return res.status(404).json(e);
  }
};

exports.getBestRating = async (req, res) => {
  try {
    const books = await Book.find() //tri décroissant par averageRating
      .sort({ averageRating: -1, _id: 1 })
      .limit(3)
      .lean();
    return res.status(200).json(books);
  } catch (e) {
    return res.status(400).json(e);
  }
};

exports.create = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'image file is required' });
    }

    let bookObj = {};
    try {
      bookObj = JSON.parse(req.body.book || '{}');
    } catch (err) {
      return res.status(400).json({ error: 'invalid book payload' });
    }

    // Nettoyage des champs interdits pour éviter des détournements (usurpation d’owner, collisions d’id)
    delete bookObj._id;
    delete bookObj.userId;

    const newBook = new Book({
      ...bookObj,
      userId: req.auth.userId, // force l’owner depuis le token
      imageUrl: makeImageUrl(req, req.file.filename),
      ratings: [], // initialisé vide
      averageRating: 0,
    });

    await newBook.save();
    return res.status(201).json({ message: 'Book created!' });
  } catch (e) {
    return res.status(400).json(e);
  }
};

exports.update = async (req, res) => {
  try {
    const original = await Book.findById(req.params.id);
    if (!original) return res.status(404).json({ error: 'Not found' });
    if (original.userId !== req.auth.userId) {
      return res.status(403).json({ error: 'unauthorized request' });
    }

    let updates = {};
    if (req.file) {
      // Avec nouvelle image: book est JSON stringifié dans req.body.book
      let parsed = {};
      try {
        parsed = JSON.parse(req.body.book || '{}');
      } catch {
        return res.status(400).json({ error: 'invalid book payload' });
      }
      updates = {
        ...parsed,
        imageUrl: makeImageUrl(req, req.file.filename),
      };

      // Supprimer l’ancienne image si existante
      const oldFile = (original.imageUrl || '').split('/images/')[1];
      if (oldFile) {
        try {
          fs.unlinkSync(path.join('images', oldFile));
        } catch {}
      }
    } else {
      // Sans nouvelle image: les champs sont directement dans req.body
      updates = { ...req.body };
      // Conserver l’ancienne imageUrl
      if (!updates.imageUrl) updates.imageUrl = original.imageUrl;
    }

    // Champs interdits
    delete updates._id;
    delete updates.userId;

    await Book.updateOne(
      { _id: req.params.id },
      { ...updates, _id: req.params.id }
    );
    return res.status(200).json({ message: 'Book updated!' });
  } catch (e) {
    return res.status(400).json(e);
  }
};

exports.remove = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Not found' });
    if (book.userId !== req.auth.userId) {
      return res.status(403).json({ error: 'unauthorized request' });
    }

    const filename = (book.imageUrl || '').split('/images/')[1];
    if (filename) {
      try {
        fs.unlinkSync(path.join('images', filename));
      } catch {}
    }

    await Book.deleteOne({ _id: req.params.id });
    return res.status(200).json({ message: 'Book deleted!' });
  } catch (e) {
    return res.status(400).json(e);
  }
};

exports.rate = async (req, res) => {
  try {
    // Pour plus de sécurité on prend l’ID du token, mais on tolère le body si absent (compat front)
    const userIdFromToken = req.auth?.userId;
    const userId = userIdFromToken || req.body.userId;

    const grade = Number(req.body.rating);
    if (Number.isNaN(grade) || grade < 0 || grade > 5) {
      return res.status(400).json({ error: 'rating must be between 0 and 5' });
    }

    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Not found' });

    if (book.ratings.find((r) => r.userId === userId)) {
      return res.status(400).json({ error: 'user already rated this book' });
    }

    book.ratings.push({ userId, grade });
    book.averageRating = //averageRating est stocké pour les tris rapides (évite un $avg à chaque lecture)
      book.ratings.reduce((a, r) => a + r.grade, 0) / book.ratings.length;

    await book.save();
    return res.status(200).json(book);
  } catch (e) {
    return res.status(400).json(e);
  }
};
