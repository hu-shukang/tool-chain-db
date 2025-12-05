/**
 * Chains - 数据库链式操作类
 * 基于 @tool-chain/core 的 Chains，专门为数据库操作设计
 */
import {
  type ChainOptions,
  type ChainOptionsWithoutError,
  type ChainOptionsWithoutThrow,
  Chains as CoreChains,
} from '@tool-chain/core';

import type { DbAdapter, DbContext, GetLastTupleElement, TupleToResults } from './types';

/**
 * 数据库链式操作类
 *
 * @template TDb 数据库实例类型（如 Kysely<Database>）
 * @template TResults 结果类型元组，用于追踪每一步的返回值
 *
 * @example
 * // 基础用法
 * const user = await new Chains()
 *   .use(db, new KyselyAdapter())
 *   .chain(getUser('user-123'))
 *   .invoke();
 *
 * @example
 * // 事务支持
 * await new Chains()
 *   .transaction(db, new KyselyAdapter())
 *   .chain(createUser({ name: 'Alice' }))
 *   .chain((db, r) => createProfile({ userId: r.r1.id }))
 *   .invoke();
 */
export class Chains<TDb = unknown, TResults extends any[] = []> {
  private context: DbContext<any> | null = null;
  private tasks: Array<(db: any, results: any) => Promise<any>> = [];

  constructor() {}

  /**
   * 注入数据库实例（非事务模式）
   * @param db 数据库实例
   * @param adapter 数据库适配器（可选）
   * @returns 新的 Chains 实例，带有正确的数据库类型
   */
  use<T>(db: T, adapter?: DbAdapter<T>): Chains<T, TResults> {
    const newChains = new Chains<T, TResults>();
    newChains.context = {
      db,
      adapter,
      isTransaction: false,
    };
    newChains.tasks = this.tasks;
    return newChains;
  }

  /**
   * 启用事务模式
   * @param db 数据库实例
   * @param adapter 数据库适配器（必需，用于执行事务）
   * @returns 新的 Chains 实例，带有正确的数据库类型
   */
  transaction<T>(db: T, adapter: DbAdapter<T>): Chains<T, TResults> {
    const newChains = new Chains<T, TResults>();
    newChains.context = {
      db,
      adapter,
      isTransaction: true,
    };
    newChains.tasks = this.tasks;
    return newChains;
  }

  /**
   * 添加一个数据库操作到链中 - Results 函数模式 (withoutThrow: true)
   */
  chain<R>(
    fn: (results: TupleToResults<TResults>) => (db: TDb) => R | Promise<R>,
    options: ChainOptionsWithoutThrow,
  ): Chains<TDb, [...TResults, { data?: R; error?: Error }]>;

  /**
   * 添加一个数据库操作到链中 - Service 函数模式 (withoutThrow: true)
   */
  chain<R>(
    fn: (db: TDb) => R | Promise<R>,
    options: ChainOptionsWithoutThrow,
  ): Chains<TDb, [...TResults, { data?: R; error?: Error }]>;

  /**
   * 添加一个数据库操作到链中 - Results 函数模式
   */
  chain<R>(
    fn: (results: TupleToResults<TResults>) => (db: TDb) => R | Promise<R>,
    options?: ChainOptionsWithoutError,
  ): Chains<TDb, [...TResults, R]>;

  /**
   * 添加一个数据库操作到链中 - Service 函数模式
   */
  chain<R>(fn: (db: TDb) => R | Promise<R>, options?: ChainOptionsWithoutError): Chains<TDb, [...TResults, R]>;

  /**
   * 添加一个数据库操作到链中（实现）
   */
  chain<R>(fn: any, options?: ChainOptions): Chains<TDb, [...TResults, R]> {
    // 将函数包装成统一的任务格式: (db, results) => Promise<R>
    const task = async (db: TDb, results: any): Promise<R> => {
      if (typeof fn === 'function') {
        // 检查 results 是否为空对象（第一次调用）
        const hasResults = results && Object.keys(results).length > 0;

        if (hasResults) {
          // 有结果，先尝试作为 Results 函数调用
          try {
            const maybeDbFn = (fn as any)(results);
            // 如果返回的是函数，说明这是 Results 函数模式
            if (typeof maybeDbFn === 'function') {
              return await Promise.resolve(maybeDbFn(db));
            }
            // 如果返回的不是函数，说明这是 Service 函数被错误地用 results 调用了
            // 应该fallback到用 db 调用
          } catch {
            // 如果调用失败，也继续尝试作为 Service 函数
          }
        }

        // 作为 Service 函数直接调用（第一次调用，或者上面的尝试失败）
        return await Promise.resolve((fn as any)(db));
      }

      throw new Error('Invalid function type');
    };

    // 如果有 options，使用 CoreChains 包装以支持 retry/timeout/withoutThrow
    const wrappedTask = this.wrapWithOptions(task, options);

    // 创建新的 Chains 实例（不可变模式）
    const newChains = new Chains<TDb, [...TResults, R]>();
    newChains.context = this.context;
    newChains.tasks = [...this.tasks, wrappedTask];

    return newChains;
  }

  /**
   * 执行整个链
   * @returns 最后一个操作的返回值
   */
  async invoke(): Promise<GetLastTupleElement<TResults>> {
    if (!this.context) {
      throw new Error('Database not set. Use .use(db) or .transaction(db) before invoking.');
    }

    if (this.context.isTransaction) {
      return await this.executeWithTransaction();
    } else {
      return await this.executeSequentially();
    }
  }

  /**
   * 顺序执行所有任务（非事务模式）
   * @private
   */
  private async executeSequentially(): Promise<any> {
    const results: any = {};
    let lastResult: any;

    for (let i = 0; i < this.tasks.length; i++) {
      lastResult = await this.tasks[i](this.context!.db, results);
      results[`r${i + 1}`] = lastResult;
    }

    return lastResult;
  }

  /**
   * 在事务中执行所有任务
   * @private
   */
  private async executeWithTransaction(): Promise<any> {
    const { db, adapter } = this.context!;

    if (!adapter) {
      throw new Error('Adapter is required for transaction mode. Use .transaction(db, adapter)');
    }

    return await adapter.transaction(db, async (trx) => {
      const results: any = {};
      let lastResult: any;

      for (let i = 0; i < this.tasks.length; i++) {
        // 在事务中，传递 trx 而不是 db
        lastResult = await this.tasks[i](trx, results);
        results[`r${i + 1}`] = lastResult;
      }

      return lastResult;
    });
  }

  /**
   * 使用 CoreChains 包装任务以支持 retry/timeout/withoutThrow
   * @private
   */
  private wrapWithOptions(
    task: (db: TDb, results: any) => Promise<any>,
    options?: ChainOptions,
  ): (db: TDb, results: any) => Promise<any> {
    if (!options) return task;

    // 使用 CoreChains 处理单个任务的执行策略
    return async (db: TDb, results: any) => {
      return await new CoreChains().chain(() => task(db, results), options as any).invoke();
    };
  }
}

/**
 * 工厂函数，用于创建新的 Chains 实例
 * @returns 新的 Chains 实例
 */
export function createChains<TDb>(): Chains<TDb> {
  return new Chains<TDb>();
}
