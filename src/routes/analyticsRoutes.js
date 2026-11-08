const r = require('express').Router();
const c = require('../controllers/analyticsController');

r.get('/top-products', c.getTopProducts);

module.exports = r;
