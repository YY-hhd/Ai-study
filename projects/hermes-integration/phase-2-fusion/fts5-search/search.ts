/**
 * FTS5 记忆搜索
 * 
 * 基于 SQLite FTS5 的全文搜索实现
 */

import * as fs from 'fs';
import * as path from 'path';
import sqlite3 from 'sqlite3';

// ============ 类型定义 ============

interface Memory {
  id: string;
  title: string;
  content: string;
  type: 'skill' | 'memory' | 'note' | 'experience';
  tags: string[];
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

interface SearchResult extends Memory {
  relevance: number;
  highlights?: string[];
}

interface SearchOptions {
  limit?: number;
  after?: string;
  before?: string;
  type?: string;
  highlight?: boolean;
}

// ============ 路径配置 ============

const PATHS = {
  memoryDb: path.join(process.env.HOME || '', '.openclaw', 'memory.db'),
};

// ============ 数据库初始化 ============

async function initDatabase(): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(PATHS.memoryDb, (err) => {
      if (err) reject(err);
    });
    
    // 创建 memories 表
    db.run(`CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      title TEXT,
      content TEXT,
      type TEXT,
      tags TEXT,
      created_at TEXT,
      updated_at TEXT,
      metadata TEXT
    )`, (err) => {
      if (err) reject(err);
    });
    
    // 创建 FTS5 虚拟表
    db.run(`CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
      title,
      content,
      tags,
      content='memories',
      content_rowid='rowid'
    )`, (err) => {
      if (err) reject(err);
    });
    
    // 创建触发器：INSERT
    db.run(`CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
      INSERT INTO memories_fts(rowid, title, content, tags)
      VALUES (new.rowid, new.title, new.content, new.tags);
    END`, (err) => {
      if (err) reject(err);
    });
    
    // 创建触发器：DELETE
    db.run(`CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
      INSERT INTO memories_fts(memories_fts, rowid, title, content, tags) 
      VALUES('delete', old.rowid, old.title, old.content, old.tags);
    END`, (err) => {
      if (err) reject(err);
    });
    
    // 创建触发器：UPDATE
    db.run(`CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
      INSERT INTO memories_fts(memories_fts, rowid, title, content, tags) 
      VALUES('delete', old.rowid, old.title, old.content, old.tags);
      INSERT INTO memories_fts(rowid, title, content, tags)
      VALUES (new.rowid, new.title, new.content, new.tags);
    END`, (err) => {
      if (err) reject(err);
    });
    
    resolve(db);
  });
}

// ============ 记忆管理 ============

