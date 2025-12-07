# @tool-chain/db

[![npm version](https://img.shields.io/npm/v/@tool-chain/db.svg)](https://www.npmjs.com/package/@tool-chain/db)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[@tool-chain/core](https://github.com/yourusername/tool-chain-core) をベースにしたデータベースチェーン操作ライブラリ。複数のORMフレームワークに対応し、組み合わせ可能なデータベース操作の構築を目的として設計されています。

[English](./README.md) | [中文文档](./README.zh-CN.md)

## 特徴

✨ **マルチORM対応** - Kysely、TypeORM、Prisma、Drizzle ORMに対応
🔗 **チェーン可能なAPI** - 流暢なインターフェースで複雑なデータベース操作を構築
🔄 **トランザクション管理** - 自動コミット/ロールバック機能を備えた組み込みトランザクションサポート
📦 **結果の受け渡し** - 後続のステップで前の操作結果にアクセス可能
🎯 **型安全** - 完全なTypeScriptサポートと優れた型推論
🛡️ **エラーハンドリング** - `withoutThrow`オプションによる統合エラーハンドリング
⚡ **高度な機能** - @tool-chain/coreからのリトライ、タイムアウトなどの機能
🎨 **Serviceパターン** - 高階関数パターンによるクリーンなサービスレイヤー設計

## インストール

```bash
npm install @tool-chain/db @tool-chain/core
```

次に、お好みのORMをインストールします（1つ以上）：

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

## インポート

不要な依存関係の読み込みを避けるため、アダプターは特定のサブパスからインポートする必要があります：

```typescript
// コアクラスと型をインポート
import { Chains } from '@tool-chain/db';

// 特定のアダプターをインポート（必要なものだけ）
import { KyselyAdapter, ChainsWithKysely } from '@tool-chain/db/kysely';
import { TypeORMAdapter, ChainsWithTypeORM } from '@tool-chain/db/typeorm';
import { PrismaAdapter, ChainsWithPrisma } from '@tool-chain/db/prisma';
import { DrizzleAdapter, ChainsWithDrizzle } from '@tool-chain/db/drizzle';
```

これにより、Kyselyのみを使用する場合、TypeORMは読み込まれず、TypeORMの依存関係がないというエラーも発生しません。

## クイックスタート

### 基本的な使用方法

このライブラリには2つの使用方法があります：

**方法1：便利クラスを使用（推奨）**

```typescript
import { ChainsWithKysely } from '@tool-chain/db/kysely';
import { Kysely } from 'kysely';

// サービス関数を定義
function getUser(id: number) {
  return (db: Kysely<Database>) => {
    return db
      .selectFrom('user')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirstOrThrow();
  };
}

// チェーンを実行 - adapterを手動で渡す必要なし
const user = await new ChainsWithKysely<Database>()
  .use(db)
  .chain(getUser(123))
  .invoke();
```

**方法2：汎用Chainsクラスを使用**

```typescript
import { Chains } from '@tool-chain/db';
import { KyselyAdapter } from '@tool-chain/db/kysely';
import { Kysely } from 'kysely';

// サービス関数を定義
function getUser(id: number) {
  return (db: Kysely<Database>) => {
    return db
      .selectFrom('user')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirstOrThrow();
  };
}

// チェーンを実行 - adapterを明示的に渡す必要あり
const user = await new Chains()
  .use(db, new KyselyAdapter())
  .chain(getUser(123))
  .invoke();
```

### トランザクションを使用

**便利クラスを使用：**

```typescript
import { ChainsWithKysely } from '@tool-chain/db/kysely';

function createUser(data: { name: string; email: string }) {
  return (db: Kysely<Database>) => {
    return db
      .insertInto('user')
      .values(data)
      .returningAll()
      .executeTakeFirstOrThrow();
  };
}

function createProfile(userId: number) {
  return (db: Kysely<Database>) => {
    return db
      .insertInto('profile')
      .values({ userId })
      .returningAll()
      .executeTakeFirstOrThrow();
  };
}

const result = await new ChainsWithKysely<Database>()
  .transaction(db)
  .chain(createUser({ name: 'Alice', email: 'alice@example.com' }))
  .chain((results) => createProfile(results.r1.id))
  .invoke();
```

**汎用Chainsクラスを使用：**

```typescript
import { Chains } from '@tool-chain/db';
import { KyselyAdapter } from '@tool-chain/db/kysely';

const result = await new Chains()
  .transaction(db, new KyselyAdapter())
  .chain(createUser({ name: 'Alice', email: 'alice@example.com' }))
  .chain((results) => createProfile(results.r1.id))
  .invoke();
```

## ORMごとの使用例

### Kysely

```typescript
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { Chains } from '@tool-chain/db';
import { KyselyAdapter } from '@tool-chain/db/kysely';

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

// Kyselyを初期化
const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      host: 'localhost',
      database: 'mydb',
    }),
  }),
});

const adapter = new KyselyAdapter<Database>();

// サービス関数を定義
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

// 非トランザクションモード
const posts = await new Chains()
  .use(db, adapter)
  .chain(getUser(1))
  .chain((results) => getUserPosts(results.r1.id))
  .invoke();

// トランザクションモード
const newPost = await new Chains()
  .transaction(db, adapter)
  .chain(getUser(1))
  .chain((results) =>
    createPost({
      userId: results.r1.id,
      title: 'My First Post',
      content: 'Hello World!',
    })
  )
  .invoke();
```

### TypeORM

```typescript
import { DataSource } from 'typeorm';
import { Chains } from '@tool-chain/db';
import { TypeORMAdapter } from '@tool-chain/db/typeorm';
import { User } from './entities/User';
import { Post } from './entities/Post';

// TypeORMを初期化
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

// サービス関数を定義
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

// 非トランザクションモード
const posts = await new Chains()
  .use(dataSource, adapter)
  .chain(getUser(1))
  .chain((results) => getUserPosts(results.r1.id))
  .invoke();

// トランザクションモード
const newPost = await new Chains()
  .transaction(dataSource, adapter)
  .chain(getUser(1))
  .chain((results) =>
    createPost({
      userId: results.r1.id,
      title: 'My First Post',
      content: 'Hello World!',
    })
  )
  .invoke();
```

### Prisma

```typescript
import { PrismaClient } from '@prisma/client';
import { Chains } from '@tool-chain/db';
import { PrismaAdapter } from '@tool-chain/db/prisma';

// Prismaを初期化
const prisma = new PrismaClient();

const adapter = new PrismaAdapter();

// サービス関数を定義
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

// 非トランザクションモード
const posts = await new Chains()
  .use(prisma, adapter)
  .chain(getUser(1))
  .chain((results) => getUserPosts(results.r1.id))
  .invoke();

// トランザクションモード
const newPost = await new Chains()
  .transaction(prisma, adapter)
  .chain(getUser(1))
  .chain((results) =>
    createPost({
      userId: results.r1.id,
      title: 'My First Post',
      content: 'Hello World!',
    })
  )
  .invoke();
```

### Drizzle ORM

```typescript
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { Chains } from '@tool-chain/db';
import { DrizzleAdapter } from '@tool-chain/db/drizzle';
import { users, posts } from './schema';
import { eq } from 'drizzle-orm';

// Drizzleを初期化
const sqlite = new Database('mydb.db');
const db = drizzle(sqlite);

const adapter = new DrizzleAdapter();

// サービス関数を定義
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

// 非トランザクションモード
const postList = await new Chains()
  .use(db, adapter)
  .chain(getUser(1))
  .chain((results) => getUserPosts(results.r1!.id))
  .invoke();

// トランザクションモード
const newPost = await new Chains()
  .transaction(db, adapter)
  .chain(getUser(1))
  .chain((results) =>
    createPost({
      userId: results.r1!.id,
      title: 'My First Post',
      content: 'Hello World!',
    })
  )
  .invoke();
```

## APIリファレンス

### Chainsクラス

#### `use(db, adapter?)`

非トランザクションモードでデータベースインスタンスを注入します。

- **パラメータ：**
  - `db`: データベースインスタンス
  - `adapter`: データベースアダプター（オプション）
- **戻り値：** データベース型を持つ新しいChainsインスタンス

#### `transaction(db, adapter)`

トランザクションモードを有効にします。

- **パラメータ：**
  - `db`: データベースインスタンス
  - `adapter`: データベースアダプター（必須）
- **戻り値：** データベース型を持つ新しいChainsインスタンス

#### `chain(fn, options?)`

チェーンにデータベース操作を追加します。

**関数パターン：**

1. **サービス関数パターン（推奨）**
   ```typescript
   function getUser(id: number) {
     return (db: Database) => {
       // データベース操作
     };
   }
   chains.chain(getUser(123));
   ```

2. **結果アクセサーパターン**
   ```typescript
   chains.chain((results) => getUser(results.r1.id));
   ```

- **パラメータ：**
  - `fn`: データベース操作関数
  - `options`: チェーンオプション（retry、timeout、withoutThrowなど）
- **戻り値：** 操作が追加された新しいChainsインスタンス

**オプション：**

- `retry?: number` - リトライ回数
- `timeout?: number` - タイムアウト（ミリ秒）
- `withoutThrow?: boolean` - 例外をスローする代わりに`{ data?, error? }`を返す

#### `invoke()`

チェーン全体を実行します。

- **戻り値：** 最後の操作の結果に解決されるPromise

### 便利クラス

これらのクラスは、各ORMに適切なアダプターを事前設定することで、よりシンプルなAPIを提供します。

#### `ChainsWithKysely<DB>`

Kysely用の便利クラス、アダプターが事前設定済み。

```typescript
import { ChainsWithKysely } from '@tool-chain/db/kysely';

const result = await new ChainsWithKysely<Database>()
  .use(db)
  .chain(getUser(123))
  .invoke();
```

#### `ChainsWithTypeORM`

TypeORM用の便利クラス、アダプターが事前設定済み。

```typescript
import { ChainsWithTypeORM } from '@tool-chain/db/typeorm';

const result = await new ChainsWithTypeORM()
  .use(dataSource)
  .chain(getUser(123))
  .invoke();
```

#### `ChainsWithPrisma`

Prisma用の便利クラス、アダプターが事前設定済み。

```typescript
import { ChainsWithPrisma } from '@tool-chain/db/prisma';

const result = await new ChainsWithPrisma()
  .use(prisma)
  .chain(getUser(123))
  .invoke();
```

#### `ChainsWithDrizzle<TDb>`

Drizzle ORM用の便利クラス、アダプターが事前設定済み。

```typescript
import { ChainsWithDrizzle } from '@tool-chain/db/drizzle';

const result = await new ChainsWithDrizzle()
  .use(db)
  .chain(getUser(123))
  .invoke();
```

### アダプター

アダプターを明示的に管理したい場合は、これらのアダプターを汎用の`Chains`クラスと一緒に使用できます。

#### `KyselyAdapter<DB>`

Kysely ORM用のアダプター。

```typescript
import { KyselyAdapter } from '@tool-chain/db/kysely';
const adapter = new KyselyAdapter<Database>();
```

#### `TypeORMAdapter`

TypeORM用のアダプター。

```typescript
import { TypeORMAdapter } from '@tool-chain/db/typeorm';
const adapter = new TypeORMAdapter();
```

#### `PrismaAdapter`

Prisma ORM用のアダプター。

```typescript
import { PrismaAdapter } from '@tool-chain/db/prisma';
const adapter = new PrismaAdapter();
```

#### `DrizzleAdapter`

Drizzle ORM用のアダプター。

```typescript
import { DrizzleAdapter } from '@tool-chain/db/drizzle';
const adapter = new DrizzleAdapter();
```

## エラーハンドリング

`withoutThrow`オプションを使用してエラーを適切に処理します：

```typescript
const result = await new Chains()
  .use(db, adapter)
  .chain(getUser(999), { withoutThrow: true })
  .invoke();

if (result.error) {
  console.error('ユーザーが見つかりません：', result.error);
} else {
  console.log('ユーザー：', result.data);
}
```

## 高度な機能

### 失敗時のリトライ

```typescript
const user = await new Chains()
  .use(db, adapter)
  .chain(getUser(123), { retry: 3 })
  .invoke();
```

### タイムアウト

```typescript
const user = await new Chains()
  .use(db, adapter)
  .chain(getUser(123), { timeout: 5000 })
  .invoke();
```

### 前のステップの結果にアクセス

```typescript
const result = await new Chains()
  .use(db, adapter)
  .chain(getUser(1))
  .chain(getUserPosts(2))
  .chain((results) => {
    // results.r1 - 最初の操作の結果（user）
    // results.r2 - 2番目の操作の結果（posts）
    return someOperation(results.r1, results.r2);
  })
  .invoke();
```

## TypeScriptサポート

このライブラリはTypeScriptで書かれており、優れた型推論を提供します：

```typescript
const result = await new Chains()
  .use(db, adapter)
  .chain(getUser(1)) // Userを返す
  .chain((results) => {
    // results.r1はUserとして推論される
    return getUserPosts(results.r1.id);
  })
  .invoke(); // Post[]として推論される
```

## ライセンス

MIT © HU SHUKANG

## コントリビューション

コントリビューションを歓迎します！お気軽にPull Requestを提出してください。

## サポート

質問や問題がある場合は、[GitHub](https://github.com/yourusername/tool-chain-db)でissueを開いてください。
