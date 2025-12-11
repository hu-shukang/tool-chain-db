# 更新日志

本文件记录了此项目的所有重要更改。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/spec/v2.0.0.html)。

[English](https://github.com/hu-shukang/tool-chain-db/blob/main/CHANGELOG.md) | [日本語ドキュメント](https://github.com/hu-shukang/tool-chain-db/blob/main/CHANGELOG.ja.md)

---

## [1.0.3] - 2025-12-11

### 变更

- 📚 增强 README 文档，添加更多徽章
  - 添加 npm 下载量徽章
  - 添加 Node.js 版本徽章
- 📚 更新文档链接为完整的 GitHub URL，提升可访问性
- 📚 优化代码示例格式，提高可读性
- 📚 重新组织示例中的 import 语句顺序，提升清晰度

---

## [1.0.2] - 2025-12-07

### 修复

- 🐛 修复了只使用一个 ORM 时出现"找不到模块"的错误（例如，使用 Kysely 却报缺少 TypeORM 的错误）
- 🐛 解决了可选 peer 依赖加载问题 - 现在只会加载你实际使用的 ORM

### 变更

- 🔧 **破坏性变更**：适配器现在必须从子路径导入，以避免加载不必要的依赖
  - 旧方式：`import { KyselyAdapter } from '@tool-chain/db'`
  - 新方式：`import { KyselyAdapter } from '@tool-chain/db/kysely'`
- 🔧 在 package.json 中为每个适配器添加了子路径导出：
  - `@tool-chain/db/kysely` - Kysely 适配器和便利类
  - `@tool-chain/db/typeorm` - TypeORM 适配器和便利类
  - `@tool-chain/db/prisma` - Prisma 适配器和便利类
  - `@tool-chain/db/drizzle` - Drizzle 适配器和便利类
- 📚 更新了所有文档（英文、中文、日文）的导入说明
- 🔧 更新了测试文件以使用新的导入路径

### 技术细节

- 从主入口文件（`src/index.ts`）中移除了适配器导出
- 在 `package.json` 中添加了子路径导出配置
- 主入口现在只导出核心 `Chains` 类和类型

### 迁移指南

如果你从 1.0.1 升级，请更新你的导入语句：

```typescript
// 旧方式（不再可用）
import { KyselyAdapter, ChainsWithKysely } from '@tool-chain/db';
import { TypeORMAdapter, ChainsWithTypeORM } from '@tool-chain/db';

// 新方式（正确）
import { Chains } from '@tool-chain/db';
import { KyselyAdapter, ChainsWithKysely } from '@tool-chain/db/kysely';
import { TypeORMAdapter, ChainsWithTypeORM } from '@tool-chain/db/typeorm';
```

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
