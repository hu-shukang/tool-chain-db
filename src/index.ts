/**
 * @tool-chain/db
 * Database chain operation library
 *
 * Based on @tool-chain/core, designed specifically for database operations, supports:
 * - Kysely, TypeORM, Prisma, and Drizzle ORM
 * - Transaction management
 * - Higher-order function pattern for service layer
 * - Result passing and access
 * - Advanced features like retry/timeout/withoutThrow
 */

// Export core classes and factory functions
export * from './chains';

// Export types
export * from './types';

// Note: Adapters should be imported from their specific subpaths to avoid
// loading unnecessary dependencies:
// - import { KyselyAdapter, ChainsWithKysely } from '@tool-chain/db/kysely'
// - import { TypeORMAdapter, ChainsWithTypeORM } from '@tool-chain/db/typeorm'
// - import { PrismaAdapter, ChainsWithPrisma } from '@tool-chain/db/prisma'
// - import { DrizzleAdapter, ChainsWithDrizzle } from '@tool-chain/db/drizzle'
