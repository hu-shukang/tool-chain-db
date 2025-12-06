/**
 * Drizzle ORM 适配器
 * 将 Drizzle 的事务 API 适配到 DbAdapter 接口
 */
import type { DbAdapter } from '../types';

/**
 * Drizzle 数据库类型
 * 支持 Drizzle 的所有数据库驱动
 */
export interface DrizzleDatabase {
  transaction<R>(fn: (trx: any) => Promise<R>): Promise<R>;
}

/**
 * Drizzle ORM 数据库适配器
 *
 * 支持所有 Drizzle 数据库驱动（PostgreSQL, MySQL, SQLite 等）
 *
 * @example
 * import { drizzle } from 'drizzle-orm/better-sqlite3';
 * import Database from 'better-sqlite3';
 * import { Chains, DrizzleAdapter } from '@tool-chain/db';
 *
 * const sqlite = new Database(':memory:');
 * const db = drizzle(sqlite);
 * const adapter = new DrizzleAdapter();
 *
 * await new Chains()
 *   .transaction(db, adapter)
 *   .chain(createUser)
 *   .invoke();
 */
export class DrizzleAdapter<TDb extends DrizzleDatabase = DrizzleDatabase> implements DbAdapter<TDb> {
  /**
   * 执行 Drizzle 事务
   *
   * Drizzle 事务机制：
   * 1. db.transaction(callback) 创建事务上下文
   * 2. callback 接收事务实例作为参数
   * 3. 如果 callback 成功完成，自动 commit
   * 4. 如果 callback 抛出异常，自动 rollback
   *
   * @param db Drizzle 数据库实例
   * @param fn 事务函数，接收事务实例作为参数
   * @returns 事务函数的返回值
   */
  async transaction<R>(db: TDb, fn: (trx: TDb) => Promise<R>): Promise<R> {
    return await db.transaction(async (tx) => {
      // Drizzle 的 tx 类型与 db 相同
      return await fn(tx as TDb);
    });
  }
}
