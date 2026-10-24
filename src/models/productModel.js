const pool = require('../config/db');

async function validateCategory(categoryId, userId) {
  if (categoryId == null) return;
  const [rows] = await pool.query(
    'SELECT id FROM categories WHERE id = ? AND user_id = ?',
    [categoryId, userId]
  );
  if (rows.length === 0) throw new Error('Category not found');
}

exports.getAll = async (userId) => {
  const [rows] = await pool.query(
    `SELECT p.*, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.user_id = ?
     ORDER BY p.id DESC`,
    [userId]
  );
  return rows;
};

exports.getById = async (id, userId) => {
  const [rows] = await pool.query(
    `SELECT p.*, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.id = ? AND p.user_id = ?`,
    [id, userId]
  );
  return rows[0] || null;
};

exports.getLowStock = async (userId) => {
  const [rows] = await pool.query(
    `SELECT p.*, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.user_id = ? AND p.quantity <= p.min_stock
     ORDER BY p.quantity ASC`,
    [userId]
  );
  return rows;
};

exports.create = async (data, userId) => {
  const categoryId = data.category_id || null;
  await validateCategory(categoryId, userId);
  const [result] = await pool.query(
    `INSERT INTO products
       (user_id, name, category_id, sku, price, quantity, min_stock)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      data.name,
      categoryId,
      data.sku || null,
      data.price || 0,
      data.quantity || 0,
      data.min_stock || 5,
    ]
  );
  return { id: result.insertId };
};

exports.update = async (id, data, userId) => {
  const categoryId = data.category_id || null;
  await validateCategory(categoryId, userId);
  const [result] = await pool.query(
    `UPDATE products
     SET name = ?, category_id = ?, sku = ?, price = ?, min_stock = ?
     WHERE id = ? AND user_id = ?`,
    [
      data.name,
      categoryId,
      data.sku || null,
      data.price || 0,
      data.min_stock || 5,
      id,
      userId,
    ]
  );
  return result.affectedRows > 0;
};

exports.remove = async (id, userId) => {
  const [result] = await pool.query(
    'DELETE FROM products WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return result.affectedRows > 0;
};
