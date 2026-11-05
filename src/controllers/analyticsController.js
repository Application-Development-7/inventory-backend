const Analytics = require('../models/analyticsModel');

exports.topProducts = async (req, res) => {
  const view = req.query.view === 'yearly' ? 'yearly' : 'monthly';
  const now = new Date();
  const year = req.query.year === undefined
    ? now.getFullYear()
    : Number(req.query.year);
  const month = req.query.month === undefined
    ? now.getMonth() + 1
    : Number(req.query.month);

  if (!Number.isInteger(year) || year < 1000 || year > 9998) {
    return res.status(400).json({ message: 'Invalid year' });
  }
  if (view === 'monthly' && (!Number.isInteger(month) || month < 1 || month > 12)) {
    return res.status(400).json({ message: 'Invalid month' });
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
