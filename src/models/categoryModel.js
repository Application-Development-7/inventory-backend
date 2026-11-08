const pool = require('../config/db');

exports.getAll = async (userId) => {
  const [rows] = await pool.query(
    'SELECT id, name, description FROM categories WHERE user_id = ? ORDER BY name',
    [userId],
  );
  return rows;
};

exports.create = async (data, userId) => {
  const [result] = await pool.query(
    'INSERT INTO categories (name, description, user_id) VALUES (?, ?, ?)',
    [data.name, data.description || null, userId],
  );
  const [rows] = await pool.query(
    'SELECT id, name, description FROM categories WHERE id = ? AND user_id = ?',
    [result.insertId, userId],
  );
  return rows[0];
};

exports.getById = async (id, userId) => {
  const [rows] = await pool.query(
    'SELECT id, name, description FROM categories WHERE id = ? AND user_id = ?',
    [id, userId],
  );
  return rows[0] || null;
};

exports.update = async (id, d, userId) => {
  const [result] = await pool.query(
    `UPDATE categories SET name = ?, description = ?
     WHERE id = ? AND user_id = ?`,
    [d.name, d.description || null, id, userId],
  );
  return result.affectedRows > 0;
};

exports.remove = async (id, userId) => {
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    await connection.query(
      'UPDATE products SET category_id = NULL WHERE category_id = ? AND user_id = ?',
      [id, userId],
    );
    const [result] = await connection.query(
      'DELETE FROM categories WHERE id = ? AND user_id = ?',
      [id, userId],
    );
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
