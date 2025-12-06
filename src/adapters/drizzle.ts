/**
 * Drizzle ORM adapter
 * Adapts Drizzle transaction API to DbAdapter interface
 */
import { Chains } from '../chains';
import type { DbAdapter } from '../types';

/**
 * Drizzle database type
 * Supports all Drizzle database drivers
 */
export interface DrizzleDatabase {
  transaction<R>(fn: (trx: any) => Promise<R>): Promise<R>;
}

/**
 * Drizzle ORM database adapter
 *
 * Supports all Drizzle database drivers (PostgreSQL, MySQL, SQLite, etc.)
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
   * Execute Drizzle transaction
   *
   * Drizzle transaction mechanism:
   * 1. db.transaction(callback) creates transaction context
   * 2. callback receives transaction instance as parameter
   * 3. If callback completes successfully, auto commit
   * 4. If callback throws exception, auto rollback
   *
   * @param db Drizzle database instance
   * @param fn Transaction function that receives transaction instance as parameter
   * @returns Return value of the transaction function
   */
  async transaction<R>(db: TDb, fn: (trx: TDb) => Promise<R>): Promise<R> {
    return await db.transaction(async (tx) => {
      // Drizzle's tx type is the same as db
      return await fn(tx as TDb);
    });
  }
}

/**
 * Convenience Chains class for Drizzle ORM
 * Automatically uses DrizzleAdapter, no need to pass adapter manually
 *
 * @template TDb Drizzle database type (must implement DrizzleDatabase interface)
 *
 * @example
 * import { drizzle } from 'drizzle-orm/better-sqlite3';
 * import Database from 'better-sqlite3';
 * import { ChainsWithDrizzle } from '@tool-chain/db';
 *
 * const sqlite = new Database(':memory:');
 * const db = drizzle(sqlite);
 *
 * // Non-transaction mode
 * const user = await new ChainsWithDrizzle()
 *   .use(db)
 *   .chain(getUser(123))
 *   .invoke();
 *
 * // Transaction mode
 * const result = await new ChainsWithDrizzle()
 *   .transaction(db)
 *   .chain(createUser({ name: 'Alice' }))
 *   .invoke();
 */
export class ChainsWithDrizzle<TDb extends DrizzleDatabase = DrizzleDatabase> {
  private adapter = new DrizzleAdapter<TDb>();

  /**
   * Inject Drizzle database instance (non-transaction mode)
   * @param db Drizzle database instance
   * @returns New Chains instance with DrizzleAdapter pre-configured
   */
  use(db: TDb): Chains<TDb> {
    return new Chains<TDb>().use(db, this.adapter);
  }

  /**
   * Enable transaction mode
   * @param db Drizzle database instance
   * @returns New Chains instance with DrizzleAdapter pre-configured
   */
  transaction(db: TDb): Chains<TDb> {
    return new Chains<TDb>().transaction(db, this.adapter);
  }
}
