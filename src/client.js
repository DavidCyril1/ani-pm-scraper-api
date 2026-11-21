/**
 * HTTP client for ani.pm upstream APIs
 */
const axios = require('axios');

const BASE = process.env.ANIPM_BASE || 'https://ani.pm';

const DEFAULT_HEADERS = {
  'User-Agent':
    process.env.ANIPM_UA ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://ani.pm/',
  Origin: 'https://ani.pm',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
};

const client = axios.create({
  baseURL: BASE,
  timeout: Number(process.env.ANIPM_TIMEOUT_MS) || 30000,
  headers: DEFAULT_HEADERS,
  validateStatus: (s) => s < 500,
});

async function aniGet(path, params = {}) {
  try {
    const res = await client.get(path, { params });
    if (
      res.status === 403 ||
      (typeof res.data === 'string' && res.data.includes('Just a moment'))
    ) {
      const err = new Error(
        'Cloudflare challenge or blocked. Retry later or rotate headers/IP.'
      );
      err.status = 403;
      throw err;
    }
    if (res.status >= 400) {
      const err = new Error(res.data?.error || `Upstream ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.data;
  } catch (e) {
    if (e.status) throw e;
    const err = new Error(e.message || 'Upstream request failed');
    err.status = e.response?.status || 502;
    throw err;
  }
}

module.exports = { aniGet, BASE, client };
