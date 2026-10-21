const r = require('express').Router();
const c = require('../controllers/forecastController');
r.get('/trends', c.getAllTrends);
r.get('/product/:productId', c.getProductForecast);
module.exports = r;