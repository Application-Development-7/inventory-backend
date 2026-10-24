const Product = require('../models/productModel');

exports.list = async (req, res) => {
  try { res.json(await Product.getAll(req.user.id)); }
  catch (e) { res.status(500).json({ message: e.message }); }
};

exports.lowStock = async (req, res) => {
  try { res.json(await Product.getLowStock(req.user.id)); }
  catch (e) { res.status(500).json({ message: e.message }); }
};

exports.getOne = async (req, res) => {
  try {
    const p = await Product.getById(req.params.id, req.user.id);
    if (!p) return res.status(404).json({ message: 'Not found' });
    res.json(p);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.create = async (req, res) => {
  try { res.status(201).json(await Product.create(req.body, req.user.id)); }
  catch (e) { res.status(400).json({ message: e.message }); }
};

exports.update = async (req, res) => {
  try {
    const updated = await Product.update(req.params.id, req.body, req.user.id);
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Updated' });
  } catch (e) { res.status(400).json({ message: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    const removed = await Product.remove(req.params.id, req.user.id);
    if (!removed) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(400).json({ message: e.message }); }
};