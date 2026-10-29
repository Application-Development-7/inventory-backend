const pool = require('../config/db');

exports.getTopProductsThisMonth = async (userId, month, view = 'monthly') => {
  const normalizedView = view === 'yearly' ? 'yearly' : 'monthly';
  const [resultSets] = await pool.query(
    'CALL sp_get_top_products_by_month(?, ?, ?)',
    [userId, month, normalizedView]
  );
  return resultSets[0].map(product => ({
    ...product,
    product_id: Number(product.product_id),
    total_sold: Number(product.total_sold),
  }));
};
