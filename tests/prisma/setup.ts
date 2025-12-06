/**
 * Prisma 测试辅助函数和设置
 */
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

// 扩展 PrismaClient 类型以包含测试用的内存数据库
export type TestPrismaClient = PrismaClient;

/**
 * 创建测试用的 Prisma 客户端
 * Prisma 7 requires adapter to be provided in constructor
 */
export function createTestPrisma(): TestPrismaClient {
  // Create adapter with :memory: url for in-memory database
  const adapter = new PrismaBetterSqlite3({
    url: ':memory:',
  });

  const prisma = new PrismaClient({
    adapter,
    log: process.env.DEBUG ? ['query', 'error', 'warn'] : ['error'],
  });

  return prisma;
}

/**
 * 初始化数据库表结构
 */
export async function setupTables(prisma: TestPrismaClient): Promise<void> {
  // Prisma 使用 migrations，这里我们直接用 SQL 创建表
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS User (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT DEFAULT 'user',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS Book (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      userId INTEGER NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    )
  `);
}

/**
 * 插入测试数据
 */
export async function seedTestData(prisma: TestPrismaClient): Promise<void> {
  // 使用原始 SQL 插入数据以避免 schema 生成问题
  await prisma.$executeRawUnsafe(`
    INSERT INTO User (id, name, email, role) VALUES
      (1, 'Alice', 'alice@example.com', 'admin'),
      (2, 'Bob', 'bob@example.com', 'user'),
      (3, 'Charlie', 'charlie@example.com', 'user')
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO Book (id, title, author, userId) VALUES
      (1, 'TypeScript 101', 'Alice', 1),
      (2, 'Database Design', 'Alice', 1),
      (3, 'JavaScript Basics', 'Bob', 2)
  `);
}

/**
 * 清理数据库
 */
export async function cleanupDb(prisma: TestPrismaClient): Promise<void> {
  try {
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS Book');
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS User');
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 用户表类型
 */
export interface UserTable {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

/**
 * 书籍表类型
 */
export interface BookTable {
  id: number;
  title: string;
  author: string;
  userId: number;
  createdAt: Date;
}
