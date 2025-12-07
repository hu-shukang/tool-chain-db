# 更新履歴

このファイルには、このプロジェクトのすべての重要な変更が記録されています。

形式は [Keep a Changelog](https://keepachangelog.com/ja/1.0.0/) に基づいており、
このプロジェクトは [セマンティックバージョニング](https://semver.org/lang/ja/spec/v2.0.0.html) に準拠しています。

[English](./CHANGELOG.md) | [中文文档](./CHANGELOG.zh-CN.md)

---

## [1.0.2] - 2025-12-07

### 修正
- 🐛 1つのORMのみを使用する場合の「モジュールが見つかりません」エラーを修正（例：Kyselyを使用しているのにTypeORMが見つからないエラーが発生する問題）
- 🐛 オプションのpeer dependencyロード問題を解決 - 実際に使用するORMのみがロードされるようになりました

### 変更
- 🔧 **破壊的変更**：不要な依存関係のロードを避けるため、アダプターはサブパスからインポートする必要があります
  - 以前：`import { KyselyAdapter } from '@tool-chain/db'`
  - 以後：`import { KyselyAdapter } from '@tool-chain/db/kysely'`
- 🔧 各アダプター用のpackage.jsonサブパスエクスポートを追加：
  - `@tool-chain/db/kysely` - Kyselyアダプターと便利クラス
  - `@tool-chain/db/typeorm` - TypeORMアダプターと便利クラス
  - `@tool-chain/db/prisma` - Prismaアダプターと便利クラス
  - `@tool-chain/db/drizzle` - Drizzleアダプターと便利クラス
- 📚 すべてのドキュメント（英語、中国語、日本語）を新しいインポート方法で更新
- 🔧 テストファイルを新しいインポートパスで更新

### 技術的な詳細
- メインエントリーポイント（`src/index.ts`）からアダプターのエクスポートを削除
- `package.json` にサブパスエクスポート設定を追加
- メインエントリーポイントは核心的な `Chains` クラスと型のみをエクスポート

### マイグレーションガイド
1.0.1からアップグレードする場合は、インポート文を更新してください：

```typescript
// 旧（動作しなくなります）
import { KyselyAdapter, ChainsWithKysely } from '@tool-chain/db';
import { TypeORMAdapter, ChainsWithTypeORM } from '@tool-chain/db';

// 新（正しい方法）
import { Chains } from '@tool-chain/db';
import { KyselyAdapter, ChainsWithKysely } from '@tool-chain/db/kysely';
import { TypeORMAdapter, ChainsWithTypeORM } from '@tool-chain/db/typeorm';
```

---

## [1.0.1] - 2025-12-07

### 変更
- 🔧 ビルドスクリプトを更新し、独立した `tsconfig.build.json` 設定ファイルを使用するように変更
- 🔧 TypeScriptビルド設定を最適化し、開発環境とビルド環境の設定を分離

### 技術的な詳細
- プロダクションビルド用の `tsconfig.build.json` ファイルを追加
- `package.json` のビルドスクリプトを更新し、`--project tsconfig.build.json` パラメータを使用

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
