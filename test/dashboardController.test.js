const test = require('node:test');
const assert = require('node:assert/strict');

const Dashboard = require('../src/models/dashboardModel');
const { summary } = require('../src/controllers/dashboardController');

test('dashboard controller returns inventory value as a number', async () => {
  const originalSummary = Dashboard.summary;
  Dashboard.summary = async () => ({
    stats: {
      total_products: '2',
      total_stock: '15',
      low_stock_count: '1',
      inventory_value: '1240.50',
    },
    low_stock_products: [],
    recent_transactions: [],
  });

  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  try {
    await summary({ user: { id: 42 } }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.stats.inventory_value, 1240.5);
    assert.equal(typeof response.body.stats.inventory_value, 'number');
  } finally {
    Dashboard.summary = originalSummary;
  }
});
