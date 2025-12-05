/**
 * Kysely 使用示例
 * 演示如何使用 @tool-chain/db 与 Kysely
 */
import { Kysely } from 'kysely';

import { Chains, KyselyAdapter } from '../src/index';

// =========================
// 1. 定义数据库类型
// =========================

interface UserTable {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: Date;
}

interface BookTable {
  id: string;
  userId: string;
  title: string;
  author: string;
  createdAt: Date;
}

interface Database {
  user: UserTable;
  book: BookTable;
}

// =========================
// 2. Service 层 - 高阶函数模式
// =========================

// 注意：Service 函数返回 () => (db) => ... 的形式
// 这样在 chain 中调用时，会自动执行并获得 (db) => ... 函数

function getUser(id: string) {
  return () => (db: Kysely<Database>) => {
    return db.selectFrom('user').where('id', '=', id).selectAll().executeTakeFirstOrThrow();
  };
}

function getBooks(userId: string) {
  return () => (db: Kysely<Database>) => {
    return db.selectFrom('book').where('userId', '=', userId).selectAll().execute();
  };
}

function createUser(data: { name: string; email: string }) {
  return () => async (db: Kysely<Database>) => {
    const result = await db
      .insertInto('user')
      .values({
        id: Math.random().toString(36).substr(2, 9),
        name: data.name,
        email: data.email,
        role: 'user',
        createdAt: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  };
}

function createBook(data: { userId: string; title: string; author: string }) {
  return () => async (db: Kysely<Database>) => {
    const result = await db
      .insertInto('book')
      .values({
        id: Math.random().toString(36).substr(2, 9),
        userId: data.userId,
        title: data.title,
        author: data.author,
        createdAt: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  };
}

// =========================
// 3. 使用示例
// =========================

async function examples() {
  // 假设 db 已经初始化
  const db = {} as Kysely<Database>; // 实际使用时需要正确初始化
  const adapter = new KyselyAdapter<Database>();

  // 示例 1: 基础查询
  console.log('=== 示例 1: 基础查询 ===');
  const user = await new Chains().use(db, adapter).chain(getUser('user-123')).invoke();

  console.log('User:', user);

  // 示例 2: 链式调用 - 查询用户的所有书籍
  console.log('\n=== 示例 2: 链式调用 ===');
  const books = await new Chains()
    .use(db, adapter)
    .chain(getUser('user-123'))
    .chain((r) => {
      // r.r1 是上一步查询的用户
      const user = r.r1;
      return getBooks(user.id);
    })
    .invoke();

  console.log('Books:', books);

  // 示例 3: 事务 - 创建用户和书籍
  console.log('\n=== 示例 3: 事务操作 ===');
  const result = await new Chains()
    .transaction(db, adapter)
    .chain(createUser({ name: 'Alice', email: 'alice@example.com' }))
    .chain((r) => {
      const user = r.r1;
      return createBook({
        userId: user.id,
        title: 'My First Book',
        author: 'Alice',
      });
    })
    .invoke();

  console.log('Created book:', result);

  // 示例 4: 错误处理
  console.log('\n=== 示例 4: 错误处理 ===');
  const safeResult = await new Chains()
    .use(db, adapter)
    .chain(getUser('non-existent-id'), {
      withoutThrow: true, // 不抛出异常
      retry: 3, // 失败时重试 3 次
      timeout: 5000, // 超时 5 秒
    })
    .chain((r) => {
      const result = r.r1 as { error?: Error; data?: UserTable };
      if (result.error) {
        console.error('Failed to get user:', result.error.message);
        // 返回 (db) => ... 函数
        return (_db: Kysely<Database>) => Promise.resolve([]);
      }
      // getBooks 返回的是 () => (db) => ..., 需要调用一次得到 (db) => ...
      return getBooks(result.data!.id)();
    })
    .invoke();

  console.log('Safe result:', safeResult);

  // 示例 5: 条件执行
  console.log('\n=== 示例 5: 条件执行 ===');

  // 先定义两个操作函数
  function deleteAllBooks() {
    return () => (db: Kysely<Database>) => db.deleteFrom('book').execute();
  }

  function returnMessage(message: string) {
    return () => (_db: Kysely<Database>) => Promise.resolve([{ message }] as any);
  }

  const adminResult = await new Chains()
    .use(db, adapter)
    .chain(getUser('user-123'))
    .chain((r) => {
      const user = r.r1;
      // 根据用户角色返回不同的操作
      if (user.role === 'admin') {
        return deleteAllBooks()();
      }
      return returnMessage('Not authorized')();
    })
    .invoke();

  console.log('Admin result:', adminResult);
}

// 导出示例函数供外部调用
export { examples };

// 运行示例（注释掉，因为需要真实的数据库连接）
// examples().catch(console.error);
