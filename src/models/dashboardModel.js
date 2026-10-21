const pool = require('../config/db');

exports.summary = async () => {
  const [results] = await pool.query('CALL sp_get_dashboard_summary()');
  return {
    stats: results[0][0],
    low_stock_products: results[1],
    recent_transactions: results[2],
  };
};