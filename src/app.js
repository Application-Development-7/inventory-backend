require('dotenv').config();
const express = require('express');
const cors = require('cors');
const auth = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', auth, require('./routes/productRoutes'));
app.use('/api/categories', auth, require('./routes/categoryRoutes'));
app.use('/api/stock', auth, require('./routes/stockRoutes'));
app.use('/api/dashboard', auth, require('./routes/dashboardRoutes'));
app.use('/api/forecast', auth, require('./routes/forecastRoutes'));
app.use('/api/analytics', auth, require('./routes/analyticsRoutes'));

app.get('/', (_, res) => res.send('Inventory API running (MVC + SP + Forecasting)'));

const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));