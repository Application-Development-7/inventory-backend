const pool = require('../config/db');

function normalizeDemandRows(
  rows,
  { includeProductId = false, yearly = false } = {},
) {
  return rows.map(row => ({
    ...(includeProductId ? { product_id: Number(row.product_id) } : {}),
    yr: Number(row.yr),
    ...(yearly ? {} : { mo: Number(row.mo) }),
    total_out: Number(row.total_out),
  }));
}

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
  return normalizeDemandRows(rows);
};

exports.getYearlyDemand = async (productId, userId) => {
  const [rows] = await pool.query(
    `SELECT YEAR(st.created_at) AS yr, SUM(st.quantity) AS total_out
     FROM stock_transactions AS st
     INNER JOIN products AS p
       ON p.id = st.product_id AND p.user_id = st.user_id
     WHERE p.id = ? AND p.user_id = ? AND st.user_id = ?
       AND st.type = 'OUT'
     GROUP BY YEAR(st.created_at)
     ORDER BY yr`,
    [productId, userId, userId],
  );
  return normalizeDemandRows(rows, { yearly: true });
};

exports.getAllMonthlyDemand = async (userId, monthsBack = 24) => {
  const [rows] = await pool.query(
    `SELECT p.id AS product_id,
            YEAR(st.created_at) AS yr,
            MONTH(st.created_at) AS mo, SUM(st.quantity) AS total_out
     FROM stock_transactions AS st
     INNER JOIN products AS p
       ON p.id = st.product_id AND p.user_id = st.user_id
     WHERE p.user_id = ? AND st.user_id = ? AND st.type = 'OUT'
       AND st.created_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
     GROUP BY p.id, YEAR(st.created_at), MONTH(st.created_at)
     ORDER BY p.id, yr, mo`,
    [userId, userId, monthsBack],
  );
  return normalizeDemandRows(rows, { includeProductId: true });
};

exports.getAllYearlyDemand = async userId => {
  const [rows] = await pool.query(
    `SELECT p.id AS product_id, YEAR(st.created_at) AS yr,
            SUM(st.quantity) AS total_out
     FROM stock_transactions AS st
     INNER JOIN products AS p
       ON p.id = st.product_id AND p.user_id = st.user_id
     WHERE p.user_id = ? AND st.user_id = ? AND st.type = 'OUT'
     GROUP BY p.id, YEAR(st.created_at)
     ORDER BY p.id, yr`,
    [userId, userId],
  );
  return normalizeDemandRows(rows, {
    includeProductId: true,
    yearly: true,
  });
};
