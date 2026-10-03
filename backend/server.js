require('dotenv').config();
const cors = require('cors');
const cookieParser = require('cookie-parser');
const express = require('express');
const mongoose = require('mongoose');
const adminRoutes = require('./routes/admin');

const requiredEnvironment = ['MONGODB_URI', 'ADMIN_USERNAME', 'ADMIN_PASSWORD', 'JWT_SECRET'];
const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]);
if (missingEnvironment.length) {
  throw new Error(`Missing required environment variables: ${missingEnvironment.join(', ')}`);
}

const app = express();
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim());

app.disable('x-powered-by');
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '16kb' }));
app.use(cookieParser());
app.use('/api/admin', adminRoutes);

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  return res.status(500).json({ message: 'حدث خطأ غير متوقع، يرجى المحاولة لاحقاً' });
});

const port = Number(process.env.PORT) || 5000;
mongoose.connect(process.env.MONGODB_URI, { dbName: 'asly_db' })
  .then(() => {
    app.listen(port, () => console.log(`Asly admin API listening on port ${port}`));
  })
  .catch(() => {
    console.error('Unable to connect to MongoDB. Check MONGODB_URI and database availability.');
    process.exit(1);
  });