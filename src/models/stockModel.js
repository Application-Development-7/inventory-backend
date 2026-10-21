const pool = require('../config/db');

exports.record = async ({ product_id, type, quantity, note, user_id }) => {
  const [rows] = await pool.query(
    'CALL sp_record_stock(?, ?, ?, ?, ?)',
    [product_id, type, quantity, note || null, user_id]
  );
  return rows[0][0];
};

exports.history = async (product_id) => {
  const [rows] = await pool.query('CALL sp_get_stock_history(?)', [product_id]);
  return rows[0];
};