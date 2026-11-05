const pool = require('../config/db');

const insertAuditLog = async (connection, log) => {
  await connection.query(
    `INSERT INTO audit_logs
      (user_id, \`action\`, entity_type, entity_name, details)
     VALUES (?, ?, 'product', ?, ?)`,
    [log.userId, log.action, log.entityName, log.details ?? null],
  );
};

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

exports.create = async (d, userId, auditAction) => {
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    if (d.category_id) {
      const [categories] = await connection.query(
        'SELECT id FROM categories WHERE id = ? AND user_id = ?',
        [d.category_id, userId],
      );
      if (categories.length === 0) {
        throw new Error('Category not found');
      }
    }

    const quantity = Number(d.quantity ?? 0);
    const [result] = await connection.query(
      `INSERT INTO products
        (name, category_id, sku, price, quantity, min_stock, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        d.name,
        d.category_id || null,
        d.sku || null,
        d.price || 0,
        quantity,
        d.min_stock ?? 5,
        userId,
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

exports.update = async (id, userId, d, audit) => {
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    if (d.category_id) {
      const [categories] = await connection.query(
        'SELECT id FROM categories WHERE id = ? AND user_id = ?',
        [d.category_id, userId],
      );
      if (categories.length === 0) {
        throw new Error('Category not found');
      }
    }
    await connection.query(
      `UPDATE products
       SET name = ?, category_id = ?, sku = ?, price = ?, min_stock = ?
       WHERE id = ? AND user_id = ?`,
      [
        d.name,
        d.category_id || null,
        d.sku || null,
        d.price || 0,
        d.min_stock ?? 5,
        id,
        userId,
      ],
    );
    await insertAuditLog(connection, audit);
    await connection.commit();
    transactionStarted = false;
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
    await connection.query(
      'DELETE FROM products WHERE id = ? AND user_id = ?',
      [id, userId],
    );
    await insertAuditLog(connection, audit);
    await connection.commit();
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};