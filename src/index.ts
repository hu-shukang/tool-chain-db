/**
 * @tool-chain/db
 * 数据库链式操作库
 *
 * 基于 @tool-chain/core，专门为数据库操作设计，支持：
 * - Kysely 和 TypeORM
 * - 事务管理
 * - 高阶函数模式的 service 层
 * - 结果传递和访问
 * - retry/timeout/withoutThrow 等高级功能
 */

// 导出核心类和工厂函数
export * from './chains';

// 导出适配器
export * from './adapters/kysely';
export * from './adapters/typeorm';
export * from './adapters/prisma';
export * from './adapters/drizzle';

// 导出类型
export * from './types';
