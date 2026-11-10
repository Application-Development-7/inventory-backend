const Inventory = require('../models/inventoryModel');

exports.clear = async (req, res) => {
  try {
    const deletedProducts = await Inventory.clearForUser(req.user.id);
    return res.json({
      message: 'Inventory cleared successfully',
      deletedProducts,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
