const test = require('node:test');
const assert = require('node:assert/strict');

const pool = require('../src/config/db');
const Dashboard = require('../src/models/dashboardModel');

test('dashboard summary calculates inventory value from price times quantity', async () => {
  const originalQuery = pool.query;
  const queries = [];
  pool.query = async (sql, params) => {
    queries.push({ sql, params });
    if (sql.includes('inventory_value')) {
      return [
        [
          {
            total_products: 2,
            total_stock: 15,
            low_stock_count: 1,
            inventory_value: '1240.50',
          },
        ],
      ];
    }
    return [[]];
  };

  try {
    const result = await Dashboard.summary(42);

    const statsQuery = queries.find(({ sql }) => sql.includes('inventory_value'));
    assert.ok(statsQuery);
    assert.match(statsQuery.sql, /SUM\(price \* quantity\)/);
    assert.deepEqual(statsQuery.params, [42]);
    assert.equal(result.stats.inventory_value, '1240.50');
  } finally {
    pool.query = originalQuery;
  }
});
