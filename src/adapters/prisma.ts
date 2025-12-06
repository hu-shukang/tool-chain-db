/**
 * Prisma adapter
 * Adapts Prisma transaction API to DbAdapter interface
 */
import type { PrismaClient } from '@prisma/client';

import { Chains } from '../chains';
import type { DbAdapter } from '../types';

/**
 * Prisma database adapter
 *
 * Supports any PrismaClient instance
 *
 * @example
 * import { PrismaClient } from '@prisma/client';
 * import { Chains, PrismaAdapter } from '@tool-chain/db';
 *
 * const prisma = new PrismaClient();
 * const adapter = new PrismaAdapter();
 *
 * await new Chains()
 *   .transaction(prisma, adapter)
 *   .chain(createUser)
 *   .invoke();
 */
export class PrismaAdapter implements DbAdapter<PrismaClient> {
  /**
   * Execute Prisma transaction
   *
   * Prisma transaction mechanism:
   * 1. prisma.$transaction() creates transaction context
   * 2. callback receives Prisma transaction client instance
   * 3. If callback completes successfully, auto commit
   * 4. If callback throws exception, auto rollback
   *
   * @param prisma PrismaClient instance
   * @param fn Transaction function that receives transaction client as parameter
   * @returns Return value of the transaction function
   */
  async transaction<R>(prisma: PrismaClient, fn: (trx: PrismaClient) => Promise<R>): Promise<R> {
    return await prisma.$transaction(async (tx) => {
      // Prisma's tx is Omit<PrismaClient, ...> type, needs type conversion
      return await fn(tx as unknown as PrismaClient);
    });
  }
}

/**
 * Convenience Chains class for Prisma
 * Automatically uses PrismaAdapter, no need to pass adapter manually
 *
 * @example
 * import { PrismaClient } from '@prisma/client';
 * import { ChainsWithPrisma } from '@tool-chain/db';
 *
 * const prisma = new PrismaClient();
 *
 * // Non-transaction mode
 * const user = await new ChainsWithPrisma()
 *   .use(prisma)
 *   .chain(getUser(123))
 *   .invoke();
 *
 * // Transaction mode
 * const result = await new ChainsWithPrisma()
 *   .transaction(prisma)
 *   .chain(createUser({ name: 'Alice' }))
 *   .invoke();
 */
export class ChainsWithPrisma {
  private adapter = new PrismaAdapter();

  /**
   * Inject Prisma client instance (non-transaction mode)
   * @param prisma PrismaClient instance
   * @returns New Chains instance with PrismaAdapter pre-configured
   */
  use(prisma: PrismaClient): Chains<PrismaClient> {
    return new Chains<PrismaClient>().use(prisma, this.adapter);
  }

  /**
   * Enable transaction mode
   * @param prisma PrismaClient instance
   * @returns New Chains instance with PrismaAdapter pre-configured
   */
  transaction(prisma: PrismaClient): Chains<PrismaClient> {
    return new Chains<PrismaClient>().transaction(prisma, this.adapter);
  }
}
