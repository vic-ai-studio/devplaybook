---
title: "MongoDB Schema Design: 5 Patterns for Scalable Apps"
description: "Master MongoDB schema design with 5 proven patterns: embedding vs referencing, bucket pattern, outlier pattern, computed pattern, and polymorphic schema. Real-world examples with Node.js and Mongoose."
date: "2026-04-02"
tags: [mongodb, database, schema-design, nosql, backend]
readingTime: "11 min read"
---

# MongoDB Schema Design: 5 Patterns for Scalable Apps

MongoDB gives you schema flexibility that relational databases don't. But "flexible schema" doesn't mean "no schema." The teams that struggle with MongoDB are usually the ones who treat it as a relational database with JSON columns, or who skip schema design entirely.

Good MongoDB schema design is about modeling data the way your application uses it. This guide covers the five patterns that solve the most common real-world problems.

## The Core Principle: Model for Access Patterns

In SQL, you normalize data based on entity relationships. In MongoDB, you model based on how your application reads and writes data.

Ask these questions before designing any collection:
1. What are the most frequent queries?
2. What is the read/write ratio?
3. How large can arrays grow?
4. What data is always accessed together?

The answers drive your schema, not the entity diagram.

## Embedding vs Referencing: The Fundamental Decision

### Embedding (Denormalization)

Store related data inside the same document:

```javascript
// Embedded: user with their addresses
{
  _id: ObjectId("..."),
  name: "Alice",
  email: "alice@example.com",
  addresses: [
    {
      type: "home",
      street: "123 Main St",
      city: "San Francisco",
      zip: "94102"
    },
    {
      type: "work",
      street: "1 Market St",
      city: "San Francisco",
      zip: "94105"
    }
  ]
}
```

**Embed when:**
- Data is always accessed together with the parent
- The array is bounded (< 100 items)
- Data doesn't need to be queried independently
- Write patterns are parent-focused (update user profile)

### Referencing (Normalization)

Store references (ObjectIds) to related documents:

```javascript
// User document
{
  _id: ObjectId("user-1"),
  name: "Alice",
  email: "alice@example.com",
  // Reference to orders collection
}

// Order documents in separate collection
{
  _id: ObjectId("order-1"),
  userId: ObjectId("user-1"),
  total: 49.99,
  items: [...],
  createdAt: new Date()
}
```

**Reference when:**
- The related data is large (thousands of items)
- Data needs to be queried independently
- Multiple documents reference the same data (e.g., products)
- Write patterns are independent (update order status without touching user)

## Pattern 1: Bucket Pattern

**Problem:** You're storing time-series data (IoT sensors, analytics events, metrics). One document per data point creates millions of documents with high index overhead.

**Solution:** Group related data points into "buckets" with a fixed time window.

```javascript
// ❌ Bad: one document per measurement
{
  _id: ObjectId("..."),
  sensorId: "temp-sensor-1",
  timestamp: ISODate("2026-04-02T10:00:01Z"),
  temperature: 72.3
}
// Result: 86,400 documents per sensor per day

// ✅ Bucket pattern: group by hour
{
  _id: ObjectId("..."),
  sensorId: "temp-sensor-1",
  date: ISODate("2026-04-02T10:00:00Z"),  // Hour bucket
  type: "temperature",
  measurements: [
    { ts: ISODate("2026-04-02T10:00:01Z"), v: 72.3 },
    { ts: ISODate("2026-04-02T10:00:31Z"), v: 72.5 },
    { ts: ISODate("2026-04-02T10:01:01Z"), v: 72.4 },
    // ... up to 60 measurements per document
  ],
  count: 60,
  minTemp: 72.1,
  maxTemp: 73.2,
  avgTemp: 72.4
}
// Result: 24 documents per sensor per day instead of 86,400
```

Node.js implementation with Mongoose:

