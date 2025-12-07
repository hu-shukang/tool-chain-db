/**
 * Chains 类 Prisma 集成测试
 * 使用 SQLite 内存数据库进行测试
 */
import { PrismaClient } from '@prisma/client';

import { Chains } from '../../src/index';
import { PrismaAdapter } from '../../src/adapters/prisma';
import {
  type BookTable,
  type TestPrismaClient,
  type UserTable,
  cleanupDb,
  createTestPrisma,
  seedTestData,
  setupTables,
} from './setup';

describe('chains with Prisma', () => {
  let prisma: TestPrismaClient;
  let adapter: PrismaAdapter;

  beforeEach(async () => {
    // 创建测试数据库
    prisma = createTestPrisma();
    adapter = new PrismaAdapter();

    // 初始化表结构
    await setupTables(prisma);

    // 插入测试数据
    await seedTestData(prisma);
  });

  afterEach(async () => {
    // 清理数据库
    await cleanupDb(prisma);
  });

  describe('基础功能', () => {
    test('应该能够执行单个查询', async () => {
      // Service 函数
      function getUser(id: number) {
        return async (db: PrismaClient) => {
          return await db.user.findFirst({ where: { id } });
        };
      }

      const user = await new Chains().use(prisma, adapter).chain(getUser(1)).invoke();

      expect(user).toMatchObject({
        id: 1,
        name: 'Alice',
        email: 'alice@example.com',
        role: 'admin',
      });
    });

    test('应该能够执行链式查询', async () => {
      // Service 函数
      const getUser = (id: number) => async (db: TestPrismaClient) => {
        return await db.user.findFirstOrThrow({ where: { id } });
      };

      const getUserBooks = (userId: number) => async (db: TestPrismaClient) => {
        return await db.book.findMany({ where: { userId } });
      };

      const books = await new Chains()
        .use(prisma, adapter)
        .chain(getUser(1))
        .chain((r) => getUserBooks(r.r1.id))
        .invoke();

      expect(books).toHaveLength(2);
      expect(books[0]).toMatchObject({ title: 'TypeScript 101', author: 'Alice' });
      expect(books[1]).toMatchObject({ title: 'Database Design', author: 'Alice' });
    });
  });

  describe('事务功能', () => {
    test('应该能够在事务中执行多个操作', async () => {
      function createUser(data: { name: string; email: string }) {
        return async (db: TestPrismaClient) => {
          return await db.user.create({
            data: {
              name: data.name,
              email: data.email,
              role: 'user',
            },
          });
        };
      }

      function createBook(data: { userId: number; title: string; author: string }) {
        return async (db: TestPrismaClient) => {
          return await db.book.create({
            data: {
              title: data.title,
              author: data.author,
              userId: data.userId,
            },
          });
        };
      }

      const book = await new Chains()
        .transaction(prisma, adapter)
        .chain(createUser({ name: 'Dave', email: 'dave@example.com' }))
        .chain((r) => {
          const user = r.r1;
          return createBook({
            userId: user.id,
            title: 'New Book',
            author: 'Dave',
          });
        })
        .invoke();

      expect(book.title).toBe('New Book');
      expect(book.author).toBe('Dave');

      // 验证数据已插入
      const users = await prisma.user.findMany();
      expect(users).toHaveLength(4); // 3 个种子数据 + 1 个新用户
    });

    test('事务失败应该回滚所有操作', async () => {
      function createUser(data: { name: string; email: string }) {
        return async (db: TestPrismaClient) => {
          return await db.user.create({
            data: {
              name: data.name,
              email: data.email,
              role: 'user',
            },
          });
        };
      }

      function throwError() {
        return (_db: TestPrismaClient) => {
          throw new Error('Test error');
        };
      }

      await expect(
        new Chains()
          .transaction(prisma, adapter)
          .chain(createUser({ name: 'Eve', email: 'eve@example.com' }))
          .chain(throwError())
          .invoke(),
      ).rejects.toThrow('Test error');

      // 验证事务已回滚，没有新用户插入
      const users = await prisma.user.findMany();
      expect(users).toHaveLength(3); // 只有种子数据
    });
  });

  describe('错误处理', () => {
    test('withoutThrow 应该捕获错误', async () => {
      function getUserOrFail(id: number) {
        return async (db: TestPrismaClient) => {
          const users = await prisma.user.findMany({ where: { id } });
          if (users.length === 0) {
            throw new Error('User not found');
          }
          return users[0];
        };
      }

      const result = await new Chains()
        .use(prisma, adapter)
        .chain(getUserOrFail(999), { withoutThrow: true })
        .chain(
          (r): ((prisma: TestPrismaClient) => Promise<{ hasError: boolean; message?: string; user?: UserTable }>) => {
            const maybeUser = r.r1;
            if (maybeUser.error) {
              // 错误情况，返回默认值
              return (_db: TestPrismaClient) =>
                Promise.resolve({ hasError: true, message: maybeUser.error!.message });
            }
            return (_db: TestPrismaClient) => Promise.resolve({ hasError: false, user: maybeUser.data });
          },
        )
        .invoke();

      expect(result).toHaveProperty('hasError', true);
      expect(result).toHaveProperty('message');
    });

    test('没有 withoutThrow 时应该抛出错误', async () => {
      function getUserOrFail(id: number) {
        return async (db: TestPrismaClient) => {
          const users = await prisma.user.findMany({ where: { id } });
          if (users.length === 0) {
            throw new Error('User not found');
          }
          return users[0];
        };
      }

      await expect(new Chains().use(prisma, adapter).chain(getUserOrFail(999)).invoke()).rejects.toThrow();
    });
  });

  describe('条件执行', () => {
    test('应该根据条件执行不同的操作', async () => {
      function getUser(id: number) {
        return async (db: TestPrismaClient) => {
          return await db.user.findFirstOrThrow({ where: { id } });
        };
      }

      function deleteAllBooks() {
        return async (db: TestPrismaClient) => {
          return await db.book.deleteMany({});
        };
      }

      // 测试管理员权限
      const adminResult = await new Chains()
        .use(prisma, adapter)
        .chain(getUser(1)) // Alice 是 admin
        .chain((r): ((prisma: TestPrismaClient) => Promise<any>) => {
          const user = r.r1;
          if (user.role === 'admin') {
            return deleteAllBooks();
          }
          return (_db: TestPrismaClient) => Promise.resolve({ message: 'Not authorized' });
        })
        .invoke();

      expect(adminResult).toHaveProperty('count'); // Prisma deleteMany 返回 { count: number }

      // 验证所有书籍已删除
      const books = await prisma.book.findMany();
      expect(books).toHaveLength(0);
    });

    test('非管理员不应该执行删除操作', async () => {
      function getUser(id: number) {
        return async (db: TestPrismaClient) => {
          return await db.user.findFirstOrThrow({ where: { id } });
        };
      }

      function deleteAllBooks() {
        return async (db: TestPrismaClient) => {
          return await db.book.deleteMany({});
        };
      }

      // 测试普通用户
      const userResult = await new Chains()
        .use(prisma, adapter)
        .chain(getUser(2)) // Bob 是普通用户
        .chain((r): ((prisma: TestPrismaClient) => Promise<any>) => {
          const user = r.r1;
          if (user.role === 'admin') {
            return deleteAllBooks();
          }
          return (_db: TestPrismaClient) => Promise.resolve({ message: 'Not authorized' });
        })
        .invoke();

      expect(userResult).toEqual({ message: 'Not authorized' });

      // 验证书籍未被删除
      const books = await prisma.$queryRawUnsafe<BookTable[]>('SELECT * FROM Book');
      expect(books).toHaveLength(3);
    });
  });

  describe('复杂场景', () => {
    test('应该能够处理复杂的业务逻辑', async () => {
      function getUserWithBooks(userId: number) {
        return async (db: TestPrismaClient) => {
          const user = await prisma.user.findFirstOrThrow({ where: { id: userId } });
          const books = await prisma.book.findMany({ where: { userId } });
          return { user, books };
        };
      }

      function updateUserRole(userId: number, newRole: 'user' | 'admin') {
        return async (db: TestPrismaClient) => {
          return await db.user.update({
            where: { id: userId },
            data: { role: newRole },
          });
        };
      }

      const result = await new Chains()
        .use(prisma, adapter)
        .chain(getUserWithBooks(2))
        .chain((r): ((prisma: TestPrismaClient) => Promise<any>) => {
          const { user, books } = r.r1;
          // 如果用户有书籍，提升为管理员
          if (books.length > 0) {
            return updateUserRole(user.id, 'admin');
          }
          return (_db: TestPrismaClient) => Promise.resolve({ message: 'No books found' });
        })
        .invoke();

      // Prisma update 返回更新后的对象
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('role', 'admin');

      // 验证用户角色已更新
      const updatedUser = await prisma.user.findFirstOrThrow({ where: { id: 2 } });
      expect(updatedUser.role).toBe('admin');
    });
  });
});
