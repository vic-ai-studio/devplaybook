# Gumroad Marketing Tools

Batch management scripts for DevPlaybook's Gumroad products.

## Setup

Add your Gumroad access token to `devplaybook/.env`:
```
GUMROAD_ACCESS_TOKEN=your_token_here
```

Get your token at: https://app.gumroad.com/settings/advanced → Access Token

## Commands

### List all products
```bash
node gumroad-manager.js list-products
```

### View all discount codes
```bash
node gumroad-manager.js list-offers
```

### Create LAUNCH20 discount code (20% off all products)
```bash
node gumroad-manager.js create-offer --name LAUNCH20 --discount 20
```

### Create BUNDLE30 code (30% off, limited to 50 uses)
```bash
node gumroad-manager.js create-offer --name BUNDLE30 --discount 30 --max-uses 50
```

### Sales summary (revenue by product)
```bash
node gumroad-manager.js sales-summary
```

## Recommended Discount Code Strategy

| Code | Discount | Purpose | Limit |
|------|----------|---------|-------|
| `LAUNCH20` | 20% off | New product launches, email campaigns | Unlimited |
| `BUNDLE30` | 30% off | Bundle deals page, high-intent visitors | 100 uses |
| `DEVNEWS` | 15% off | Newsletter subscriber exclusive | Unlimited |
| `EARLY50` | 50% off | First 10 buyers, limited launch | 10 uses |

## Current Discount Codes Status

Run `node gumroad-manager.js list-offers` to see active codes.

**To activate LAUNCH20 and BUNDLE30:**
1. Set `GUMROAD_ACCESS_TOKEN` in .env
2. Run `node gumroad-manager.js create-offer --name LAUNCH20 --discount 20`
3. Run `node gumroad-manager.js create-offer --name BUNDLE30 --discount 30 --max-uses 100`
4. Verify: `node gumroad-manager.js list-offers`