```javascript
const SensorBucketSchema = new mongoose.Schema({
  sensorId: { type: String, required: true, index: true },
  date: { type: Date, required: true },  // Truncated to hour
  measurements: [{
    ts: Date,
    v: Number
  }],
  count: { type: Number, default: 0 },
  minTemp: Number,
  maxTemp: Number,
  avgTemp: Number
});

SensorBucketSchema.index({ sensorId: 1, date: 1 }, { unique: true });

async function addMeasurement(sensorId, value, timestamp) {
  const hourBucket = new Date(timestamp);
  hourBucket.setMinutes(0, 0, 0);

  await SensorBucket.findOneAndUpdate(
    { sensorId, date: hourBucket },
    {
      $push: { measurements: { ts: timestamp, v: value } },
      $inc: { count: 1 },
      $min: { minTemp: value },
      $max: { maxTemp: value }
    },
    { upsert: true }
  );
}
```

## Pattern 2: Outlier Pattern

**Problem:** Most documents have small arrays (5-10 items), but a few "outlier" documents have enormous arrays that blow up document size.

**Classic example:** Comments on a post. Most posts have 5 comments. One viral post has 50,000 comments.

```javascript
// Post document (normal case — works fine embedded)
{
  _id: ObjectId("post-1"),
  title: "My Normal Post",
  comments: [
    { userId: ObjectId("..."), text: "Great post!", createdAt: new Date() },
    // ... 5 comments total
  ],
  commentCount: 5,
  hasOverflow: false
}

// Viral post — handle differently
{
  _id: ObjectId("post-2"),
  title: "This Post Went Viral",
  comments: [
    // Only the 20 most recent comments embedded for quick display
    { userId: ObjectId("..."), text: "Amazing!", createdAt: new Date() },
    // ... 20 embedded
  ],
  commentCount: 50000,
  hasOverflow: true  // Flag indicating there are more in comments collection
}

// Overflow comments in separate collection
{
  _id: ObjectId("..."),
  postId: ObjectId("post-2"),
  userId: ObjectId("..."),
  text: "This is one of the overflow comments",
  createdAt: new Date()
}
```

```javascript
async function getComments(postId, page = 1) {
  const post = await Post.findById(postId, { comments: 1, hasOverflow: 1 });

  if (!post.hasOverflow) {
    return post.comments;
  }

  // Paginate from overflow collection
  return Comment.find({ postId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * 20)
    .limit(20);
}
```

## Pattern 3: Computed Pattern

**Problem:** A query aggregates data from many documents on every request. This is expensive at scale.

**Solution:** Pre-compute and cache the result in the document.

```javascript
// ❌ Expensive: calculate average rating on every page load
db.reviews.aggregate([
  { $match: { productId: ObjectId("prod-1") } },
  { $group: { _id: null, avgRating: { $avg: "$rating" }, count: { $sum: 1 } } }
]);
// On a product with 100,000 reviews, this is slow

// ✅ Computed: store pre-calculated stats on the product document
{
  _id: ObjectId("prod-1"),
  name: "Wireless Headphones",
  price: 79.99,
  // Pre-computed stats — updated when reviews change
  ratingStats: {
    average: 4.3,
    count: 10842,
    distribution: { "5": 5200, "4": 3100, "3": 1500, "2": 700, "1": 342 }
  }
}

// Update stats atomically when a new review is added
async function addReview(productId, rating, userId) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    await Review.create([{
      productId, rating, userId, createdAt: new Date()
    }], { session });

    // Atomically update computed stats
    await Product.findByIdAndUpdate(productId, {
      $inc: {
        'ratingStats.count': 1,
        [`ratingStats.distribution.${rating}`]: 1
      }
    }, { session });

    // Recalculate average (simplified — use a more precise approach in production)
    const product = await Product.findById(productId).session(session);
    const stats = product.ratingStats;
    const newAvg = (Object.entries(stats.distribution)
      .reduce((sum, [r, c]) => sum + parseInt(r) * c, 0)) / stats.count;

    await Product.findByIdAndUpdate(productId,
      { 'ratingStats.average': Math.round(newAvg * 10) / 10 },
      { session }
    );

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}
```

## Pattern 4: Schema Versioning

**Problem:** Your schema evolves over time. Old documents have a different shape than new documents.

```javascript
// Documents may have different schemas over time:
// v1 (old): { name: "Alice Smith" }
// v2 (current): { firstName: "Alice", lastName: "Smith" }

// Add schema_version to all documents
{
  _id: ObjectId("..."),
  schema_version: 1,
  name: "Alice Smith"  // old format
}

{
  _id: ObjectId("..."),
  schema_version: 2,
  firstName: "Alice",
  lastName: "Smith"  // new format
}
```

