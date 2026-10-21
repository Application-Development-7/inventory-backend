const Cat = require('../models/categoryModel');

exports.list = async (req, res) => {
  try { res.json(await Cat.getAll()); }
  catch (e) { res.status(500).json({ message: e.message }); }
};

exports.create = async (req, res) => {
  try { res.status(201).json(await Cat.create(req.body)); }
  catch (e) { res.status(400).json({ message: e.message }); }
};

exports.update = async (req, res) => {
  try {
    await Cat.update(req.params.id, req.body);
    res.json({ message: 'Updated' });
  } catch (e) { res.status(400).json({ message: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    await Cat.remove(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(400).json({ message: e.message }); }
};