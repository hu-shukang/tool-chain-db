/**
 * Drizzle ORM 测试辅助函数和设置
 */
import BetterSQLite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

type Database = BetterSQLite3.Database;

/**
 * 用户表定义
 */
export const users = sqliteTable('user', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role').notNull().default('user'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

/**
 * 书籍表定义
 */
export const books = sqliteTable('book', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  author: text('author').notNull(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

/**
 * Schema 定义
 */
export const schema = {
  users,
  books,
};

/**
 * 测试数据库类型
 */
export type TestDatabase = BetterSQLite3Database<typeof schema>;

/**
 * 用于保存 SQLite 实例的 WeakMap
 */
const sqliteInstances = new WeakMap<TestDatabase, Database>();

/**
 * 创建测试用的 Drizzle 数据库
 */
export function createTestDb(): TestDatabase {
  const sqlite = new BetterSQLite3(':memory:');
  // 启用外键约束
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  // 保存 SQLite 实例的引用
  sqliteInstances.set(db, sqlite);
  return db;
}

/**
 * 初始化数据库表结构
 */
export async function setupTables(db: TestDatabase): Promise<void> {
  const sqlite = sqliteInstances.get(db);
  if (!sqlite) throw new Error('SQLite instance not found');

  // 创建表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS user (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS book (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
    )
  `);
}

/**
 * 插入测试数据
 */
export async function seedTestData(db: TestDatabase): Promise<void> {
  const sqlite = sqliteInstances.get(db);
  if (!sqlite) throw new Error('SQLite instance not found');

  sqlite.exec(`
    INSERT INTO user (id, name, email, role) VALUES
      (1, 'Alice', 'alice@example.com', 'admin'),
      (2, 'Bob', 'bob@example.com', 'user'),
      (3, 'Charlie', 'charlie@example.com', 'user')
  `);

  sqlite.exec(`
    INSERT INTO book (id, title, author, user_id) VALUES
      (1, 'TypeScript 101', 'Alice', 1),
      (2, 'Database Design', 'Alice', 1),
      (3, 'JavaScript Basics', 'Bob', 2)
  `);
}

/**
 * 清理数据库
 */
export async function cleanupDb(db: TestDatabase): Promise<void> {
  const sqlite = sqliteInstances.get(db);
  if (!sqlite) return;

  sqlite.exec('DROP TABLE IF EXISTS book');
  sqlite.exec('DROP TABLE IF EXISTS user');
  sqlite.close();
  sqliteInstances.delete(db);
}

/**
 * 用户表类型
 */
export interface UserTable {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

/**
 * 书籍表类型
 */
export interface BookTable {
  id: number;
  title: string;
  author: string;
  userId: number;
  createdAt: string;
}
