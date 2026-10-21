const r = require('express').Router();
const c = require('../controllers/productController');
r.get('/', c.list);
r.get('/low-stock', c.lowStock);
r.get('/:id', c.getOne);
r.post('/', c.create);
r.put('/:id', c.update);
r.delete('/:id', c.remove);
module.exports = r;