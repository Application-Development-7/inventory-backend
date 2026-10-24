const pool = require('../config/db');

exports.getMonthlyDemand = async (productId, userId, monthsBack = 24) => {
  const [rows] = await pool.query(
    `SELECT YEAR(st.created_at) AS yr, MONTH(st.created_at) AS mo,
            SUM(st.quantity) AS total_out
     FROM stock_transactions st
     JOIN products p ON st.product_id = p.id
     WHERE st.product_id = ? AND p.user_id = ? AND st.type = 'OUT'
       AND st.created_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
     GROUP BY YEAR(st.created_at), MONTH(st.created_at)
     ORDER BY yr, mo`,
    [productId, userId, monthsBack]
  );
  return rows;
};

exports.getAllMonthlyDemand = async (userId, monthsBack = 24) => {
  const [rows] = await pool.query(
    `SELECT st.product_id, YEAR(st.created_at) AS yr,
            MONTH(st.created_at) AS mo, SUM(st.quantity) AS total_out
     FROM stock_transactions st
     JOIN products p ON st.product_id = p.id
     WHERE p.user_id = ? AND st.type = 'OUT'
       AND st.created_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
     GROUP BY st.product_id, YEAR(st.created_at), MONTH(st.created_at)
     ORDER BY st.product_id, yr, mo`,
    [userId, monthsBack]
  );
  return rows;
};
