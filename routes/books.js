const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const uploadImage = require('../middleware/uploadImage');
const bookCtrl = require('../controllers/bookController');

router.get('/', bookCtrl.getAll);
router.get('/bestrating', bookCtrl.getBestRating);
router.get('/:id', bookCtrl.getOne);

router.post('/', auth, uploadImage('image'), bookCtrl.create);
router.put('/:id', auth, uploadImage('image'), bookCtrl.update);
router.delete('/:id', auth, bookCtrl.remove);

router.post('/:id/rating', auth, bookCtrl.rate);

module.exports = router;
