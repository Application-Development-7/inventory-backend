const pool = require('../config/db');

exports.record = async ({ product_id, type, quantity, note, user_id }) => {
  const [rows] = await pool.query(
    'CALL sp_record_stock(?, ?, ?, ?, ?)',
    [product_id, type, quantity, note || null, user_id]
  );
  return rows[0][0];
};

exports.history = async (product_id, user_id) => {
  const [rows] = await pool.query(
    `SELECT id, product_id, type, quantity, note, created_at
     FROM stock_transactions
     WHERE product_id = ? AND user_id = ?
     ORDER BY created_at DESC, id DESC`,
    [product_id, user_id],
  );
  return rows;
};