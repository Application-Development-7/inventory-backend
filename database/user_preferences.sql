ALTER TABLE users
  ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT '₱',
  ADD COLUMN low_stock_threshold INT NOT NULL DEFAULT 5,
  ADD COLUMN notify_low_stock BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN notify_weekly_summary BOOLEAN NOT NULL DEFAULT TRUE;

DROP PROCEDURE IF EXISTS sp_get_user_by_id;
DROP PROCEDURE IF EXISTS sp_update_user_preferences;

DELIMITER $$

CREATE PROCEDURE sp_get_user_by_id(IN p_user_id INT)
BEGIN
  SELECT
    id,
    username,
    display_name,
    password_hash,
    role,
    currency,
    low_stock_threshold,
    notify_low_stock,
    notify_weekly_summary
  FROM users
  WHERE id = p_user_id
  LIMIT 1;
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

DELIMITER ;