```javascript
// Migration middleware — runs on read
function migrateUser(doc) {
  if (!doc) return null;

  if (doc.schema_version === 1) {
    const [firstName, ...rest] = doc.name.split(' ');
    doc.firstName = firstName;
    doc.lastName = rest.join(' ');
    delete doc.name;
    doc.schema_version = 2;

    // Optionally: write migrated doc back to DB
    User.findByIdAndUpdate(doc._id, {
      $set: { firstName: doc.firstName, lastName: doc.lastName, schema_version: 2 },
      $unset: { name: '' }
    }).exec(); // Non-blocking background migration
  }

  return doc;
}

UserSchema.post('find', function(docs) {
  return docs.map(migrateUser);
});
```

## Pattern 5: Polymorphic Pattern

**Problem:** You have documents that are similar but not identical — like different types of content in a feed.

```javascript
// All content items in one collection
// Type: "article"
{
  _id: ObjectId("..."),
  type: "article",
  title: "10 Redis Patterns",
  authorId: ObjectId("..."),
  slug: "10-redis-patterns",
  readingTime: 8,
  createdAt: new Date()
}

// Type: "video"
{
  _id: ObjectId("..."),
  type: "video",
  title: "Redis Tutorial",
  authorId: ObjectId("..."),
  durationSeconds: 1320,
  thumbnailUrl: "https://cdn.example.com/thumb.jpg",
  createdAt: new Date()
}

// Type: "tool"
{
  _id: ObjectId("..."),
  type: "tool",
  name: "Redis Commander",
  category: "database",
  githubUrl: "https://github.com/...",
  stars: 8900,
  createdAt: new Date()
}
```

```javascript
// Handler factory for different content types
const handlers = {
  article: {
    render: (item) => ({ ...item, url: `/articles/${item.slug}` }),
    search: (query) => ({ title: { $regex: query, $options: 'i' } })
  },
  video: {
    render: (item) => ({ ...item, formattedDuration: formatSeconds(item.durationSeconds) }),
    search: (query) => ({ title: { $regex: query, $options: 'i' } })
  },
  tool: {
    render: (item) => ({ ...item, url: `/tools/${item._id}` }),
    search: (query) => ({ name: { $regex: query, $options: 'i' } })
  }
};

async function getFeedItems(userId, page = 1) {
  const items = await Content.find({})
    .sort({ createdAt: -1 })
    .skip((page - 1) * 20)
    .limit(20);

  return items.map(item => handlers[item.type]?.render(item) || item);
}
```

## Schema Design Quick Reference

| Scenario | Pattern | Key Benefit |
|---------|---------|------------|
| Time-series data | Bucket | 100x fewer documents |
| Viral content with huge arrays | Outlier | Prevents document bloat |
| Expensive aggregations | Computed | Pre-calculate, read fast |
| Multiple content types | Polymorphic | Single collection, shared queries |
| Evolving schema | Versioning | Backward compatibility |
| One-to-few relationships | Embedding | Single read, atomic updates |
| One-to-many (unbounded) | Referencing | Prevents document size limit |

## Indexes for Patterns

Don't forget to index your pattern fields:

```javascript
// Bucket pattern: compound index
SensorBucketSchema.index({ sensorId: 1, date: -1 });

// Outlier pattern: efficient overflow lookup
CommentSchema.index({ postId: 1, createdAt: -1 });

// Polymorphic: type + shared fields
ContentSchema.index({ type: 1, createdAt: -1 });
ContentSchema.index({ authorId: 1, type: 1 });

// Schema versioning: find unmigratedocs
UserSchema.index({ schema_version: 1 });
```

The right schema design in MongoDB is the difference between a database that slows down at 10K records and one that stays fast at 100M.

---

**Related tools:**
- [MongoDB vs PostgreSQL comparison](/tools/mongodb-vs-postgresql-guide)
- [Database indexing strategies](/blog/database-indexing-strategies)
- [Redis caching patterns](/blog/redis-caching-patterns-nodejs)
