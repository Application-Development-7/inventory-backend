const pool = require('../config/db');

exports.getTopProducts = async ({ startDate, endDate }, userId) => {
  const [rows] = await pool.query(
    `SELECT p.id AS product_id,
            p.name AS product_name,
            SUM(st.quantity) AS total_sold
     FROM stock_transactions AS st
     INNER JOIN products AS p
       ON p.id = st.product_id AND p.user_id = st.user_id
     WHERE st.type = 'OUT'
       AND st.user_id = ?
       AND p.user_id = ?
       AND st.created_at >= ?
       AND st.created_at < ?
     GROUP BY p.id, p.name
     ORDER BY total_sold DESC, p.name ASC
     LIMIT 5`,
    [userId, userId, startDate, endDate],
  );
  return rows.map(product => ({
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
