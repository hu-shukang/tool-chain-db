# @tool-chain/db

强大的数据库链式操作库 - 基于 [@tool-chain/core](https://www.npmjs.com/package/@tool-chain/core)，专门为数据库操作设计。

## 特性

- ✅ **依赖注入** - 通过 `use()` 或 `transaction()` 一次性注入数据库实例
- ✅ **事务支持** - 内置事务管理，失败自动回滚
- ✅ **高阶函数模式** - 支持 Service 层的高阶函数写法
- ✅ **结果传递** - 访问之前步骤的结果 (`r1`, `r2`, `r3`...)
- ✅ **类型安全** - 完整的 TypeScript 类型支持
- ✅ **高级功能** - 继承 `@tool-chain/core` 的 retry、timeout、withoutThrow 等功能
- ✅ **多数据库** - 支持 Kysely 和 TypeORM，可扩展到其他数据库

## 安装

```bash
npm install @tool-chain/db @tool-chain/core

# 根据你使用的数据库安装对应的库
npm install kysely  # 如果使用 Kysely
# 或
npm install typeorm # 如果使用 TypeORM
```

## 快速开始

### Kysely 示例

```typescript
import { Kysely } from 'kysely';
import { Chains, KyselyAdapter } from '@tool-chain/db';

// 数据库类型定义
interface Database {
  user: UserTable;
  book: BookTable;
}

// 初始化数据库
const db = new Kysely<Database>({ /* ... */ });
const adapter = new KyselyAdapter<Database>();

// Service 层 - 高阶函数模式
function getUser(id: string) {
  return () => (db: Kysely<Database>) => {
    return db
      .selectFrom('user')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirstOrThrow();
  };
}

function getBooks(userId: string) {
  return () => (db: Kysely<Database>) => {
    return db
      .selectFrom('book')
      .where('userId', '=', userId)
      .selectAll()
      .execute();
  };
}

// API 层 - 链式调用
const user = await new Chains()
  .use(db, adapter)
  .chain(getUser('user-123'))
  .invoke();

console.log(user);
```

### TypeORM 示例

```typescript
import { DataSource } from 'typeorm';
import { Chains, TypeORMAdapter } from '@tool-chain/db';

const dataSource = new DataSource({ /* ... */ });
await dataSource.initialize();

const adapter = new TypeORMAdapter();

const user = await new Chains()
  .use(dataSource, adapter)
  .chain((db) => db.getRepository(User).findOne({ where: { id: 'user-123' } }))
  .invoke();
```

## 核心用法

### 1. 基础链式调用

```typescript
const result = await new Chains()
  .use(db, adapter)
  .chain(getUser('user-123'))
  .chain(getUserProfile)
  .invoke();
```

### 2. 访问之前的结果

```typescript
const books = await new Chains()
  .use(db, adapter)
  .chain(getUser('user-123'))
  .chain((r) => {
    // r.r1 是上一步的结果
    const user = r.r1;
    return getBooks(user.id);
  })
  .invoke();
```

### 3. 事务支持

```typescript
await new Chains()
  .transaction(db, adapter)  // 启用事务
  .chain(createUser({ name: 'Alice', email: 'alice@example.com' }))
  .chain((r) => {
    const userId = r.r1.id;
    return createProfile({ userId, bio: 'Developer' });
  })
  .invoke();
// 任何步骤失败都会自动回滚
```

### 4. 错误处理

```typescript
const result = await new Chains()
  .use(db, adapter)
  .chain(getUser('user-123'), {
    withoutThrow: true,  // 捕获错误，不抛出
    retry: 3,            // 失败时重试 3 次
    timeout: 5000,       // 超时 5 秒
  })
  .chain((r) => {
    if (r.r1.error) {
      // 处理错误，返回 (db) => ... 函数
      console.error('Failed to get user:', r.r1.error);
      return (db) => Promise.resolve([]);
    }
    // 使用成功的结果，getBooks 返回 () => (db) => ..., 需要调用一次
    return getBooks(r.r1.data.id)();
  })
  .invoke();
```

### 5. 条件执行

```typescript
const result = await new Chains()
  .use(db, adapter)
  .chain(getUser('user-123'))
  .chain((r) => {
    const user = r.r1;
    // 只有管理员才能删除所有书籍
    if (user.role === 'admin') {
      return (db) => db.deleteFrom('book').execute();
    }
    return (db) => Promise.resolve({ message: 'Not authorized' });
  })
  .invoke();
```

## API 文档

### `Chains<TDb, TResults>`

核心链式操作类。

#### 方法

##### `use(db, adapter?)`

注入数据库实例（非事务模式）。

```typescript
const chains = new Chains().use(db, adapter);
```

##### `transaction(db, adapter)`

启用事务模式。

```typescript
const chains = new Chains().transaction(db, adapter);
```

##### `chain(fn, options?)`

添加一个数据库操作到链中。

支持两种函数模式：
1. **Service 函数（高阶函数）**：`getUser('id')` - 返回 `() => (db) => ...`
2. **结果访问函数**：`(results) => getUser(results.r1.id)` - 返回 `(db) => ...`

**选项**：
- `withoutThrow?: boolean` - 捕获错误而不抛出
- `retry?: number` - 重试次数
- `retryDelay?: number` - 重试延迟（毫秒）
- `retryWhen?: ...` - 重试条件
- `timeout?: number` - 超时（毫秒）

```typescript
chains.chain(getUser('id'), { retry: 3, timeout: 5000 });
```

##### `invoke()`

执行整个链并返回最后一个操作的结果。

```typescript
const result = await chains.invoke();
```

### 适配器

#### `KyselyAdapter<DB>`

Kysely 数据库适配器。

```typescript
const adapter = new KyselyAdapter<Database>();
```

#### `TypeORMAdapter`

TypeORM 数据库适配器。

```typescript
const adapter = new TypeORMAdapter();
```

## 设计模式

### Service 层模式

推荐将数据库操作封装成高阶函数：

```typescript
// book.service.ts
export function getBook(bookId: string) {
  return () => (db: Kysely<Database>) => {
    return db.selectFrom('bookTbl')
      .where('id', '=', bookId)
      .selectAll()
      .executeTakeFirstOrThrow();
  };
}

export function deleteBook(bookId: string) {
  return () => (db: Kysely<Database>) => {
    return db.deleteFrom('bookTbl')
      .where('id', '=', bookId)
      .executeTakeFirst();
  };
}

export function queryBooks(condition: BookQueryInput) {
  return () => async (db: Kysely<Database>) => {
    const { id, title, username } = condition;
    let query = db
      .selectFrom('bookTbl as b')
      .innerJoin('userTbl as u', 'b.userId', 'u.id')
      .select(['b.id', 'b.title', 'u.username']);

    if (id) query = query.where('b.id', '=', id);
    if (title) query = query.where('b.title', 'like', `%${title}%`);
    if (username) query = query.where('u.username', 'like', `%${username}%`);

    return await query.execute();
  };
}
```

### API 层使用

```typescript
// books.controller.ts
import { getBook, queryBooks, deleteBook } from './book.service';

// 简单查询
app.get('/books', async (req, res) => {
  const books = await new Chains()
    .use(db, adapter)
    .chain(queryBooks(req.query))
    .invoke();

  res.json(books);
});

// 复杂操作 - 查询并删除
app.delete('/books/:id', async (req, res) => {
  const result = await new Chains()
    .use(db, adapter)
    .chain(getBook(req.params.id))  // 先查询确认存在
    .chain((r) => deleteBook(req.params.id))  // 再删除
    .invoke();

  res.json({ success: true });
});

// 事务操作
app.post('/books', async (req, res) => {
  const book = await new Chains()
    .transaction(db, adapter)
    .chain(createBook(req.body))
    .chain((r) => logBookCreation(r.r1.id))
    .invoke();

  res.json(book);
});
```

## 与 @tool-chain/core 的关系

`@tool-chain/db` 基于 `@tool-chain/core` 构建：

- **继承高级功能**：retry、timeout、withoutThrow 等选项直接来自 core
- **扩展数据库特性**：添加了 `use()`、`transaction()` 和数据库适配器
- **兼容性**：可以在同一个项目中同时使用两个包

```typescript
import { Chains as CoreChains } from '@tool-chain/core';  // 通用链
import { Chains } from '@tool-chain/db';                  // 数据库链

// 通用异步操作
await new CoreChains()
  .chain(() => fetchData())
  .chain((r) => processData(r.r1))
  .invoke();

// 数据库操作
await new Chains()
  .use(db, adapter)
  .chain(getUser('id'))
  .invoke();
```

## 许可证

MIT © HU SHUKANG
