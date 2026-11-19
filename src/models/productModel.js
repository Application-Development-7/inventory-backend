const pool = require('../config/db');

exports.getAll = async (userId) => {
  const [results] = await pool.query('CALL sp_get_all_products(?)', [userId]);
  return results[0];
};

exports.getById = async (id, userId) => {
  const [results] = await pool.query('CALL sp_get_product_by_id(?, ?)', [
    userId,
    id,
  ]);
  return results[0][0] || null;
};

exports.getLowStock = async (userId) => {
  const [results] = await pool.query('CALL sp_get_low_stock_products(?)', [
    userId,
  ]);
  return results[0];
};

exports.create = async (data, userId, auditAction) => {
  const quantity = Number(data.quantity ?? 0);
  const [results] = await pool.query(
    'CALL sp_create_product(?, ?, ?, ?, ?, ?, ?, ?)',
    [
      userId,
      data.name,
      data.category_id || null,
      data.sku || null,
      data.price || 0,
      quantity,
      data.min_stock ?? 5,
      auditAction,
    ],
  );
  return results[0][0];
};

exports.update = async (id, userId, data, audit) => {
  const [results] = await pool.query(
    'CALL sp_update_product(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      id,
      userId,
      data.name,
      data.category_id || null,
      data.sku || null,
      data.price || 0,
      data.min_stock ?? 5,
      audit.action,
      audit.entityName,
      audit.details ?? null,
    ],
  );
  return Number(results[0][0].updated) === 1;
};

exports.remove = async (id, userId, audit) => {
  const [results] = await pool.query(
    'CALL sp_delete_product(?, ?, ?, ?, ?)',
    [id, userId, audit.action, audit.entityName, audit.details ?? null],
  );
  return Number(results[0][0].deleted) === 1;
};
