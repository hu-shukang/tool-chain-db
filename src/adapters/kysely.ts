/**
 * Kysely adapter
 * Adapts Kysely transaction API to DbAdapter interface
 */
import type { Kysely } from 'kysely';

import { Chains } from '../chains';
import type { DbAdapter } from '../types';

/**
 * Kysely database adapter
 *
 * @template DB Database schema type
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
   * Execute Kysely transaction
   *
   * Kysely transaction mechanism:
   * 1. db.transaction() creates transaction context
   * 2. .execute(callback) executes transaction function
   * 3. callback receives transaction instance trx (also Kysely<DB> type)
   * 4. If callback completes successfully, auto commit
   * 5. If callback throws exception, auto rollback
   *
   * @param db Kysely database instance
   * @param fn Transaction function that receives transaction instance as parameter
   * @returns Return value of the transaction function
   */
  async transaction<R>(db: Kysely<DB>, fn: (trx: Kysely<DB>) => Promise<R>): Promise<R> {
    return await db.transaction().execute(fn);
  }
}

/**
 * Convenience Chains class for Kysely
 * Automatically uses KyselyAdapter, no need to pass adapter manually
 *
 * @template DB Database schema type
 *
 * @example
 * import { Kysely } from 'kysely';
 * import { ChainsWithKysely } from '@tool-chain/db';
 *
 * const db = new Kysely<Database>({ ... });
 *
 * // Non-transaction mode
 * const user = await new ChainsWithKysely<Database>()
 *   .use(db)
 *   .chain(getUser(123))
 *   .invoke();
 *
 * // Transaction mode
 * const result = await new ChainsWithKysely<Database>()
 *   .transaction(db)
 *   .chain(createUser({ name: 'Alice' }))
 *   .invoke();
 */
export class ChainsWithKysely<DB> {
  private adapter = new KyselyAdapter<DB>();

  /**
   * Inject Kysely database instance (non-transaction mode)
   * @param db Kysely database instance
   * @returns New Chains instance with KyselyAdapter pre-configured
   */
  use(db: Kysely<DB>): Chains<Kysely<DB>> {
    return new Chains<Kysely<DB>>().use(db, this.adapter);
  }

  /**
   * Enable transaction mode
   * @param db Kysely database instance
   * @returns New Chains instance with KyselyAdapter pre-configured
   */
  transaction(db: Kysely<DB>): Chains<Kysely<DB>> {
    return new Chains<Kysely<DB>>().transaction(db, this.adapter);
  }
}
