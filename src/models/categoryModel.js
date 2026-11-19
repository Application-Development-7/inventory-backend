const pool = require('../config/db');

exports.getAll = async (userId) => {
  const [results] = await pool.query('CALL sp_get_all_categories(?)', [userId]);
  return results[0];
};

exports.create = async (data, userId) => {
  const [results] = await pool.query('CALL sp_create_category(?, ?, ?)', [
    userId,
    data.name,
    data.description || null,
  ]);
  return results[0][0];
};

exports.getById = async (id, userId) => {
  const [results] = await pool.query('CALL sp_get_category_by_id(?, ?)', [
    userId,
    id,
  ]);
  return results[0][0] || null;
};

exports.update = async (id, data, userId) => {
  const [results] = await pool.query('CALL sp_update_category(?, ?, ?, ?)', [
    id,
    userId,
    data.name,
    data.description || null,
  ]);
  return Number(results[0][0].updated) > 0;
};

exports.remove = async (id, userId) => {
  const [results] = await pool.query('CALL sp_delete_category(?, ?)', [
    id,
    userId,
  ]);
  return Number(results[0][0].deleted) > 0;
};
