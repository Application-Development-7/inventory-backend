const Dash = require('../models/dashboardModel');

exports.summary = async (req, res) => {
  try { res.json(await Dash.summary(req.user.id)); }
  catch (e) { res.status(500).json({ message: e.message }); }
};