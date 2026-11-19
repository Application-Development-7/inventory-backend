USE inventory_db;

DROP PROCEDURE IF EXISTS sp_get_all_products;
DROP PROCEDURE IF EXISTS sp_get_product_by_id;
DROP PROCEDURE IF EXISTS sp_get_low_stock_products;
DROP PROCEDURE IF EXISTS sp_create_product;
DROP PROCEDURE IF EXISTS sp_update_product;
DROP PROCEDURE IF EXISTS sp_delete_product;
DROP PROCEDURE IF EXISTS sp_get_all_categories;
DROP PROCEDURE IF EXISTS sp_get_category_by_id;
DROP PROCEDURE IF EXISTS sp_create_category;
DROP PROCEDURE IF EXISTS sp_update_category;
DROP PROCEDURE IF EXISTS sp_delete_category;
DROP PROCEDURE IF EXISTS sp_record_stock;
DROP PROCEDURE IF EXISTS sp_get_stock_history;
DROP PROCEDURE IF EXISTS sp_get_dashboard_transactions;
DROP PROCEDURE IF EXISTS sp_get_dashboard_summary;
DROP PROCEDURE IF EXISTS sp_get_user_by_username;
DROP PROCEDURE IF EXISTS sp_get_user_by_id;
DROP PROCEDURE IF EXISTS sp_create_user;
DROP PROCEDURE IF EXISTS sp_update_user_profile;
DROP PROCEDURE IF EXISTS sp_update_user_password;
DROP PROCEDURE IF EXISTS sp_update_user_preferences;
DROP PROCEDURE IF EXISTS sp_delete_user;
DROP PROCEDURE IF EXISTS sp_get_top_products;
DROP PROCEDURE IF EXISTS sp_clear_inventory;
DROP PROCEDURE IF EXISTS sp_get_monthly_demand;
DROP PROCEDURE IF EXISTS sp_get_yearly_demand;
DROP PROCEDURE IF EXISTS sp_get_all_monthly_demand;
DROP PROCEDURE IF EXISTS sp_get_all_yearly_demand;

DELIMITER $$

CREATE PROCEDURE sp_get_all_products(IN p_user_id INT)
BEGIN
  SELECT p.id, p.name, p.category_id, c.name AS category_name,
         p.sku, p.price, p.quantity, p.min_stock
  FROM products AS p
  LEFT JOIN categories AS c
    ON c.id = p.category_id AND c.user_id = p.user_id
  WHERE p.user_id = p_user_id
  ORDER BY p.name;
END$$

CREATE PROCEDURE sp_get_product_by_id(
  IN p_user_id INT,
  IN p_product_id INT
)
BEGIN
  SELECT p.id, p.name, p.category_id, c.name AS category_name,
         p.sku, p.price, p.quantity, p.min_stock
  FROM products AS p
  LEFT JOIN categories AS c
    ON c.id = p.category_id AND c.user_id = p.user_id
  WHERE p.user_id = p_user_id AND p.id = p_product_id
  LIMIT 1;
END$$

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

CREATE PROCEDURE sp_create_product(
  IN p_user_id INT,
  IN p_name VARCHAR(255),
  IN p_category_id INT,
  IN p_sku VARCHAR(255),
  IN p_price DECIMAL(12, 2),
  IN p_quantity INT,
  IN p_min_stock INT,
  IN p_audit_action VARCHAR(255)
)
BEGIN
  DECLARE v_product_id INT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  IF p_category_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM categories
    WHERE id = p_category_id AND user_id = p_user_id
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Category not found';
  END IF;

  INSERT INTO products
    (user_id, name, category_id, sku, price, quantity, min_stock)
  VALUES
    (p_user_id, p_name, p_category_id, p_sku, p_price, p_quantity, p_min_stock);
  SET v_product_id = LAST_INSERT_ID();

  IF p_quantity > 0 THEN
    INSERT INTO stock_transactions
      (product_id, type, quantity, note, user_id)
    VALUES
      (v_product_id, 'IN', p_quantity, 'Initial stock', p_user_id);
  END IF;

  INSERT INTO audit_logs
    (user_id, `action`, entity_type, entity_name, details)
  VALUES
    (p_user_id, p_audit_action, 'product', p_name,
     CONCAT('{"productId":', v_product_id, '}'));

  COMMIT;

  SELECT id, name, category_id, sku, price, quantity, min_stock
  FROM products
  WHERE id = v_product_id AND user_id = p_user_id;
END$$

