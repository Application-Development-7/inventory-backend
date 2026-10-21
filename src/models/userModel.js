const pool = require('../config/db');

exports.findByUsername = async (username) => {
  const [rows] = await pool.query('CALL sp_get_user_by_username(?)', [username]);
  return rows[0][0] || null;
};

exports.create = async (username, passwordHash, role) => {
  const [rows] = await pool.query(
    'CALL sp_register_user(?, ?, ?)',
    [username, passwordHash, role]
  );
  return rows[0][0];
};