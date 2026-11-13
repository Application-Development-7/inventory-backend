DROP PROCEDURE IF EXISTS sp_get_user_by_id;
DROP PROCEDURE IF EXISTS sp_update_user_profile;
DROP PROCEDURE IF EXISTS sp_update_user_password;

DELIMITER $$

CREATE PROCEDURE sp_get_user_by_id(IN p_user_id INT)
BEGIN
  SELECT id, username, display_name, password_hash, role
  FROM users
  WHERE id = p_user_id
  LIMIT 1;
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

DELIMITER ;