CREATE PROCEDURE sp_update_product(
  IN p_product_id INT,
  IN p_user_id INT,
  IN p_name VARCHAR(255),
  IN p_category_id INT,
  IN p_sku VARCHAR(255),
  IN p_price DECIMAL(12, 2),
  IN p_min_stock INT,
  IN p_audit_action VARCHAR(255),
  IN p_entity_name VARCHAR(255),
  IN p_details TEXT
)
BEGIN
  DECLARE v_existing_id INT DEFAULT NULL;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_existing_id = NULL;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  SELECT id INTO v_existing_id
  FROM products
  WHERE id = p_product_id AND user_id = p_user_id
  FOR UPDATE;

  IF v_existing_id IS NULL THEN
    ROLLBACK;
    SELECT 0 AS updated;
  ELSE
    IF p_category_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM categories
      WHERE id = p_category_id AND user_id = p_user_id
    ) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Category not found';
    END IF;

    UPDATE products
    SET name = p_name,
        category_id = p_category_id,
        sku = p_sku,
        price = p_price,
        min_stock = p_min_stock
    WHERE id = p_product_id AND user_id = p_user_id;

    INSERT INTO audit_logs
      (user_id, `action`, entity_type, entity_name, details)
    VALUES
      (p_user_id, p_audit_action, 'product', p_entity_name, p_details);

    COMMIT;
    SELECT 1 AS updated;
  END IF;
END$$

CREATE PROCEDURE sp_delete_product(
  IN p_product_id INT,
  IN p_user_id INT,
  IN p_audit_action VARCHAR(255),
  IN p_entity_name VARCHAR(255),
  IN p_details TEXT
)
BEGIN
  DECLARE v_existing_id INT DEFAULT NULL;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_existing_id = NULL;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  SELECT id INTO v_existing_id
  FROM products
  WHERE id = p_product_id AND user_id = p_user_id
  FOR UPDATE;

  IF v_existing_id IS NULL THEN
    ROLLBACK;
    SELECT 0 AS deleted;
  ELSE
    DELETE FROM stock_transactions
    WHERE product_id = p_product_id AND user_id = p_user_id;
    DELETE FROM products
    WHERE id = p_product_id AND user_id = p_user_id;

    INSERT INTO audit_logs
      (user_id, `action`, entity_type, entity_name, details)
    VALUES
      (p_user_id, p_audit_action, 'product', p_entity_name, p_details);

    COMMIT;
    SELECT 1 AS deleted;
  END IF;
END$$

CREATE PROCEDURE sp_get_all_categories(IN p_user_id INT)
BEGIN
  SELECT id, name, description
  FROM categories
  WHERE user_id = p_user_id
  ORDER BY name;
END$$

CREATE PROCEDURE sp_get_category_by_id(
  IN p_user_id INT,
  IN p_category_id INT
)
BEGIN
  SELECT id, name, description
  FROM categories
  WHERE id = p_category_id AND user_id = p_user_id
  LIMIT 1;
END$$

CREATE PROCEDURE sp_create_category(
  IN p_user_id INT,
  IN p_name VARCHAR(255),
  IN p_description TEXT
)
BEGIN
  DECLARE v_category_id INT;
  INSERT INTO categories (name, description, user_id)
  VALUES (p_name, p_description, p_user_id);
  SET v_category_id = LAST_INSERT_ID();

  SELECT id, name, description
  FROM categories
  WHERE id = v_category_id AND user_id = p_user_id;
END$$

CREATE PROCEDURE sp_update_category(
  IN p_category_id INT,
  IN p_user_id INT,
  IN p_name VARCHAR(255),
  IN p_description TEXT
)
BEGIN
  UPDATE categories
  SET name = p_name, description = p_description
  WHERE id = p_category_id AND user_id = p_user_id;
  SELECT ROW_COUNT() AS updated;
END$$

CREATE PROCEDURE sp_delete_category(
  IN p_category_id INT,
  IN p_user_id INT
)
BEGIN
  DECLARE v_deleted INT DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  UPDATE products
  SET category_id = NULL
  WHERE category_id = p_category_id AND user_id = p_user_id;
  DELETE FROM categories
  WHERE id = p_category_id AND user_id = p_user_id;
  SET v_deleted = ROW_COUNT();
  COMMIT;

  SELECT v_deleted AS deleted;
END$$

CREATE PROCEDURE sp_record_stock(
  IN p_product_id INT,
  IN p_type VARCHAR(3),
  IN p_quantity INT,
  IN p_note TEXT,
  IN p_user_id INT
)
BEGIN
  DECLARE v_current_quantity INT DEFAULT NULL;
  DECLARE v_not_found BOOLEAN DEFAULT FALSE;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_not_found = TRUE;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Quantity must be greater than zero';
  END IF;
  IF p_type IS NULL OR p_type NOT IN ('IN', 'OUT') THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Stock type must be IN or OUT';
  END IF;

  START TRANSACTION;
  SELECT quantity INTO v_current_quantity
  FROM products
  WHERE id = p_product_id AND user_id = p_user_id
  FOR UPDATE;

  IF v_not_found THEN
    ROLLBACK;
    SELECT 0 AS found, NULL AS new_quantity;
  ELSEIF p_type = 'OUT' AND v_current_quantity < p_quantity THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient stock';
  ELSE
    SET v_current_quantity = IF(
      p_type = 'IN',
      v_current_quantity + p_quantity,
      v_current_quantity - p_quantity
    );

    UPDATE products
    SET quantity = v_current_quantity
    WHERE id = p_product_id AND user_id = p_user_id;
    INSERT INTO stock_transactions
      (product_id, type, quantity, note, user_id)
    VALUES
      (p_product_id, p_type, p_quantity, p_note, p_user_id);
    COMMIT;

    SELECT 1 AS found, v_current_quantity AS new_quantity;
  END IF;
