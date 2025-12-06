/**
 * Type definitions - @tool-chain/db
 * Imports types from @tool-chain/core and extends with database-specific types
 */
import type { GetLastTupleElement, TupleToResults } from '@tool-chain/core';

// Re-export core types
export type { TupleToResults, GetLastTupleElement };

/**
 * Internal task function type
 * Receives database instance and previous results, returns current step result
 */
export type Task<TDb, TResults extends any[]> = (db: TDb, results: TupleToResults<TResults>) => Promise<any>;

/**
 * Database context
 * Stores database instance and adapter information
 */
export interface DbContext<TDb> {
  db: TDb;
  adapter?: DbAdapter<TDb>;
  isTransaction: boolean;
}

/**
 * Database adapter interface
 * Used to abstract transaction implementations across different databases
 */
export interface DbAdapter<TDb> {
  /**
   * Execute a transaction
   * @param db Database instance
   * @param fn Transaction function that receives transaction instance as parameter
   * @returns Return value of the transaction function
   */
  transaction<R>(db: TDb, fn: (trx: TDb) => Promise<R>): Promise<R>;
}

/**
 * Service function type (direct function pattern)
 * Receives db parameter and directly returns result
 * Example: getUser('id') returns (db) => db.selectFrom('user')...
 */
export type DbServiceFn<TDb, R> = (db: TDb) => R | Promise<R>;

/**
 * Results accessor function type
 * Receives previous step results, returns (db) => ... function
 * Example: (results) => getUser(results.r1.id)
 */
export type DbResultsFn<TDb, TResults extends any[], R> = (
  results: TupleToResults<TResults>,
) => (db: TDb) => R | Promise<R>;

/**
 * Database function union type
 * Supports two patterns:
 * 1. Service function: getUser('id') - directly returns (db) => ...
 * 2. Results accessor function: (results) => getUser(results.r1.id) - returns (db) => ...
 *
 * Uses loose type definition to support runtime checking
 */
export type DbFunction<TDb, TResults extends any[], R> =
  | DbServiceFn<TDb, R>
  | DbResultsFn<TDb, TResults, R>
  | ((arg: TDb | TupleToResults<TResults>) => R | Promise<R> | ((db: TDb) => R | Promise<R>));
