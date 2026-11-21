require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const routes = require('./routes');
const { BASE } = require('./client');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (req, res) => {
  res.json({ ok: true, upstream: BASE, ts: Date.now() });
});

app.use('/api', routes);

// Root mirrors API overview
app.get('/', (req, res) => {
  res.redirect('/api');
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: err.message || 'Internal error',
    status,
  });
});

app.listen(PORT, () => {
  console.log(`ani.pm Scraper API  →  http://localhost:${PORT}`);
  console.log(`Stream example      →  GET /api/stream/1642/1?lang=sub`);
});