async function addMemory(memory: Memory): Promise<void> {
  const db = await initDatabase();
  
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`INSERT OR REPLACE INTO memories 
      (id, title, content, type, tags, created_at, updated_at, metadata) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    
    stmt.run(
      memory.id,
      memory.title,
      memory.content,
      memory.type,
      JSON.stringify(memory.tags),
      memory.createdAt,
      memory.updatedAt,
      JSON.stringify(memory.metadata || {}),
      function(err) {
        stmt.finalize();
        db.close();
        if (err) reject(err);
        else {
          console.log(`✅ Added memory: ${memory.id} (${memory.title})`);
          resolve();
        }
      }
    );
  });
}

// ============ 搜索功能 ============

async function search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
  const db = await initDatabase();
  const { limit = 20, after, before, type, highlight = false } = options;
  
  return new Promise((resolve, reject) => {
    let sql = `
      SELECT m.*, bm25(memories_fts) as relevance
      FROM memories_fts fts
      JOIN memories m ON fts.rowid = m.rowid
      WHERE memories_fts MATCH ?
    `;
    
    const params: any[] = [query];
    
    // 添加时间过滤
    if (after) {
      sql += ` AND m.created_at >= ?`;
      params.push(after);
    }
    if (before) {
      sql += ` AND m.created_at <= ?`;
      params.push(before);
    }
    
    // 添加类型过滤
    if (type) {
      sql += ` AND m.type = ?`;
      params.push(type);
    }
    
    // 排序和限制
    sql += ` ORDER BY relevance DESC LIMIT ?`;
    params.push(limit);
    
    db.all(sql, params, (err, rows: any[]) => {
      if (err) {
        db.close();
        reject(err);
        return;
      }
      
      const results: SearchResult[] = rows.map(row => ({
        id: row.id,
        title: row.title,
        content: row.content,
        type: row.type,
        tags: JSON.parse(row.tags || '[]'),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        metadata: JSON.parse(row.metadata || '{}'),
        relevance: row.relevance,
      }));
      
      db.close();
      
      if (highlight) {
        resolve(applyHighlights(results, query));
      } else {
        resolve(results);
      }
    });
  });
}

async function applyHighlights(results: SearchResult[], query: string): Promise<SearchResult[]> {
  // 提取搜索词
  const terms = query.replace(/["\-\+]/g, '').split(/\s+/).filter(t => t.length > 0);
  
  return results.map(result => {
    let highlighted = result.content;
    const highlights: string[] = [];
    
    for (const term of terms) {
      const regex = new RegExp(`\\b(${term})\\b`, 'gi');
      if (regex.test(highlighted)) {
        highlights.push(term);
        highlighted = highlighted.replace(regex, '<mark>$1</mark>');
      }
    }
    
    return {
      ...result,
      content: highlighted,
      highlights,
    };
  });
}

// ============ 索引管理 ============

async function rebuildIndex(): Promise<void> {
  const db = await initDatabase();
  
  return new Promise((resolve, reject) => {
    // 删除 FTS 表
    db.run('DROP TABLE IF EXISTS memories_fts', (err) => {
      if (err) reject(err);
    });
    
    // 重新创建 FTS 表
    db.run(`CREATE VIRTUAL TABLE memories_fts USING fts5(
      title,
      content,
      tags,
      content='memories',
      content_rowid='rowid'
    )`, (err) => {
      if (err) reject(err);
    });
    
    // 重新索引所有数据
    db.run(`INSERT INTO memories_fts(rowid, title, content, tags)
      SELECT rowid, title, content, tags FROM memories`, (err) => {
      if (err) reject(err);
    });
    
    // 分析
    db.run('ANALYZE', (err) => {
      db.close();
      if (err) reject(err);
      else {
        console.log('✅ Index rebuilt successfully');
        resolve();
      }
    });
  });
}

async function checkSync(): Promise<{ total: number; indexed: number; missing: number }> {
  const db = await initDatabase();
  
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM memories', [], (err, totalRow: any) => {
      if (err) {
        db.close();
        reject(err);
        return;
      }
      
      db.get('SELECT COUNT(*) as count FROM memories_fts', [], (err, indexedRow: any) => {
        db.close();
        if (err) reject(err);
        else {
          const total = totalRow.count;
          const indexed = indexedRow.count;
          const missing = total - indexed;
          
          console.log(`Total memories: ${total}`);
          console.log(`Indexed: ${indexed}`);
          console.log(`Missing: ${missing}`);
          console.log(`Sync status: ${missing === 0 ? '✅' : '❌'}`);
          
          resolve({ total, indexed, missing });
        }
      });
    });
  });
}

// ============ CLI 入口 ============

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'init') {
    initDatabase().then(() => {
      console.log('✅ Database initialized with FTS5 support');
    }).catch(console.error);
    
  } else if (command === 'add') {
    const memory: Memory = {
      id: `mem-${Date.now()}`,
      title: 'Test Memory',
      content: 'This is a test memory for FTS5 search demo',
      type: 'note',
      tags: ['test', 'demo'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    addMemory(memory).catch(console.error);
    
  } else if (command === 'search') {
    const query = args.find(a => !a.startsWith('-'));
    const limit = parseInt(args.find(a => a === '--limit')?.split('=')[1] || '20');
    const highlight = args.includes('--highlight');
    const type = args.find(a => a === '--type')?.split('=')[1];
    
    if (!query) {
      console.error('Error: query is required');
      process.exit(1);
    }
    
    search(query, { limit, highlight, type }).then(results => {
      console.log(`Found ${results.length} results:\n`);
      results.forEach((r, i) => {
        console.log(`${i + 1}. [${r.type}] ${r.title}`);
        console.log(`   ${r.content.substring(0, 100)}...`);
        console.log(`   Relevance: ${r.relevance.toFixed(4)} | Tags: ${r.tags.join(', ')}`);
        console.log();
      });
    }).catch(console.error);
    
  } else if (command === 'rebuild') {
    rebuildIndex().catch(console.error);
    
  } else if (command === 'check-sync') {
    checkSync().catch(console.error);
    
  } else {
    console.log('FTS5 Memory Search');
    console.log('\nUsage:');
    console.log('  fts5-search init           Initialize database');
    console.log('  fts5-search add            Add test memory (demo)');
    console.log('  fts5-search search <query> Search memories');
    console.log('  fts5-search rebuild        Rebuild index');
    console.log('  fts5-search check-sync     Check sync status');
    console.log('\nSearch options:');
    console.log('  --limit=20     Result limit');
    console.log('  --highlight    Enable highlighting');
    console.log('  --type=skill   Filter by type');
    process.exit(1);
  }
}

// 导出函数
export { 
  initDatabase,
  addMemory,
  search,
  rebuildIndex,
  checkSync,
};

if (require.main === module) {
  main();
}
