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

exports.getMonthlyDemand = async (productId, userId, monthsBack = 12) => {
  const [results] = await pool.query(
    'CALL sp_get_monthly_demand(?, ?, ?)',
    [productId, userId, monthsBack],
  );
  return normalizeDemandRows(results[0]);
};

exports.getYearlyDemand = async (productId, userId) => {
  const [results] = await pool.query('CALL sp_get_yearly_demand(?, ?)', [
    productId,
    userId,
  ]);
  return normalizeDemandRows(results[0], { yearly: true });
};

exports.getAllMonthlyDemand = async (userId, monthsBack = 12) => {
  const [results] = await pool.query(
    'CALL sp_get_all_monthly_demand(?, ?)',
    [userId, monthsBack],
  );
  return normalizeDemandRows(results[0], { includeProductId: true });
};

exports.getAllYearlyDemand = async (userId) => {
  const [results] = await pool.query('CALL sp_get_all_yearly_demand(?)', [
    userId,
  ]);
  return normalizeDemandRows(results[0], {
    includeProductId: true,
    yearly: true,
  });
};