END$$

CREATE PROCEDURE sp_get_stock_history(
  IN p_product_id INT,
  IN p_user_id INT
)
BEGIN
  SELECT st.*, u.username
  FROM stock_transactions AS st
  INNER JOIN products AS p
    ON p.id = st.product_id AND p.user_id = st.user_id
  LEFT JOIN users AS u ON u.id = st.user_id
  WHERE st.product_id = p_product_id
    AND st.user_id = p_user_id
    AND p.user_id = p_user_id
  ORDER BY st.created_at DESC, st.id DESC;
END$$

CREATE PROCEDURE sp_get_dashboard_transactions(
  IN p_user_id INT,
  IN p_before_created_at DATETIME,
  IN p_before_id BIGINT
)
BEGIN
  SELECT activity.id, activity.product_id, activity.product_name,
         activity.category_name, activity.type, activity.quantity,
         activity.action, activity.details,
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
  WHERE p_before_created_at IS NULL
     OR activity.created_at < p_before_created_at
     OR (
       activity.created_at = p_before_created_at
       AND activity.id < p_before_id
     )
  ORDER BY activity.created_at DESC, activity.id DESC
  LIMIT 20;
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

  SELECT p.id, p.name, p.category_id, c.name AS category_name,
         p.sku, p.price, p.quantity, p.min_stock
  FROM products AS p
  LEFT JOIN categories AS c
    ON c.id = p.category_id AND c.user_id = p.user_id
  WHERE p.user_id = p_user_id AND p.quantity <= p.min_stock
  ORDER BY p.quantity ASC, p.name;

  SELECT activity.id, activity.product_id, activity.product_name,
         activity.category_name, activity.type, activity.quantity,
         activity.action, activity.details,
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

CREATE PROCEDURE sp_get_user_by_username(IN p_username VARCHAR(255))
BEGIN
  SELECT id, username, password_hash, role
  FROM users
  WHERE username = p_username
  LIMIT 1;
END$$

CREATE PROCEDURE sp_get_user_by_id(IN p_user_id INT)
BEGIN
  SELECT id, username, display_name, password_hash, role, currency,
         low_stock_threshold, notify_low_stock, notify_weekly_summary
  FROM users
  WHERE id = p_user_id
  LIMIT 1;
END$$

CREATE PROCEDURE sp_create_user(
  IN p_username VARCHAR(255),
  IN p_password_hash VARCHAR(255),
  IN p_role VARCHAR(50)
)
BEGIN
  DECLARE v_user_id INT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  INSERT INTO users (username, password_hash, role)
  VALUES (p_username, p_password_hash, p_role);
  SET v_user_id = LAST_INSERT_ID();

  INSERT INTO categories (user_id, name, description)
  SELECT v_user_id, name, description
  FROM categories
  WHERE user_id = (
    SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1
  );

  COMMIT;
  SELECT v_user_id AS id;
END$$

CREATE PROCEDURE sp_update_user_profile(
  IN p_user_id INT,
  IN p_new_username VARCHAR(50),
  IN p_display_name VARCHAR(100)
)
BEGIN
  UPDATE users
  SET username = p_new_username,
      display_name = NULLIF(p_display_name, '')
  WHERE id = p_user_id;
END$$

CREATE PROCEDURE sp_update_user_password(
  IN p_user_id INT,
  IN p_new_password_hash VARCHAR(255)
)
BEGIN
  UPDATE users
  SET password_hash = p_new_password_hash
  WHERE id = p_user_id;
END$$

CREATE PROCEDURE sp_update_user_preferences(
  IN p_user_id INT,
  IN p_currency VARCHAR(10),
  IN p_low_stock_threshold INT,
  IN p_notify_low_stock BOOLEAN,
  IN p_notify_weekly_summary BOOLEAN
)
BEGIN
  UPDATE users
  SET currency = p_currency,
      low_stock_threshold = p_low_stock_threshold,
      notify_low_stock = p_notify_low_stock,
      notify_weekly_summary = p_notify_weekly_summary
  WHERE id = p_user_id;
