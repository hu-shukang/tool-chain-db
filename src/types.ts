/**
 * 类型定义文件 - @tool-chain/db
 * 导入 @tool-chain/core 的类型并扩展数据库特定的类型
 */
import type { GetLastTupleElement, TupleToResults } from '@tool-chain/core';

// 重新导出核心类型
export type { TupleToResults, GetLastTupleElement };

/**
 * 数据库上下文
 * 存储数据库实例和适配器信息
 */
export interface DbContext<TDb> {
  db: TDb;
  adapter?: DbAdapter<TDb>;
  isTransaction: boolean;
}

/**
 * 数据库适配器接口
 * 用于抽象不同数据库的事务实现
 */
export interface DbAdapter<TDb> {
  /**
   * 执行事务
   * @param db 数据库实例
   * @param fn 事务函数，接收事务实例作为参数
   * @returns 事务函数的返回值
   */
  transaction<R>(db: TDb, fn: (trx: TDb) => Promise<R>): Promise<R>;
}

/**
 * Service 函数类型（直接函数模式）
 * 接收 db 参数，直接返回结果
 * 例如：getUser('id') 返回 (db) => db.selectFrom('user')...
 */
export type DbServiceFn<TDb, R> = (db: TDb) => R | Promise<R>;

/**
 * 结果访问函数类型
 * 接收之前步骤的结果，返回 (db) => ... 函数
 * 例如：(results) => getUser(results.r1.id)
 */
export type DbResultsFn<TDb, TResults extends any[], R> = (
  results: TupleToResults<TResults>,
) => (db: TDb) => R | Promise<R>;

/**
 * 数据库函数联合类型
 * 支持两种模式：
 * 1. Service 函数：getUser('id') - 直接返回 (db) => ...
 * 2. 结果访问函数：(results) => getUser(results.r1.id) - 返回 (db) => ...
 *
 * 使用宽松的类型定义以支持运行时判断
 */
export type DbFunction<TDb, TResults extends any[], R> =
  | DbServiceFn<TDb, R>
  | DbResultsFn<TDb, TResults, R>
  | ((arg: TDb | TupleToResults<TResults>) => R | Promise<R> | ((db: TDb) => R | Promise<R>));
