const test = require('node:test');
const assert = require('node:assert/strict');

const {
  analyzeYearlySeries,
  generateRecommendations,
} = require('../src/services/forecastingService');

test('yearly analysis returns recent history and three annual projections', () => {
  const currentYear = new Date().getFullYear();
  const result = analyzeYearlySeries([
    { yr: currentYear - 2, total_out: 100 },
    { yr: currentYear - 1, total_out: 150 },
    { yr: currentYear, total_out: 200 },
  ]);

  assert.equal(result.status, 'OK');
  assert.equal(result.view, 'yearly');
  assert.equal(result.history.length, 5);
  assert.equal(result.history.at(-1).year, currentYear);
  assert.equal(result.history.at(-1).demand, 200);
  assert.deepEqual(
    result.projections.map(point => point.year),
    [currentYear + 1, currentYear + 2, currentYear + 3]
  );
  assert.ok(result.projections[0].predicted_demand > 200);
});

test('yearly analysis reports insufficient history with fewer than three years', () => {
  const currentYear = new Date().getFullYear();
  const result = analyzeYearlySeries([
    { yr: currentYear - 1, total_out: 50 },
    { yr: currentYear, total_out: 70 },
  ]);

  assert.equal(result.status, 'INSUFFICIENT_DATA');
  assert.equal(result.data_points, 2);
  assert.match(result.message, /3 years/);
});

test('recommendations cover urgency, growth, seasonal opportunity, and optimization', () => {
  const recommendations = generateRecommendations(
    [
      {
        product_name: 'Sparkling Apple Cider',
        label: 'RISING',
        quantity: '2',
        min_stock: '10',
        confidence: 75,
        history: [{ demand: 100 }],
        projections: [{ predicted_demand: 115 }],
      },
      {
        product_name: 'Mango Juice',
        label: 'SEASONAL_PEAK',
        quantity: 30,
        min_stock: 10,
        confidence: 85,
        history: [{ demand: 100 }],
        projections: [{ predicted_demand: 140 }],
      },
      {
        product_name: 'Herbal Tea',
        label: 'FALLING',
        quantity: 40,
        min_stock: 10,
        confidence: 70,
        history: [{ demand: 100 }],
        projections: [{ predicted_demand: 80 }],
      },
    ],
    { limit: 10 }
  );

  assert.deepEqual(
    recommendations.map(item => item.type),
    ['URGENT', 'HIGH_PRIORITY', 'HIGH_PRIORITY', 'OPPORTUNITY', 'OPTIMIZE']
  );
  assert.equal(
    recommendations[0].title,
    'URGENT: Sparkling Apple Cider is low on stock and demand is rising'
  );
  assert.equal(recommendations[1].title, 'Stock up on Sparkling Apple Cider');
  assert.equal(
    recommendations[1].description,
    'Demand is projected to rise 15% next month.'
  );
  assert.equal(recommendations[3].title, 'Reorder Mango Juice early');
  assert.equal(recommendations[4].title, 'Reduce Herbal Tea order');
});

test('high confidence alone produces an opportunity recommendation', () => {
  const recommendations = generateRecommendations([
    {
      product_name: 'Coffee',
      label: 'STABLE',
      confidence: '90',
    },
  ]);

  assert.deepEqual(recommendations, [
    {
      type: 'OPPORTUNITY',
      title: 'Reorder Coffee early',
      description: 'Lead time may increase.',
    },
  ]);
});

test('yearly growth recommendations describe the next year', () => {
  const recommendations = generateRecommendations([
    {
      product_name: 'Coffee',
      view: 'yearly',
      label: 'RISING',
      history: [{ demand: 100 }],
      projections: [{ predicted_demand: 120 }],
    },
  ]);

  assert.equal(
    recommendations[0].description,
    'Demand is projected to rise 20% next year.'
  );
});

test('recommendations are prioritized and limited to three', () => {
  const recommendations = generateRecommendations(
    [
      {
        product_name: 'Falling item',
        label: 'FALLING',
      },
      {
        product_name: 'Rising item',
        label: 'RISING',
        quantity: 20,
        min_stock: 5,
      },
      {
        product_name: 'Urgent item',
        label: 'RISING',
        quantity: 1,
        min_stock: 5,
      },
    ],
    { limit: 3 }
  );

  assert.deepEqual(
    recommendations.map(item => item.type),
    ['URGENT', 'HIGH_PRIORITY', 'HIGH_PRIORITY']
  );
});
