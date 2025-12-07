# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

[中文文档](./CHANGELOG.zh-CN.md) | [日本語ドキュメント](./CHANGELOG.ja.md)

---

## [1.0.2] - 2025-12-07

### Fixed
- 🐛 Fixed "Cannot find module" error when using only one ORM (e.g., using Kysely but getting errors about missing TypeORM)
- 🐛 Resolved optional peer dependency loading issue - now only the ORM you use will be loaded

### Changed
- 🔧 **Breaking Change**: Adapters must now be imported from subpaths to avoid loading unnecessary dependencies
  - Before: `import { KyselyAdapter } from '@tool-chain/db'`
  - After: `import { KyselyAdapter } from '@tool-chain/db/kysely'`
- 🔧 Added package.json subpath exports for each adapter:
  - `@tool-chain/db/kysely` - Kysely adapter and convenience classes
  - `@tool-chain/db/typeorm` - TypeORM adapter and convenience classes
  - `@tool-chain/db/prisma` - Prisma adapter and convenience classes
  - `@tool-chain/db/drizzle` - Drizzle adapter and convenience classes
- 📚 Updated all documentation (English, Chinese, Japanese) with new import instructions
- 🔧 Updated test files to use new import paths

### Technical
- Removed adapter exports from main entry point (`src/index.ts`)
- Added subpath exports configuration in `package.json`
- Main entry point now only exports core `Chains` class and types

### Migration Guide
If you're upgrading from 1.0.1, update your imports:

```typescript
// Old (will no longer work)
import { KyselyAdapter, ChainsWithKysely } from '@tool-chain/db';
import { TypeORMAdapter, ChainsWithTypeORM } from '@tool-chain/db';

// New (correct)
import { Chains } from '@tool-chain/db';
import { KyselyAdapter, ChainsWithKysely } from '@tool-chain/db/kysely';
import { TypeORMAdapter, ChainsWithTypeORM } from '@tool-chain/db/typeorm';
```

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
