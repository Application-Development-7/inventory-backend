CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  `action` VARCHAR(255) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_name VARCHAR(255) NOT NULL,
  details TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_logs_created_at (created_at, id),
  KEY idx_audit_logs_entity (entity_type, entity_name)
);

DROP PROCEDURE IF EXISTS sp_get_dashboard_summary;
DROP PROCEDURE IF EXISTS sp_get_low_stock_products;

DELIMITER $$

CREATE PROCEDURE sp_get_low_stock_products(IN p_user_id INT)
BEGIN
  SELECT p.id, p.name, p.category_id, c.name AS category_name,
         p.sku, p.price, p.quantity, p.min_stock
  FROM products AS p
  LEFT JOIN categories AS c
    ON c.id = p.category_id AND c.user_id = p.user_id
  WHERE p.user_id = p_user_id AND p.quantity <= p.min_stock
  ORDER BY p.quantity ASC, p.name;
END$$

CREATE PROCEDURE sp_get_dashboard_summary(IN p_user_id INT)
BEGIN
  SELECT
    COUNT(*) AS total_products,
    COALESCE(SUM(quantity), 0) AS total_stock,
    COALESCE(
      SUM(CASE WHEN quantity <= min_stock THEN 1 ELSE 0 END),
      0
    ) AS low_stock_count,
    COALESCE(SUM(price * quantity), 0) AS inventory_value
  FROM products
  WHERE user_id = p_user_id;

  CALL sp_get_low_stock_products(p_user_id);

  SELECT
    activity.id,
    activity.product_id,
    activity.product_name,
    activity.category_name,
    activity.type,
    activity.quantity,
    activity.action,
    activity.details,
    CAST(activity.created_at AS CHAR) AS created_at
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
    LEFT JOIN products AS p
      ON p.id = st.product_id AND p.user_id = st.user_id
    LEFT JOIN categories AS c
      ON c.id = p.category_id AND c.user_id = st.user_id
    WHERE st.user_id = p_user_id

    UNION ALL

    SELECT
      -CAST(al.id AS SIGNED) AS id,
      NULL AS product_id,
      al.entity_name AS product_name,
      NULL AS category_name,
      CONCAT('AUDIT_', UPPER(al.`action`)) AS type,
      0 AS quantity,
      al.`action` AS action,
      al.details,
      al.created_at
    FROM audit_logs AS al
    WHERE al.user_id = p_user_id AND al.entity_type = 'product'
  ) AS activity
  ORDER BY activity.created_at DESC, activity.id DESC
  LIMIT 20;
END$$

DELIMITER ;
