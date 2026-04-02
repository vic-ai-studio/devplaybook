---
title: "Sequelize — Promise-Based Node.js ORM"
description: "Sequelize is the original Node.js ORM, supporting PostgreSQL, MySQL, SQLite, and SQL Server. While newer alternatives like Prisma and Drizzle are growing, Sequelize remains widely used in legacy Node.js applications."
category: "Database"
pricing: "Free / Open Source"
pricingDetail: "Sequelize is 100% free and open-source (MIT)."
website: "https://sequelize.org"
github: "https://github.com/sequelize/sequelize"
tags: ["database", "orm", "nodejs", "postgresql", "mysql", "sqlite", "javascript"]
pros:
  - "Battle-tested: 12+ years of production use, well-understood behavior"
  - "Full-featured: associations, transactions, migrations, hooks, scopes"
  - "JavaScript-native: no TypeScript required (though TypeScript is supported)"
  - "Wide database support: PostgreSQL, MySQL, MariaDB, SQLite, SQL Server"
  - "Large existing codebase: most older Node.js projects use Sequelize"
cons:
  - "TypeScript types are secondary citizens — weaker type safety than Prisma/Drizzle"
  - "Verbose configuration compared to modern ORMs"
  - "Performance not optimized for serverless"
  - "New projects should generally prefer Prisma or Drizzle"
date: "2026-04-02"
---

## What is Sequelize?

Sequelize is the original Node.js ORM, predating TypeScript's popularity. It uses an Active Record-like pattern with model classes that map to database tables. While Prisma and Drizzle have largely overtaken it for new projects, Sequelize powers a massive amount of production Node.js applications.

## Quick Start

```bash
npm install sequelize
npm install pg pg-hstore  # For PostgreSQL
# Or: npm install mysql2  # For MySQL
```

```javascript
const { Sequelize, DataTypes, Model } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Test connection
await sequelize.authenticate();
```

## Model Definition

```javascript
// models/User.js
class User extends Model {}

User.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },
  name: {
    type: DataTypes.STRING(100),
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  sequelize,
  tableName: 'users',
  timestamps: true,  // Adds createdAt and updatedAt
});

// models/Post.js
class Post extends Model {}

Post.init({
  title: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.TEXT },
  published: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { sequelize, tableName: 'posts', timestamps: true });

// Associations
User.hasMany(Post, { foreignKey: 'authorId', as: 'posts' });
Post.belongsTo(User, { foreignKey: 'authorId', as: 'author' });
```

## CRUD Operations

```javascript
// CREATE
const user = await User.create({
  email: 'alice@example.com',
  name: 'Alice',
});

// READ
const users = await User.findAll({
  where: { active: true },
  include: [{
    model: Post,
    as: 'posts',
    where: { published: true },
    required: false,  // LEFT JOIN
  }],
  order: [['createdAt', 'DESC']],
  limit: 10,
  offset: 0,
});

const user = await User.findByPk(1, {
  include: ['posts']
});

const user = await User.findOne({ where: { email: 'alice@example.com' } });

// UPDATE
await User.update({ name: 'Alice Smith' }, { where: { id: 1 } });

// UPSERT
await User.upsert({ email: 'alice@example.com', name: 'Alice Updated' });

// DELETE
await User.destroy({ where: { id: 1 } });

// Transactions
const t = await sequelize.transaction();
try {
  const user = await User.create({ email: 'bob@example.com' }, { transaction: t });
  await Post.create({ title: 'Post', authorId: user.id }, { transaction: t });
  await t.commit();
} catch (error) {
  await t.rollback();
  throw error;
}
```

## Migrations with Sequelize CLI

```bash
npm install --save-dev sequelize-cli

# Initialize migrations
npx sequelize-cli init

# Create migration
npx sequelize-cli migration:create --name create-users

# Run migrations
npx sequelize-cli db:migrate

# Undo last migration
npx sequelize-cli db:migrate:undo
```

```javascript
// migrations/create-users.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      email: { type: Sequelize.STRING, unique: true, allowNull: false },
      name: { type: Sequelize.STRING },
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: { type: Sequelize.DATE },
      updatedAt: { type: Sequelize.DATE },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('users');
  }
};
```

Sequelize remains relevant for maintaining existing codebases. For new Node.js projects, consider Prisma or Drizzle ORM instead.
