/**
 * Prisma 适配器
 * 将 Prisma 的事务 API 适配到 DbAdapter 接口
 */
import type { PrismaClient } from '@prisma/client';

import type { DbAdapter } from '../types';

/**
 * Prisma 数据库适配器
 *
 * 支持任何 PrismaClient 实例
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
   * 执行 Prisma 事务
   *
   * Prisma 事务机制：
   * 1. prisma.$transaction() 创建事务上下文
   * 2. callback 接收 Prisma 事务客户端实例
   * 3. 如果 callback 成功完成，自动 commit
   * 4. 如果 callback 抛出异常，自动 rollback
   *
   * @param prisma PrismaClient 实例
   * @param fn 事务函数，接收事务客户端作为参数
   * @returns 事务函数的返回值
   */
  async transaction<R>(prisma: PrismaClient, fn: (trx: PrismaClient) => Promise<R>): Promise<R> {
    return await prisma.$transaction(async (tx) => {
      // Prisma 的 tx 是 Omit<PrismaClient, ...> 类型，需要进行类型转换
      return await fn(tx as unknown as PrismaClient);
    });
  }
}
