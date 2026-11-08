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
      low_stock_products: Array.isArray(dashboard.low_stock_products)
        ? dashboard.low_stock_products
        : [],
      recent_transactions: Array.isArray(dashboard.recent_transactions)
        ? dashboard.recent_transactions
        : [],
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.transactions = async (req, res) => {
  const { beforeCreatedAt, beforeId } = req.query;
  const hasCreatedAt = beforeCreatedAt !== undefined;
  const hasId = beforeId !== undefined;
  if (hasCreatedAt !== hasId) {
    return res.status(400).json({
      message: 'beforeCreatedAt and beforeId must be provided together',
    });
  }

  let cursor;
  if (hasCreatedAt) {
    const id = Number(beforeId);
    if (
      typeof beforeCreatedAt !== 'string' ||
      beforeCreatedAt.trim().length === 0 ||
      !Number.isFinite(Date.parse(beforeCreatedAt)) ||
      !Number.isSafeInteger(id) ||
      id === 0
    ) {
      return res.status(400).json({ message: 'Invalid transaction cursor' });
    }
    cursor = { beforeCreatedAt, beforeId: id };
  }

  try {
    res.json(await Dash.transactions(req.user.id, cursor));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};