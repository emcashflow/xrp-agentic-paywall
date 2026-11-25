import express from 'express';
import { requirePayment } from 'x402-xrpl/express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
dotenv.config();

const app = express();
app.use(express.json());
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRICE_DROPS = process.env.PRICE_DROPS || '1000';
const PRICE_PREMIUM_DROPS = process.env.PRICE_PREMIUM_DROPS || '5000';
const PRICE_CRYPTO_DROPS = process.env.PRICE_CRYPTO_DROPS || '2000';
const PAY_TO_ADDRESS = process.env.PAY_TO_ADDRESS || 'rHsrj8Ez8oLcWdt8jSuAuqVNJtg1YKB6YC';
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'https://xrpl-x402.t54.ai';
const ADMIN_KEY = process.env.ADMIN_KEY || 'change-me';

const LOG_FILE = path.join(__dirname, 'payments.log.json');
if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, '[]');

function logEvent(type, data) {
  const log = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
  log.push({ type, ts: new Date().toISOString(), ...data });
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

app.get('/', (req,res) => res.sendFile(path.join(__dirname, 'agent_landing.html')));
app.get('/pricing', (req,res) => res.sendFile(path.join(__dirname, 'pricing.html')));
app.get('/api/ping', (req,res) => res.json({ status: 'ok', service: 'AgentPay API', time: new Date().toISOString() }));
app.get('/admin/payments', (req,res) => {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(401).send('Unauthorized');
  res.json(JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')));
});

app.get('/api/price', requirePayment({
  price: PRICE_CRYPTO_DROPS,
  payToAddress: PAY_TO_ADDRESS,
  network: 'xrpl:1',
  asset: 'XRP',
  facilitatorUrl: FACILITATOR_URL,
  resource: 'api:price',
  description: 'Live crypto price - 2000 drops'
}), async (req,res) => {
  const symbol = (req.query.symbol || 'bitcoin').toLowerCase();
  try {
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${symbol}&vs_currencies=usd`);
    const data = await r.json();
    logEvent('payment_success', { route: '/api/price', symbol, amount: PRICE_CRYPTO_DROPS });
    res.json({ symbol, price_usd: data[symbol]?.usd, source: 'coingecko', paid: true });
  } catch { res.status(500).json({ error: 'price fetch failed' }); }
});

app.get('/api/weather', requirePayment({
  price: PRICE_DROPS,
  payToAddress: PAY_TO_ADDRESS,
  network: 'xrpl:1',
  asset: 'XRP',
  facilitatorUrl: FACILITATOR_URL,
  resource: 'api:weather',
  description: 'Live weather - 1000 drops'
}), async (req,res) => {
  const city = req.query.city || 'london';
  try {
    const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}`);
    const geoData = await geo.json();
    const { latitude, longitude } = geoData.results[0];
    const weather = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
    const w = await weather.json();
    logEvent('payment_success', { route: '/api/weather', city, amount: PRICE_DROPS });
    res.json({ city, weather: w.current_weather, paid: true });
  } catch { res.status(500).json({ error: 'weather fetch failed' }); }
});

app.get('/api/news', requirePayment({
  price: PRICE_PREMIUM_DROPS,
  payToAddress: PAY_TO_ADDRESS,
  network: 'xrpl:1',
  asset: 'XRP',
  facilitatorUrl: FACILITATOR_URL,
  resource: 'api:news',
  description: 'Top news headlines - 5000 drops'
}), async (req,res) => {
  try {
    const r = await fetch('https://api.allorigins.win/raw?url=https://newsapi.org/v2/top-headlines?country=us&apiKey=demo');
    logEvent('payment_success', { route: '/api/news', amount: PRICE_PREMIUM_DROPS });
    res.json({ headlines: ['Headline 1','Headline 2','Headline 3'], paid: true, note: 'Demo headlines - replace with real API key' });
  } catch { res.status(500).json({ error: 'news fetch failed' }); }
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`Running on port ${port}`));
