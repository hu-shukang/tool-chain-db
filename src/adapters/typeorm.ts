/**
 * TypeORM 适配器
 * 将 TypeORM 的事务 API 适配到 DbAdapter 接口
 */
import { DataSource, EntityManager } from 'typeorm';

import type { DbAdapter } from '../types';

/**
 * TypeORM 数据库适配器
 *
 * 支持两种输入：
 * 1. DataSource - 数据源实例，会创建新事务
 * 2. EntityManager - 实体管理器，如果已在事务中则复用
 *
 * @example
 * import { DataSource } from 'typeorm';
 * import { TypeORMAdapter } from '@tool-chain/db';
 *
 * const dataSource = new DataSource({ ... });
 * await dataSource.initialize();
 *
 * const adapter = new TypeORMAdapter();
 *
 * await new Chains()
 *   .transaction(dataSource, adapter)
 *   .chain(createUser)
 *   .invoke();
 */
export class TypeORMAdapter implements DbAdapter<DataSource | EntityManager> {
  /**
   * 执行 TypeORM 事务
   *
   * TypeORM 事务机制：
   * 1. DataSource.transaction(callback) 创建新事务
   * 2. callback 接收 EntityManager 实例
   * 3. EntityManager 用于执行数据库操作
   * 4. 如果 callback 成功完成，自动 commit
   * 5. 如果 callback 抛出异常，自动 rollback
   *
   * @param db DataSource 或 EntityManager 实例
   * @param fn 事务函数，接收 EntityManager 作为参数
   * @returns 事务函数的返回值
   */
  async transaction<R>(db: DataSource | EntityManager, fn: (trx: EntityManager) => Promise<R>): Promise<R> {
    if (db instanceof DataSource) {
      // db 是 DataSource，创建新事务
      return await db.transaction(fn);
    } else {
      // db 已经是 EntityManager（可能已在事务中）
      // 直接使用当前的 EntityManager
      return await fn(db);
    }
  }
}
