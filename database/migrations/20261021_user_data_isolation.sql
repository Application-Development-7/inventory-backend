USE inventory_db;

-- Back up the database first. Existing inventory is assigned to the first admin.
DROP PROCEDURE IF EXISTS assert_admin_for_tenancy_migration;
DELIMITER //
CREATE PROCEDURE assert_admin_for_tenancy_migration()
BEGIN
  DECLARE v_admin_id INT;
  SET v_admin_id = (
    SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1
  );
  IF v_admin_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Create an admin user before migrating inventory ownership';
  END IF;
  SET @legacy_admin_id = v_admin_id;
END//
DELIMITER ;

CALL assert_admin_for_tenancy_migration();
DROP PROCEDURE assert_admin_for_tenancy_migration;

ALTER TABLE categories
  ADD COLUMN user_id INT NULL AFTER id,
  DROP INDEX `name`,
  ADD UNIQUE KEY uq_categories_user_name (user_id, name),
  ADD CONSTRAINT fk_categories_user
    FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE products
  ADD COLUMN user_id INT NULL AFTER id,
  DROP INDEX sku,
  ADD UNIQUE KEY uq_products_user_sku (user_id, sku),
  ADD KEY ix_products_user_id (user_id),
  ADD CONSTRAINT fk_products_user
    FOREIGN KEY (user_id) REFERENCES users(id);

UPDATE categories SET user_id = @legacy_admin_id WHERE user_id IS NULL;
UPDATE products SET user_id = @legacy_admin_id WHERE user_id IS NULL;

INSERT INTO categories (user_id, name, description)
SELECT u.id, c.name, c.description
FROM users u
JOIN categories c ON c.user_id = @legacy_admin_id
WHERE u.id <> @legacy_admin_id;

ALTER TABLE categories
  MODIFY COLUMN user_id INT NOT NULL;

ALTER TABLE products
  MODIFY COLUMN user_id INT NOT NULL;

-- Add starter categories where they do not already exist.
INSERT INTO categories (user_id, name, description)
SELECT u.id, starter.name, 'Default inventory category'
FROM users u
CROSS JOIN (
  SELECT 'Beverages' AS name
  UNION ALL SELECT 'Snacks'
  UNION ALL SELECT 'Household'
) AS starter
LEFT JOIN categories c
  ON c.user_id = u.id AND c.name = starter.name
WHERE c.id IS NULL;

-- Add sample products for every account without replacing existing products.
INSERT INTO products
  (user_id, name, category_id, sku, price, quantity, min_stock)
SELECT u.id, starter.name, c.id, starter.sku, starter.price,
       starter.quantity, starter.min_stock
FROM users u
CROSS JOIN (
  SELECT 'Bottled Water (500ml)' AS name, 'STARTER-WATER-500' AS sku,
         'Beverages' AS category_name, 1.00 AS price, 24 AS quantity,
         5 AS min_stock
  UNION ALL
  SELECT 'Ground Coffee (250g)', 'STARTER-COFFEE-250',
         'Beverages', 8.50, 12, 3
  UNION ALL
  SELECT 'Rice Crackers', 'STARTER-RICE-CRACKERS',
         'Snacks', 2.75, 18, 4
  UNION ALL
  SELECT 'Dish Soap (500ml)', 'STARTER-DISH-SOAP-500',
         'Household', 3.25, 10, 3
) AS starter
JOIN categories c
  ON c.user_id = u.id AND c.name = starter.category_name
LEFT JOIN products existing
  ON existing.user_id = u.id AND existing.sku = starter.sku
WHERE existing.id IS NULL;
