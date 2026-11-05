const pool = require('../config/db');

exports.getMonthlyDemand = async (productId, userId, monthsBack = 24) => {
  const [rows] = await pool.query(
    `SELECT YEAR(st.created_at) AS yr,
            MONTH(st.created_at) AS mo,
            SUM(st.quantity) AS total_out
     FROM stock_transactions AS st
     INNER JOIN products AS p
       ON p.id = st.product_id AND p.user_id = st.user_id
     WHERE p.id = ? AND p.user_id = ? AND st.user_id = ?
       AND st.type = 'OUT'
       AND st.created_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
     GROUP BY YEAR(st.created_at), MONTH(st.created_at)
     ORDER BY yr, mo`,
    [productId, userId, userId, monthsBack],
  );
  return rows;
};

exports.getAllMonthlyDemand = async (userId, monthsBack = 24) => {
  const [rows] = await pool.query(
    `SELECT p.id AS product_id,
            YEAR(st.created_at) AS yr,
            MONTH(st.created_at) AS mo,
            SUM(st.quantity) AS total_out
     FROM stock_transactions AS st
     INNER JOIN products AS p
       ON p.id = st.product_id AND p.user_id = st.user_id
     WHERE p.user_id = ? AND st.user_id = ? AND st.type = 'OUT'
       AND st.created_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
     GROUP BY p.id, YEAR(st.created_at), MONTH(st.created_at)
     ORDER BY p.id, yr, mo`,
    [userId, userId, monthsBack],
  );
  return rows;
};