const pool = require('../config/db');

exports.getAll = async () => {
  const [rows] = await pool.query('CALL sp_get_all_categories()');
  return rows[0];
};

exports.create = async (d) => {
  const [rows] = await pool.query(
    'CALL sp_create_category(?, ?)',
    [d.name, d.description || null]
  );
  return rows[0][0];
};

exports.update = async (id, d) => {
  await pool.query(
    'CALL sp_update_category(?, ?, ?)',
    [id, d.name, d.description || null]
  );
};

exports.remove = async (id) => {
  await pool.query('CALL sp_delete_category(?)', [id]);
};