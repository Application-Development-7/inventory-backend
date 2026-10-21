const Product = require('../models/productModel');

exports.list = async (req, res) => {
  try { res.json(await Product.getAll()); }
  catch (e) { res.status(500).json({ message: e.message }); }
};

exports.lowStock = async (req, res) => {
  try { res.json(await Product.getLowStock()); }
  catch (e) { res.status(500).json({ message: e.message }); }
};

exports.getOne = async (req, res) => {
  try {
    const p = await Product.getById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Not found' });
    res.json(p);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.create = async (req, res) => {
  try { res.status(201).json(await Product.create(req.body)); }
  catch (e) { res.status(400).json({ message: e.message }); }
};

exports.update = async (req, res) => {
  try {
    await Product.update(req.params.id, req.body);
    res.json({ message: 'Updated' });
  } catch (e) { res.status(400).json({ message: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    await Product.remove(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(400).json({ message: e.message }); }
};