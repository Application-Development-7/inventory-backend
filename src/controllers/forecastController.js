const Forecast = require('../models/forecastModel');
const Product = require('../models/productModel');
const { analyzeSeries } = require('../services/forecastingService');

exports.getProductForecast = async (req, res) => {
  try {
    const product = await Product.getById(req.params.productId);
    if (!product) return res.status(404).json({ message: 'Not found' });

    const data = await Forecast.getMonthlyDemand(req.params.productId, 24);
    const analysis = analyzeSeries(data);
    res.json({ product: { id: product.id, name: product.name }, ...analysis });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.getAllTrends = async (req, res) => {
  try {
    const products = await Product.getAll();
    const allData = await Forecast.getAllMonthlyDemand(24);

    const grouped = {};
    allData.forEach(row => {
      (grouped[row.product_id] = grouped[row.product_id] || []).push(row);
    });

    const trends = products.map(p => {
      const analysis = analyzeSeries(grouped[p.id] || []);
      return { product_id: p.id, product_name: p.name, ...analysis };
    });

    res.json(trends);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};