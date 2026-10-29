const pool = require('../config/db');

exports.summary = async (userId) => {
  const [[stats], [lowStockProducts], [recentTransactions]] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) AS total_products,
              COALESCE(SUM(quantity), 0) AS total_stock,
              COALESCE(SUM(quantity <= min_stock), 0) AS low_stock_count,
              CAST(COALESCE(SUM(price * quantity), 0) AS DECIMAL(10, 2))
                AS inventory_value
       FROM products
       WHERE user_id = ?`,
      [userId]
    ),
    pool.query(
      `SELECT id, name, quantity, min_stock
       FROM products
       WHERE user_id = ? AND quantity <= min_stock
       ORDER BY quantity ASC
       LIMIT 10`,
      [userId]
    ),
    pool.query(
      `SELECT st.id, st.product_id, st.type, st.quantity, st.created_at,
              p.name AS product_name, c.name AS category_name
       FROM stock_transactions st
       JOIN products p ON st.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.user_id = ?
       ORDER BY st.created_at DESC
       LIMIT 10`,
      [userId]
    ),
  ]);
  return {
    stats: stats[0],
    low_stock_products: lowStockProducts,
    recent_transactions: recentTransactions,
  };
};
