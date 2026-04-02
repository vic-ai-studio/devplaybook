---
title: "Mongoose — Elegant MongoDB Object Modeling for Node.js"
description: "Mongoose is the most popular ODM (Object Document Mapper) for MongoDB in Node.js. It provides schema validation, middleware, query building, and TypeScript support for MongoDB applications."
category: "Database"
pricing: "Free / Open Source"
pricingDetail: "Mongoose is 100% free and open-source (MIT). Part of the Automattic open-source portfolio."
website: "https://mongoosejs.com"
github: "https://github.com/Automattic/mongoose"
tags: ["database", "mongodb", "odm", "nodejs", "typescript", "schema", "validation"]
pros:
  - "Schema validation: define structure and validation rules for your MongoDB documents"
  - "Middleware/hooks: pre/post save, validate, and query middleware"
  - "Population: JOIN-like references between collections"
  - "TypeScript support: full type inference for schemas and queries"
  - "Mature ecosystem: 10+ years, extensive documentation and community"
cons:
  - "Schema layer adds overhead on top of MongoDB's schemaless nature"
  - "Performance overhead vs native MongoDB driver for bulk operations"
  - "Version compatibility issues between major versions are common"
  - "Strict schemas can conflict with MongoDB's flexible document model"
date: "2026-04-02"
---

## What is Mongoose?

Mongoose is the ODM (Object Document Mapper) that makes MongoDB feel like a structured relational database — with schemas, validation, middleware, and type safety. It's the default choice for Node.js + MongoDB stacks.

## Quick Start

```bash
npm install mongoose
```

## Schema and Model Definition

```typescript
import mongoose, { Schema, Document, Model } from 'mongoose';

interface IUser extends Document {
  email: string;
  name: string;
  age?: number;
  active: boolean;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email'],
  },
  name: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 100,
  },
  age: {
    type: Number,
    min: 0,
    max: 120,
  },
  active: { type: Boolean, default: true },
}, {
  timestamps: true,  // Adds createdAt and updatedAt
});

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ name: 'text' });  // Full-text search

// Virtual (computed property)
UserSchema.virtual('displayName').get(function() {
  return `${this.name} <${this.email}>`;
});

// Instance method
UserSchema.methods.isActive = function() {
  return this.active;
};

// Static method
UserSchema.statics.findByEmail = async function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

// Middleware (hooks)
UserSchema.pre('save', function(next) {
  this.email = this.email.toLowerCase();
  next();
});

const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
```

## CRUD Operations

```typescript
await mongoose.connect(process.env.MONGODB_URI!);

// CREATE
const user = await User.create({
  email: 'alice@example.com',
  name: 'Alice',
});

// READ
const users = await User.find({ active: true })
  .select('name email')
  .sort({ createdAt: -1 })
  .limit(10)
  .lean();  // Returns plain JS objects (faster)

const user = await User.findById(id);
const user = await User.findOne({ email: 'alice@example.com' });

// UPDATE
await User.findByIdAndUpdate(id, { name: 'Alice Smith' }, { new: true });
await User.updateMany({ active: false }, { $set: { deletedAt: new Date() } });

// DELETE
await User.findByIdAndDelete(id);
await User.deleteMany({ active: false });

// Aggregation
const stats = await User.aggregate([
  { $match: { active: true } },
  { $group: { _id: null, count: { $sum: 1 }, avgAge: { $avg: '$age' } } },
]);
```

## References and Population

```typescript
const PostSchema = new Schema({
  title: { type: String, required: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  tags: [{ type: String }],
});

// Populate (like JOIN)
const posts = await Post.find({ published: true })
  .populate('author', 'name email')
  .sort('-createdAt')
  .limit(10);
// posts[0].author.name → "Alice"
```

## TypeScript Inference

```typescript
// Modern Mongoose v8 with TypeScript
interface IUser {
  email: string;
  name: string;
  active?: boolean;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true },
  name: { type: String, required: true },
  active: { type: Boolean, default: true },
});

const User = mongoose.model<IUser>('User', UserSchema);

// TypeScript knows the return types
const user = await User.findOne({ email: '...' });
// user is HydratedDocument<IUser> | null
```

Mongoose remains the standard for MongoDB applications in Node.js, especially when you need schema enforcement on what is otherwise a schemaless database.
