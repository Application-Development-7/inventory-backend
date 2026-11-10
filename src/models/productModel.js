const pool = require('../config/db');

const insertAuditLog = async (connection, log) => {
  await connection.query(
    `INSERT INTO audit_logs
      (user_id, \`action\`, entity_type, entity_name, details)
     VALUES (?, ?, 'product', ?, ?)`,
    [log.userId, log.action, log.entityName, log.details ?? null],
  );
};

async function validateCategory(connection, categoryId, userId) {
  if (categoryId == null) return;
  const [rows] = await connection.query(
    'SELECT id FROM categories WHERE id = ? AND user_id = ?',
    [categoryId, userId],
  );
  if (rows.length === 0) throw new Error('Category not found');
}

exports.getAll = async (userId) => {
  const [rows] = await pool.query(
    `SELECT p.id, p.name, p.category_id, c.name AS category_name,
            p.sku, p.price, p.quantity, p.min_stock
     FROM products AS p
     LEFT JOIN categories AS c
       ON c.id = p.category_id AND c.user_id = p.user_id
     WHERE p.user_id = ?
     ORDER BY p.name`,
    [userId],
  );
  return rows;
};

exports.getById = async (id, userId) => {
  const [rows] = await pool.query(
    `SELECT p.id, p.name, p.category_id, c.name AS category_name,
            p.sku, p.price, p.quantity, p.min_stock
     FROM products AS p
     LEFT JOIN categories AS c
       ON c.id = p.category_id AND c.user_id = p.user_id
     WHERE p.id = ? AND p.user_id = ?
     LIMIT 1`,
    [id, userId],
  );
  return rows[0] || null;
};

exports.getLowStock = async (userId) => {
  const [rows] = await pool.query(
    `SELECT p.id, p.name, p.category_id, c.name AS category_name,
            p.sku, p.price, p.quantity, p.min_stock
     FROM products AS p
     LEFT JOIN categories AS c
       ON c.id = p.category_id AND c.user_id = p.user_id
     WHERE p.user_id = ? AND p.quantity <= p.min_stock
     ORDER BY p.quantity ASC, p.name`,
    [userId],
  );
  return rows;
};

exports.create = async (data, userId, auditAction) => {
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const categoryId = data.category_id || null;
    await validateCategory(connection, categoryId, userId);

    const quantity = Number(data.quantity ?? 0);
    const [result] = await connection.query(
      `INSERT INTO products
        (user_id, name, category_id, sku, price, quantity, min_stock)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        data.name,
        categoryId,
        data.sku || null,
        data.price || 0,
        quantity,
        data.min_stock ?? 5,
      ],
    );

    if (quantity > 0) {
      await connection.query(
        `INSERT INTO stock_transactions
          (product_id, type, quantity, note, user_id)
         VALUES (?, 'IN', ?, 'Initial stock', ?)`,
        [result.insertId, quantity, userId],
      );
    }

    const [rows] = await connection.query(
      `SELECT id, name, category_id, sku, price, quantity, min_stock
       FROM products
       WHERE id = ? AND user_id = ?`,
      [result.insertId, userId],
    );
    await insertAuditLog(connection, {
      userId,
      action: auditAction,
      entityName: rows[0].name,
      details: JSON.stringify({ productId: result.insertId }),
    });
    await connection.commit();
    transactionStarted = false;
    return rows[0];
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

exports.update = async (id, userId, data, audit) => {
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const [existingRows] = await connection.query(
      'SELECT id FROM products WHERE id = ? AND user_id = ? FOR UPDATE',
      [id, userId],
    );
    if (existingRows.length === 0) {
      await connection.rollback();
      transactionStarted = false;
      return false;
    }
    const categoryId = data.category_id || null;
    await validateCategory(connection, categoryId, userId);
    await connection.query(
      `UPDATE products
       SET name = ?, category_id = ?, sku = ?, price = ?, min_stock = ?
       WHERE id = ? AND user_id = ?`,
      [
        data.name,
        categoryId,
        data.sku || null,
        data.price || 0,
        data.min_stock ?? 5,
        id,
        userId,
      ],
    );
    await insertAuditLog(connection, audit);
    await connection.commit();
    transactionStarted = false;
    return true;
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

exports.remove = async (id, userId, audit) => {
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    await connection.query(
      'DELETE FROM stock_transactions WHERE product_id = ? AND user_id = ?',
      [id, userId],
    );
    const [result] = await connection.query(
      'DELETE FROM products WHERE id = ? AND user_id = ?',
      [id, userId],
    );
    if (result.affectedRows === 0) {
      await connection.rollback();
      transactionStarted = false;
      return false;
    }
    await insertAuditLog(connection, audit);
    await connection.commit();
    transactionStarted = false;
    return true;
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
