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

// Export adapters
export * from './adapters/kysely';
export * from './adapters/typeorm';
export * from './adapters/prisma';
export * from './adapters/drizzle';

// Export types
export * from './types';
