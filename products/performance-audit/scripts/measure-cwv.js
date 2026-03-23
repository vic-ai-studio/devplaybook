/**
 * Core Web Vitals Measurement Script
 *
 * Drop this script into any page to measure real-user Core Web Vitals.
 * Reports LCP, INP, CLS, FCP, and TTFB to the console and optionally
 * to an analytics endpoint.
 *
 * Usage:
 *   Option 1: Include via <script> tag
 *     <script src="measure-cwv.js" defer></script>
 *
 *   Option 2: Import as module
 *     import { initCWV } from './measure-cwv.js';
 *     initCWV({ endpoint: '/api/vitals' });
 *
 *   Option 3: Paste into DevTools console for quick measurement
 *
 * Configuration:
 *   - Set ANALYTICS_ENDPOINT to send data to your backend
 *   - Set DEBUG = true to log all entries to console
 *   - Set SAMPLE_RATE to control what % of users report (0.0 - 1.0)
 */

(function () {
  'use strict';

  // ============================================================
  // Configuration
  // ============================================================
  const CONFIG = {
    // Set to your analytics endpoint to collect field data
    // Example: '/api/vitals' or 'https://analytics.example.com/vitals'
    ANALYTICS_ENDPOINT: null,

    // Log detailed metrics to the console
    DEBUG: true,

    // Percentage of page loads that report metrics (1.0 = 100%)
    SAMPLE_RATE: 1.0,

    // Core Web Vitals thresholds
    THRESHOLDS: {
      LCP: { good: 2500, poor: 4000 },
      INP: { good: 200, poor: 500 },
      CLS: { good: 0.1, poor: 0.25 },
      FCP: { good: 1800, poor: 3000 },
      TTFB: { good: 800, poor: 1800 },
    },
  };

  // ============================================================
  // Sampling
  // ============================================================
  if (Math.random() > CONFIG.SAMPLE_RATE) return;

  // ============================================================
  // Utility Functions
  // ============================================================
  function getRating(name, value) {
    const threshold = CONFIG.THRESHOLDS[name];
    if (!threshold) return 'unknown';
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  function formatValue(name, value) {
    if (name === 'CLS') return value.toFixed(4);
    return Math.round(value) + 'ms';
  }

  function logMetric(name, value, entries) {
    if (!CONFIG.DEBUG) return;

    const rating = getRating(name, value);
    const formatted = formatValue(name, value);
    const colors = {
      good: 'background:#0cce6b;color:white;padding:2px 6px;border-radius:3px',
      'needs-improvement': 'background:#ffa400;color:white;padding:2px 6px;border-radius:3px',
      poor: 'background:#ff4e42;color:white;padding:2px 6px;border-radius:3px',
      unknown: 'background:#999;color:white;padding:2px 6px;border-radius:3px',
    };

    console.log(
      `%c${name}%c ${formatted} %c${rating}`,
      'font-weight:bold;font-size:14px',
      'font-size:14px',
      colors[rating]
    );

    if (entries && entries.length > 0) {
      console.groupCollapsed(`  ${name} details`);
      entries.forEach((entry) => {
        if (name === 'LCP') {
          console.log('Element:', entry.element);
          console.log('URL:', entry.url);
          console.log('Size:', entry.size);
          console.log('Load time:', Math.round(entry.loadTime) + 'ms');
          console.log('Render time:', Math.round(entry.renderTime) + 'ms');
        } else if (name === 'CLS') {
          console.log('Value:', entry.value.toFixed(4));
          entry.sources?.forEach((source) => {
            console.log('Source:', source.node, 'moved by', Math.round(source.currentRect?.height || 0) + 'px');
          });
        } else if (name === 'INP') {
          console.log('Event type:', entry.name);
          console.log('Target:', entry.target);
          console.log('Processing time:', Math.round(entry.processingEnd - entry.processingStart) + 'ms');
          console.log('Presentation delay:', Math.round(entry.startTime + entry.duration - entry.processingEnd) + 'ms');
        }
      });
      console.groupEnd();
    }
  }

  function sendToAnalytics(name, value, id) {
    if (!CONFIG.ANALYTICS_ENDPOINT) return;

    const body = JSON.stringify({
      name,
      value: Math.round(name === 'CLS' ? value * 1000 : value),
      rating: getRating(name, value),
      id,
      url: window.location.href,
      timestamp: Date.now(),
      connection: navigator.connection
        ? {
            effectiveType: navigator.connection.effectiveType,
            downlink: navigator.connection.downlink,
            rtt: navigator.connection.rtt,
          }
        : null,
      deviceMemory: navigator.deviceMemory || null,
      hardwareConcurrency: navigator.hardwareConcurrency || null,
    });

    // Use sendBeacon for reliability (survives page unload)
    if (navigator.sendBeacon) {
      navigator.sendBeacon(CONFIG.ANALYTICS_ENDPOINT, body);
    } else {
      fetch(CONFIG.ANALYTICS_ENDPOINT, {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      });
    }
  }

  // ============================================================
  // Generate unique ID for this page view
  // ============================================================
  const pageViewId =
    Date.now().toString(36) + Math.random().toString(36).substring(2, 8);

  // ============================================================
  // LCP — Largest Contentful Paint
  // ============================================================
  function observeLCP() {
    if (!('PerformanceObserver' in window)) return;

    let lastEntry = null;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        lastEntry = entries[entries.length - 1];
      });

      observer.observe({ type: 'largest-contentful-paint', buffered: true });

      // LCP is finalized when user interacts or page is hidden
      const reportLCP = () => {
        if (lastEntry) {
          const value = lastEntry.renderTime || lastEntry.loadTime;
          logMetric('LCP', value, [lastEntry]);
          sendToAnalytics('LCP', value, pageViewId);
          observer.disconnect();
        }
      };

      // Report on first input (user interaction finalizes LCP)
      ['keydown', 'click', 'pointerdown'].forEach((type) => {
        addEventListener(type, reportLCP, { once: true, capture: true });
      });

      // Also report when page is hidden
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') reportLCP();
      });
    } catch (e) {
      // PerformanceObserver not supported for this entry type
    }
  }

  // ============================================================
  // INP — Interaction to Next Paint
  // ============================================================
  function observeINP() {
    if (!('PerformanceObserver' in window)) return;

    const interactions = [];

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Only measure discrete events (click, keydown, etc.)
          if (entry.interactionId) {
            interactions.push(entry);
          }
        }
      });

      observer.observe({ type: 'event', buffered: true, durationThreshold: 16 });

      // Report INP when page is hidden
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && interactions.length > 0) {
          // INP = the worst interaction (highest duration)
          // More precisely: p98 of interactions, but for simplicity we use max
          interactions.sort((a, b) => b.duration - a.duration);
          const inp = interactions[0];
          logMetric('INP', inp.duration, [inp]);
          sendToAnalytics('INP', inp.duration, pageViewId);
          observer.disconnect();
        }
      });
    } catch (e) {
      // event timing API not supported
    }
  }

  // ============================================================
  // CLS — Cumulative Layout Shift
  // ============================================================
  function observeCLS() {
    if (!('PerformanceObserver' in window)) return;

    let clsValue = 0;
    let clsEntries = [];
    let sessionValue = 0;
    let sessionEntries = [];
    let lastEntryTime = 0;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Only count shifts without recent user input
          if (!entry.hadRecentInput) {
            const timeSinceLastEntry = entry.startTime - lastEntryTime;

            // New session window: gap > 1s or session > 5s
            if (timeSinceLastEntry > 1000 || entry.startTime - sessionEntries[0]?.startTime > 5000) {
              sessionValue = 0;
              sessionEntries = [];
            }

            sessionValue += entry.value;
            sessionEntries.push(entry);
            lastEntryTime = entry.startTime;

            // Track the largest session window
            if (sessionValue > clsValue) {
              clsValue = sessionValue;
              clsEntries = [...sessionEntries];
            }
          }
        }
      });

      observer.observe({ type: 'layout-shift', buffered: true });

      // Report CLS when page is hidden
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          logMetric('CLS', clsValue, clsEntries);
          sendToAnalytics('CLS', clsValue, pageViewId);
          observer.disconnect();
        }
      });
    } catch (e) {
      // layout-shift not supported
    }
  }

  // ============================================================
  // FCP — First Contentful Paint
  // ============================================================
  function observeFCP() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entry = list.getEntries().find((e) => e.name === 'first-contentful-paint');
        if (entry) {
          logMetric('FCP', entry.startTime, [entry]);
          sendToAnalytics('FCP', entry.startTime, pageViewId);
          observer.disconnect();
        }
      });

      observer.observe({ type: 'paint', buffered: true });
    } catch (e) {
      // paint timing not supported
    }
  }

  // ============================================================
  // TTFB — Time to First Byte
  // ============================================================
  function measureTTFB() {
    try {
      const nav = performance.getEntriesByType('navigation')[0];
      if (nav) {
        const ttfb = nav.responseStart - nav.requestStart;
        logMetric('TTFB', ttfb, [nav]);
        sendToAnalytics('TTFB', ttfb, pageViewId);

        if (CONFIG.DEBUG) {
          console.groupCollapsed('  Navigation timing breakdown');
          console.log('DNS lookup:', Math.round(nav.domainLookupEnd - nav.domainLookupStart) + 'ms');
          console.log('TCP connect:', Math.round(nav.connectEnd - nav.connectStart) + 'ms');
          console.log('TLS handshake:', Math.round(nav.requestStart - nav.secureConnectionStart) + 'ms');
          console.log('Request:', Math.round(nav.responseStart - nav.requestStart) + 'ms');
          console.log('Response:', Math.round(nav.responseEnd - nav.responseStart) + 'ms');
          console.log('DOM processing:', Math.round(nav.domComplete - nav.responseEnd) + 'ms');
          console.log('Load event:', Math.round(nav.loadEventEnd - nav.loadEventStart) + 'ms');
          console.groupEnd();
        }
      }
    } catch (e) {
      // navigation timing not supported
    }
  }

  // ============================================================
  // Resource Loading Summary
  // ============================================================
  function reportResourceSummary() {
    if (!CONFIG.DEBUG) return;

    try {
      const resources = performance.getEntriesByType('resource');
      const summary = {};

      resources.forEach((r) => {
        const type = r.initiatorType || 'other';
        if (!summary[type]) {
          summary[type] = { count: 0, totalSize: 0, totalDuration: 0 };
        }
        summary[type].count++;
        summary[type].totalSize += r.transferSize || 0;
        summary[type].totalDuration += r.duration || 0;
      });

      console.groupCollapsed('Resource loading summary');
      console.table(
        Object.entries(summary)
          .sort((a, b) => b[1].totalSize - a[1].totalSize)
          .reduce((acc, [type, data]) => {
            acc[type] = {
              count: data.count,
              'total size': (data.totalSize / 1024).toFixed(1) + ' KB',
              'avg duration': Math.round(data.totalDuration / data.count) + 'ms',
            };
            return acc;
          }, {})
      );

      // Find slowest resources
      const slowest = [...resources]
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5);

      console.log('Top 5 slowest resources:');
      slowest.forEach((r) => {
        console.log(
          `  ${Math.round(r.duration)}ms — ${r.name.split('/').pop()} (${(r.transferSize / 1024).toFixed(1)} KB)`
        );
      });

      console.groupEnd();
    } catch (e) {
      // resource timing not supported
    }
  }

  // ============================================================
  // Initialize
  // ============================================================
  function initCWV(options = {}) {
    if (options.endpoint) CONFIG.ANALYTICS_ENDPOINT = options.endpoint;
    if (options.debug !== undefined) CONFIG.DEBUG = options.debug;
    if (options.sampleRate !== undefined) CONFIG.SAMPLE_RATE = options.sampleRate;

    if (CONFIG.DEBUG) {
      console.log(
        '%cCore Web Vitals Measurement',
        'font-size:16px;font-weight:bold;color:#1a73e8'
      );
      console.log('Page view ID:', pageViewId);
    }

    observeLCP();
    observeINP();
    observeCLS();
    observeFCP();

    // Measure TTFB after load
    if (document.readyState === 'complete') {
      measureTTFB();
      reportResourceSummary();
    } else {
      window.addEventListener('load', () => {
        // Slight delay to ensure navigation timing is complete
        setTimeout(() => {
          measureTTFB();
          reportResourceSummary();
        }, 100);
      });
    }
  }

  // Auto-initialize if loaded as a script tag
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initCWV };
  } else if (typeof window !== 'undefined') {
    window.initCWV = initCWV;
    initCWV();
  }
})();
