const pool = require('../config/db');

exports.getAll = async () => {
  const [rows] = await pool.query('CALL sp_get_all_products()');
  return rows[0];
};

exports.getById = async (id) => {
  const [rows] = await pool.query('CALL sp_get_product_by_id(?)', [id]);
  return rows[0][0] || null;
};

exports.getLowStock = async () => {
  const [rows] = await pool.query('CALL sp_get_low_stock_products()');
  return rows[0];
};

exports.create = async (d) => {
  const [rows] = await pool.query(
    'CALL sp_create_product(?, ?, ?, ?, ?, ?)',
    [d.name, d.category_id || null, d.sku || null, d.price || 0,
     d.quantity || 0, d.min_stock || 5]
  );
  return rows[0][0];
};

exports.update = async (id, d) => {
  await pool.query(
    'CALL sp_update_product(?, ?, ?, ?, ?, ?)',
    [id, d.name, d.category_id || null, d.sku || null,
     d.price || 0, d.min_stock || 5]
  );
};

exports.remove = async (id) => {
  await pool.query('CALL sp_delete_product(?)', [id]);
};