END$$

CREATE PROCEDURE sp_delete_user(IN p_user_id INT)
BEGIN
  DECLARE v_deleted INT DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  DELETE FROM stock_transactions
  WHERE user_id = p_user_id
     OR product_id IN (
       SELECT id FROM products WHERE user_id = p_user_id
     );
  DELETE FROM products WHERE user_id = p_user_id;
  DELETE FROM categories WHERE user_id = p_user_id;
  DELETE FROM audit_logs WHERE user_id = p_user_id;
  DELETE FROM users WHERE id = p_user_id;
  SET v_deleted = ROW_COUNT();
  COMMIT;

  SELECT v_deleted AS deleted;
END$$

CREATE PROCEDURE sp_get_top_products(
  IN p_user_id INT,
  IN p_start_date DATETIME,
  IN p_end_date DATETIME
)
BEGIN
  SELECT p.id AS product_id,
         p.name AS product_name,
         SUM(st.quantity) AS total_sold
  FROM stock_transactions AS st
  INNER JOIN products AS p
    ON p.id = st.product_id AND p.user_id = st.user_id
  WHERE st.type = 'OUT'
    AND st.user_id = p_user_id
    AND p.user_id = p_user_id
    AND st.created_at >= p_start_date
    AND st.created_at < p_end_date
  GROUP BY p.id, p.name
  ORDER BY total_sold DESC, p.name ASC
  LIMIT 5;
END$$

CREATE PROCEDURE sp_clear_inventory(IN p_user_id INT)
BEGIN
  DECLARE v_deleted_products INT DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  DELETE FROM stock_transactions
  WHERE user_id = p_user_id
     OR product_id IN (
       SELECT id FROM products WHERE user_id = p_user_id
     );
  DELETE FROM products WHERE user_id = p_user_id;
  SET v_deleted_products = ROW_COUNT();
  COMMIT;

  SELECT v_deleted_products AS deleted_products;
END$$

CREATE PROCEDURE sp_get_monthly_demand(
  IN p_product_id INT,
  IN p_user_id INT,
  IN p_months_back INT
)
BEGIN
  SELECT YEAR(st.created_at) AS yr,
         MONTH(st.created_at) AS mo,
         SUM(st.quantity) AS total_out
  FROM stock_transactions AS st
  INNER JOIN products AS p
    ON p.id = st.product_id AND p.user_id = st.user_id
  WHERE p.id = p_product_id
    AND p.user_id = p_user_id
    AND st.user_id = p_user_id
    AND st.type = 'OUT'
    AND st.created_at >= DATE_SUB(CURDATE(), INTERVAL p_months_back MONTH)
  GROUP BY YEAR(st.created_at), MONTH(st.created_at)
  ORDER BY yr, mo;
END$$

CREATE PROCEDURE sp_get_yearly_demand(
  IN p_product_id INT,
  IN p_user_id INT
)
BEGIN
  SELECT YEAR(st.created_at) AS yr,
         SUM(st.quantity) AS total_out
  FROM stock_transactions AS st
  INNER JOIN products AS p
    ON p.id = st.product_id AND p.user_id = st.user_id
  WHERE p.id = p_product_id
    AND p.user_id = p_user_id
    AND st.user_id = p_user_id
    AND st.type = 'OUT'
  GROUP BY YEAR(st.created_at)
  ORDER BY yr;
END$$

CREATE PROCEDURE sp_get_all_monthly_demand(
  IN p_user_id INT,
  IN p_months_back INT
)
BEGIN
  SELECT p.id AS product_id,
         YEAR(st.created_at) AS yr,
         MONTH(st.created_at) AS mo,
         SUM(st.quantity) AS total_out
  FROM stock_transactions AS st
  INNER JOIN products AS p
    ON p.id = st.product_id AND p.user_id = st.user_id
  WHERE p.user_id = p_user_id
    AND st.user_id = p_user_id
    AND st.type = 'OUT'
    AND st.created_at >= DATE_SUB(CURDATE(), INTERVAL p_months_back MONTH)
  GROUP BY p.id, YEAR(st.created_at), MONTH(st.created_at)
  ORDER BY p.id, yr, mo;
END$$

CREATE PROCEDURE sp_get_all_yearly_demand(IN p_user_id INT)
BEGIN
  SELECT p.id AS product_id,
         YEAR(st.created_at) AS yr,
         SUM(st.quantity) AS total_out
  FROM stock_transactions AS st
  INNER JOIN products AS p
    ON p.id = st.product_id AND p.user_id = st.user_id
  WHERE p.user_id = p_user_id
    AND st.user_id = p_user_id
    AND st.type = 'OUT'
  GROUP BY p.id, YEAR(st.created_at)
  ORDER BY p.id, yr;
END$$

DELIMITER ;
