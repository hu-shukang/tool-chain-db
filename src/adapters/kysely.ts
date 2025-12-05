/**
 * Kysely 适配器
 * 将 Kysely 的事务 API 适配到 DbAdapter 接口
 */
import type { Kysely } from 'kysely';

import type { DbAdapter } from '../types';

/**
 * Kysely 数据库适配器
 *
 * @template DB 数据库 schema 类型
 *
 * @example
 * import { Kysely } from 'kysely';
 * import { KyselyAdapter } from '@tool-chain/db';
 *
 * interface Database {
 *   user: UserTable;
 *   post: PostTable;
 * }
 *
 * const db = new Kysely<Database>({ ... });
 * const adapter = new KyselyAdapter<Database>();
 *
 * await new Chains()
 *   .transaction(db, adapter)
 *   .chain(createUser)
 *   .invoke();
 */
export class KyselyAdapter<DB> implements DbAdapter<Kysely<DB>> {
  /**
   * 执行 Kysely 事务
   *
   * Kysely 事务机制：
   * 1. db.transaction() 创建事务上下文
   * 2. .execute(callback) 执行事务函数
   * 3. callback 接收事务实例 trx (也是 Kysely<DB> 类型)
   * 4. 如果 callback 成功完成，自动 commit
   * 5. 如果 callback 抛出异常，自动 rollback
   *
   * @param db Kysely 数据库实例
   * @param fn 事务函数，接收事务实例作为参数
   * @returns 事务函数的返回值
   */
  async transaction<R>(db: Kysely<DB>, fn: (trx: Kysely<DB>) => Promise<R>): Promise<R> {
    return await db.transaction().execute(fn);
  }
}
