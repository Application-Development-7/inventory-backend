const Product = require('../models/productModel');

const auditActor = (user) => {
  const role = user.role?.toString() || 'admin';
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
};

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
  try {
    const actor = auditActor(req.user);
    const product = await Product.create(
      req.body,
      req.user.id,
      `${actor} added product ${req.body.name}`,
    );
    res.status(201).json(product);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.update = async (req, res) => {
  try {
    const existing = await Product.getById(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ message: 'Not found' });
    const productName = req.body.name?.trim() || existing.name;
    const updated = await Product.update(req.params.id, req.user.id, req.body, {
      userId: req.user.id,
      action: `${auditActor(req.user)} edited product ${productName}`,
      entityName: productName,
      details: JSON.stringify({ productId: existing.id }),
    });
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Updated' });
  } catch (e) { res.status(400).json({ message: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    const existing = await Product.getById(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ message: 'Not found' });
    const removed = await Product.remove(req.params.id, req.user.id, {
      userId: req.user.id,
      action: `${auditActor(req.user)} deleted product ${existing.name}`,
      entityName: existing.name,
      details: JSON.stringify({ productId: existing.id }),
    });
    if (!removed) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(400).json({ message: e.message }); }
};