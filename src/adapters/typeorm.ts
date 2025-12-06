/**
 * TypeORM adapter
 * Adapts TypeORM transaction API to DbAdapter interface
 */
import { DataSource, EntityManager } from 'typeorm';

import { Chains } from '../chains';
import type { DbAdapter } from '../types';

/**
 * TypeORM database adapter
 *
 * Supports two input types:
 * 1. DataSource - Data source instance, will create new transaction
 * 2. EntityManager - Entity manager, will reuse if already in transaction
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
   * Execute TypeORM transaction
   *
   * TypeORM transaction mechanism:
   * 1. DataSource.transaction(callback) creates new transaction
   * 2. callback receives EntityManager instance
   * 3. EntityManager is used to execute database operations
   * 4. If callback completes successfully, auto commit
   * 5. If callback throws exception, auto rollback
   *
   * @param db DataSource or EntityManager instance
   * @param fn Transaction function that receives EntityManager as parameter
   * @returns Return value of the transaction function
   */
  async transaction<R>(db: DataSource | EntityManager, fn: (trx: EntityManager) => Promise<R>): Promise<R> {
    if (db instanceof DataSource) {
      // db is DataSource, create new transaction
      return await db.transaction(fn);
    } else {
      // db is already EntityManager (might already be in transaction)
      // Directly use current EntityManager
      return await fn(db);
    }
  }
}

/**
 * Convenience Chains class for TypeORM
 * Automatically uses TypeORMAdapter, no need to pass adapter manually
 *
 * @example
 * import { DataSource } from 'typeorm';
 * import { ChainsWithTypeORM } from '@tool-chain/db';
 *
 * const dataSource = new DataSource({ ... });
 * await dataSource.initialize();
 *
 * // Non-transaction mode
 * const user = await new ChainsWithTypeORM()
 *   .use(dataSource)
 *   .chain(getUser(123))
 *   .invoke();
 *
 * // Transaction mode
 * const result = await new ChainsWithTypeORM()
 *   .transaction(dataSource)
 *   .chain(createUser({ name: 'Alice' }))
 *   .invoke();
 */
export class ChainsWithTypeORM {
  private adapter = new TypeORMAdapter();

  /**
   * Inject TypeORM DataSource or EntityManager instance (non-transaction mode)
   * @param db DataSource or EntityManager instance
   * @returns New Chains instance with TypeORMAdapter pre-configured
   */
  use(db: DataSource | EntityManager): Chains<DataSource | EntityManager> {
    return new Chains<DataSource | EntityManager>().use(db, this.adapter);
  }

  /**
   * Enable transaction mode
   * @param db DataSource or EntityManager instance
   * @returns New Chains instance with TypeORMAdapter pre-configured
   */
  transaction(db: DataSource | EntityManager): Chains<DataSource | EntityManager> {
    return new Chains<DataSource | EntityManager>().transaction(db, this.adapter);
  }
}
