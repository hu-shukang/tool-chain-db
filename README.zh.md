# @tool-chain/db

[![npm version](https://img.shields.io/npm/v/@tool-chain/db.svg)](https://www.npmjs.com/package/@tool-chain/db)
[![npm downloads](https://img.shields.io/npm/dm/@tool-chain/db.svg)](https://www.npmjs.com/package/@tool-chain/db)
[![Node.js Version](https://img.shields.io/node/v/@tool-chain/db.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

基于 [@tool-chain/core](https://github.com/hu-shukang/tool-chain-core) 的数据库链式操作库，专为构建可组合的数据库操作而设计，支持多种 ORM 框架。

[English](https://github.com/hu-shukang/tool-chain-db/blob/main/README.md) | [日本語ドキュメント](https://github.com/hu-shukang/tool-chain-db/blob/main/README.ja.md)

## 特性

✨ **多 ORM 支持** - 支持 Kysely、TypeORM、Prisma 和 Drizzle ORM
🔗 **链式 API** - 使用流畅的接口构建复杂的数据库操作
🔄 **事务管理** - 内置事务支持，自动提交/回滚
📦 **结果传递** - 在后续步骤中访问前一步的操作结果
🎯 **类型安全** - 完整的 TypeScript 支持，优秀的类型推断
🛡️ **错误处理** - 集成错误处理，支持 `withoutThrow` 选项
⚡ **高级特性** - 支持重试、超时等来自 @tool-chain/core 的功能
🎨 **Service 模式** - 高阶函数模式，打造清晰的服务层设计

## 安装

```bash
npm install @tool-chain/db @tool-chain/core
```

然后安装你喜欢的 ORM（一个或多个）：

```bash
# Kysely
npm install kysely

# TypeORM
npm install typeorm

# Prisma
npm install @prisma/client

# Drizzle ORM
npm install drizzle-orm
```

## 导入

为了避免加载不必要的依赖，适配器应该从其特定子路径导入：

```typescript
// 导入核心类和类型
import { Chains } from '@tool-chain/db';
import { ChainsWithDrizzle, DrizzleAdapter } from '@tool-chain/db/drizzle';
// 导入特定适配器（仅导入需要的）
import { ChainsWithKysely, KyselyAdapter } from '@tool-chain/db/kysely';
import { ChainsWithPrisma, PrismaAdapter } from '@tool-chain/db/prisma';
import { ChainsWithTypeORM, TypeORMAdapter } from '@tool-chain/db/typeorm';
```

这确保如果你仅使用 Kysely，TypeORM 不会被加载，你也不会因为缺少 TypeORM 依赖而出错。

## 快速开始

### 基础用法

本库提供两种使用方式：

**方式一：使用便利类（推荐）**

```typescript
import { ChainsWithKysely } from '@tool-chain/db/kysely';
import { Kysely } from 'kysely';

// 定义你的 service 函数
function getUser(id: number) {
  return (db: Kysely<Database>) => {
    return db.selectFrom('user').where('id', '=', id).selectAll().executeTakeFirstOrThrow();
  };
}

// 执行链式操作 - 无需手动传递 adapter
const user = await new ChainsWithKysely<Database>().use(db).chain(getUser(123)).invoke();
```

**方式二：使用通用 Chains 类**

```typescript
import { Chains } from '@tool-chain/db';
import { KyselyAdapter } from '@tool-chain/db/kysely';
import { Kysely } from 'kysely';

// 定义你的 service 函数
function getUser(id: number) {
  return (db: Kysely<Database>) => {
    return db.selectFrom('user').where('id', '=', id).selectAll().executeTakeFirstOrThrow();
  };
}

// 执行链式操作 - 需要显式传递 adapter
const user = await new Chains().use(db, new KyselyAdapter()).chain(getUser(123)).invoke();
```

### 使用事务

**使用便利类：**

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

**使用通用 Chains 类：**

```typescript
import { Chains } from '@tool-chain/db';
import { KyselyAdapter } from '@tool-chain/db/kysely';

const result = await new Chains()
  .transaction(db, new KyselyAdapter())
  .chain(createUser({ name: 'Alice', email: 'alice@example.com' }))
  .chain((results) => createProfile(results.r1.id))
  .invoke();
```

## 各 ORM 的使用示例

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

// 初始化 Kysely
const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      host: 'localhost',
      database: 'mydb',
    }),
  }),
});

const adapter = new KyselyAdapter<Database>();

// 定义 service 函数
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

// 非事务模式
const posts = await new Chains()
  .use(db, adapter)
  .chain(getUser(1))
  .chain((results) => getUserPosts(results.r1.id))
  .invoke();

// 事务模式
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

// 初始化 TypeORM
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

// 定义 service 函数
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

// 非事务模式
const posts = await new Chains()
  .use(dataSource, adapter)
  .chain(getUser(1))
  .chain((results) => getUserPosts(results.r1.id))
  .invoke();

// 事务模式
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

// 初始化 Prisma
const prisma = new PrismaClient();

const adapter = new PrismaAdapter();

// 定义 service 函数
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

// 非事务模式
const posts = await new Chains()
  .use(prisma, adapter)
  .chain(getUser(1))
  .chain((results) => getUserPosts(results.r1.id))
  .invoke();

// 事务模式
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

// 初始化 Drizzle
const sqlite = new Database('mydb.db');
const db = drizzle(sqlite);

const adapter = new DrizzleAdapter();

// 定义 service 函数
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

// 非事务模式
const postList = await new Chains()
  .use(db, adapter)
  .chain(getUser(1))
  .chain((results) => getUserPosts(results.r1!.id))
  .invoke();

// 事务模式
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

## API 参考

### Chains 类

#### `use(db, adapter?)`

注入数据库实例（非事务模式）。

- **参数：**
  - `db`: 数据库实例
  - `adapter`: 数据库适配器（可选）
- **返回：** 带有数据库类型的新 Chains 实例

#### `transaction(db, adapter)`

启用事务模式。

- **参数：**
  - `db`: 数据库实例
  - `adapter`: 数据库适配器（必需）
- **返回：** 带有数据库类型的新 Chains 实例

#### `chain(fn, options?)`

向链中添加数据库操作。

**函数模式：**

1. **Service 函数模式（推荐）**

   ```typescript
   function getUser(id: number) {
     return (db: Database) => {
       // 你的数据库操作
     };
   }
   chains.chain(getUser(123));
   ```

2. **结果访问器模式**
   ```typescript
   chains.chain((results) => getUser(results.r1.id));
   ```

- **参数：**
  - `fn`: 数据库操作函数
  - `options`: 链选项（retry、timeout、withoutThrow 等）
- **返回：** 添加了操作的新 Chains 实例

**选项：**

- `retry?: number` - 重试次数
- `timeout?: number` - 超时时间（毫秒）
- `withoutThrow?: boolean` - 返回 `{ data?, error? }` 而不是抛出异常

#### `invoke()`

执行整个链。

- **返回：** Promise，解析为最后一个操作的结果

### 便利类

这些类通过预配置适当的适配器为各个 ORM 提供了更简单的 API。

#### `ChainsWithKysely<DB>`

Kysely 的便利类，已预配置适配器。

```typescript
import { ChainsWithKysely } from '@tool-chain/db/kysely';

const result = await new ChainsWithKysely<Database>().use(db).chain(getUser(123)).invoke();
```

#### `ChainsWithTypeORM`

TypeORM 的便利类，已预配置适配器。

```typescript
import { ChainsWithTypeORM } from '@tool-chain/db/typeorm';

const result = await new ChainsWithTypeORM().use(dataSource).chain(getUser(123)).invoke();
```

#### `ChainsWithPrisma`

Prisma 的便利类，已预配置适配器。

```typescript
import { ChainsWithPrisma } from '@tool-chain/db/prisma';

const result = await new ChainsWithPrisma().use(prisma).chain(getUser(123)).invoke();
```

#### `ChainsWithDrizzle<TDb>`

Drizzle ORM 的便利类，已预配置适配器。

```typescript
import { ChainsWithDrizzle } from '@tool-chain/db/drizzle';

const result = await new ChainsWithDrizzle().use(db).chain(getUser(123)).invoke();
```

### 适配器

如果你更喜欢显式管理适配器，这些适配器可以与通用 `Chains` 类一起使用。

#### `KyselyAdapter<DB>`

Kysely ORM 的适配器。

```typescript
import { KyselyAdapter } from '@tool-chain/db/kysely';

const adapter = new KyselyAdapter<Database>();
```

#### `TypeORMAdapter`

TypeORM 的适配器。

```typescript
import { TypeORMAdapter } from '@tool-chain/db/typeorm';

const adapter = new TypeORMAdapter();
```

#### `PrismaAdapter`

Prisma ORM 的适配器。

```typescript
import { PrismaAdapter } from '@tool-chain/db/prisma';

const adapter = new PrismaAdapter();
```

#### `DrizzleAdapter`

Drizzle ORM 的适配器。

```typescript
import { DrizzleAdapter } from '@tool-chain/db/drizzle';

const adapter = new DrizzleAdapter();
```

## 错误处理

使用 `withoutThrow` 选项优雅地处理错误：

```typescript
const result = await new Chains().use(db, adapter).chain(getUser(999), { withoutThrow: true }).invoke();

if (result.error) {
  console.error('用户未找到：', result.error);
} else {
  console.log('用户：', result.data);
}
```

## 高级特性

### 失败重试

```typescript
const user = await new Chains().use(db, adapter).chain(getUser(123), { retry: 3 }).invoke();
```

### 超时控制

```typescript
const user = await new Chains().use(db, adapter).chain(getUser(123), { timeout: 5000 }).invoke();
```

### 访问前一步的结果

```typescript
const result = await new Chains()
  .use(db, adapter)
  .chain(getUser(1))
  .chain(getUserPosts(2))
  .chain((results) => {
    // results.r1 - 第一个操作的结果（user）
    // results.r2 - 第二个操作的结果（posts）
    return someOperation(results.r1, results.r2);
  })
  .invoke();
```

## TypeScript 支持

本库使用 TypeScript 编写，提供优秀的类型推断：

```typescript
const result = await new Chains()
  .use(db, adapter)
  .chain(getUser(1)) // 返回 User
  .chain((results) => {
    // results.r1 被推断为 User
    return getUserPosts(results.r1.id);
  })
  .invoke(); // 推断为 Post[]
```

## 许可证

MIT © HU SHUKANG

## 贡献

欢迎贡献！请随时提交 Pull Request。

## 支持

如果你有任何问题或遇到问题，请在 [GitHub](https://github.com/hu-shukang/tool-chain-db) 上开启 issue。
