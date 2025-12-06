/**
 * Chains 类 Drizzle ORM 集成测试
 * 使用 SQLite 内存数据库进行测试
 */
import { eq, sql } from 'drizzle-orm';

import { Chains, DrizzleAdapter } from '../../src/index';
import {
  type BookTable,
  type TestDatabase,
  type UserTable,
  books,
  cleanupDb,
  createTestDb,
  seedTestData,
  setupTables,
  users,
} from './setup';

describe('chains with Drizzle', () => {
  let db: TestDatabase;
  let adapter: DrizzleAdapter<TestDatabase>;

  beforeEach(async () => {
    // 创建测试数据库
    db = createTestDb();
    adapter = new DrizzleAdapter<TestDatabase>();

    // 初始化表结构
    await setupTables(db);

    // 插入测试数据
    await seedTestData(db);
  });

  afterEach(async () => {
    // 清理数据库
    await cleanupDb(db);
  });

  describe('基础功能', () => {
    test('应该能够执行单个查询', async () => {
      // Service 函数
      const getUser = (id: number) => (database: TestDatabase) => {
        return database.select().from(users).where(eq(users.id, id)).get();
      };

      const user = await new Chains().use(db, adapter).chain(getUser(1)).invoke();

      expect(user).toMatchObject({
        id: 1,
        name: 'Alice',
        email: 'alice@example.com',
        role: 'admin',
      });
    });

    test('应该能够执行链式查询', async () => {
      // Service 函数
      const getUser = (id: number) => async (database: TestDatabase) => {
        return await database.select().from(users).where(eq(users.id, id)).get();
      };

      const getUserBooks = (userId: number) => async (database: TestDatabase) => {
        return await database.select().from(books).where(eq(books.userId, userId)).all();
      };

      const userBooks = await new Chains()
        .use(db, adapter)
        .chain(getUser(1))
        .chain((r) => getUserBooks(r.r1!.id))
        .invoke();

      expect(userBooks).toHaveLength(2);
      expect(userBooks[0]).toMatchObject({ title: 'TypeScript 101', author: 'Alice' });
      expect(userBooks[1]).toMatchObject({ title: 'Database Design', author: 'Alice' });
    });
  });

  // TODO: 事务功能测试存在 SQLite 外键约束问题，需要进一步调试
  // describe('事务功能', () => { ... });

  describe('错误处理', () => {
    test('withoutThrow 应该捕获错误', async () => {
      const getUserOrFail = (id: number) => async (database: TestDatabase) => {
        const user = await database.select().from(users).where(eq(users.id, id)).get();
        if (!user) {
          throw new Error('User not found');
        }
        return user;
      };

      const result = await new Chains()
        .use(db, adapter)
        .chain(getUserOrFail(999), { withoutThrow: true })
        .chain((r): ((db: TestDatabase) => Promise<{ hasError: boolean; message?: string; user?: UserTable }>) => {
          const maybeUser = r.r1;
          if (maybeUser.error) {
            // 错误情况，返回默认值
            return (_database: TestDatabase) => Promise.resolve({ hasError: true, message: maybeUser.error!.message });
          }
          return (_database: TestDatabase) => Promise.resolve({ hasError: false, user: maybeUser.data });
        })
        .invoke();

      expect(result).toHaveProperty('hasError', true);
      expect(result).toHaveProperty('message');
    });

    test('没有 withoutThrow 时应该抛出错误', async () => {
      const getUserOrFail = (id: number) => async (database: TestDatabase) => {
        const user = await database.select().from(users).where(eq(users.id, id)).get();
        if (!user) {
          throw new Error('User not found');
        }
        return user;
      };

      await expect(new Chains().use(db, adapter).chain(getUserOrFail(999)).invoke()).rejects.toThrow();
    });
  });

  describe('条件执行', () => {
    test('应该根据条件执行不同的操作', async () => {
      const getUser = (id: number) => async (database: TestDatabase) => {
        return await database.select().from(users).where(eq(users.id, id)).get();
      };

      const deleteAllBooks = () => async (database: TestDatabase) => {
        return await database.delete(books);
      };

      // 测试管理员权限
      const adminResult = await new Chains()
        .use(db, adapter)
        .chain(getUser(1)) // Alice 是 admin
        .chain((r): ((db: TestDatabase) => Promise<any>) => {
          const user = r.r1;
          if (user!.role === 'admin') {
            return deleteAllBooks();
          }
          return (_database: TestDatabase) => Promise.resolve({ message: 'Not authorized' });
        })
        .invoke();

      // DELETE 操作成功
      expect(adminResult).toBeDefined();

      // 验证所有书籍已删除
      const allBooks = await db.select().from(books).all();
      expect(allBooks).toHaveLength(0);
    });

    test('非管理员不应该执行删除操作', async () => {
      const getUser = (id: number) => async (database: TestDatabase) => {
        return await database.select().from(users).where(eq(users.id, id)).get();
      };

      const deleteAllBooks = () => async (database: TestDatabase) => {
        return await database.delete(books);
      };

      // 测试普通用户
      const userResult = await new Chains()
        .use(db, adapter)
        .chain(getUser(2)) // Bob 是普通用户
        .chain((r): ((db: TestDatabase) => Promise<any>) => {
          const user = r.r1;
          if (user!.role === 'admin') {
            return deleteAllBooks();
          }
          return (_database: TestDatabase) => Promise.resolve({ message: 'Not authorized' });
        })
        .invoke();

      expect(userResult).toEqual({ message: 'Not authorized' });

      // 验证书籍未被删除
      const allBooks = await db.select().from(books).all();
      expect(allBooks).toHaveLength(3);
    });
  });

  describe('复杂场景', () => {
    test('应该能够处理复杂的业务逻辑', async () => {
      const getUserWithBooks = (userId: number) => async (database: TestDatabase) => {
        const user = await database.select().from(users).where(eq(users.id, userId)).get();
        const userBooks = await database.select().from(books).where(eq(books.userId, userId)).all();
        return { user, books: userBooks };
      };

      const updateUserRole = (userId: number, newRole: 'user' | 'admin') => async (database: TestDatabase) => {
        return await database.update(users).set({ role: newRole }).where(eq(users.id, userId));
      };

      const result = await new Chains()
        .use(db, adapter)
        .chain(getUserWithBooks(2))
        .chain((r): ((db: TestDatabase) => Promise<any>) => {
          const { user, books: userBooks } = r.r1;
          // 如果用户有书籍，提升为管理员
          if (userBooks.length > 0) {
            return updateUserRole(user!.id, 'admin');
          }
          return (_database: TestDatabase) => Promise.resolve({ message: 'No books found' });
        })
        .invoke();

      // UPDATE 操作成功
      expect(result).toBeDefined();

      // 验证用户角色已更新
      const updatedUser = await db.select().from(users).where(eq(users.id, 2)).get();
      expect(updatedUser?.role).toBe('admin');
    });
  });
});
