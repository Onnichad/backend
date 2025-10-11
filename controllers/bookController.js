const fs = require('fs');
const path = require('path');
const Book = require('../models/Book');

const imageUrl = req.file
  ? `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
  : existingBook.imageUrl; // vérifie si une nouvelle image a été envoyée par l’utilisateur via le champ image permet de ne pas effacer l’image actuelle quand un utilisateur met à jour un livre sans en téléverser une nouvelle

exports.getAll = async (req, res) => {
  try {
    const books = await Book.find().lean();
    res.status(200).json(books);
  } catch (e) {
    res.status(400).json(e);
  }
};

exports.getOne = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).lean();
    if (!book) return res.status(404).json({ error: 'Not found' });
    res.status(200).json(book);
  } catch (e) {
    res.status(404).json(e);
  }
};

exports.getBestRating = async (req, res) => {
  try {
    const books = await Book.find()
      .sort({ averageRating: -1, _id: 1 })
      .limit(3)
      .lean();
    res.status(200).json(books);
  } catch (e) {
    res.status(400).json(e);
  }
};

exports.create = async (req, res) => {
  try {
    const bookObj = JSON.parse(req.body.book);
    delete bookObj._id;
    delete bookObj.userId;

    const newBook = new Book({
      ...bookObj,
      userId: req.auth.userId,
      imageUrl: imageUrl(req, req.file.filename),
      ratings: [],
      averageRating: 0,
    });

    await newBook.save();
    res.status(201).json({ message: 'Book created!' });
  } catch (e) {
    res.status(400).json(e);
  }
};

exports.update = async (req, res) => {
  try {
    const original = await Book.findById(req.params.id);
    if (!original) return res.status(404).json({ error: 'Not found' });
    if (original.userId !== req.auth.userId)
      return res.status(403).json({ error: 'unauthorized request' });

    const hasFile = !!req.file;
    const updates = hasFile
      ? {
          ...JSON.parse(req.body.book),
          imageUrl: imageUrl(req, req.file.filename),
        }
      : { ...req.body };

    delete updates._id;
    delete updates.userId;

    if (hasFile) {
      const old = path.basename(original.imageUrl || '');
      if (old) {
        try {
          fs.unlinkSync(path.join('images', old));
        } catch (_) {}
      }
    }

    await Book.updateOne(
      { _id: req.params.id },
      { ...updates, _id: req.params.id }
    );
    res.status(200).json({ message: 'Book updated!' });
  } catch (e) {
    res.status(400).json(e);
  }
};

exports.remove = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Not found' });
    if (book.userId !== req.auth.userId)
      return res.status(403).json({ error: 'unauthorized request' });

    const filename = (book.imageUrl || '').split('/images/')[1];
    if (filename) {
      try {
        fs.unlinkSync(path.join('images', filename));
      } catch (_) {}
    }

    await Book.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: 'Book deleted!' });
  } catch (e) {
    res.status(400).json(e);
  }
};

exports.rate = async (req, res) => {
  try {
    const { userId, rating } = req.body;
    const grade = Number(rating);
    if (Number.isNaN(grade) || grade < 0 || grade > 5)
      return res.status(400).json({ error: 'rating must be between 0 and 5' });

    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Not found' });

    if (book.ratings.find((r) => r.userId === userId))
      return res.status(400).json({ error: 'user already rated this book' });

    book.ratings.push({ userId, grade });
    book.averageRating =
      book.ratings.reduce((a, r) => a + r.grade, 0) / book.ratings.length;

    await book.save();
    res.status(200).json(book);
  } catch (e) {
    res.status(400).json(e);
  }
};
