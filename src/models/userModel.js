const pool = require('../config/db');

exports.findByUsername = async (username) => {
  const [rows] = await pool.query('CALL sp_get_user_by_username(?)', [username]);
  return rows[0][0] || null;
};

exports.findById = async (userId) => {
  const [rows] = await pool.query('CALL sp_get_user_by_id(?)', [userId]);
  return rows[0][0] || null;
};

exports.create = async (username, passwordHash, role) => {
  const [rows] = await pool.query(
    'CALL sp_register_user(?, ?, ?)',
    [username, passwordHash, role]
  );
  return rows[0][0];
};

exports.updateProfile = async (userId, username, displayName) => {
  await pool.query('CALL sp_update_user_profile(?, ?, ?)', [
    userId,
    username,
    displayName,
  ]);
  return exports.findById(userId);
};

exports.updatePassword = async (userId, passwordHash) => {
  await pool.query('CALL sp_update_user_password(?, ?)', [
    userId,
    passwordHash,
  ]);
};

exports.updatePreferences = async (
  userId,
  currency,
  lowStockThreshold,
  notifyLowStock,
  notifyWeeklySummary,
) => {
  await pool.query('CALL sp_update_user_preferences(?, ?, ?, ?, ?)', [
    userId,
    currency,
    lowStockThreshold,
    notifyLowStock,
    notifyWeeklySummary,
  ]);
  return exports.findById(userId);
};

exports.deleteAccount = async (userId) => {
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
    await connection.query('DELETE FROM products WHERE user_id = ?', [userId]);
    await connection.query('DELETE FROM categories WHERE user_id = ?', [userId]);
    await connection.query('DELETE FROM audit_logs WHERE user_id = ?', [userId]);
    const [result] = await connection.query('DELETE FROM users WHERE id = ?', [
      userId,
    ]);
    await connection.commit();
    transactionStarted = false;
    return result.affectedRows > 0;
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};