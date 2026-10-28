const pool = require('../config/db');

function normalizeDemandRows(rows, { includeProductId = false, yearly = false } = {}) {
  return rows.map(row => ({
    ...(includeProductId ? { product_id: Number(row.product_id) } : {}),
    yr: Number(row.yr),
    ...(yearly ? {} : { mo: Number(row.mo) }),
    total_out: Number(row.total_out),
  }));
}

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
  return normalizeDemandRows(rows);
};

exports.getYearlyDemand = async (productId, userId) => {
  const [rows] = await pool.query(
    `SELECT YEAR(st.created_at) AS yr, SUM(st.quantity) AS total_out
     FROM stock_transactions st
     JOIN products p ON st.product_id = p.id
     WHERE st.product_id = ? AND p.user_id = ? AND st.type = 'OUT'
     GROUP BY YEAR(st.created_at)
     ORDER BY yr`,
    [productId, userId]
  );
  return normalizeDemandRows(rows, { yearly: true });
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
  return normalizeDemandRows(rows, { includeProductId: true });
};

exports.getAllYearlyDemand = async userId => {
  const [rows] = await pool.query(
    `SELECT st.product_id, YEAR(st.created_at) AS yr,
            SUM(st.quantity) AS total_out
     FROM stock_transactions st
     JOIN products p ON st.product_id = p.id
     WHERE p.user_id = ? AND st.type = 'OUT'
     GROUP BY st.product_id, YEAR(st.created_at)
     ORDER BY st.product_id, yr`,
    [userId]
  );
  return normalizeDemandRows(rows, {
    includeProductId: true,
    yearly: true,
  });
};
