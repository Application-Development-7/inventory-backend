USE inventory_db;

DROP PROCEDURE IF EXISTS sp_get_top_products_by_month;
DELIMITER //
CREATE PROCEDURE sp_get_top_products_by_month(
  IN p_user_id INT,
  IN p_month INT
)
BEGIN
  SELECT p.id AS product_id, p.name AS product_name,
         CAST(SUM(st.quantity) AS UNSIGNED) AS total_sold
  FROM stock_transactions st
  JOIN products p ON st.product_id = p.id
  WHERE p.user_id = p_user_id
    AND st.user_id = p_user_id
    AND st.type = 'OUT'
    AND MONTH(st.created_at) = p_month
  GROUP BY p.id, p.name
  ORDER BY total_sold DESC, p.name ASC
  LIMIT 5;
END//
DELIMITER ;
