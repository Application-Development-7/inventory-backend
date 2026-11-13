const Analytics = require('../models/analyticsModel');

exports.getTopProducts = async (req, res) => {
  const rawView = req.query.view;
  const view = typeof rawView === 'string' ? rawView.toLowerCase() : 'monthly';
  if (!['monthly', 'yearly'].includes(view)) {
    return res
      .status(400)
      .json({ message: "view must be either 'monthly' or 'yearly'" });
  }

  const now = new Date();
  const rawYear = req.query.year;
  const year = rawYear === undefined ? now.getFullYear() : Number(rawYear);
  const rawMonth = req.query.month;
  const month = rawMonth === undefined ? now.getMonth() + 1 : Number(rawMonth);

  if (!Number.isInteger(year) || year < 1000 || year > 9998) {
    return res.status(400).json({ message: 'Invalid year' });
  }
  if (view === 'monthly') {
    if (
      (typeof rawMonth === 'string' && !/^\d{1,2}$/.test(rawMonth)) ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return res.status(400).json({ message: 'Invalid month' });
    }
  }

  const startDate = view === 'yearly'
    ? new Date(year, 0, 1)
    : new Date(year, month - 1, 1);
  const endDate = view === 'yearly'
    ? new Date(year + 1, 0, 1)
    : new Date(year, month, 1);

  try {
    const products = await Analytics.getTopProducts(
      { startDate, endDate },
      req.user.id,
    );
    return res.json(products);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.topProducts = exports.getTopProducts;
