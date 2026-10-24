const pool = require('../config/db');

exports.findByUsername = async (username) => {
  const [rows] = await pool.query('CALL sp_get_user_by_username(?)', [username]);
  return rows[0][0] || null;
};

exports.create = async (username, passwordHash, role) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [username, passwordHash, role]
    );
    await connection.query(
      `INSERT INTO categories (user_id, name, description)
       SELECT ?, name, description
       FROM categories
       WHERE user_id = (
         SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1
       )`,
      [result.insertId]
    );
    await connection.commit();
    return { id: result.insertId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
