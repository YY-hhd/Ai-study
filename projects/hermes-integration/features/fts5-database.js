#!/usr/bin/env node

/**
 * SQLite FTS5 真实数据库实现
 * 
 * 提供完整的全文搜索功能，支持短语搜索、前缀匹配、高亮显示等
 */

const Database = require('sqlite3').Database;
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(process.env.HOME || '', '.openclaw', 'memory.db');

class FTS5Database {
  constructor() {
    this.db = null;
  }

  // 初始化数据库
  async init() {
    return new Promise((resolve, reject) => {
      this.db = new Database(DB_PATH, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // 创建 memories 表
        this.db.run(`CREATE TABLE IF NOT EXISTS memories (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          type TEXT DEFAULT 'note',
          tags TEXT DEFAULT '[]',
          metadata TEXT DEFAULT '{}',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err) reject(err);
        });
        
        // 创建 FTS5 虚拟表
        this.db.run(`CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
          title,
          content,
          tags,
          content='memories',
          content_rowid='rowid'
        )`, (err) => {
          if (err) reject(err);
        });
        
        // 创建触发器 - INSERT
        this.db.run(`CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
          INSERT INTO memories_fts(rowid, title, content, tags)
          VALUES (new.rowid, new.title, new.content, new.tags);
        END`, (err) => {
          if (err) reject(err);
        });
        
        // 创建触发器 - DELETE
        this.db.run(`CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
          INSERT INTO memories_fts(memories_fts, rowid, title, content, tags) 
          VALUES('delete', old.rowid, old.title, old.content, old.tags);
        END`, (err) => {
          if (err) reject(err);
        });
        
        // 创建触发器 - UPDATE
        this.db.run(`CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
          INSERT INTO memories_fts(memories_fts, rowid, title, content, tags) 
          VALUES('delete', old.rowid, old.title, old.content, old.tags);
          INSERT INTO memories_fts(rowid, title, content, tags)
          VALUES (new.rowid, new.title, new.content, new.tags);
        END`, (err) => {
          if (err) reject(err);
          else {
            console.log('✅ FTS5 数据库初始化完成');
            resolve();
          }
        });
      });
    });
  }

  // 添加记忆
  async addMemory(memory) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`INSERT OR REPLACE INTO memories 
        (id, title, content, type, tags, metadata, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      
      stmt.run(
        memory.id,
        memory.title,
        memory.content,
        memory.type || 'note',
        JSON.stringify(memory.tags || []),
        JSON.stringify(memory.metadata || {}),
        memory.createdAt || new Date().toISOString(),
        new Date().toISOString(),
        function(err) {
          stmt.finalize();
          if (err) reject(err);
          else {
            console.log(`✅ 已添加记忆：${memory.id}`);
            resolve(memory.id);
          }
        }
      );
    });
  }

  // FTS5 搜索
  async search(query, options = {}) {
    const { limit = 20, highlight = false, type = null } = options;
    
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT m.*, bm25(memories_fts) as relevance
        FROM memories_fts fts
        JOIN memories m ON fts.rowid = m.rowid
        WHERE memories_fts MATCH ?
      `;
      
      const params = [query];
      
      if (type) {
        sql += ` AND m.type = ?`;
        params.push(type);
      }
      
      sql += ` ORDER BY relevance DESC LIMIT ?`;
      params.push(limit);
      
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else {
          const results = rows.map(row => ({
            id: row.id,
            title: row.title,
            content: row.content,
            type: row.type,
            tags: JSON.parse(row.tags || '[]'),
            metadata: JSON.parse(row.metadata || '{}'),
            createdAt: row.created_at,
            relevance: row.relevance
          }));
          
          if (highlight) {
            resolve(this.applyHighlight(results, query));
          } else {
            resolve(results);
          }
        }
      });
    });
  }

  // 应用高亮
  applyHighlight(results, query) {
    const terms = query.replace(/["\-\+]/g, '').split(/\s+/).filter(t => t.length > 0);
    
    return results.map(result => {
      let highlighted = result.content;
      const highlights = [];
      
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
        highlights
      };
    });
  }

  // 获取所有记忆
  async listMemories(limit = 100) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM memories ORDER BY created_at DESC LIMIT ?',
        [limit],
        (err, rows) => {
          if (err) reject(err);
          else {
            resolve(rows.map(row => ({
              ...row,
              tags: JSON.parse(row.tags || '[]'),
              metadata: JSON.parse(row.metadata || {})
            })));
          }
        }
      );
    });
  }

  // 删除记忆
  async deleteMemory(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM memories WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else {
          console.log(`✅ 已删除记忆：${id}`);
          resolve(this.changes);
        }
      });
    });
  }

  // 获取统计信息
  async getStats() {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT COUNT(*) as count FROM memories', [], (err, row) => {
        if (err) reject(err);
        else {
          resolve({
            totalMemories: row.count,
            databasePath: DB_PATH
          });
        }
      });
    });
  }

  // 关闭数据库
  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// CLI 入口
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const db = new FTS5Database();
  
  try {
    await db.init();
    
    if (command === 'init') {
      console.log('✅ FTS5 数据库已初始化');
      const stats = await db.getStats();
      console.log(`📊 记忆总数：${stats.totalMemories}`);
      console.log(`📁 数据库路径：${stats.databasePath}`);
      
    } else if (command === 'add') {
      const memory = {
        id: `mem-${Date.now()}`,
        title: args[1] || 'Test Memory',
        content: args[2] || 'This is a test memory',
        type: args[3] || 'note',
        tags: ['test', 'demo']
      };
      await db.addMemory(memory);
      
    } else if (command === 'search') {
      const query = args[1];
      if (!query) {
        console.error('Error: query is required');
        process.exit(1);
      }
      
      const results = await db.search(query, {
        limit: 10,
        highlight: args.includes('--highlight')
      });
      
      console.log(`\n🔍 搜索结果："${query}"`);
      console.log(`📊 找到 ${results.length} 条结果\n`);
      
      results.forEach((r, i) => {
        console.log(`${i + 1}. [${r.type}] ${r.title}`);
        console.log(`   相关性：${r.relevance.toFixed(4)}`);
        console.log(`   标签：${r.tags.join(', ')}`);
        if (r.highlights && r.highlights.length > 0) {
          console.log(`   高亮：${r.highlights.join(', ')}`);
        }
        console.log(`   内容：${r.content.substring(0, 100)}...\n`);
      });
      
    } else if (command === 'list') {
      const memories = await db.listMemories(20);
      console.log(`\n📋 记忆列表 (最近 ${memories.length} 条):\n`);
      memories.forEach((m, i) => {
        console.log(`${i + 1}. [${m.type}] ${m.title} (${m.tags.join(', ')})`);
      });
      
    } else if (command === 'stats') {
      const stats = await db.getStats();
      console.log('\n📊 FTS5 数据库统计:');
      console.log(`   记忆总数：${stats.totalMemories}`);
      console.log(`   数据库路径：${stats.databasePath}`);
      
    } else {
      console.log('SQLite FTS5 数据库工具');
      console.log('\nUsage:');
      console.log('  node fts5-database.js init              初始化数据库');
      console.log('  node fts5-database.js add "标题" "内容" 添加记忆');
      console.log('  node fts5-database.js search "查询"     搜索记忆');
      console.log('  node fts5-database.js list              列出记忆');
      console.log('  node fts5-database.js stats             查看统计');
      console.log('\nOptions:');
      console.log('  --highlight    高亮显示匹配词');
    }
    
    await db.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await db.close();
    process.exit(1);
  }
}

// 导出类
module.exports = { FTS5Database };

// 运行 CLI
if (require.main === module) {
  main();
}
