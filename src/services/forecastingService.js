// Pure forecasting math. NO database access here.
const HIGH_CONFIDENCE_THRESHOLD = 80;

function computeLinearTrend(points) {
  const n = points.length;
  if (n < 2) return { slope: 0, r2: 0, direction: 'FLAT' };

  const xs = points.map((_, i) => i);
  const ys = points.map(p => Number(p.total_out));
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (ys[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;

  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    const pred = yMean + slope * (xs[i] - xMean);
    ssTot += (ys[i] - yMean) ** 2;
    ssRes += (ys[i] - pred) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  const direction = slope > 0.5 ? 'UP' : slope < -0.5 ? 'DOWN' : 'FLAT';
  return { slope, r2, direction };
}

function monthKey(year, month) {
  return year * 12 + month - 1;
}

function monthFromKey(key) {
  const year = Math.floor(key / 12);
  return { year, month: key - year * 12 + 1 };
}

function analyzeSeries(monthlyData) {
  const sorted = [...monthlyData].sort(
    (a, b) => (a.yr * 12 + a.mo) - (b.yr * 12 + b.mo)
  );

  if (sorted.length < 3) {
    return {
      status: 'INSUFFICIENT_DATA',
      message: 'Need at least 3 months of stock-out history',
      data_points: sorted.length,
    };
  }

  const overallAvg =
    sorted.reduce((s, d) => s + Number(d.total_out), 0) / sorted.length;

  const byMonth = {};
  sorted.forEach(d => {
    byMonth[d.mo] = byMonth[d.mo] || [];
    byMonth[d.mo].push(Number(d.total_out));
  });

  const seasonalIndex = {};
  for (let m = 1; m <= 12; m++) {
    if (byMonth[m] && byMonth[m].length > 0) {
      const avg = byMonth[m].reduce((a, b) => a + b, 0) / byMonth[m].length;
      seasonalIndex[m] = overallAvg > 0 ? +(avg / overallAvg).toFixed(2) : 1;
    } else {
      seasonalIndex[m] = 1;
    }
  }

  const recent = sorted.slice(-6);
  const trend = computeLinearTrend(recent);
  const recentAvg =
    recent.reduce((s, d) => s + Number(d.total_out), 0) / recent.length;

  const now = new Date();
  const nextMonth = ((now.getMonth() + 1) % 12) + 1;
  const nextYear = now.getFullYear() + (nextMonth === 1 ? 1 : 0);

  const upcoming = seasonalIndex[nextMonth];
  let label = 'STABLE';
  if (upcoming >= 1.3) label = 'SEASONAL_PEAK';
  else if (upcoming <= 0.7) label = 'SEASONAL_LOW';
  else if (trend.slope > 0.05 * overallAvg) label = 'RISING';
  else if (trend.slope < -0.05 * overallAvg) label = 'FALLING';

  const peakEntry = Object.entries(seasonalIndex).sort((a, b) => b[1] - a[1])[0];
  const peakMonth = { month: parseInt(peakEntry[0]), index: peakEntry[1] };

  const confidence = Math.min(100, Math.round((sorted.length / 24) * 100));
  const monthlyTotals = new Map(
    sorted.map(point => [
      monthKey(Number(point.yr), Number(point.mo)),
      Number(point.total_out),
    ])
  );
  const currentKey = monthKey(now.getFullYear(), now.getMonth() + 1);
  const history = Array.from({ length: 24 }, (_, index) => {
    const month = monthFromKey(currentKey - 23 + index);
    return {
      ...month,
      demand: monthlyTotals.get(monthKey(month.year, month.month)) || 0,
    };
  });
  const projections = [];
  for (let index = 0; index < 6; index++) {
    const month = monthFromKey(currentKey + index + 1);
    const seasonalMultiplier = seasonalIndex[month.month];
    const baseDemand = Math.max(
      0,
      recentAvg + trend.slope * (recent.length / 2 + index)
    );
    const predictedDemand = Math.max(
      0,
      Math.round(baseDemand * seasonalMultiplier)
    );
    const previousDemand =
      index === 0
        ? Number(history[history.length - 1].demand)
        : Number(projections[index - 1].predicted_demand);
    const direction =
      predictedDemand > previousDemand
        ? 'UP'
        : predictedDemand < previousDemand
        ? 'DOWN'
        : 'STABLE';
    projections.push({
      ...month,
      predicted_demand: predictedDemand,
      confidence,
      direction,
      seasonal_multiplier: seasonalMultiplier,
    });
  }

  return {
    status: 'OK',
    data_points: sorted.length,
    trend: {
      direction: trend.direction,
      slope: +trend.slope.toFixed(2),
      r2: +trend.r2.toFixed(2),
    },
    label,
    peak_month: peakMonth,
    seasonal_index: seasonalIndex,
    forecast: {
      month: nextMonth,
      year: nextYear,
      predicted_demand: projections[0].predicted_demand,
      seasonal_multiplier: upcoming,
    },
    confidence,
    history,
    projections,
  };
}

function analyzeYearlySeries(yearlyData) {
  const sorted = [...yearlyData]
    .map(point => ({
      yr: Number(point.yr),
      total_out: Number(point.total_out),
    }))
    .sort((a, b) => a.yr - b.yr);

  const now = new Date();
  const currentYear = now.getFullYear();
  const firstYear = currentYear - 4;
  const yearlyTotals = new Map(
    sorted.map(point => [point.yr, point.total_out])
  );
  const history = Array.from({ length: 5 }, (_, index) => {
    const year = firstYear + index;
    return { year, demand: yearlyTotals.get(year) || 0 };
  });
  const populatedYears = history.filter(point =>
    yearlyTotals.has(point.year)
  ).length;

  if (populatedYears < 3) {
    return {
      status: 'INSUFFICIENT_DATA',
      message: 'Need at least 3 years of stock-out history',
      data_points: populatedYears,
      view: 'yearly',
    };
  }

  const points = history.map(point => ({ total_out: point.demand }));
  const trend = computeLinearTrend(points);
  const overallAvg =
    history.reduce((total, point) => total + point.demand, 0) / history.length;
  const recentAvg = overallAvg;
  const confidence = Math.min(100, Math.round((populatedYears / 5) * 100));
  const label =
    trend.slope > 0.05 * overallAvg
      ? 'RISING'
      : trend.slope < -0.05 * overallAvg
        ? 'FALLING'
        : 'STABLE';

  const projections = [];
  for (let index = 0; index < 3; index++) {
    const predictedDemand = Math.max(
      0,
      Math.round(recentAvg + trend.slope * (history.length / 2 + index))
    );
    const previousDemand =
      index === 0
        ? history[history.length - 1].demand
        : projections[index - 1].predicted_demand;
    const direction =
      predictedDemand > previousDemand
        ? 'UP'
        : predictedDemand < previousDemand
          ? 'DOWN'
          : 'STABLE';
    projections.push({
      year: currentYear + index + 1,
      predicted_demand: predictedDemand,
      confidence,
      direction,
    });
  }

  return {
    status: 'OK',
    view: 'yearly',
    data_points: populatedYears,
    trend: {
      direction: trend.direction,
      slope: +trend.slope.toFixed(2),
      r2: +trend.r2.toFixed(2),
    },
    label,
    confidence,
    history,
    projections,
    forecast: {
      year: projections[0].year,
      predicted_demand: projections[0].predicted_demand,
    },
  };
}

function generateRecommendations(trends, { limit = 3 } = {}) {
  const recommendations = [];

  for (const trend of trends) {
    const name = trend.product_name || 'This product';
    const label = trend.label;
    const quantity = Number(trend.quantity);
    const minStock = Number(trend.min_stock);
    const confidence = Number(trend.confidence);
    const history = trend.history || [];
    const projections = trend.projections || [];
    const currentDemand = Number(history.at(-1)?.demand);
    const nextDemand = Number(projections[0]?.predicted_demand);
    const forecastPeriod = trend.view === 'yearly' ? 'next year' : 'next month';
    const demandIncrease =
      Number.isFinite(currentDemand) &&
      currentDemand > 0 &&
      Number.isFinite(nextDemand)
        ? Math.max(0, Math.round(((nextDemand - currentDemand) / currentDemand) * 100))
        : 0;

    if (
      label === 'RISING' &&
      Number.isFinite(quantity) &&
      Number.isFinite(minStock) &&
      quantity < minStock
    ) {
      recommendations.push({
        priority: 0,
        type: 'URGENT',
        title: `URGENT: ${name} is low on stock and demand is rising`,
        description: 'Reorder immediately!',
      });
    }

    if (label === 'RISING' || label === 'SEASONAL_PEAK') {
      recommendations.push({
        priority: 1,
        type: 'HIGH_PRIORITY',
        title: `Stock up on ${name}`,
        description: `Demand is projected to rise ${demandIncrease}% ${forecastPeriod}.`,
      });
    }

    if (
      label === 'SEASONAL_PEAK' ||
      (Number.isFinite(confidence) &&
        confidence >= HIGH_CONFIDENCE_THRESHOLD)
    ) {
      recommendations.push({
        priority: 2,
        type: 'OPPORTUNITY',
        title: `Reorder ${name} early`,
        description: 'Lead time may increase.',
      });
    }

    if (label === 'FALLING') {
      recommendations.push({
        priority: 3,
        type: 'OPTIMIZE',
        title: `Reduce ${name} order`,
        description: 'Demand is expected to drop.',
      });
    }
  }

  return recommendations
    .sort((a, b) => a.priority - b.priority)
    .slice(0, limit)
    .map(({ priority, ...recommendation }) => recommendation);
}

module.exports = {
  analyzeSeries,
  analyzeYearlySeries,
  generateRecommendations,
};