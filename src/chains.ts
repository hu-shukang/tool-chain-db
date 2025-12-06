/**
 * Chains - Database chain operation class
 * Based on @tool-chain/core Chains, specifically designed for database operations
 */
import {
  type ChainOptions,
  type ChainOptionsWithoutError,
  type ChainOptionsWithoutThrow,
  Chains as CoreChains,
} from '@tool-chain/core';

import type { DbAdapter, DbContext, GetLastTupleElement, Task, TupleToResults } from './types';

/**
 * Database chain operation class
 *
 * @template TDb Database instance type (e.g. Kysely<Database>)
 * @template TResults Result type tuple, used to track return values of each step
 *
 * @example
 * // Basic usage
 * const user = await new Chains()
 *   .use(db, new KyselyAdapter())
 *   .chain(getUser('user-123'))
 *   .invoke();
 *
 * @example
 * // Transaction support
 * await new Chains()
 *   .transaction(db, new KyselyAdapter())
 *   .chain(createUser({ name: 'Alice' }))
 *   .chain((db, r) => createProfile({ userId: r.r1.id }))
 *   .invoke();
 */
export class Chains<TDb = unknown, TResults extends any[] = []> {
  private context: DbContext<any> | null = null;
  private tasks: Task<TDb, any[]>[] = [];

  constructor() {}

  /**
   * Inject database instance (non-transaction mode)
   * @param db Database instance
   * @param adapter Database adapter (optional)
   * @returns New Chains instance with correct database type
   */
  use<T>(db: T, adapter?: DbAdapter<T>): Chains<T, TResults> {
    const newChains = new Chains<T, TResults>();
    newChains.context = {
      db,
      adapter,
      isTransaction: false,
    };
    newChains.tasks = this.tasks as unknown as Task<T, any[]>[];
    return newChains;
  }

  /**
   * Enable transaction mode
   * @param db Database instance
   * @param adapter Database adapter (required for executing transactions)
   * @returns New Chains instance with correct database type
   */
  transaction<T>(db: T, adapter: DbAdapter<T>): Chains<T, TResults> {
    const newChains = new Chains<T, TResults>();
    newChains.context = {
      db,
      adapter,
      isTransaction: true,
    };
    newChains.tasks = this.tasks as unknown as Task<T, any[]>[];
    return newChains;
  }

  /**
   * Add a database operation to the chain - Results accessor function pattern with error handling
   *
   * Use this overload when you need to access previous step results AND want to catch errors
   * without throwing (using `withoutThrow: true` option).
   *
   * **How to define the function:**
   * ```typescript
   * function getUserPosts(userId: number) {
   *   return (db: Kysely<Database>) => {
   *     return db.selectFrom('post').where('userId', '=', userId).selectAll().execute();
   *   };
   * }
   *
   * // Usage - access previous step results with error handling
   * const result = await chains
   *   .chain(getUser(123))
   *   .chain((results) => getUserPosts(results.r1.id), { withoutThrow: true })
   *   .invoke();
   *
   * // Result type: { data?: Post[], error?: Error }
   * if (result.error) {
   *   console.error('Failed to get posts:', result.error);
   * } else {
   *   console.log('Posts:', result.data);
   * }
   * ```
   *
   * @param fn Results accessor function: `(results) => (db) => Promise<R>`
   * @param options Chain options with `withoutThrow: true`
   * @returns New Chains instance with error-safe result type `{ data?: R; error?: Error }`
   */
  chain<R>(
    fn: (results: TupleToResults<TResults>) => (db: TDb) => R | Promise<R>,
    options: ChainOptionsWithoutThrow,
  ): Chains<TDb, [...TResults, { data?: R; error?: Error }]>;

  /**
   * Add a database operation to the chain - Service function pattern with error handling
   *
   * Use this overload when you DON'T need to access previous results AND want to catch errors
   * without throwing (using `withoutThrow: true` option).
   *
   * **How to define the function:**
   * ```typescript
   * function getUser(id: number) {
   *   return (db: Kysely<Database>) => {
   *     return db.selectFrom('user').where('id', '=', id).selectAll().executeTakeFirstOrThrow();
   *   };
   * }
   *
   * // Usage - direct service function with error handling
   * const result = await chains
   *   .chain(getUser(123), { withoutThrow: true })
   *   .invoke();
   *
   * // Result type: { data?: User, error?: Error }
   * if (result.error) {
   *   console.error('User not found:', result.error);
   * } else {
   *   console.log('User:', result.data);
   * }
   * ```
   *
   * @param fn Service function: `(db) => Promise<R>`
   * @param options Chain options with `withoutThrow: true`
   * @returns New Chains instance with error-safe result type `{ data?: R; error?: Error }`
   */
  chain<R>(
    fn: (db: TDb) => R | Promise<R>,
    options: ChainOptionsWithoutThrow,
  ): Chains<TDb, [...TResults, { data?: R; error?: Error }]>;

  /**
   * Add a database operation to the chain - Results accessor function pattern
   *
   * Use this overload when you need to access previous step results.
   *
   * **How to define the function:**
   * ```typescript
   * function getUserPosts(userId: number) {
   *   return (db: Kysely<Database>) => {
   *     return db.selectFrom('post').where('userId', '=', userId).selectAll().execute();
   *   };
   * }
   *
   * // Usage - access previous step results
   * const posts = await chains
   *   .chain(getUser(123))
   *   .chain((results) => getUserPosts(results.r1.id))
   *   .invoke();
   * ```
   *
   * The results object provides access to all previous step results:
   * - `results.r1` - first step result
   * - `results.r2` - second step result
   * - `results.r3` - third step result, etc.
   *
   * @param fn Results accessor function: `(results) => (db) => Promise<R>`
   * @param options Optional chain options (retry, timeout, etc.)
   * @returns New Chains instance with result type `R`
   */
  chain<R>(
    fn: (results: TupleToResults<TResults>) => (db: TDb) => R | Promise<R>,
    options?: ChainOptionsWithoutError,
  ): Chains<TDb, [...TResults, R]>;

