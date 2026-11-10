const pool = require('../config/db');

const transactionQuery = (hasCursor) => `
  SELECT id, product_id, product_name, category_name, type, quantity,
    action, details, CAST(created_at AS CHAR) AS created_at
  FROM (
    SELECT
      CAST(st.id AS SIGNED) AS id,
      st.product_id,
      p.name AS product_name,
      c.name AS category_name,
      st.type,
      st.quantity,
      NULL AS action,
      st.note AS details,
      st.created_at
    FROM stock_transactions AS st
    LEFT JOIN products AS p ON p.id = st.product_id AND p.user_id = st.user_id
    LEFT JOIN categories AS c ON c.id = p.category_id AND c.user_id = st.user_id
    WHERE st.user_id = ?

    UNION ALL

    SELECT
      -CAST(al.id AS SIGNED) AS id,
      NULL AS product_id,
      al.entity_name AS product_name,
      NULL AS category_name,
      CONCAT('AUDIT_', UPPER(al.\`action\`)) AS type,
      0 AS quantity,
      al.\`action\` AS action,
      al.details,
      al.created_at
    FROM audit_logs AS al
    WHERE al.user_id = ? AND al.entity_type = 'product'
  ) AS activities
  ${hasCursor ? 'WHERE (created_at < ? OR (created_at = ? AND id < ?))' : ''}
  ORDER BY created_at DESC, id DESC
  LIMIT 20
`;

exports.transactions = async (userId, { beforeCreatedAt, beforeId } = {}) => {
  const hasCursor = beforeCreatedAt != null && beforeId != null;
  const parameters = hasCursor
    ? [userId, userId, beforeCreatedAt, beforeCreatedAt, beforeId]
    : [userId, userId];
  const [rows] = await pool.query(transactionQuery(hasCursor), parameters);
  return rows;
};

exports.summary = async (userId) => {
  const [statsRows] = await pool.query(`
    SELECT
      COUNT(*) AS total_products,
      COALESCE(SUM(quantity), 0) AS total_stock,
      COALESCE(SUM(CASE WHEN quantity <= min_stock THEN 1 ELSE 0 END), 0)
        AS low_stock_count,
      COALESCE(SUM(price * quantity), 0) AS inventory_value
    FROM products
    WHERE user_id = ?
  `, [userId]);
  const [lowStockResults] = await pool.query(
    `SELECT p.id, p.name, p.category_id, c.name AS category_name,
            p.sku, p.price, p.quantity, p.min_stock
     FROM products AS p
     LEFT JOIN categories AS c
       ON c.id = p.category_id AND c.user_id = p.user_id
     WHERE p.user_id = ? AND p.quantity <= p.min_stock
     ORDER BY p.quantity ASC, p.name`,
    [userId],
  );

  return {
    stats: statsRows[0],
    low_stock_products: lowStockResults,
    recent_transactions: await exports.transactions(userId),
  };
};
