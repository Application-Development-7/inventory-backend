const pool = require('../config/db');

exports.getTopProductsThisMonth = async (userId, month) => {
  const [resultSets] = await pool.query(
    'CALL sp_get_top_products_by_month(?, ?)',
    [userId, month]
  );
  return resultSets[0];
};