  /**
   * Add a database operation to the chain - Service function pattern (Recommended)
   *
   * Use this overload when you DON'T need to access previous step results.
   * This is the most common and recommended pattern for defining database operations.
   *
   * **How to define the function:**
   * ```typescript
   * function getUser(id: number) {
   *   return (db: Kysely<Database>) => {
   *     return db.selectFrom('user').where('id', '=', id).selectAll().executeTakeFirstOrThrow();
   *   };
   * }
   *
   * function createUser(data: { name: string; email: string }) {
   *   return (db: Kysely<Database>) => {
   *     return db.insertInto('user').values(data).returningAll().executeTakeFirstOrThrow();
   *   };
   * }
   *
   * // Usage - simple and clean
   * const user = await chains
   *   .chain(getUser(123))
   *   .invoke();
   *
   * // Chaining multiple operations
   * const newUser = await chains
   *   .transaction(db, adapter)
   *   .chain(createUser({ name: 'Alice', email: 'alice@example.com' }))
   *   .chain(getUser(123))
   *   .invoke();
   * ```
   *
   * @param fn Service function: `(db) => Promise<R>`
   * @param options Optional chain options (retry, timeout, etc.)
   * @returns New Chains instance with result type `R`
   */
  chain<R>(fn: (db: TDb) => R | Promise<R>, options?: ChainOptionsWithoutError): Chains<TDb, [...TResults, R]>;

  /**
   * Implementation
   */
  chain<R>(fn: any, options?: ChainOptions): Chains<TDb, [...TResults, R]> {
    // Wrap function into unified task format: (db, results) => Promise<R>
    const task: Task<TDb, TResults> = async (db, results) => {
      if (typeof fn === 'function') {
        // Check if results is an empty object (first call)
        const hasResults = results && Object.keys(results).length > 0;

        if (hasResults) {
          // Has results, try calling as Results function first
          const maybeDbFn = this.tryCallAsResultsFunction(fn, results);
          if (maybeDbFn !== null) {
            return await Promise.resolve(maybeDbFn(db));
          }
        }

        // Call as Service function directly (first call, or above attempt failed)
        return await Promise.resolve(fn(db));
      }

      throw new Error('Invalid function type');
    };

    // If options provided, wrap with CoreChains to support retry/timeout/withoutThrow
    const wrappedTask = this.wrapWithOptions(task, options);

    // Create new Chains instance (immutable pattern)
    const newChains = new Chains<TDb, [...TResults, R]>();
    newChains.context = this.context;
    newChains.tasks = [...this.tasks, wrappedTask as Task<TDb, any[]>];

    return newChains;
  }

  /**
   * Try to call function as Results function
   * @private
   * @returns Returns db function if successful, otherwise null
   */
  private tryCallAsResultsFunction(
    fn: (...args: any[]) => any,
    results: TupleToResults<TResults>,
  ): ((db: TDb) => any) | null {
    try {
      const maybeDbFn = fn(results);
      // If returned value is a function, this is Results function pattern
      if (typeof maybeDbFn === 'function') {
        return maybeDbFn;
      }
      // If returned value is not a function, this is a Service function incorrectly called with results
      return null;
    } catch {
      // If call fails, return null to indicate it's not a Results function
      return null;
    }
  }

  /**
   * Execute the entire chain
   * @returns Return value of the last operation
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
   * Execute all tasks sequentially (non-transaction mode)
   * @private
   */
  private async executeSequentially(): Promise<any> {
    const results: Record<string, unknown> = {};
    let lastResult: unknown;

    for (let i = 0; i < this.tasks.length; i++) {
      lastResult = await this.tasks[i](this.context!.db, results as TupleToResults<any[]>);
      results[`r${i + 1}`] = lastResult;
    }

    return lastResult;
  }

  /**
   * Execute all tasks within a transaction
   * @private
   */
  private async executeWithTransaction(): Promise<any> {
    const { db, adapter } = this.context!;

    if (!adapter) {
      throw new Error('Adapter is required for transaction mode. Use .transaction(db, adapter)');
    }

    return await adapter.transaction(db, async (trx) => {
      const results: Record<string, unknown> = {};
      let lastResult: unknown;

      for (let i = 0; i < this.tasks.length; i++) {
        // In transaction, pass trx instead of db
        lastResult = await this.tasks[i](trx, results as TupleToResults<any[]>);
        results[`r${i + 1}`] = lastResult;
      }

      return lastResult;
    });
  }

  /**
   * Wrap task with CoreChains to support retry/timeout/withoutThrow
   * @private
   */
  private wrapWithOptions<TCurrentResults extends any[]>(
    task: Task<TDb, TCurrentResults>,
    options?: ChainOptions,
  ): Task<TDb, TCurrentResults> {
    if (!options) return task;

    // Use CoreChains to handle single task execution strategy
    return async (db, results) => {
      // Use type assertion to be compatible with CoreChains options type
      type CoreChainOptions = Parameters<CoreChains['chain']>[1];
      return await new CoreChains().chain(() => task(db, results), options as CoreChainOptions).invoke();
    };
  }
}

/**
 * Factory function for creating new Chains instance
 * @returns New Chains instance
 */
export function createChains<TDb>(): Chains<TDb> {
  return new Chains<TDb>();
}
