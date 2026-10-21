const r = require('express').Router();
const c = require('../controllers/stockController');
r.post('/', c.record);
r.get('/product/:productId', c.history);
module.exports = r;