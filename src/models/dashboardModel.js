const pool = require('../config/db');

exports.transactions = async (userId, { beforeCreatedAt, beforeId } = {}) => {
  const [results] = await pool.query(
    'CALL sp_get_dashboard_transactions(?, ?, ?)',
    [userId, beforeCreatedAt ?? null, beforeId ?? null],
  );
  return results[0];
};

exports.summary = async (userId) => {
  const [results] = await pool.query('CALL sp_get_dashboard_summary(?)', [
    userId,
  ]);
  return {
    stats: results[0][0],
    low_stock_products: results[1],
    recent_transactions: results[2],
  };
};
