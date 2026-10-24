const pool = require('../config/db');

exports.getAll = async (userId) => {
  const [rows] = await pool.query(
    'SELECT * FROM categories WHERE user_id = ? ORDER BY name',
    [userId]
  );
  return rows;
};

exports.create = async (data, userId) => {
  const [result] = await pool.query(
    'INSERT INTO categories (user_id, name, description) VALUES (?, ?, ?)',
    [userId, data.name, data.description || null]
  );
  return { id: result.insertId };
};

exports.update = async (id, data, userId) => {
  const [result] = await pool.query(
    `UPDATE categories SET name = ?, description = ?
     WHERE id = ? AND user_id = ?`,
    [data.name, data.description || null, id, userId]
  );
  return result.affectedRows > 0;
};

exports.remove = async (id, userId) => {
  const [result] = await pool.query(
    'DELETE FROM categories WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return result.affectedRows > 0;
};
