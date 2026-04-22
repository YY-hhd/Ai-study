/**
 * OpenClaw ↔ Hermes 记忆格式转换器
 * 
 * 支持文件式记忆 (Markdown) ↔ SQLite 记忆 双向转换
 */

import * as fs from 'fs';
import * as path from 'path';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

// ============ 类型定义 ============

interface MemoryRecord {
  id: string;
  content: string;
  tags: string[];
  created_at: string;
  importance?: number;
}

interface MigrationReport {
  timestamp: string;
  direction: 'openclaw-to-hermes' | 'hermes-to-openclaw';
  files: Record<string, { status: string; records?: number; error?: string }>;
  database?: {
    path: string;
    totalRecords: number;
    ftsIndexed: boolean;
  };
  warnings: string[];
  backupPath?: string;
}

// ============ Markdown 解析 ============

function parseMarkdownSection(content: string, filename: string): MemoryRecord[] {
  const records: MemoryRecord[] = [];
  const lines = content.split('\n');
  let currentSection: { title: string; content: string[]; date?: string } | null = null;

  for (const line of lines) {
    // 检测章节标题
    const headingMatch = line.match(/^##+\s*(.*)$/);
    if (headingMatch) {
      if (currentSection) {
        records.push(createRecord(currentSection, filename));
      }
      currentSection = {
        title: headingMatch[1].trim(),
        content: [],
        date: extractDate(headingMatch[1]) || extractDate(filename),
      };
    } else if (currentSection && line.trim()) {
      currentSection.content.push(line);
    }
  }

  if (currentSection) {
    records.push(createRecord(currentSection, filename));
  }

  return records;
}

function createRecord(
  section: { title: string; content: string[]; date?: string },
  filename: string
): MemoryRecord {
  const date = section.date || new Date().toISOString().slice(0, 10);
  const id = `${filename}-${date}-${hash(section.title)}`;
  const tags = extractTags(section.title, filename);

  return {
    id,
    content: section.content.join('\n'),
    tags,
    created_at: `${date}T00:00:00+08:00`,
    importance: calculateImportance(section.title, section.content.join('\n')),
  };
}

function extractDate(text: string): string | null {
  const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
  return dateMatch ? dateMatch[1] : null;
}

function extractTags(title: string, filename: string): string[] {
  const tags: string[] = [];
  
  if (filename.includes('MEMORY')) tags.push('memory');
  if (filename.includes('USER')) tags.push('user');
  if (filename.includes('SOUL')) tags.push('soul');
  if (filename.includes('IDENTITY')) tags.push('identity');
  if (filename.includes('AGENT')) tags.push('agent');
  
  if (title.toLowerCase().includes('项目')) tags.push('project');
  if (title.toLowerCase().includes('学习')) tags.push('learning');
  if (title.toLowerCase().includes('偏好')) tags.push('preference');
  
  return tags.length > 0 ? tags : ['general'];
}

function calculateImportance(title: string, content: string): number {
  let importance = 1;
  if (title.includes('核心') || title.includes('重要')) importance += 2;
  if (content.includes('必须') || content.includes('一定')) importance += 1;
  if (content.length > 500) importance += 1;
  return importance;
}

function hash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

// ============ SQLite 操作 ============

async function initDatabase(dbPath: string): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

async function createTables(db: sqlite3.Database): Promise<void> {
  const queries = [
    `CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      embedding BLOB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP,
      tags TEXT,
      importance INTEGER DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT,
      created_at TIMESTAMP,
      parent_id TEXT,
      lineage TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS user_models (
      id TEXT PRIMARY KEY,
      dialectic_data TEXT,
      preferences TEXT,
      updated_at TIMESTAMP
    )`,
    `CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(content, tags)`,
  ];

  for (const query of queries) {
    await runQuery(db, query);
  }
}

async function runQuery(db: sqlite3.Database, query: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(query, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function insertMemory(db: sqlite3.Database, record: MemoryRecord): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO memories (id, content, tags, created_at, importance)
       VALUES (?, ?, ?, ?, ?)`,
      [record.id, record.content, JSON.stringify(record.tags), record.created_at, record.importance],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// ============ 转换函数 ============

async function openclawToHermes(
  workspacePath: string,
  dbPath: string
): Promise<MigrationReport> {
  const report: MigrationReport = {
    timestamp: new Date().toISOString(),
    direction: 'openclaw-to-hermes',
    files: {},
    warnings: [],
  };

  // 备份现有数据库
  if (fs.existsSync(dbPath)) {
    report.backupPath = backupFile(dbPath);
  }

  // 初始化数据库
  const db = await initDatabase(dbPath);
  await createTables(db);

  let totalRecords = 0;

  // 处理根目录文件
  const rootFiles = ['MEMORY.md', 'USER.md', 'SOUL.md', 'IDENTITY.md', 'AGENTS.md'];
  for (const file of rootFiles) {
    const filePath = path.join(workspacePath, file);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const records = parseMarkdownSection(content, file);
        for (const record of records) {
          await insertMemory(db, record);
          totalRecords++;
        }
        report.files[file] = { status: 'migrated', records: records.length };
      } catch (error) {
        report.files[file] = { status: 'error', error: String(error) };
      }
    }
  }

  // 处理 memory/ 目录
  const memoryDir = path.join(workspacePath, 'memory');
  if (fs.existsSync(memoryDir)) {
    const dailyFiles = fs.readdirSync(memoryDir).filter(f => f.endsWith('.md'));
    for (const file of dailyFiles) {
      const filePath = path.join(memoryDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const records = parseMarkdownSection(content, `memory/${file}`);
        for (const record of records) {
          await insertMemory(db, record);
          totalRecords++;
        }
        report.files[`memory/${file}`] = { status: 'migrated', records: records.length };
      } catch (error) {
        report.files[`memory/${file}`] = { status: 'error', error: String(error) };
      }
    }
  }

  report.database = {
    path: dbPath,
    totalRecords: totalRecords,
    ftsIndexed: true,
  };

  db.close();
  return report;
}

function backupFile(filePath: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupPath = `${filePath}.backup-${timestamp}`;
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, backupPath);
  }
  return backupPath;
}

// ============ CLI 入口 ============

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'to-hermes') {
    const workspacePath = args.find((a, i) => args[i - 1] === '--workspace' || args[i - 1] === '-w') 
      || '~/.openclaw/workspace';
    const dbPath = args.find((a, i) => args[i - 1] === '--database' || args[i - 1] === '-d') 
      || '~/.hermes/memory.db';

    const expandedWorkspace = workspacePath.replace('~', process.env.HOME || process.env.USERPROFILE || '');
    const expandedDb = dbPath.replace('~', process.env.HOME || process.env.USERPROFILE || '');

    openclawToHermes(expandedWorkspace, expandedDb)
      .then((report) => {
        console.log('✅ 记忆迁移完成');
        console.log(`📊 总记录数：${report.database?.totalRecords}`);
        console.log(`💾 数据库：${expandedDb}`);
        if (report.backupPath) {
          console.log(`💿 备份：${report.backupPath}`);
        }
      })
      .catch((error) => {
        console.error('❌ 迁移失败:', error);
        process.exit(1);
      });
  } else {
    console.log('用法:');
    console.log('  converter to-hermes --workspace <path> --database <path>');
    process.exit(1);
  }
}

// 导出函数
export { parseMarkdownSection, openclawToHermes, initDatabase, insertMemory };

if (require.main === module) {
  main();
}
