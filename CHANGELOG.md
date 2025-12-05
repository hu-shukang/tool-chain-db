# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-05

### Added
- 🎉 初始版本发布
- ✨ 核心 `Chains` 类，支持数据库链式操作
- ✨ `KyselyAdapter` - Kysely 数据库适配器
- ✨ `TypeORMAdapter` - TypeORM 数据库适配器
- ✨ 依赖注入功能（`use()` 方法）
- ✨ 事务支持（`transaction()` 方法）
- ✨ 高阶函数模式的 Service 层支持
- ✨ 结果传递和访问（`r1`, `r2`, `r3`...）
- ✨ 继承 `@tool-chain/core` 的高级功能（retry, timeout, withoutThrow）
- ✨ 完整的 TypeScript 类型支持
- 📚 详细的 README 文档和使用示例

### Features
- 支持 ESM 和 CommonJS 双模块格式
- 完整的类型推导和类型安全
- 适配器模式，可扩展到其他数据库
