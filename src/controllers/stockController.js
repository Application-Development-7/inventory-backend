const Stock = require('../models/stockModel');
const Product = require('../models/productModel');

exports.record = async (req, res) => {
  try {
    const { product_id, type, quantity, note } = req.body;
    const product = await Product.getById(product_id, req.user.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const result = await Stock.record({
      product_id,
      type,
      quantity: parseInt(quantity, 10),
      note,
      user_id: req.user.id,
    });
    res.status(201).json(result);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.history = async (req, res) => {
  try {
    const product = await Product.getById(req.params.productId, req.user.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(await Stock.history(req.params.productId, req.user.id));
  } catch (e) { res.status(500).json({ message: e.message }); }
};