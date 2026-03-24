---
title: "IP Geolocation Lookup: How to Find Location, ISP, and Timezone from an IP Address"
description: "Learn how IP geolocation works, which APIs and tools to use, and how to implement IP-based features in your app. Covers country detection, timezone lookup, and rate limiting by region."
date: "2026-03-24"
tags: ["ip", "geolocation", "networking", "api", "developer-tools", "security"]
readingTime: "7 min read"
---

# IP Geolocation Lookup: How to Find Location, ISP, and Timezone from an IP Address

IP geolocation maps an IP address to a physical location — country, region, city, timezone, and ISP. It's used for content localization, fraud detection, analytics, and access control.

**[Look Up an IP Address →](/tools/ip-geolocation)**

## What IP Geolocation Returns

A typical IP geolocation response includes:

```json
{
  "ip": "8.8.8.8",
  "country": "United States",
  "country_code": "US",
  "region": "California",
  "city": "Mountain View",
  "latitude": 37.386,
  "longitude": -122.0838,
  "timezone": "America/Los_Angeles",
  "utc_offset": "-0700",
  "isp": "Google LLC",
  "org": "Google Public DNS",
  "asn": "AS15169",
  "is_vpn": false,
  "is_proxy": false,
  "is_datacenter": false
}
```

**Accuracy note:** IP geolocation is accurate to the country level ~99% of the time, to the city level ~80% of the time, and is less reliable at the street level. It's a best estimate, not GPS.

## Common Use Cases

**Content localization:** Show prices in local currency, dates in local format, or redirect users to regional versions of your site.

**Timezone-aware scheduling:** Show event times in the user's timezone without asking them to select one.

**Fraud and risk detection:** Flag sign-ups from high-risk regions, VPNs, or Tor exit nodes.

**Access control (geo-blocking):** Restrict content based on licensing or regulatory requirements.

**Analytics:** Understand where your traffic comes from without relying on user-provided location.

## IP Geolocation APIs

### Free APIs

**ipapi.co** — 1,000 requests/day free:
```bash
curl https://ipapi.co/8.8.8.8/json/
```

**ip-api.com** — 45 requests/minute free:
```bash
curl http://ip-api.com/json/8.8.8.8
```

**ipinfo.io** — 50,000 requests/month free:
```bash
curl https://ipinfo.io/8.8.8.8/json
```

### Get Current User's IP

```bash
# Your own IP
curl https://api.ipify.org?format=json
# {"ip":"203.0.113.1"}

# Your IP with geolocation
curl https://ipapi.co/json/
```

## IP Geolocation in JavaScript

```javascript
// Get current user's location from IP
async function getUserLocation() {
  const response = await fetch('https://ipapi.co/json/');
  const data = await response.json();
  return {
    country: data.country_name,
    countryCode: data.country_code,
    city: data.city,
    timezone: data.timezone,
    currency: data.currency,
    callingCode: data.country_calling_code,
  };
}

// Usage
const location = await getUserLocation();
console.log(`User is in ${location.city}, ${location.country}`);
console.log(`Their timezone: ${location.timezone}`);
```

### Auto-detect Timezone

```javascript
async function getDefaultTimezone(ip) {
  const geo = await fetch(`https://ipapi.co/${ip}/json/`).then(r => r.json());
  return geo.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Use browser API first (more accurate), fall back to IP
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone 
  || await getDefaultTimezone(userIp);
```

### Currency Detection

```javascript
async function detectUserCurrency() {
  const geo = await fetch('https://ipapi.co/json/').then(r => r.json());
  return {
    currency: geo.currency,          // "USD"
    symbol: getCurrencySymbol(geo.currency),
    country: geo.country_code,
  };
}

// Show localized pricing
const { currency } = await detectUserCurrency();
const price = currency === 'JPY' ? '¥1,400' : '$9.99';
```

## IP Geolocation in Python

```python
import requests

def get_ip_location(ip=None):
    """Get geolocation data for an IP address. Uses caller's IP if None."""
    url = f"https://ipapi.co/{ip}/json/" if ip else "https://ipapi.co/json/"
    response = requests.get(url, timeout=5)
    data = response.json()
    
    return {
        "ip": data.get("ip"),
        "country": data.get("country_name"),
        "country_code": data.get("country_code"),
        "city": data.get("city"),
        "timezone": data.get("timezone"),
        "latitude": data.get("latitude"),
        "longitude": data.get("longitude"),
        "isp": data.get("org"),
    }

# Usage
location = get_ip_location("8.8.8.8")
print(f"IP is located in: {location['city']}, {location['country']}")
print(f"ISP: {location['isp']}")
```

## Server-Side IP Detection

### Getting the Real Client IP

Behind a load balancer or CDN, the IP in `request.socket.remoteAddress` is the load balancer's IP. Use headers:

```javascript
// Node.js / Express
function getClientIp(req) {
  return (
    req.headers['cf-connecting-ip'] ||          // Cloudflare
    req.headers['x-real-ip'] ||                  // Nginx proxy
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||  // Standard proxy header
    req.socket.remoteAddress
  );
}
```

**Security note:** Never trust `X-Forwarded-For` for security decisions without validating it. Clients can forge this header unless your load balancer strips and re-adds it.

### Cloudflare Headers

If you're behind Cloudflare, they provide:
- `CF-Connecting-IP`: the real client IP
- `CF-IPCountry`: two-letter country code
- `CF-Ray`: request trace ID

```javascript
// In a Cloudflare Worker or Pages Function
export async function onRequest({ request }) {
  const country = request.headers.get('CF-IPCountry');
  
  if (country === 'CN' || country === 'RU') {
    // Geo-restricted content
    return new Response('Not available in your region', { status: 451 });
  }
  
  return fetch(request);
}
```

## Local Databases vs API Calls

For high-volume use (>1K requests/day), use a local database instead of an API:

**MaxMind GeoLite2** — free, updated monthly:
```python
import geoip2.database

reader = geoip2.database.Reader('GeoLite2-City.mmdb')

def lookup(ip):
    response = reader.city(ip)
    return {
        "country": response.country.name,
        "city": response.city.name,
        "latitude": response.location.latitude,
        "timezone": response.location.time_zone,
    }
```

**Benefits of local DB:**
- No API rate limits
- No external latency (~1ms lookup vs ~50-200ms API call)
- No cost at scale
- Data privacy (IP addresses don't leave your infrastructure)

## VPN and Proxy Detection

Many IP geolocation APIs also return VPN/proxy flags:

```javascript
async function checkVpn(ip) {
  const data = await fetch(`https://ipapi.co/${ip}/json/`).then(r => r.json());
  return {
    isVpn: data.is_vpn || false,
    isProxy: data.is_proxy || false,
    isTor: data.is_tor || false,
    isDatacenter: data.is_hosting || false,
  };
}
```

**Use for:** Flagging high-risk transactions, preventing abuse of free trials, or adjusting risk scores in fraud detection.

## Conclusion

IP geolocation is accurate enough for timezone detection, currency display, and country-level access control — but not reliable enough for precise location claims. Use a client-side API for low volume, a local database (MaxMind GeoLite2) for production scale, and always consider the privacy implications of collecting IP-based location data.

**[Look Up an IP Address Online →](/tools/ip-geolocation)**
