const pool = require('../config/db');

exports.record = async ({
  product_id,
  type,
  quantity,
  note,
  user_id,
}) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [products] = await connection.query(
      'SELECT quantity FROM products WHERE id = ? AND user_id = ? FOR UPDATE',
      [product_id, user_id]
    );
    if (products.length === 0) {
      await connection.rollback();
      return null;
    }

    const currentQuantity = products[0].quantity;
    if (type === 'OUT' && currentQuantity < quantity) {
      throw new Error('Insufficient stock');
    }
    const newQuantity =
      type === 'IN' ? currentQuantity + quantity : currentQuantity - quantity;

    await connection.query(
      'UPDATE products SET quantity = ? WHERE id = ? AND user_id = ?',
      [newQuantity, product_id, user_id]
    );
    await connection.query(
      `INSERT INTO stock_transactions
         (product_id, type, quantity, note, user_id)
       VALUES (?, ?, ?, ?, ?)`,
      [product_id, type, quantity, note || null, user_id]
    );
    await connection.commit();
    return { new_quantity: newQuantity };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

exports.history = async (productId, userId) => {
  const [rows] = await pool.query(
    `SELECT st.*, u.username
     FROM stock_transactions st
     JOIN products p ON st.product_id = p.id
     LEFT JOIN users u ON st.user_id = u.id
     WHERE st.product_id = ? AND p.user_id = ?
     ORDER BY st.created_at DESC`,
    [productId, userId]
  );
  return rows;
};
