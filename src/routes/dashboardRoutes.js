const r = require('express').Router();
const c = require('../controllers/dashboardController');
r.get('/', c.summary);
module.exports = r;