# @tool-chain/db

[![npm version](https://img.shields.io/npm/v/@tool-chain/db.svg)](https://www.npmjs.com/package/@tool-chain/db)
[![npm downloads](https://img.shields.io/npm/dm/@tool-chain/db.svg)](https://www.npmjs.com/package/@tool-chain/db)
[![Node.js Version](https://img.shields.io/node/v/@tool-chain/db.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Database chain operation library based on [@tool-chain/core](https://github.com/hu-shukang/tool-chain-core), designed specifically for building composable database operations with support for multiple ORMs.

[中文文档](https://github.com/hu-shukang/tool-chain-db/blob/main/README.zh.md) | [日本語ドキュメント](https://github.com/hu-shukang/tool-chain-db/blob/main/README.ja.md)

## Features

✨ **Multi-ORM Support** - Works with Kysely, TypeORM, Prisma, and Drizzle ORM
🔗 **Chainable API** - Build complex database operations with a fluent interface
🔄 **Transaction Management** - Built-in transaction support with automatic commit/rollback
📦 **Result Passing** - Access previous operation results in subsequent steps
🎯 **Type-Safe** - Full TypeScript support with excellent type inference
🛡️ **Error Handling** - Integrated error handling with `withoutThrow` option
⚡ **Advanced Features** - Retry, timeout, and other features from @tool-chain/core
🎨 **Service Pattern** - Higher-order function pattern for clean service layer design

## Installation

```bash
npm install @tool-chain/db @tool-chain/core
```

Then install your preferred ORM (one or more):

```bash
# For Kysely
npm install kysely

# For TypeORM
npm install typeorm

# For Prisma
npm install @prisma/client

# For Drizzle ORM
npm install drizzle-orm
```

## Importing

To avoid loading unnecessary dependencies, adapters should be imported from their specific subpaths:

```typescript
// Import core classes and types
import { Chains } from '@tool-chain/db';
import { ChainsWithDrizzle, DrizzleAdapter } from '@tool-chain/db/drizzle';
// Import specific adapters (only the ones you need)
import { ChainsWithKysely, KyselyAdapter } from '@tool-chain/db/kysely';
import { ChainsWithPrisma, PrismaAdapter } from '@tool-chain/db/prisma';
import { ChainsWithTypeORM, TypeORMAdapter } from '@tool-chain/db/typeorm';
```

This ensures that if you only use Kysely, TypeORM won't be loaded and you won't get errors about missing TypeORM dependencies.

## Quick Start

### Basic Usage

There are two ways to use this library:

**Option 1: Using Convenience Classes (Recommended)**

```typescript
import { ChainsWithKysely } from '@tool-chain/db/kysely';
import { Kysely } from 'kysely';

// Define your service functions
function getUser(id: number) {
  return (db: Kysely<Database>) => {
    return db.selectFrom('user').where('id', '=', id).selectAll().executeTakeFirstOrThrow();
  };
}

// Execute the chain - no need to pass adapter manually
const user = await new ChainsWithKysely<Database>().use(db).chain(getUser(123)).invoke();
```

**Option 2: Using Generic Chains Class**

```typescript
import { Chains } from '@tool-chain/db';
import { KyselyAdapter } from '@tool-chain/db/kysely';
import { Kysely } from 'kysely';

// Define your service functions
function getUser(id: number) {
  return (db: Kysely<Database>) => {
    return db.selectFrom('user').where('id', '=', id).selectAll().executeTakeFirstOrThrow();
  };
}

// Execute the chain - need to pass adapter explicitly
const user = await new Chains().use(db, new KyselyAdapter()).chain(getUser(123)).invoke();
```

### With Transactions

**Using Convenience Class:**

```typescript
import { ChainsWithKysely } from '@tool-chain/db/kysely';

function createUser(data: { name: string; email: string }) {
  return (db: Kysely<Database>) => {
    return db.insertInto('user').values(data).returningAll().executeTakeFirstOrThrow();
  };
}

function createProfile(userId: number) {
  return (db: Kysely<Database>) => {
    return db.insertInto('profile').values({ userId }).returningAll().executeTakeFirstOrThrow();
  };
}

const result = await new ChainsWithKysely<Database>()
  .transaction(db)
  .chain(createUser({ name: 'Alice', email: 'alice@example.com' }))
  .chain((results) => createProfile(results.r1.id))
  .invoke();
```

**Using Generic Chains Class:**

```typescript
import { Chains } from '@tool-chain/db';
import { KyselyAdapter } from '@tool-chain/db/kysely';

const result = await new Chains()
  .transaction(db, new KyselyAdapter())
  .chain(createUser({ name: 'Alice', email: 'alice@example.com' }))
  .chain((results) => createProfile(results.r1.id))
  .invoke();
```

## Usage Examples by ORM

### Kysely

```typescript
import { Chains } from '@tool-chain/db';
import { KyselyAdapter } from '@tool-chain/db/kysely';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

interface Database {
  user: {
    id: number;
    name: string;
    email: string;
  };
  post: {
    id: number;
    userId: number;
    title: string;
    content: string;
  };
}

// Initialize Kysely
const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      host: 'localhost',
      database: 'mydb',
    }),
  }),
});

const adapter = new KyselyAdapter<Database>();

// Define service functions
function getUser(id: number) {
  return (db: Kysely<Database>) => {
    return db.selectFrom('user').where('id', '=', id).selectAll().executeTakeFirstOrThrow();
  };
}

function getUserPosts(userId: number) {
  return (db: Kysely<Database>) => {
    return db.selectFrom('post').where('userId', '=', userId).selectAll().execute();
  };
}

function createPost(data: { userId: number; title: string; content: string }) {
  return (db: Kysely<Database>) => {
    return db.insertInto('post').values(data).returningAll().executeTakeFirstOrThrow();
  };
}

// Non-transaction mode
const posts = await new Chains()
  .use(db, adapter)
  .chain(getUser(1))
  .chain((results) => getUserPosts(results.r1.id))
  .invoke();

// Transaction mode
const newPost = await new Chains()
  .transaction(db, adapter)
  .chain(getUser(1))
  .chain((results) =>
    createPost({
      userId: results.r1.id,
      title: 'My First Post',
      content: 'Hello World!',
    }),
  )
  .invoke();
```

### TypeORM

```typescript
import { Chains } from '@tool-chain/db';
import { TypeORMAdapter } from '@tool-chain/db/typeorm';
import { DataSource } from 'typeorm';

import { Post } from './entities/Post';
import { User } from './entities/User';

// Initialize TypeORM
const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'user',
  password: 'password',
  database: 'mydb',
  entities: [User, Post],
  synchronize: true,
});

await dataSource.initialize();

const adapter = new TypeORMAdapter();

// Define service functions
function getUser(id: number) {
  return (manager: typeof dataSource.manager) => {
    return manager.findOneOrFail(User, { where: { id } });
  };
}

function getUserPosts(userId: number) {
  return (manager: typeof dataSource.manager) => {
    return manager.find(Post, { where: { userId } });
  };
}

function createPost(data: { userId: number; title: string; content: string }) {
  return (manager: typeof dataSource.manager) => {
    const post = manager.create(Post, data);
    return manager.save(post);
  };
}

// Non-transaction mode
const posts = await new Chains()
  .use(dataSource, adapter)
  .chain(getUser(1))
  .chain((results) => getUserPosts(results.r1.id))
  .invoke();

// Transaction mode
const newPost = await new Chains()
  .transaction(dataSource, adapter)
  .chain(getUser(1))
  .chain((results) =>
    createPost({
      userId: results.r1.id,
      title: 'My First Post',
      content: 'Hello World!',
    }),
  )
  .invoke();
```

### Prisma

```typescript
import { PrismaClient } from '@prisma/client';
import { Chains } from '@tool-chain/db';
import { PrismaAdapter } from '@tool-chain/db/prisma';

// Initialize Prisma
const prisma = new PrismaClient();

const adapter = new PrismaAdapter();

// Define service functions
function getUser(id: number) {
  return (prisma: PrismaClient) => {
    return prisma.user.findUniqueOrThrow({ where: { id } });
  };
}

function getUserPosts(userId: number) {
  return (prisma: PrismaClient) => {
    return prisma.post.findMany({ where: { userId } });
  };
}

function createPost(data: { userId: number; title: string; content: string }) {
  return (prisma: PrismaClient) => {
    return prisma.post.create({ data });
  };
}

// Non-transaction mode
const posts = await new Chains()
  .use(prisma, adapter)
  .chain(getUser(1))
  .chain((results) => getUserPosts(results.r1.id))
  .invoke();

// Transaction mode
const newPost = await new Chains()
  .transaction(prisma, adapter)
  .chain(getUser(1))
  .chain((results) =>
    createPost({
      userId: results.r1.id,
      title: 'My First Post',
      content: 'Hello World!',
    }),
  )
  .invoke();
```

### Drizzle ORM

```typescript
import { Chains } from '@tool-chain/db';
import { DrizzleAdapter } from '@tool-chain/db/drizzle';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import { posts, users } from './schema';

// Initialize Drizzle
const sqlite = new Database('mydb.db');
const db = drizzle(sqlite);

const adapter = new DrizzleAdapter();

// Define service functions
function getUser(id: number) {
  return (db: typeof db) => {
    return db.select().from(users).where(eq(users.id, id)).get();
  };
}

function getUserPosts(userId: number) {
  return (db: typeof db) => {
    return db.select().from(posts).where(eq(posts.userId, userId)).all();
  };
}

function createPost(data: { userId: number; title: string; content: string }) {
  return (db: typeof db) => {
    return db.insert(posts).values(data).returning().get();
  };
}

// Non-transaction mode
const postList = await new Chains()
  .use(db, adapter)
  .chain(getUser(1))
  .chain((results) => getUserPosts(results.r1!.id))
  .invoke();

// Transaction mode
const newPost = await new Chains()
  .transaction(db, adapter)
  .chain(getUser(1))
  .chain((results) =>
    createPost({
      userId: results.r1!.id,
      title: 'My First Post',
      content: 'Hello World!',
    }),
  )
  .invoke();
```

## API Reference

### Chains Class

#### `use(db, adapter?)`

Inject a database instance in non-transaction mode.

- **Parameters:**
  - `db`: Database instance
  - `adapter`: Database adapter (optional)
- **Returns:** New Chains instance with the database type

#### `transaction(db, adapter)`

Enable transaction mode.

- **Parameters:**
  - `db`: Database instance
  - `adapter`: Database adapter (required)
- **Returns:** New Chains instance with the database type

#### `chain(fn, options?)`

Add a database operation to the chain.

**Function Patterns:**

1. **Service Function Pattern (Recommended)**

   ```typescript
   function getUser(id: number) {
     return (db: Database) => {
       // Your database operation
     };
   }
   chains.chain(getUser(123));
   ```

2. **Results Accessor Pattern**
   ```typescript
   chains.chain((results) => getUser(results.r1.id));
   ```

- **Parameters:**
  - `fn`: Database operation function
  - `options`: Chain options (retry, timeout, withoutThrow, etc.)
- **Returns:** New Chains instance with the operation added

**Options:**

- `retry?: number` - Number of retry attempts
- `timeout?: number` - Timeout in milliseconds
- `withoutThrow?: boolean` - Return `{ data?, error? }` instead of throwing

#### `invoke()`

Execute the entire chain.

- **Returns:** Promise resolving to the last operation's result

### Convenience Classes

These classes provide a simpler API by pre-configuring the appropriate adapter for each ORM.

#### `ChainsWithKysely<DB>`

Convenience class for Kysely with pre-configured adapter.

```typescript
import { ChainsWithKysely } from '@tool-chain/db/kysely';

const result = await new ChainsWithKysely<Database>().use(db).chain(getUser(123)).invoke();
```

#### `ChainsWithTypeORM`

Convenience class for TypeORM with pre-configured adapter.

```typescript
import { ChainsWithTypeORM } from '@tool-chain/db/typeorm';

const result = await new ChainsWithTypeORM().use(dataSource).chain(getUser(123)).invoke();
```

#### `ChainsWithPrisma`

Convenience class for Prisma with pre-configured adapter.

```typescript
import { ChainsWithPrisma } from '@tool-chain/db/prisma';

const result = await new ChainsWithPrisma().use(prisma).chain(getUser(123)).invoke();
```

#### `ChainsWithDrizzle<TDb>`

Convenience class for Drizzle ORM with pre-configured adapter.

```typescript
import { ChainsWithDrizzle } from '@tool-chain/db/drizzle';

const result = await new ChainsWithDrizzle().use(db).chain(getUser(123)).invoke();
```

### Adapters

These adapters can be used with the generic `Chains` class if you prefer explicit adapter management.

#### `KyselyAdapter<DB>`

Adapter for Kysely ORM.

```typescript
import { KyselyAdapter } from '@tool-chain/db/kysely';

const adapter = new KyselyAdapter<Database>();
```

#### `TypeORMAdapter`

Adapter for TypeORM.

```typescript
import { TypeORMAdapter } from '@tool-chain/db/typeorm';

const adapter = new TypeORMAdapter();
```

#### `PrismaAdapter`

Adapter for Prisma ORM.

```typescript
import { PrismaAdapter } from '@tool-chain/db/prisma';

const adapter = new PrismaAdapter();
```

#### `DrizzleAdapter`

Adapter for Drizzle ORM.

```typescript
import { DrizzleAdapter } from '@tool-chain/db/drizzle';

const adapter = new DrizzleAdapter();
```

## Error Handling

Use the `withoutThrow` option to handle errors gracefully:

```typescript
const result = await new Chains().use(db, adapter).chain(getUser(999), { withoutThrow: true }).invoke();

if (result.error) {
  console.error('User not found:', result.error);
} else {
  console.log('User:', result.data);
}
```

## Advanced Features

### Retry on Failure

```typescript
const user = await new Chains().use(db, adapter).chain(getUser(123), { retry: 3 }).invoke();
```

### Timeout

```typescript
const user = await new Chains().use(db, adapter).chain(getUser(123), { timeout: 5000 }).invoke();
```

### Accessing Previous Results

```typescript
const result = await new Chains()
  .use(db, adapter)
  .chain(getUser(1))
  .chain(getUserPosts(2))
  .chain((results) => {
    // results.r1 - first operation result (user)
    // results.r2 - second operation result (posts)
    return someOperation(results.r1, results.r2);
  })
  .invoke();
```

## TypeScript Support

This library is written in TypeScript and provides excellent type inference:

```typescript
const result = await new Chains()
  .use(db, adapter)
  .chain(getUser(1)) // Returns User
  .chain((results) => {
    // results.r1 is inferred as User
    return getUserPosts(results.r1.id);
  })
  .invoke(); // Inferred as Post[]
```

## License

MIT © HU SHUKANG

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you have any questions or issues, please open an issue on [GitHub](https://github.com/hu-shukang/tool-chain-db).
