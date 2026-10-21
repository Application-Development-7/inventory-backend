const pool = require('../config/db');

exports.getMonthlyDemand = async (productId, monthsBack = 24) => {
  const [rows] = await pool.query(
    'CALL sp_get_monthly_demand(?, ?)',
    [productId, monthsBack]
  );
  return rows[0];
};

exports.getAllMonthlyDemand = async (monthsBack = 24) => {
  const [rows] = await pool.query(
    'CALL sp_get_all_monthly_demand(?)',
    [monthsBack]
  );
  return rows[0];
};