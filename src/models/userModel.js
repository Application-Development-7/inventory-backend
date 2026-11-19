const pool = require('../config/db');

exports.findByUsername = async (username) => {
  const [results] = await pool.query('CALL sp_get_user_by_username(?)', [
    username,
  ]);
  return results[0][0] || null;
};

exports.findById = async (userId) => {
  const [results] = await pool.query('CALL sp_get_user_by_id(?)', [userId]);
  return results[0][0] || null;
};

exports.create = async (username, passwordHash, role) => {
  const [results] = await pool.query('CALL sp_create_user(?, ?, ?)', [
    username,
    passwordHash,
    role,
  ]);
  return { id: results[0][0].id };
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
  const [results] = await pool.query('CALL sp_delete_user(?)', [userId]);
  return Number(results[0][0].deleted) > 0;
};
