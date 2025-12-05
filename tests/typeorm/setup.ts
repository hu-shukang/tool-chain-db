/**
 * TypeORM 测试工具函数 - 使用 SQLite 创建测试数据库
 */
import { Column, DataSource, Entity, EntityManager, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

/**
 * User 实体
 */
@Entity('user')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  role!: 'user' | 'admin';

  @Column()
  created_at!: string;
}

/**
 * Book 实体
 */
@Entity('book')
export class Book {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  user_id!: number;

  @Column()
  title!: string;

  @Column()
  author!: string;

  @Column()
  created_at!: string;

  @ManyToOne(() => User)
  user?: User;
}

/**
 * 创建内存数据源
 */
export async function createTestDataSource(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: 'better-sqlite3',
    database: ':memory:',
    entities: [User, Book],
    synchronize: true, // 自动创建表结构
    logging: false,
  });

  await dataSource.initialize();
  return dataSource;
}

/**
 * 清理数据源
 */
export async function cleanupDataSource(dataSource: DataSource): Promise<void> {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
}

/**
 * 插入测试数据
 */
export async function seedTestData(dataSource: DataSource): Promise<void> {
  const now = new Date().toISOString();

  // 插入用户
  await dataSource
    .createQueryBuilder()
    .insert()
    .into(User)
    .values([
      { name: 'Alice', email: 'alice@example.com', role: 'admin', created_at: now },
      { name: 'Bob', email: 'bob@example.com', role: 'user', created_at: now },
      { name: 'Charlie', email: 'charlie@example.com', role: 'user', created_at: now },
    ])
    .execute();

  // 插入书籍
  await dataSource
    .createQueryBuilder()
    .insert()
    .into(Book)
    .values([
      { user_id: 1, title: 'TypeScript 101', author: 'Alice', created_at: now },
      { user_id: 1, title: 'Database Design', author: 'Alice', created_at: now },
      { user_id: 2, title: 'JavaScript Basics', author: 'Bob', created_at: now },
    ])
    .execute();
}

/**
 * 辅助函数：从 DataSource 或 EntityManager 获取 EntityManager
 */
export function getManager(db: DataSource | EntityManager): EntityManager {
  return db instanceof DataSource ? db.manager : db;
}
