DROP PROCEDURE IF EXISTS sp_migrate_user_data_isolation;

DELIMITER $$

CREATE PROCEDURE sp_migrate_user_data_isolation()
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'products'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE products ADD COLUMN user_id INT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'categories'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE categories ADD COLUMN user_id INT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'stock_transactions'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE stock_transactions ADD COLUMN user_id INT NULL;
  END IF;

  UPDATE products AS p
  LEFT JOIN users AS u ON u.id = p.user_id
  SET p.user_id = NULL
  WHERE p.user_id IS NOT NULL AND u.id IS NULL;

  IF (SELECT COUNT(*) FROM users) = 1 THEN
    UPDATE products
    SET user_id = (SELECT MIN(id) FROM users)
    WHERE user_id IS NULL;
  END IF;

  UPDATE categories AS c
  INNER JOIN (
    SELECT category_id, MIN(user_id) AS user_id
    FROM products
    WHERE category_id IS NOT NULL AND user_id IS NOT NULL
    GROUP BY category_id
    HAVING COUNT(DISTINCT user_id) = 1
  ) AS owners ON owners.category_id = c.id
  SET c.user_id = owners.user_id
  WHERE c.user_id IS NULL;

  UPDATE categories AS c
  LEFT JOIN users AS u ON u.id = c.user_id
  SET c.user_id = NULL
  WHERE c.user_id IS NOT NULL AND u.id IS NULL;

  UPDATE stock_transactions AS st
  INNER JOIN products AS p ON p.id = st.product_id
  SET st.user_id = p.user_id
  WHERE p.user_id IS NOT NULL
    AND (st.user_id IS NULL OR st.user_id <> p.user_id);

  UPDATE stock_transactions AS st
  LEFT JOIN users AS u ON u.id = st.user_id
  SET st.user_id = NULL
  WHERE st.user_id IS NOT NULL AND u.id IS NULL;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.key_column_usage
    WHERE table_schema = DATABASE()
      AND table_name = 'products'
      AND column_name = 'user_id'
      AND referenced_table_name = 'users'
      AND referenced_column_name = 'id'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT fk_products_user_id
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.key_column_usage
    WHERE table_schema = DATABASE()
      AND table_name = 'categories'
      AND column_name = 'user_id'
      AND referenced_table_name = 'users'
      AND referenced_column_name = 'id'
  ) THEN
    ALTER TABLE categories
      ADD CONSTRAINT fk_categories_user_id
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.key_column_usage
    WHERE table_schema = DATABASE()
      AND table_name = 'stock_transactions'
      AND column_name = 'user_id'
      AND referenced_table_name = 'users'
      AND referenced_column_name = 'id'
  ) THEN
    ALTER TABLE stock_transactions
      ADD CONSTRAINT fk_stock_transactions_user_id
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END$$

DELIMITER ;

CALL sp_migrate_user_data_isolation();
DROP PROCEDURE sp_migrate_user_data_isolation;

DROP PROCEDURE IF EXISTS sp_get_all_products;
DROP PROCEDURE IF EXISTS sp_get_product_by_id;
DROP PROCEDURE IF EXISTS sp_get_low_stock_products;
DROP PROCEDURE IF EXISTS sp_record_stock;

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

CREATE PROCEDURE sp_record_stock(
  IN p_product_id INT,
  IN p_type VARCHAR(3),
  IN p_quantity INT,
  IN p_note TEXT,
  IN p_user_id INT
)
BEGIN
  DECLARE v_transaction_id BIGINT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Quantity must be greater than zero';
  END IF;

  IF p_type IS NULL OR p_type NOT IN ('IN', 'OUT') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Stock type must be IN or OUT';
  END IF;

  START TRANSACTION;

  UPDATE products
  SET quantity = CASE
    WHEN p_type = 'IN' THEN quantity + p_quantity
    ELSE quantity - p_quantity
  END
  WHERE id = p_product_id
    AND user_id = p_user_id
    AND (p_type = 'IN' OR quantity >= p_quantity);

  IF ROW_COUNT() <> 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Product not found or insufficient stock';
  END IF;

  INSERT INTO stock_transactions
    (product_id, type, quantity, note, user_id)
  VALUES
    (p_product_id, p_type, p_quantity, p_note, p_user_id);

  SET v_transaction_id = LAST_INSERT_ID();
  COMMIT;

  SELECT id, product_id, type, quantity, note, created_at
  FROM stock_transactions
  WHERE id = v_transaction_id AND user_id = p_user_id;
END$$

DELIMITER ;
