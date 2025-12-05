/**
 * 测试工具函数 - 使用 SQLite 创建测试数据库
 */
import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';

// 数据库类型定义
export interface UserTable {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  created_at: string;
}

export interface BookTable {
  id: number;
  user_id: number;
  title: string;
  author: string;
  created_at: string;
}

export interface TestDatabase {
  user: UserTable;
  book: BookTable;
}

/**
 * 创建内存数据库实例
 */
export function createTestDb(): Kysely<TestDatabase> {
  const dialect = new SqliteDialect({
    database: new Database(':memory:'),
  });

  return new Kysely<TestDatabase>({ dialect });
}

/**
 * 初始化数据库表结构
 */
export async function setupTables(db: Kysely<TestDatabase>): Promise<void> {
  // 创建 user 表
  await db.schema
    .createTable('user')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('email', 'text', (col) => col.notNull().unique())
    .addColumn('role', 'text', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) => col.notNull())
    .execute();

  // 创建 book 表
  await db.schema
    .createTable('book')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('user_id', 'integer', (col) => col.notNull().references('user.id'))
    .addColumn('title', 'text', (col) => col.notNull())
    .addColumn('author', 'text', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) => col.notNull())
    .execute();
}

/**
 * 清理数据库
 */
export async function cleanupDb(db: Kysely<TestDatabase>): Promise<void> {
  await db.destroy();
}

/**
 * 插入测试数据
 */
export async function seedTestData(db: Kysely<TestDatabase>): Promise<void> {
  const now = new Date().toISOString();

  // 插入用户
  await db
    .insertInto('user')
    .values([
      { name: 'Alice', email: 'alice@example.com', role: 'admin', created_at: now } as any,
      { name: 'Bob', email: 'bob@example.com', role: 'user', created_at: now } as any,
      { name: 'Charlie', email: 'charlie@example.com', role: 'user', created_at: now } as any,
    ])
    .execute();

  // 插入书籍
  await db
    .insertInto('book')
    .values([
      { user_id: 1, title: 'TypeScript 101', author: 'Alice', created_at: now } as any,
      { user_id: 1, title: 'Database Design', author: 'Alice', created_at: now } as any,
      { user_id: 2, title: 'JavaScript Basics', author: 'Bob', created_at: now } as any,
    ])
    .execute();
}
