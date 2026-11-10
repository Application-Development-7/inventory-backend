const bcrypt = require('bcryptjs');
const User = require('../models/userModel');

exports.updateProfile = async (req, res) => {
  const { username, displayName, currentPassword } = req.body;
  if (
    typeof username !== 'string' ||
    !username.trim() ||
    username.trim().length > 50
  ) {
    return res.status(400).json({ message: 'Username must be 1 to 50 characters' });
  }
  if (
    typeof displayName !== 'string' ||
    displayName.trim().length > 100
  ) {
    return res.status(400).json({ message: 'Display name must be 100 characters or fewer' });
  }

  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (username.trim() !== currentUser.username) {
      if (typeof currentPassword !== 'string' || !currentPassword) {
        return res
          .status(400)
          .json({ message: 'Password required to change username' });
      }
      if (!(await bcrypt.compare(currentPassword, currentUser.password_hash))) {
        return res.status(400).json({ message: 'Incorrect password' });
      }
    }

    const user = await User.updateProfile(
      req.user.id,
      username.trim(),
      displayName.trim(),
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({
      message: 'Profile updated successfully',
      username: user.username,
      display_name: user.display_name,
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Username is already taken' });
    }
    return res.status(500).json({ message: error.message });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      currency: user.currency,
      low_stock_threshold: user.low_stock_threshold,
      notify_low_stock:
        user.notify_low_stock === true || Number(user.notify_low_stock) === 1,
      notify_weekly_summary:
        user.notify_weekly_summary === true ||
        Number(user.notify_weekly_summary) === 1,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.updatePreferences = async (req, res) => {
  const { currency, lowStockThreshold, notifyLowStock, notifyWeeklySummary } =
    req.body;
  if (!['₱', '$', '€'].includes(currency)) {
    return res.status(400).json({ message: 'Unsupported currency' });
  }
  if (
    !Number.isInteger(lowStockThreshold) ||
    lowStockThreshold < 0 ||
    lowStockThreshold > 2147483647
  ) {
    return res.status(400).json({
      message: 'Low stock threshold must be a non-negative integer',
    });
  }
  if (
    typeof notifyLowStock !== 'boolean' ||
    typeof notifyWeeklySummary !== 'boolean'
  ) {
    return res.status(400).json({ message: 'Notification settings must be boolean' });
  }

  try {
    const user = await User.updatePreferences(
      req.user.id,
      currency,
      lowStockThreshold,
      notifyLowStock,
      notifyWeeklySummary,
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({
      message: 'Preferences updated successfully',
      currency: user.currency,
      low_stock_threshold: user.low_stock_threshold,
      notify_low_stock:
        user.notify_low_stock === true || Number(user.notify_low_stock) === 1,
      notify_weekly_summary:
        user.notify_weekly_summary === true ||
        Number(user.notify_weekly_summary) === 1,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const deleted = await User.deleteAccount(req.user.id);
    if (!deleted) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (
    typeof currentPassword !== 'string' ||
    !currentPassword ||
    typeof newPassword !== 'string' ||
    newPassword.length < 8
  ) {
    return res.status(400).json({
      message: 'Current password is required and new password must be at least 8 characters',
    });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await User.updatePassword(req.user.id, newPasswordHash);
    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
