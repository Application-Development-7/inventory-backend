const r = require('express').Router();
const c = require('../controllers/analyticsController');

r.get('/top-products', c.topProducts);

module.exports = r;
