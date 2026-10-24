const router = require('express').Router();
const controller = require('../controllers/analyticsController');

router.get('/top-products', controller.getTopProducts);

module.exports = router;
