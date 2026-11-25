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

function stripHtml(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '')
             .replace(/<style[\s\S]*?<\/style>/gi, '')
             .replace(/<[^>]+>/g, ' ')
             .replace(/\s+/g, ' ')
             .trim();
}
function firstNSentences(text, n=2) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  return sentences.slice(0,n).join(' ').trim();
}
function extractKeywords(text, top=10) {
  const stop = new Set(['the','and','for','with','that','this','from','are','you','your','has','have','was','were','which','their','they','will','can','not','about','into','more','when','what','there','been','also','any','all','its','our','your','these','those']);
  const words = (text.toLowerCase().match(/\b[a-z]{3,}\b/g) || []).filter(w=>!stop.has(w));
  const freq = {};
  for (const w of words) freq[w] = (freq[w]||0)+1;
  return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,top).map(([w])=>w);
}

app.get('/', (req,res) => res.sendFile(path.join(__dirname, 'agent_landing.html')));
app.get('/pricing', (req,res) => res.sendFile(path.join(__dirname, 'pricing.html')));
app.get('/api/ping', (req,res) => res.json({ status: 'ok', service: 'AgentPay API', time: new Date().toISOString() }));
app.get('/admin/payments', (req,res) => {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(401).send('Unauthorized');
  res.json(JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')));
});

app.get('/api/data', requirePayment({
  price: PRICE_DROPS,
  payToAddress: PAY_TO_ADDRESS,
  network: 'xrpl:1',
  asset: 'XRP',
  facilitatorUrl: FACILITATOR_URL,
  resource: 'api:data',
  description: 'Agent data pack - 1000 drops'
}), (req,res) => {
  logEvent('payment_success', { route: '/api/data', amount: PRICE_DROPS });
  res.json({ data: { timestamp: new Date().toISOString(), value: 'Agent Data Pack' }, paid: true });
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

app.get('/api/summary', requirePayment({
  price: PRICE_PREMIUM_DROPS,
  payToAddress: PAY_TO_ADDRESS,
  network: 'xrpl:1',
  asset: 'XRP',
  facilitatorUrl: FACILITATOR_URL,
  resource: 'api:summary',
  description: 'URL summary - 5000 drops'
}), async (req,res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'url query required' });
  try {
    const resp = await fetch(url, { redirect: 'follow' });
    if (!resp.ok) throw new Error('fetch failed');
    const html = await resp.text();
    const text = stripHtml(html).slice(0, 8000);
    const summary = firstNSentences(text, 2);
    logEvent('payment_success', { route: '/api/summary', url, amount: PRICE_PREMIUM_DROPS });
    res.json({ url, summary, paid: true, chars_used: text.length });
  } catch (e) {
    res.status(500).json({ error: 'summary failed', detail: e.message });
  }
});

app.get('/api/keywords', requirePayment({
  price: PRICE_PREMIUM_DROPS,
  payToAddress: PAY_TO_ADDRESS,
  network: 'xrpl:1',
  asset: 'XRP',
  facilitatorUrl: FACILITATOR_URL,
  resource: 'api:keywords',
  description: 'SEO keywords - 5000 drops'
}), async (req,res) => {
  const site = req.query.site;
  if (!site) return res.status(400).json({ error: 'site query required' });
  try {
    const url = site.startsWith('http') ? site : `https://${site}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('fetch failed');
    const html = await resp.text();
    const text = stripHtml(html).slice(0, 15000);
    const keywords = extractKeywords(text, 12);
    logEvent('payment_success', { route: '/api/keywords', site, amount: PRICE_PREMIUM_DROPS });
    res.json({ site, keywords, paid: true });
  } catch (e) {
    res.status(500).json({ error: 'keywords failed', detail: e.message });
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`Running on port ${port}`));
