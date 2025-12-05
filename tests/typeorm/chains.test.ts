/**
 * Chains with TypeORM 测试
 * 使用 SQLite 内存数据库进行集成测试
 */
import { DataSource, EntityManager } from 'typeorm';

import { Chains, TypeORMAdapter } from '../../src/index';
import { Book, User, cleanupDataSource, createTestDataSource, getManager, seedTestData } from './setup';

describe('chains with TypeORM', () => {
  let dataSource: DataSource;
  let adapter: TypeORMAdapter;

  beforeEach(async () => {
    // 创建测试数据源
    dataSource = await createTestDataSource();
    adapter = new TypeORMAdapter();

    // 插入测试数据
    await seedTestData(dataSource);
  });

  afterEach(async () => {
    // 清理数据源
    await cleanupDataSource(dataSource);
  });

  describe('基础功能', () => {
    test('应该能够执行单个查询', async () => {
      // Service 函数
      function getUser(id: number) {
        return (db: DataSource | EntityManager) => {
          return getManager(db).findOneOrFail(User, { where: { id } });
        };
      }

      const user = await new Chains().use(dataSource, adapter).chain(getUser(1)).invoke();

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
        return (db: DataSource | EntityManager) => {
          return getManager(db).findOneOrFail(User, { where: { id } });
        };
      }

      function getUserBooks(userId: number) {
        return (db: DataSource | EntityManager) => {
          return getManager(db).find(Book, { where: { user_id: userId } });
        };
      }

      const books = await new Chains()
        .use(dataSource, adapter)
        .chain(getUser(1))
        .chain((r) => getUserBooks(r.r1.id))
        .invoke();

      expect(books).toHaveLength(2);
      expect(books[0]).toMatchObject({ title: 'TypeScript 101', author: 'Alice' });
      expect(books[1]).toMatchObject({ title: 'Database Design', author: 'Alice' });
    });

    test('应该能够访问多个之前的结果', async () => {
      function getUser(id: number) {
        return (db: DataSource | EntityManager) => {
          return getManager(db).findOneOrFail(User, { where: { id } });
        };
      }

      function getAllBooks() {
        return (db: DataSource | EntityManager) => {
          return getManager(db).find(Book);
        };
      }

      const result = await new Chains()
        .use(dataSource, adapter)
        .chain(getUser(1))
        .chain(getAllBooks())
        .chain((r) => {
          // 访问 r1 和 r2
          const user = r.r1;
          const allBooks = r.r2;

          // 返回一个组合结果
          return (_db: DataSource | EntityManager) => ({
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
        return async (db: DataSource | EntityManager) => {
          const manager = getManager(db);
          const user = manager.create(User, {
            ...data,
            role: 'user',
            created_at: new Date().toISOString(),
          });
          return await manager.save(user);
        };
      }

      function createBook(data: { user_id: number; title: string; author: string }) {
        return async (db: DataSource | EntityManager) => {
          const manager = getManager(db);
          const book = manager.create(Book, {
            ...data,
            created_at: new Date().toISOString(),
          });
          return await manager.save(book);
        };
      }

      const book = await new Chains()
        .transaction(dataSource, adapter)
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
      const users = await dataSource.manager.find(User);
      expect(users).toHaveLength(4); // 3 个种子数据 + 1 个新用户
    });

    test('事务失败应该回滚所有操作', async () => {
      function createUser(data: { name: string; email: string }) {
        return async (db: DataSource | EntityManager) => {
          const manager = getManager(db);
          const user = manager.create(User, {
            ...data,
            role: 'user',
            created_at: new Date().toISOString(),
          });
          return await manager.save(user);
        };
      }

      function throwError() {
        return (_db: DataSource | EntityManager) => {
          throw new Error('Test error');
        };
      }

      await expect(
        new Chains()
          .transaction(dataSource, adapter)
          .chain(createUser({ name: 'Eve', email: 'eve@example.com' }))
          .chain(throwError())
          .invoke(),
      ).rejects.toThrow('Test error');

      // 验证事务已回滚，没有新用户插入
      const users = await dataSource.manager.find(User);
      expect(users).toHaveLength(3); // 只有种子数据
    });
  });

  describe('错误处理', () => {
    test('withoutThrow 应该捕获错误', async () => {
      function getUserOrFail(id: number) {
        return (db: DataSource | EntityManager) => {
          return getManager(db).findOneOrFail(User, { where: { id } });
        };
      }

      const result = await new Chains()
        .use(dataSource, adapter)
        .chain(getUserOrFail(999), { withoutThrow: true })
        .chain(
          (r): ((db: DataSource | EntityManager) => Promise<{ hasError: boolean; message?: string; user?: User }>) => {
            const maybeUser = r.r1;
            if (maybeUser.error) {
              // 错误情况，返回默认值
              return (_db: DataSource | EntityManager) =>
                Promise.resolve({ hasError: true, message: maybeUser.error!.message });
            }
            return (_db: DataSource | EntityManager) => Promise.resolve({ hasError: false, user: maybeUser.data });
          },
        )
        .invoke();

      expect(result).toHaveProperty('hasError', true);
      expect(result).toHaveProperty('message');
    });

    test('没有 withoutThrow 时应该抛出错误', async () => {
      function getUserOrFail(id: number) {
        return (db: DataSource | EntityManager) => {
          return getManager(db).findOneOrFail(User, { where: { id } });
        };
      }

      await expect(new Chains().use(dataSource, adapter).chain(getUserOrFail(999)).invoke()).rejects.toThrow();
    });
  });

  describe('条件执行', () => {
    test('应该根据条件执行不同的操作', async () => {
      function getUser(id: number) {
        return (db: DataSource | EntityManager) => {
          return getManager(db).findOneOrFail(User, { where: { id } });
        };
      }

      function deleteAllBooks() {
        return (db: DataSource | EntityManager) => {
          return getManager(db).createQueryBuilder().delete().from(Book).execute();
        };
      }

      // 测试管理员权限
      const adminResult = await new Chains()
        .use(dataSource, adapter)
        .chain(getUser(1)) // Alice 是 admin
        .chain((r): ((db: DataSource | EntityManager) => Promise<any>) => {
          const user = r.r1;
          if (user.role === 'admin') {
            return deleteAllBooks();
          }
          return (_db: DataSource | EntityManager) => Promise.resolve({ message: 'Not authorized' });
        })
        .invoke();

      expect(adminResult).toHaveProperty('affected');

      // 验证所有书籍已删除
      const books = await dataSource.manager.find(Book);
      expect(books).toHaveLength(0);
    });

    test('非管理员不应该执行删除操作', async () => {
      function getUser(id: number) {
        return (db: DataSource | EntityManager) => {
          return getManager(db).findOneOrFail(User, { where: { id } });
        };
      }

      function deleteAllBooks() {
        return (db: DataSource | EntityManager) => {
          return getManager(db).createQueryBuilder().delete().from(Book).execute();
        };
      }

      // 测试普通用户
      const userResult = await new Chains()
        .use(dataSource, adapter)
        .chain(getUser(2)) // Bob 是普通用户
        .chain((r): ((db: DataSource | EntityManager) => Promise<any>) => {
          const user = r.r1;
          if (user.role === 'admin') {
            return deleteAllBooks();
          }
          return (_db: DataSource | EntityManager) => Promise.resolve({ message: 'Not authorized' });
        })
        .invoke();

      expect(userResult).toEqual({ message: 'Not authorized' });

      // 验证书籍未被删除
      const books = await dataSource.manager.find(Book);
      expect(books).toHaveLength(3);
    });
  });

  describe('复杂场景', () => {
    test('应该能够处理复杂的业务逻辑', async () => {
      function getUserWithBooks(userId: number) {
        return async (db: DataSource | EntityManager) => {
          const manager = getManager(db);
          const user = await manager.findOneOrFail(User, { where: { id: userId } });
          const books = await manager.find(Book, { where: { user_id: userId } });
          return { user, books };
        };
      }

      function updateUserRole(userId: number, newRole: 'user' | 'admin') {
        return (db: DataSource | EntityManager) => {
          return getManager(db).update(User, { id: userId }, { role: newRole });
        };
      }

      const result = await new Chains()
        .use(dataSource, adapter)
        .chain(getUserWithBooks(2))
        .chain((r): ((db: DataSource | EntityManager) => Promise<any>) => {
          const { user, books } = r.r1;
          // 如果用户有书籍，提升为管理员
          if (books.length > 0) {
            return updateUserRole(user.id, 'admin');
          }
          return (_db: DataSource | EntityManager) => Promise.resolve({ message: 'No books found' });
        })
        .invoke();

      expect(result).toHaveProperty('affected');

      // 验证用户角色已更新
      const updatedUser = await dataSource.manager.findOneOrFail(User, { where: { id: 2 } });
      expect(updatedUser.role).toBe('admin');
    });
  });
});
