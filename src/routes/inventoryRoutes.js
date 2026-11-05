const r = require('express').Router();
const c = require('../controllers/inventoryController');

r.delete('/clear', c.clear);

module.exports = r;
