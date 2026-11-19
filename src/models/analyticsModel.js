const pool = require('../config/db');

exports.getTopProducts = async ({ startDate, endDate }, userId) => {
  const [results] = await pool.query('CALL sp_get_top_products(?, ?, ?)', [
    userId,
    startDate,
    endDate,
  ]);
  return results[0].map(product => ({
    ...product,
    product_id: Number(product.product_id),
    total_sold: Number(product.total_sold),
  }));
};

exports.getTopProductsThisMonth = async (userId, month, view = 'monthly') => {
  const year = new Date().getFullYear();
  const startDate = view === 'yearly'
    ? new Date(year, 0, 1)
    : new Date(year, month - 1, 1);
  const endDate = view === 'yearly'
    ? new Date(year + 1, 0, 1)
    : new Date(year, month, 1);
  return exports.getTopProducts({ startDate, endDate }, userId);
};
