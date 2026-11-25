# AgentPay API

Pay-per-call data for AI agents. Pay in XRP via x402. No API keys.

## Endpoints

### GET /api/ping
Free health check
```
https://xrp-agentic-paywall.onrender.com/api/ping
```

### GET /api/data
1000 drops
```
https://xrp-agentic-paywall.onrender.com/api/data
```

### GET /api/summary?url=
5000 drops
```
https://xrp-agentic-paywall.onrender.com/api/summary?url=https://example.com
```

### GET /api/price?symbol=BTC
2000 drops
```
https://xrp-agentic-paywall.onrender.com/api/price?symbol=BTC
```

### GET /api/keywords?site=
5000 drops
```
https://xrp-agentic-paywall.onrender.com/api/keywords?site=example.com
```

## Pricing
All payments settle in XRP to rHsrj8Ez8oLcWdt8jSuAuqVNJtg1YKB6YC

## Admin
`/admin/payments` with header `x-admin-key`
