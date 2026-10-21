const Stock = require('../models/stockModel');

exports.record = async (req, res) => {
  try {
    const { product_id, type, quantity, note } = req.body;
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
  try { res.json(await Stock.history(req.params.productId)); }
  catch (e) { res.status(500).json({ message: e.message }); }
};