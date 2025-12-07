# 更新日志

本文件记录了此项目的所有重要更改。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/spec/v2.0.0.html)。

[English](./CHANGELOG.md) | [日本語ドキュメント](./CHANGELOG.ja.md)

---

## [1.0.1] - 2025-12-07

### 变更
- 🔧 更新构建脚本，使用独立的 `tsconfig.build.json` 配置文件进行编译
- 🔧 优化 TypeScript 构建配置，分离开发和构建环境的配置

### 技术细节
- 新增 `tsconfig.build.json` 文件用于生产构建
- 更新 `package.json` 中的构建脚本，使用 `--project tsconfig.build.json` 参数

---

## [1.0.0] - 2024-12-06

### 新增功能
- 🎉 @tool-chain/db 首次发布
- ✨ 核心 `Chains` 类，支持数据库链式操作
- ✨ 多 ORM 支持：
  - `KyselyAdapter` - Kysely 数据库适配器
  - `TypeORMAdapter` - TypeORM 数据库适配器
  - `PrismaAdapter` - Prisma ORM 适配器
  - `DrizzleAdapter` - Drizzle ORM 适配器
- ✨ 便利包装类，提供更简单的 API：
  - `ChainsWithKysely<DB>` - Kysely 预配置 Chains
  - `ChainsWithTypeORM` - TypeORM 预配置 Chains
  - `ChainsWithPrisma` - Prisma 预配置 Chains
  - `ChainsWithDrizzle<TDb>` - Drizzle 预配置 Chains
- ✨ 通过 `use()` 方法实现依赖注入
- ✨ 通过 `transaction()` 方法支持事务
- ✨ 高阶函数模式的 Service 层支持
- ✨ 结果传递和访问（`r1`, `r2`, `r3`...）
- ✨ 继承自 `@tool-chain/core` 的高级功能：
  - `retry` - 失败自动重试
  - `timeout` - 操作超时控制
  - `withoutThrow` - 无抛出异常的错误处理
- ✨ 完整的 TypeScript 支持，优秀的类型推断
- 📚 完善的文档：
  - 英文 README
  - 中文 README（简体中文）
  - 日文 README（日本語）
- ✅ 完整的测试覆盖（46 个测试）：
  - 基础功能测试
  - 事务测试
  - 错误处理测试
  - 条件执行测试
  - 复杂场景测试
  - ChainOptions 测试（重试、超时、组合）

### 特性
- 支持 ESM 和 CommonJS 双模块格式
- 完整的类型推导和类型安全
- 适配器模式，可扩展到其他数据库
- 不可变链式模式，更好的代码组织
- 与所有主流 ORM 无缝协作
