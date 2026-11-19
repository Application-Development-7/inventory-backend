const pool = require('../config/db');

exports.record = async ({
  product_id,
  type,
  quantity,
  note,
  user_id,
}) => {
  const [results] = await pool.query('CALL sp_record_stock(?, ?, ?, ?, ?)', [
    product_id,
    type,
    quantity,
    note || null,
    user_id,
  ]);
  const result = results[0][0];
  return Number(result.found) === 1
    ? { new_quantity: result.new_quantity }
    : null;
};

exports.history = async (productId, userId) => {
  const [results] = await pool.query('CALL sp_get_stock_history(?, ?)', [
    productId,
    userId,
  ]);
  return results[0];
};
