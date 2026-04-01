---
title: "MongoDB Aggregation Pipeline: Advanced Patterns & Optimization"
description: "MongoDB aggregation pipeline advanced guide: $lookup joins, $facet for multi-queries, $bucket for histograms, $unwind arrays, pipeline optimization, indexes for aggregation, and Node.js examples."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["MongoDB", "aggregation pipeline", "aggregation", "$lookup", "$facet", "NoSQL", "Node.js"]
readingTime: "10 min read"
category: "database"
---

The MongoDB aggregation pipeline is one of the most powerful data processing tools in any database. It can handle analytics, joins, transformations, and complex reporting entirely within the database — no application-level data processing required. This guide covers advanced pipeline patterns and the optimization techniques that separate fast pipelines from slow ones.

## Pipeline Fundamentals

The pipeline is a sequence of stages. Documents flow through each stage, transformed by the stage operator. The key rule: **each stage only has access to the documents output by the previous stage.**

```javascript
db.orders.aggregate([
  { $match: { status: 'completed', createdAt: { $gte: new Date('2026-01-01') } } },
  { $group: { _id: '$customerId', totalSpent: { $sum: '$amount' }, count: { $sum: 1 } } },
  { $sort: { totalSpent: -1 } },
  { $limit: 100 },
  { $project: { customerId: '$_id', totalSpent: 1, count: 1, _id: 0 } },
]);
```

Stage order matters enormously for performance — we will cover the optimization rules in detail.

## Core Stages Reference

| Stage | Purpose |
|---|---|
| `$match` | Filter documents (like `find`) |
| `$group` | Group and aggregate (`GROUP BY`) |
| `$project` | Shape/transform documents |
| `$sort` | Order documents |
| `$limit` / `$skip` | Pagination |
| `$lookup` | Join with another collection |
| `$unwind` | Flatten arrays |
| `$facet` | Run multiple sub-pipelines |
| `$bucket` | Group by ranges |
| `$addFields` | Add computed fields |

## $lookup for Joins

`$lookup` performs a left outer join. There are two forms: simple equality and pipeline-based (for complex conditions).

### Simple Equality Join

```javascript
// Join orders with customers
db.orders.aggregate([
  { $match: { status: 'completed' } },
  {
    $lookup: {
      from: 'customers',
      localField: 'customerId',
      foreignField: '_id',
      as: 'customer',
    },
  },
  // customer is an array — unwind if expecting single match
  { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
  {
    $project: {
      orderId: '$_id',
      amount: 1,
      'customer.email': 1,
      'customer.name': 1,
    },
  },
]);
```

### Pipeline-Based Lookup (Multi-Condition)

```javascript
// Join with conditions beyond simple equality
db.orders.aggregate([
  {
    $lookup: {
      from: 'promotions',
      let: { orderDate: '$createdAt', orderAmount: '$amount' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $lte: ['$startDate', '$$orderDate'] },
                { $gte: ['$endDate', '$$orderDate'] },
                { $lte: ['$minOrderAmount', '$$orderAmount'] },
              ],
            },
          },
        },
        { $project: { code: 1, discountPercent: 1 } },
      ],
      as: 'applicablePromotions',
    },
  },
]);
```

**Performance note:** Always add an index on the `foreignField` (or the fields matched in a pipeline `$lookup`). Without an index, MongoDB scans the entire foreign collection for each document.

## $unwind — Flattening Arrays

`$unwind` deconstructs an array field, creating one document per array element. Use `preserveNullAndEmptyArrays: true` to retain documents where the array is missing or empty:

```javascript
// Products with multiple tags — analyze per-tag stats
db.products.aggregate([
  { $match: { active: true } },
  {
    $unwind: {
      path: '$tags',
      preserveNullAndEmptyArrays: false, // Exclude products with no tags
    },
  },
  {
    $group: {
      _id: '$tags',
      productCount: { $sum: 1 },
      avgPrice: { $avg: '$price' },
      products: { $push: '$name' },
    },
  },
  { $sort: { productCount: -1 } },
  { $limit: 20 },
]);
```

## $facet — Multiple Sub-Pipelines in One Query

`$facet` runs multiple independent aggregation pipelines on the same input documents and returns all results in a single query. This is ideal for dashboard queries where you need counts, averages, and distributions simultaneously.

```javascript
// Single query for a product catalog page
db.products.aggregate([
  { $match: { active: true, categoryId: ObjectId('...') } },
  {
    $facet: {
      // Total count and pagination info
      metadata: [
        { $count: 'total' },
      ],

      // Paginated product list
      products: [
        { $sort: { createdAt: -1 } },
        { $skip: 0 },
        { $limit: 20 },
        { $project: { name: 1, price: 1, imageUrl: 1, rating: 1 } },
      ],

      // Price distribution for filter UI
      priceRanges: [
        {
          $bucket: {
            groupBy: '$price',
            boundaries: [0, 25, 50, 100, 250, 500, 1000],
            default: '1000+',
            output: { count: { $sum: 1 } },
          },
        },
      ],

      // Brand counts for filter sidebar
      brands: [
        { $group: { _id: '$brand', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ],

      // Average price and rating
      summary: [
        {
          $group: {
            _id: null,
            avgPrice: { $avg: '$price' },
            avgRating: { $avg: '$rating' },
          },
        },
      ],
    },
  },
]);
```

Without `$facet`, you would run 5 separate queries. With it, MongoDB processes the matched documents once and fans out to each sub-pipeline.

## $bucket — Histograms and Range Grouping

