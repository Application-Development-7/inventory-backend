const test = require('node:test');
const assert = require('node:assert/strict');

const Forecast = require('../src/models/forecastModel');
const Product = require('../src/models/productModel');
const { getAllTrends } = require('../src/controllers/forecastController');

test('all trends response includes stock levels and actionable recommendations', async () => {
  const originalGetAll = Product.getAll;
  const originalGetAllMonthlyDemand = Forecast.getAllMonthlyDemand;
  const originalGetAllYearlyDemand = Forecast.getAllYearlyDemand;

  Product.getAll = async userId => {
    assert.equal(userId, 42);
    return [
      {
        id: 7,
        name: 'Sparkling Apple Cider',
        quantity: '2',
        min_stock: '10',
      },
    ];
  };
  Forecast.getAllMonthlyDemand = async userId => {
    assert.equal(userId, 42);
    const now = new Date();
    return [3, 2, 1].map((monthsAgo, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo);
      return {
        product_id: 7,
        yr: monthDate.getFullYear(),
        mo: monthDate.getMonth() + 1,
        total_out: (index + 1) * 100,
      };
    });
  };
  Forecast.getAllYearlyDemand = async () => [];

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
    await getAllTrends(
      { query: { view: 'monthly' }, user: { id: 42 } },
      response
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.trends[0].quantity, 2);
    assert.equal(response.body.trends[0].min_stock, 10);
    assert.equal(response.body.trends[0].label, 'RISING');
    assert.deepEqual(response.body.recommendations[0], {
      type: 'URGENT',
      title: 'URGENT: Sparkling Apple Cider is low on stock and demand is rising',
      description: 'Reorder immediately!',
    });
  } finally {
    Product.getAll = originalGetAll;
    Forecast.getAllMonthlyDemand = originalGetAllMonthlyDemand;
    Forecast.getAllYearlyDemand = originalGetAllYearlyDemand;
  }
});
