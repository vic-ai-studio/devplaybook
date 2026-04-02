---
title: "TypeORM — Object-Relational Mapper for TypeScript & Node.js"
description: "TypeORM is the most feature-complete ORM for TypeScript and Node.js. It supports Active Record and Data Mapper patterns, decorators-based entities, and works with PostgreSQL, MySQL, SQLite, MongoDB, and more."
category: "Database"
pricing: "Free / Open Source"
pricingDetail: "TypeORM is 100% free and open-source (MIT). Created by Umed Khudoiberdiev, community maintained."
website: "https://typeorm.io"
github: "https://github.com/typeorm/typeorm"
tags: ["database", "orm", "typescript", "nodejs", "postgresql", "mysql", "decorators", "entity"]
pros:
  - "Feature-complete: Active Record AND Data Mapper patterns, full SQL feature support"
  - "Decorator-based entities: define schema as classes with TypeScript decorators"
  - "Migration support: auto-generate migrations from entity changes"
  - "Multiple databases: PostgreSQL, MySQL, SQLite, Oracle, MongoDB, SQL Server"
  - "Query Builder: fluent SQL builder for complex queries"
cons:
  - "Slow compared to newer ORMs (Drizzle, Prisma) due to heavy reflection"
  - "Decorator syntax requires experimental TypeScript settings"
  - "Large bundle size — not suitable for edge deployments"
  - "Maintenance has slowed; Prisma/Drizzle are now more actively developed"
date: "2026-04-02"
---

## What is TypeORM?

TypeORM was the dominant TypeScript ORM for several years and remains widely used in enterprise Node.js applications, particularly those built with NestJS. It supports both Active Record (model-centric) and Data Mapper (repository-centric) patterns, giving flexibility in architecture.

## Quick Start

```bash
npm install typeorm reflect-metadata
npm install pg  # Or mysql2, sqlite3, etc.
```

```typescript
// Require reflect-metadata at app entry point
import "reflect-metadata";
import { DataSource } from "typeorm";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: "postgres",
  password: "password",
  database: "myapp",
  synchronize: false,  // Never true in production
  logging: true,
  entities: ["src/entities/**/*.ts"],
  migrations: ["src/migrations/**/*.ts"],
});
```

## Entity Definition (Data Mapper)

```typescript
// src/entities/User.ts
import {
  Entity, Column, PrimaryGeneratedColumn,
  CreateDateColumn, UpdateDateColumn,
  OneToMany, ManyToOne
} from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  name: string;

  @Column({ default: true })
  active: boolean;

  @OneToMany(() => Post, post => post.author)
  posts: Post[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity("posts")
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column("text", { nullable: true })
  content: string;

  @Column({ default: false })
  published: boolean;

  @ManyToOne(() => User, user => user.posts)
  author: User;

  @Column()
  authorId: number;

  @CreateDateColumn()
  createdAt: Date;
}
```

## Repository Pattern (Data Mapper)

```typescript
import { AppDataSource } from "./data-source";
import { User } from "./entities/User";

const userRepository = AppDataSource.getRepository(User);

// CREATE
const user = userRepository.create({ email: "alice@example.com", name: "Alice" });
await userRepository.save(user);

// READ
const users = await userRepository.find({
  where: { active: true },
  relations: ["posts"],
  order: { createdAt: "DESC" },
  take: 10,
  skip: 0,
});

// FIND ONE
const user = await userRepository.findOne({
  where: { email: "alice@example.com" },
  relations: ["posts"],
});

// UPDATE
await userRepository.update({ id: 1 }, { name: "Alice Smith" });

// DELETE
await userRepository.delete({ id: 1 });
```

## Query Builder

```typescript
const posts = await AppDataSource
  .createQueryBuilder(Post, "post")
  .leftJoinAndSelect("post.author", "user")
  .where("post.published = :published", { published: true })
  .andWhere("user.email LIKE :domain", { domain: "%@company.com" })
  .orderBy("post.createdAt", "DESC")
  .limit(20)
  .getMany();

// With subqueries
const activeUsers = await AppDataSource
  .createQueryBuilder(User, "user")
  .where(qb => {
    const subQuery = qb.subQuery()
      .select("post.authorId")
      .from(Post, "post")
      .where("post.published = true")
      .getQuery();
    return "user.id IN " + subQuery;
  })
  .getMany();
```

## NestJS Integration

TypeORM is the default ORM for NestJS:

```typescript
// app.module.ts
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [User, Post],
      migrations: ['dist/migrations/**/*.js'],
      migrationsRun: true,
    }),
    TypeOrmModule.forFeature([User, Post]),
  ],
})
export class AppModule {}

// users.service.ts
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findAll() {
    return this.userRepository.find({ relations: ['posts'] });
  }
}
```

TypeORM remains the go-to ORM for NestJS applications and enterprise systems that benefit from its mature feature set, despite newer alternatives offering better performance.
