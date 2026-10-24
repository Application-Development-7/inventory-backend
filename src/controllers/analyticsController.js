const Analytics = require('../models/analyticsModel');

exports.getTopProducts = async (req, res) => {
  const rawMonth = req.query.month;
  let month;
  if (rawMonth === undefined) {
    // JavaScript months are zero-indexed; the API and MySQL use 1–12.
    month = new Date().getMonth() + 1;
  } else {
    if (typeof rawMonth !== 'string' || !/^\d{1,2}$/.test(rawMonth)) {
      return res
        .status(400)
        .json({ message: 'month must be an integer from 1 to 12' });
    }
    month = Number(rawMonth);
    if (month < 1 || month > 12) {
      return res
        .status(400)
        .json({ message: 'month must be an integer from 1 to 12' });
    }
  }

  try {
    const products = await Analytics.getTopProductsThisMonth(req.user.id, month);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
