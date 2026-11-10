const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findByUsername(username);
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ message: 'Invalid credentials' });

    const profile = await User.findById(user.id);
    if (!profile) {
      return res.status(404).json({ message: 'User not found' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        display_name: profile.display_name,
        role: user.role,
        currency: profile.currency,
        low_stock_threshold: profile.low_stock_threshold,
        notify_low_stock:
          profile.notify_low_stock === true ||
          Number(profile.notify_low_stock) === 1,
        notify_weekly_summary:
          profile.notify_weekly_summary === true ||
          Number(profile.notify_weekly_summary) === 1,
      },
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const result = await User.create(username, hash, 'staff');
    res.status(201).json(result);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};