const fs = require('fs');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');

const UPLOAD_DIR = path.join(__dirname, '..', 'images');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const MIME_TYPES = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// Storage disque + nommage safe
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeBase = file.originalname
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_\.-]/g, '');
    const ext = MIME_TYPES[file.mimetype] || 'jpg';
    cb(null, `${safeBase.replace(/\.[^.]+$/, '')}_${Date.now()}.${ext}`);
  },
});

//limite & filtrage
const limits = { fileSize: 10 * 1024 * 1024 }; // 10 MB
const fileFilter = (req, file, cb) => {
  if (!MIME_TYPES[file.mimetype]) {
    return cb(new Error('Type de fichier non supporté'), false);
  }
  cb(null, true);
};

function uploadImage(field = 'image') {
  const upload = multer({ storage, limits, fileFilter }).single(field);

  return (req, res, next) => {
    upload(req, res, async (err) => {
      if (err) return next(err);
      if (!req.file) return next(); // pas d'image envoyée

      try {
        const maxW = parseInt(process.env.IMAGE_MAX_WIDTH || '900', 10);
        const quality = parseInt(process.env.IMAGE_QUALITY || '75', 10);

        const srcPath = req.file.path; // fichier original
        const parsed = path.parse(srcPath);
        const outPath = path.join(parsed.dir, `${parsed.name}.webp`);

        // Optimisation → WebP
        await sharp(srcPath)
          .rotate()
          .resize({ width: maxW, withoutEnlargement: true })
          .webp({ quality })
          .toFile(outPath);

        // Supprime l'original, garde WebP
        fs.unlinkSync(srcPath);

        // Mets à jour req.file
        const stat = fs.statSync(outPath);
        req.file.filename = `${parsed.name}.webp`;
        req.file.path = outPath;
        req.file.mimetype = 'image/webp';
        req.file.size = stat.size;

        return next();
      } catch (e) {
        return next(e);
      }
    });
  };
}

module.exports = uploadImage;