`$bucket` is purpose-built for creating histograms and distributing values into defined ranges:

```javascript
// Age distribution of users
db.users.aggregate([
  { $match: { active: true } },
  {
    $bucket: {
      groupBy: '$age',
      boundaries: [18, 25, 35, 45, 55, 65, 100],
      default: 'Other', // Documents outside all boundaries
      output: {
        count: { $sum: 1 },
        avgSpend: { $avg: '$totalSpend' },
        users: { $push: '$email' }, // Careful with large arrays
      },
    },
  },
]);

// $bucketAuto — let MongoDB determine boundaries
db.products.aggregate([
  {
    $bucketAuto: {
      groupBy: '$price',
      buckets: 5,  // Create 5 equal-sized groups
      output: { count: { $sum: 1 }, avgPrice: { $avg: '$price' } },
    },
  },
]);
```

## Top-N Per Group Pattern

A common analytics requirement: get the top N items within each group. Use `$sort`, `$group` with `$push`, then `$slice`:

```javascript
// Top 3 selling products per category
db.orders.aggregate([
  { $match: { status: 'completed', createdAt: { $gte: new Date('2026-01-01') } } },
  { $unwind: '$items' },
  {
    $group: {
      _id: { category: '$items.category', product: '$items.productId' },
      revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
      unitsSold: { $sum: '$items.quantity' },
    },
  },
  { $sort: { revenue: -1 } },
  {
    $group: {
      _id: '$_id.category',
      topProducts: {
        $push: {
          productId: '$_id.product',
          revenue: '$revenue',
          unitsSold: '$unitsSold',
        },
      },
    },
  },
  {
    $project: {
      category: '$_id',
      topProducts: { $slice: ['$topProducts', 3] },
      _id: 0,
    },
  },
]);
```

## Pipeline Optimization Rules

### Rule 1: $match as Early as Possible

Every `$match` placed early reduces the number of documents flowing through subsequent stages. MongoDB can also use indexes for `$match` at the start of the pipeline.

```javascript
// BAD — $match after $lookup processes all documents in two collections
db.orders.aggregate([
  { $lookup: { from: 'customers', localField: 'customerId', foreignField: '_id', as: 'customer' } },
  { $match: { 'customer.country': 'TW' } },  // Too late
]);

// GOOD — filter before the expensive $lookup
db.orders.aggregate([
  { $match: { status: 'completed' } },  // Use index here
  { $lookup: { ... } },
  { $match: { 'customer.country': 'TW' } },
]);
```

### Rule 2: $project Early to Reduce Document Size

Projecting away unused fields early means less data moves through the pipeline:

```javascript
db.users.aggregate([
  { $match: { active: true } },
  { $project: { _id: 1, email: 1, plan: 1 } },  // Drop large fields early
  { $lookup: { ... } },
]);
```

### Rule 3: Index Compatibility

Indexes are used by `$match` and `$sort` **only when they appear at the start of the pipeline** (before any `$group`, `$unwind`, or `$project` that restructures documents).

To verify index usage, add `.explain('executionStats')`:

```javascript
db.orders.aggregate([
  { $match: { status: 'pending', createdAt: { $gte: new Date() } } },
  { $group: { _id: '$customerId', count: { $sum: 1 } } },
], { explain: true });
```

Look for `IXSCAN` in the winning plan. If you see `COLLSCAN`, add an index.

## Node.js Examples

### Mongoose

```javascript
const mongoose = require('mongoose');

// Use Model.aggregate() for Mongoose
const results = await Order.aggregate([
  { $match: { status: 'completed', createdAt: { $gte: startDate } } },
  {
    $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      dailyRevenue: { $sum: '$amount' },
      orderCount: { $sum: 1 },
    },
  },
  { $sort: { _id: 1 } },
]);

// Note: Mongoose does NOT apply schema virtuals or middleware to aggregate results
// Use .exec() for proper Promise handling
```

### Native MongoDB Driver

```javascript
const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db('myapp');

const pipeline = [
  { $match: { active: true } },
  { $facet: { ... } },
];

// Cursor-based iteration for large result sets
const cursor = db.collection('products').aggregate(pipeline, {
  allowDiskUse: true,  // Allow spill to disk for large sorts
  maxTimeMS: 30000,    // 30-second timeout
});

for await (const doc of cursor) {
  process(doc);
}
await cursor.close();
```

Use `allowDiskUse: true` for aggregations on large collections where sorting or grouping exceeds the 100MB in-memory limit. It is slower but prevents pipeline failures.

## Common Gotchas

**$group destroys existing indexes.** After a `$group` stage, you cannot use indexes on fields in subsequent stages. Put all `$match` filters before `$group`.

**$lookup without indexes is a full collection scan.** Always index the `foreignField`.

**Large `$push` arrays cause memory issues.** If you are pushing documents into an array during `$group`, cap it with `$slice` or use `$addToSet` with a limit.

**$unwind multiplies document count.** If a document has 10 items in an array, `$unwind` turns it into 10 documents. This can cause downstream stages to process far more documents than expected.

## Summary

The aggregation pipeline rewards planning. Think through the data flow before writing the first stage: what can be filtered early to reduce volume? What fields can be projected away? Where do joins happen and are the join fields indexed?

For analytics-heavy applications, the aggregation pipeline often eliminates the need for a separate analytics database. With `$facet` for multi-dimensional queries, `$bucket` for distributions, and proper indexing at the start of pipelines, MongoDB can serve complex dashboard queries in under 100ms at scale.
