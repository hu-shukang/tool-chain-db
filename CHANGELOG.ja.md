# 更新履歴

このファイルには、このプロジェクトのすべての重要な変更が記録されています。

形式は [Keep a Changelog](https://keepachangelog.com/ja/1.0.0/) に基づいており、
このプロジェクトは [セマンティックバージョニング](https://semver.org/lang/ja/spec/v2.0.0.html) に準拠しています。

[English](./CHANGELOG.md) | [中文文档](./CHANGELOG.zh-CN.md)

---

## [1.0.0] - 2024-12-06

### 追加機能
- 🎉 @tool-chain/db 初回リリース
- ✨ データベースチェーン操作のための核心 `Chains` クラス
- ✨ マルチORM対応：
  - `KyselyAdapter` - Kysely データベースアダプター
  - `TypeORMAdapter` - TypeORM データベースアダプター
  - `PrismaAdapter` - Prisma ORM アダプター
  - `DrizzleAdapter` - Drizzle ORM アダプター
- ✨ よりシンプルなAPIのための便利ラッパークラス：
  - `ChainsWithKysely<DB>` - Kysely用事前設定Chains
  - `ChainsWithTypeORM` - TypeORM用事前設定Chains
  - `ChainsWithPrisma` - Prisma用事前設定Chains
  - `ChainsWithDrizzle<TDb>` - Drizzle用事前設定Chains
- ✨ `use()` メソッドによる依存性注入
- ✨ `transaction()` メソッドによるトランザクションサポート
- ✨ 高階関数パターンによるServiceレイヤーサポート
- ✨ 結果の受け渡しとアクセス（`r1`, `r2`, `r3`...）
- ✨ `@tool-chain/core` から継承された高度な機能：
  - `retry` - 失敗時の自動リトライ
  - `timeout` - 操作タイムアウト制御
  - `withoutThrow` - 例外をスローしないエラーハンドリング
- ✨ 優れた型推論を持つ完全なTypeScriptサポート
- 📚 包括的なドキュメント：
  - 英語 README
  - 中国語 README（简体中文）
  - 日本語 README
- ✅ 完全なテストカバレッジ（46テスト）：
  - 基本機能テスト
  - トランザクションテスト
  - エラーハンドリングテスト
  - 条件付き実行テスト
  - 複雑なシナリオテスト
  - ChainOptionsテスト（リトライ、タイムアウト、組み合わせ）

### 特徴
- ESMとCommonJSの両モジュール形式をサポート
- 完全な型推論と型安全性
- 他のデータベースへ拡張可能なアダプターパターン
- より良いコード組織のための不変チェーンパターン
- すべての主要ORMとシームレスに連携
