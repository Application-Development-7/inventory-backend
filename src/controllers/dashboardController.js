const Dash = require('../models/dashboardModel');

function numericValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

exports.summary = async (req, res) => {
  try {
    const dashboard = await Dash.summary(req.user.id);
    res.json({
      ...dashboard,
      stats: {
        ...dashboard.stats,
        total_products: numericValue(dashboard.stats.total_products),
        total_stock: numericValue(dashboard.stats.total_stock),
        low_stock_count: numericValue(dashboard.stats.low_stock_count),
        inventory_value: numericValue(dashboard.stats.inventory_value),
      },
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};