const pool = require('../config/db');

exports.clearForUser = async (userId) => {
  const [results] = await pool.query('CALL sp_clear_inventory(?)', [userId]);
  return Number(results[0][0].deleted_products);
};
