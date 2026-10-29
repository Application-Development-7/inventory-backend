const Forecast = require('../models/forecastModel');
const Product = require('../models/productModel');
const {
  analyzeSeries,
  analyzeYearlySeries,
  generateRecommendations,
} = require('../services/forecastingService');

function numericValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeForecastNumbers(analysis) {
  return {
    ...analysis,
    ...(analysis.data_points !== undefined
      ? { data_points: numericValue(analysis.data_points) }
      : {}),
    ...(analysis.confidence !== undefined
      ? { confidence: numericValue(analysis.confidence) }
      : {}),
    ...(analysis.trend
      ? {
          trend: {
            ...analysis.trend,
            slope: numericValue(analysis.trend.slope),
            r2: numericValue(analysis.trend.r2),
          },
        }
      : {}),
    ...(analysis.peak_month
      ? {
          peak_month: {
            ...analysis.peak_month,
            month: numericValue(analysis.peak_month.month),
            index: numericValue(analysis.peak_month.index),
          },
        }
      : {}),
    ...(analysis.seasonal_index
      ? {
          seasonal_index: Object.fromEntries(
            Object.entries(analysis.seasonal_index).map(([month, index]) => [
              month,
              numericValue(index),
            ])
          ),
        }
      : {}),
    ...(analysis.forecast
      ? {
          forecast: {
            ...analysis.forecast,
            ...(analysis.forecast.year !== undefined
              ? { year: numericValue(analysis.forecast.year) }
              : {}),
            ...(analysis.forecast.month !== undefined
              ? { month: numericValue(analysis.forecast.month) }
              : {}),
            predicted_demand: numericValue(
              analysis.forecast.predicted_demand
            ),
            ...(analysis.forecast.seasonal_multiplier !== undefined
              ? {
                  seasonal_multiplier: numericValue(
                    analysis.forecast.seasonal_multiplier
                  ),
                }
              : {}),
          },
        }
      : {}),
    history: (analysis.history || []).map(point => ({
      ...point,
      year: numericValue(point.year),
      ...(point.month !== undefined
        ? { month: numericValue(point.month) }
        : {}),
      demand: numericValue(point.demand),
    })),
    projections: (analysis.projections || []).map(point => ({
      ...point,
      year: numericValue(point.year),
      ...(point.month !== undefined
        ? { month: numericValue(point.month) }
        : {}),
      predicted_demand: numericValue(point.predicted_demand),
      confidence: numericValue(point.confidence),
      ...(point.seasonal_multiplier !== undefined
        ? { seasonal_multiplier: numericValue(point.seasonal_multiplier) }
        : {}),
    })),
  };
}

function getView(req, res) {
  const rawView = req.query.view;
  const view = typeof rawView === 'string' ? rawView.toLowerCase() : 'monthly';
  if (!['monthly', 'yearly'].includes(view)) {
    res.status(400).json({ message: "view must be either 'monthly' or 'yearly'" });
    return null;
  }
  return view;
}

exports.getProductForecast = async (req, res) => {
  try {
    const view = getView(req, res);
    if (!view) return;

    const product = await Product.getById(req.params.productId, req.user.id);
    if (!product) return res.status(404).json({ message: 'Not found' });

    const data =
      view === 'yearly'
        ? await Forecast.getYearlyDemand(req.params.productId, req.user.id)
        : await Forecast.getMonthlyDemand(
            req.params.productId,
            req.user.id,
            24
          );
    const analysis = normalizeForecastNumbers(
      view === 'yearly'
        ? analyzeYearlySeries(data)
        : { ...analyzeSeries(data), view }
    );
    res.json({
      product: { id: numericValue(product.id), name: product.name },
      ...analysis,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.getAllTrends = async (req, res) => {
  try {
    const view = getView(req, res);
    if (!view) return;

    const products = await Product.getAll(req.user.id);
    const allData =
      view === 'yearly'
        ? await Forecast.getAllYearlyDemand(req.user.id)
        : await Forecast.getAllMonthlyDemand(req.user.id, 24);

    const grouped = {};
    allData.forEach(row => {
      (grouped[row.product_id] = grouped[row.product_id] || []).push(row);
    });

    const trends = products.map(p => {
      const analysis = normalizeForecastNumbers(
        view === 'yearly'
          ? analyzeYearlySeries(grouped[p.id] || [])
          : { ...analyzeSeries(grouped[p.id] || []), view }
      );
      return {
        product_id: numericValue(p.id),
        product_name: p.name,
        quantity: numericValue(p.quantity),
        min_stock: numericValue(p.min_stock),
        ...analysis,
      };
    });

    res.json({
      trends,
      recommendations: generateRecommendations(trends),
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};