# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

[中文文档](./CHANGELOG.zh-CN.md) | [日本語ドキュメント](./CHANGELOG.ja.md)

---

## [1.0.1] - 2025-12-07

### Changed
- 🔧 Updated build scripts to use separate `tsconfig.build.json` configuration file
- 🔧 Optimized TypeScript build configuration, separating development and build environment settings

### Technical
- Added `tsconfig.build.json` file for production builds
- Updated build scripts in `package.json` to use `--project tsconfig.build.json` parameter

---

## [1.0.0] - 2024-12-06

### Added
- 🎉 Initial release of @tool-chain/db
- ✨ Core `Chains` class for database chain operations
- ✨ Multi-ORM support:
  - `KyselyAdapter` - Kysely database adapter
  - `TypeORMAdapter` - TypeORM database adapter
  - `PrismaAdapter` - Prisma ORM adapter
  - `DrizzleAdapter` - Drizzle ORM adapter
- ✨ Convenience wrapper classes for simpler API:
  - `ChainsWithKysely<DB>` - Pre-configured Chains for Kysely
  - `ChainsWithTypeORM` - Pre-configured Chains for TypeORM
  - `ChainsWithPrisma` - Pre-configured Chains for Prisma
  - `ChainsWithDrizzle<TDb>` - Pre-configured Chains for Drizzle
- ✨ Dependency injection via `use()` method
- ✨ Transaction support via `transaction()` method
- ✨ Higher-order function pattern for service layer
- ✨ Result passing and access (`r1`, `r2`, `r3`...)
- ✨ Advanced features inherited from `@tool-chain/core`:
  - `retry` - Automatic retry on failure
  - `timeout` - Operation timeout control
  - `withoutThrow` - Error handling without throwing
- ✨ Full TypeScript support with excellent type inference
- 📚 Comprehensive documentation:
  - English README
  - Chinese README (简体中文)
  - Japanese README (日本語)
- ✅ Complete test coverage (46 tests):
  - Basic functionality tests
  - Transaction tests
  - Error handling tests
  - Conditional execution tests
  - Complex scenario tests
  - ChainOptions tests (retry, timeout, combinations)

### Features
- Supports both ESM and CommonJS module formats
- Complete type inference and type safety
- Adapter pattern for extensibility to other databases
- Immutable chain pattern for better code organization
- Works seamlessly with all major ORMs
