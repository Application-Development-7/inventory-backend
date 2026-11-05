const pool = require('../config/db');

exports.clearForUser = async (userId) => {
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    await connection.query(
      `DELETE FROM stock_transactions
       WHERE user_id = ?
          OR product_id IN (
            SELECT id FROM products WHERE user_id = ?
          )`,
      [userId, userId],
    );
    const [result] = await connection.query(
      'DELETE FROM products WHERE user_id = ?',
      [userId],
    );
    await connection.commit();
    transactionStarted = false;
    return result.affectedRows;
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
