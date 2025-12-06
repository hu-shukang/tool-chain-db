/**
 * Chains 类测试
 * 使用 SQLite 内存数据库进行集成测试
 */
import { Kysely } from 'kysely';

import { Chains, KyselyAdapter } from '../../src/index';
import { BookTable, TestDatabase, UserTable, cleanupDb, createTestDb, seedTestData, setupTables } from './setup';

describe('chains', () => {
  let db: Kysely<TestDatabase>;
  let adapter: KyselyAdapter<TestDatabase>;

  beforeEach(async () => {
    // 创建测试数据库
    db = createTestDb();
    adapter = new KyselyAdapter<TestDatabase>();

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
      function getUser(id: number) {
        return (db: Kysely<TestDatabase>) => {
          return db.selectFrom('user').where('id', '=', id).selectAll().executeTakeFirstOrThrow();
        };
      }

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
      function getUser(id: number) {
        return (db: Kysely<TestDatabase>) => {
          return db.selectFrom('user').where('id', '=', id).selectAll().executeTakeFirstOrThrow();
        };
      }

      function getUserBooks(userId: number) {
        return (db: Kysely<TestDatabase>) => {
          return db.selectFrom('book').where('user_id', '=', userId).selectAll().execute();
        };
      }

      const books = await new Chains()
        .use(db, adapter)
        .chain(getUser(1))
        .chain((r) => getUserBooks(r.r1.id))
        .invoke();

      expect(books).toHaveLength(2);
      expect(books[0]).toMatchObject({ title: 'TypeScript 101', author: 'Alice' });
      expect(books[1]).toMatchObject({ title: 'Database Design', author: 'Alice' });
    });

    test('应该能够访问多个之前的结果', async () => {
      function getUser(id: number) {
        return (db: Kysely<TestDatabase>) => {
          return db.selectFrom('user').where('id', '=', id).selectAll().executeTakeFirstOrThrow();
        };
      }

      function getAllBooks() {
        return (db: Kysely<TestDatabase>) => {
          return db.selectFrom('book').selectAll().execute();
        };
      }

      const result = await new Chains()
        .use(db, adapter)
        .chain(getUser(1))
        .chain(getAllBooks())
        .chain((r) => {
          // 访问 r1 和 r2
          const user = r.r1;
          const allBooks = r.r2;

          // 返回一个组合结果
          return (_db: Kysely<TestDatabase>) => ({
            user: user.name,
            totalBooks: allBooks.length,
            userBooks: allBooks.filter((b) => b.user_id === user.id).length,
          });
        })
        .invoke();

      expect(result).toEqual({
        user: 'Alice',
        totalBooks: 3,
        userBooks: 2,
      });
    });
  });

  describe('事务功能', () => {
    test('应该能够在事务中执行多个操作', async () => {
      function createUser(data: { name: string; email: string }) {
        return async (db: Kysely<TestDatabase>) => {
          const result = await db
            .insertInto('user')
            .values({ ...data, role: 'user', created_at: new Date().toISOString() } as any)
            .returningAll()
            .executeTakeFirstOrThrow();
          return result;
        };
      }

      function createBook(data: { user_id: number; title: string; author: string }) {
        return async (db: Kysely<TestDatabase>) => {
          const result = await db
            .insertInto('book')
            .values({ ...data, created_at: new Date().toISOString() } as any)
            .returningAll()
            .executeTakeFirstOrThrow();
          return result;
        };
      }

      const book = await new Chains()
        .transaction(db, adapter)
        .chain(createUser({ name: 'Dave', email: 'dave@example.com' }))
        .chain((r) => {
          const user = r.r1;
          return createBook({
            user_id: user.id,
            title: 'New Book',
            author: 'Dave',
          });
        })
        .invoke();

      expect(book.title).toBe('New Book');
      expect(book.author).toBe('Dave');

      // 验证数据已插入
      const users = await db.selectFrom('user').selectAll().execute();
      expect(users).toHaveLength(4); // 3 个种子数据 + 1 个新用户
    });

    test('事务失败应该回滚所有操作', async () => {
      function createUser(data: { name: string; email: string }) {
        return async (db: Kysely<TestDatabase>) => {
          const result = await db
            .insertInto('user')
            .values({ ...data, role: 'user', created_at: new Date().toISOString() } as any)
            .returningAll()
            .executeTakeFirstOrThrow();
          return result;
        };
      }

      function throwError() {
        return (_db: Kysely<TestDatabase>) => {
          throw new Error('Test error');
        };
      }

      await expect(
        new Chains()
          .transaction(db, adapter)
          .chain(createUser({ name: 'Eve', email: 'eve@example.com' }))
          .chain(throwError())
          .invoke(),
      ).rejects.toThrow('Test error');

      // 验证事务已回滚，没有新用户插入
      const users = await db.selectFrom('user').selectAll().execute();
      expect(users).toHaveLength(3); // 只有种子数据
    });
  });

  describe('错误处理', () => {
    test('withoutThrow 应该捕获错误', async () => {
      function getUserOrFail(id: number) {
        return (db: Kysely<TestDatabase>) => {
          return db.selectFrom('user').where('id', '=', id).selectAll().executeTakeFirstOrThrow();
        };
      }

      const result = await new Chains()
        .use(db, adapter)
        .chain(getUserOrFail(999), { withoutThrow: true })
        .chain(
          (r): ((db: Kysely<TestDatabase>) => Promise<{ hasError: boolean; message?: string; user?: UserTable }>) => {
            const maybeUser = r.r1;
            if (maybeUser.error) {
              // 错误情况，返回默认值
              return (_db: Kysely<TestDatabase>) =>
                Promise.resolve({ hasError: true, message: maybeUser.error!.message });
            }
            return (_db: Kysely<TestDatabase>) => Promise.resolve({ hasError: false, user: maybeUser.data });
          },
        )
        .invoke();

      expect(result).toHaveProperty('hasError', true);
      expect(result).toHaveProperty('message');
    });

    test('没有 withoutThrow 时应该抛出错误', async () => {
      function getUserOrFail(id: number) {
        return (db: Kysely<TestDatabase>) => {
          return db.selectFrom('user').where('id', '=', id).selectAll().executeTakeFirstOrThrow();
        };
      }

      await expect(new Chains().use(db, adapter).chain(getUserOrFail(999)).invoke()).rejects.toThrow();
    });
  });

  describe('条件执行', () => {
    test('应该根据条件执行不同的操作', async () => {
      function getUser(id: number) {
        return (db: Kysely<TestDatabase>) => {
          return db.selectFrom('user').where('id', '=', id).selectAll().executeTakeFirstOrThrow();
        };
      }

      function deleteAllBooks() {
        return (db: Kysely<TestDatabase>) => {
          return db.deleteFrom('book').execute();
        };
      }

      // 测试管理员权限
      const adminResult = await new Chains()
        .use(db, adapter)
        .chain(getUser(1)) // Alice 是 admin
        .chain((r): ((db: Kysely<TestDatabase>) => Promise<any>) => {
          const user = r.r1;
          if (user.role === 'admin') {
            return deleteAllBooks();
          }
          return (_db: Kysely<TestDatabase>) => Promise.resolve({ message: 'Not authorized' });
        })
        .invoke();

      expect(Array.isArray(adminResult)).toBe(true);

      // 验证所有书籍已删除
      const books = await db.selectFrom('book').selectAll().execute();
      expect(books).toHaveLength(0);
    });

    test('非管理员不应该执行删除操作', async () => {
      function getUser(id: number) {
        return (db: Kysely<TestDatabase>) => {
          return db.selectFrom('user').where('id', '=', id).selectAll().executeTakeFirstOrThrow();
        };
      }

      function deleteAllBooks() {
        return (db: Kysely<TestDatabase>) => {
          return db.deleteFrom('book').execute();
        };
      }

      // 测试普通用户
      const userResult = await new Chains()
        .use(db, adapter)
        .chain(getUser(2)) // Bob 是普通用户
        .chain((r): ((db: Kysely<TestDatabase>) => Promise<any>) => {
          const user = r.r1;
          if (user.role === 'admin') {
            return deleteAllBooks();
          }
          return (_db: Kysely<TestDatabase>) => Promise.resolve({ message: 'Not authorized' });
        })
        .invoke();

      expect(userResult).toEqual({ message: 'Not authorized' });

      // 验证书籍未被删除
      const books = await db.selectFrom('book').selectAll().execute();
      expect(books).toHaveLength(3);
    });
  });

  describe('复杂场景', () => {
    test('应该能够处理复杂的业务逻辑', async () => {
      function getUserWithBooks(userId: number) {
        return async (db: Kysely<TestDatabase>) => {
          const user = await db.selectFrom('user').where('id', '=', userId).selectAll().executeTakeFirstOrThrow();

          const books = await db.selectFrom('book').where('user_id', '=', userId).selectAll().execute();

          return { user, books };
        };
      }

      function updateUserRole(userId: number, newRole: 'user' | 'admin') {
        return (db: Kysely<TestDatabase>) => {
          return db.updateTable('user').set({ role: newRole }).where('id', '=', userId).execute();
        };
      }

      const result = await new Chains()
        .use(db, adapter)
        .chain(getUserWithBooks(2))
        .chain((r): ((db: Kysely<TestDatabase>) => Promise<any>) => {
          const { user, books } = r.r1;
          // 如果用户有书籍，提升为管理员
          if (books.length > 0) {
            return updateUserRole(user.id, 'admin');
          }
          return (_db: Kysely<TestDatabase>) => Promise.resolve({ message: 'No books found' });
        })
        .invoke();

      expect(Array.isArray(result)).toBe(true);

      // 验证用户角色已更新
      const updatedUser = await db.selectFrom('user').where('id', '=', 2).selectAll().executeTakeFirstOrThrow();
      expect(updatedUser.role).toBe('admin');
    });
  });

  describe('ChainOptions 测试', () => {
    describe('retry 选项', () => {
      test('应该在失败时重试指定次数', async () => {
        let attemptCount = 0;

        function failTwiceThenSucceed() {
          return async (_db: Kysely<TestDatabase>) => {
            attemptCount++;
            if (attemptCount < 3) {
              throw new Error(`Attempt ${attemptCount} failed`);
            }
            return { success: true, attempts: attemptCount };
          };
        }

        const result = await new Chains()
          .use(db, adapter)
          .chain(failTwiceThenSucceed(), { retry: 3 })
          .invoke();

        expect(result).toEqual({ success: true, attempts: 3 });
        expect(attemptCount).toBe(3);
      });

      test('应该在重试次数用尽后抛出错误', async () => {
        let attemptCount = 0;

        function alwaysFail() {
          return async (_db: Kysely<TestDatabase>) => {
            attemptCount++;
            throw new Error(`Attempt ${attemptCount} failed`);
          };
        }

        await expect(
          new Chains()
            .use(db, adapter)
            .chain(alwaysFail(), { retry: 2 })
            .invoke(),
        ).rejects.toThrow('Attempt');

        // retry: 2 表示总共执行 3 次（1次初始 + 2次重试）
        expect(attemptCount).toBe(3);
      });

      test('retry 应该与 withoutThrow 一起使用', async () => {
        let attemptCount = 0;

        function alwaysFail() {
          return async (_db: Kysely<TestDatabase>) => {
            attemptCount++;
            throw new Error(`Attempt ${attemptCount} failed`);
          };
        }

        const result = await new Chains()
          .use(db, adapter)
          .chain(alwaysFail(), { retry: 2, withoutThrow: true })
          .invoke();

        expect(result).toHaveProperty('error');
        expect(result.error).toBeInstanceOf(Error);
        expect(attemptCount).toBe(3); // 1次初始 + 2次重试
      });
    });

    describe('timeout 选项', () => {
      test('应该在超时后中断操作', async () => {
        function slowOperation() {
          return async (_db: Kysely<TestDatabase>) => {
            // 等待 200ms
            await new Promise((resolve) => setTimeout(resolve, 200));
            return { success: true };
          };
        }

        await expect(
          new Chains()
            .use(db, adapter)
            .chain(slowOperation(), { timeout: 100 })
            .invoke(),
        ).rejects.toThrow();
      });

      test('应该在时限内完成操作', async () => {
        function fastOperation() {
          return async (_db: Kysely<TestDatabase>) => {
            // 等待 50ms
            await new Promise((resolve) => setTimeout(resolve, 50));
            return { success: true };
          };
        }

        const result = await new Chains()
          .use(db, adapter)
          .chain(fastOperation(), { timeout: 200 })
          .invoke();

        expect(result).toEqual({ success: true });
      });

      test('timeout 应该与 withoutThrow 一起使用', async () => {
        function slowOperation() {
          return async (_db: Kysely<TestDatabase>) => {
            await new Promise((resolve) => setTimeout(resolve, 200));
            return { success: true };
          };
        }

        const result = await new Chains()
          .use(db, adapter)
          .chain(slowOperation(), { timeout: 100, withoutThrow: true })
          .invoke();

        expect(result).toHaveProperty('error');
        expect(result.error).toBeInstanceOf(Error);
      });
    });

    describe('组合使用多个选项', () => {
      test('应该同时应用 retry 和 timeout', async () => {
        let attemptCount = 0;

        function slowOperationThatFailsOnce() {
          return async (_db: Kysely<TestDatabase>) => {
            attemptCount++;
            await new Promise((resolve) => setTimeout(resolve, 50));
            if (attemptCount < 2) {
              throw new Error('First attempt failed');
            }
            return { success: true, attempts: attemptCount };
          };
        }

        const result = await new Chains()
          .use(db, adapter)
          .chain(slowOperationThatFailsOnce(), { retry: 2, timeout: 100 })
          .invoke();

        expect(result).toEqual({ success: true, attempts: 2 });
      });

      test('应该同时应用 retry、timeout 和 withoutThrow', async () => {
        let attemptCount = 0;

        function alwaysSlow() {
          return async (_db: Kysely<TestDatabase>) => {
            attemptCount++;
            await new Promise((resolve) => setTimeout(resolve, 150));
            return { success: true };
          };
        }

        const result = await new Chains()
          .use(db, adapter)
          .chain(alwaysSlow(), { retry: 1, timeout: 100, withoutThrow: true })
          .invoke();

        expect(result).toHaveProperty('error');
        expect(result.error).toBeInstanceOf(Error);
        // retry: 1 表示总共执行 2 次（1次初始 + 1次重试）
        expect(attemptCount).toBe(2);
      });
    });

    describe('在事务中使用 ChainOptions', () => {
      test('retry 应该在事务中工作', async () => {
        let attemptCount = 0;

        function createUserWithRetry(data: { name: string; email: string }) {
          return async (db: Kysely<TestDatabase>) => {
            attemptCount++;
            if (attemptCount < 2) {
              throw new Error('Temporary failure');
            }
            const result = await db
              .insertInto('user')
              .values({ ...data, role: 'user', created_at: new Date().toISOString() } as any)
              .returningAll()
              .executeTakeFirstOrThrow();
            return result;
          };
        }

        const user = await new Chains()
          .transaction(db, adapter)
          .chain(createUserWithRetry({ name: 'Frank', email: 'frank@example.com' }), { retry: 2 })
          .invoke();

        expect(user.name).toBe('Frank');
        expect(attemptCount).toBe(2);

        // 验证用户已创建
        const users = await db.selectFrom('user').selectAll().execute();
        expect(users).toHaveLength(4); // 3 个种子数据 + 1 个新用户
      });

      test('timeout 应该在事务中工作', async () => {
        function slowCreate() {
          return async (_db: Kysely<TestDatabase>) => {
            await new Promise((resolve) => setTimeout(resolve, 200));
            return { success: true };
          };
        }

        await expect(
          new Chains()
            .transaction(db, adapter)
            .chain(slowCreate(), { timeout: 100 })
            .invoke(),
        ).rejects.toThrow();

        // 验证事务已回滚，没有新数据
        const users = await db.selectFrom('user').selectAll().execute();
        expect(users).toHaveLength(3); // 只有种子数据
      });
    });
  });
});
