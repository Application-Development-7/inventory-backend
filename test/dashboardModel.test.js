const test = require('node:test');
const assert = require('node:assert/strict');

const pool = require('../src/config/db');
const Dashboard = require('../src/models/dashboardModel');

test('dashboard summary maps the stored procedure result sets', async () => {
  const originalQuery = pool.query;
  let call;
  pool.query = async (sql, params) => {
    call = { sql, params };
    return [[
      [{
        total_products: 2,
        total_stock: 15,
        low_stock_count: 1,
        inventory_value: '1240.50',
      }],
      [{ id: 8, name: 'Low stock item' }],
      [{ id: 3, product_name: 'Recent item' }],
    ], []];
  };

  try {
    const result = await Dashboard.summary(42);

    assert.equal(call.sql, 'CALL sp_get_dashboard_summary(?)');
    assert.deepEqual(call.params, [42]);
    assert.equal(result.stats.inventory_value, '1240.50');
    assert.deepEqual(result.low_stock_products, [{ id: 8, name: 'Low stock item' }]);
    assert.deepEqual(result.recent_transactions, [{ id: 3, product_name: 'Recent item' }]);
  } finally {
    pool.query = originalQuery;
  }
});

test('dashboard transactions pass a paired pagination cursor to the procedure', async () => {
  const originalQuery = pool.query;
  let call;
  pool.query = async (sql, params) => {
    call = { sql, params };
    return [[[]], []];
  };

  try {
    const result = await Dashboard.transactions(42, {
      beforeCreatedAt: '2026-11-19 10:30:00',
      beforeId: -7,
    });

    assert.equal(call.sql, 'CALL sp_get_dashboard_transactions(?, ?, ?)');
    assert.deepEqual(call.params, [42, '2026-11-19 10:30:00', -7]);
    assert.deepEqual(result, []);
  } finally {
    pool.query = originalQuery;
  }
});
