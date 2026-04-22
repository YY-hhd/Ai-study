/**
 * 会话历史互通工具
 * 
 * OpenClaw ↔ Hermes 会话历史双向同步
 */

import * as fs from 'fs';
import * as path from 'path';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

// ============ 类型定义 ============

interface MessageExport {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolCalls?: any[];
  metadata?: Record<string, any>;
}

interface SessionExport {
  id: string;
  title?: string;
  createdAt: string;
  lastActivity: string;
  model?: string;
  messageCount: number;
  messages: MessageExport[];
  metadata?: Record<string, any>;
}

interface OpenClawSession {
  sessionKey: string;
  kind: string;
  lastActivity?: string;
  model?: string;
  messageCount?: number;
}

// ============ 路径配置 ============

const PATHS = {
  openclawSessions: path.join(process.env.HOME || '', '.openclaw', 'agents', 'main', 'sessions', 'sessions.json'),
  hermesSessionsDb: path.join(process.env.HOME || '', '.hermes', 'sessions.db'),
};

// ============ OpenClaw 会话操作 ============

function loadOpenClawSessions(): OpenClawSession[] {
  if (!fs.existsSync(PATHS.openclawSessions)) {
    throw new Error(`OpenClaw sessions file not found: ${PATHS.openclawSessions}`);
  }
  const content = fs.readFileSync(PATHS.openclawSessions, 'utf-8');
  const data = JSON.parse(content);
  return data.sessions || [];
}

function exportOpenClawSessions(): SessionExport[] {
  const sessions = loadOpenClawSessions();
  
  return sessions.map(session => ({
    id: sanitizeSessionId(session.sessionKey),
    title: extractSessionTitle(session.sessionKey),
    createdAt: session.lastActivity || new Date().toISOString(),
    lastActivity: session.lastActivity || new Date().toISOString(),
    model: session.model,
    messageCount: session.messageCount || 0,
    messages: [], // 实际消息需要从会话历史中加载
    metadata: {
      kind: session.kind,
      source: 'openclaw',
    },
  }));
}

function importToOpenClaw(sessions: SessionExport[]): void {
  const existingSessions = loadOpenClawSessions();
  const existingKeys = new Set(existingSessions.map(s => s.sessionKey));
  
  for (const session of sessions) {
    const sessionKey = `${session.metadata?.source || 'import'}-${session.id}`;
    
    if (!existingKeys.has(sessionKey)) {
      existingSessions.push({
        sessionKey,
        kind: 'direct',
        lastActivity: session.lastActivity,
        model: session.model,
        messageCount: session.messageCount,
      });
    }
  }
  
  // 保存更新后的会话列表
  const sessionsDir = path.dirname(PATHS.openclawSessions);
  if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
  }
  
  fs.writeFileSync(PATHS.openclawSessions, JSON.stringify({ sessions: existingSessions }, null, 2), 'utf-8');
  console.log(`✅ Imported ${sessions.length} sessions to OpenClaw`);
}

// ============ Hermes 会话操作 ============

async function loadHermesSessions(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(PATHS.hermesSessionsDb)) {
      reject(new Error(`Hermes sessions database not found: ${PATHS.hermesSessionsDb}`));
      return;
    }
    
    const db = new sqlite3.Database(PATHS.hermesSessionsDb, sqlite3.OPEN_READONLY, (err) => {
      if (err) reject(err);
    });
    
    db.all('SELECT * FROM sessions ORDER BY created_at DESC', [], (err, rows) => {
      db.close();
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function exportHermesSessions(): Promise<SessionExport[]> {
  const sessions = await loadHermesSessions();
  
  return sessions.map((session: any) => ({
    id: sanitizeSessionId(session.id),
    title: session.title,
    createdAt: session.created_at,
    lastActivity: session.created_at, // Hermes 使用 created_at 作为最后活动时间
    model: undefined, // Hermes 不存储模型信息
    messageCount: 0, // 需要单独查询
    messages: [], // 需要单独查询消息
    metadata: {
      source: 'hermes',
      parent_id: session.parent_id,
      lineage: session.lineage,
    },
  }));
}

async function importToHermes(sessions: SessionExport[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(PATHS.hermesSessionsDb, (err) => {
      if (err) reject(err);
    });
    
    // 创建表 (如果不存在)
    db.run(`CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT,
      created_at TIMESTAMP,
      parent_id TEXT,
      lineage TEXT
    )`, (err) => {
      if (err) {
        db.close();
        reject(err);
        return;
      }
      
      // 插入会话
      const stmt = db.prepare(`INSERT OR REPLACE INTO sessions (id, title, created_at, parent_id, lineage) VALUES (?, ?, ?, ?, ?)`);
      
      let inserted = 0;
      for (const session of sessions) {
        stmt.run(
          session.id,
          session.title || 'Imported Session',
          session.createdAt,
          session.metadata?.parent_id || null,
          session.metadata?.lineage || null,
          (err) => {
            if (err) console.error(`Failed to insert session ${session.id}:`, err);
            else inserted++;
          }
        );
      }
      
      stmt.finalize((err) => {
        db.close();
        if (err) reject(err);
        else {
          console.log(`✅ Imported ${inserted} sessions to Hermes`);
          resolve();
        }
      });
    });
  });
}

// ============ 工具函数 ============

function sanitizeSessionId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
}

function extractSessionTitle(sessionKey: string): string {
  // 从 sessionKey 提取可读标题
  const parts = sessionKey.split(':');
  if (parts.length >= 3) {
    return `${parts[1]}-${parts[2]}`;
  }
  return sessionKey;
}

// ============ 导出功能 ============

async function exportSessions(from: 'openclaw' | 'hermes', outputPath: string): Promise<void> {
  let sessions: SessionExport[];
  
  if (from === 'openclaw') {
    sessions = exportOpenClawSessions();
  } else if (from === 'hermes') {
    sessions = await exportHermesSessions();
  } else {
    throw new Error('Invalid source. Use "openclaw" or "hermes".');
  }
  
  // 计算总消息数
  const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);
  
  // 保存到文件
  fs.writeFileSync(outputPath, JSON.stringify(sessions, null, 2), 'utf-8');
  
  console.log(`✅ Exported ${sessions.length} sessions with ${totalMessages} messages`);
  console.log(`📄 Output: ${outputPath}`);
}

// ============ 导入功能 ============

async function importSessions(to: 'openclaw' | 'hermes', inputPath: string): Promise<void> {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }
  
  const content = fs.readFileSync(inputPath, 'utf-8');
  const sessions: SessionExport[] = JSON.parse(content);
  
  if (to === 'openclaw') {
    importToOpenClaw(sessions);
  } else if (to === 'hermes') {
    await importToHermes(sessions);
  } else {
    throw new Error('Invalid target. Use "openclaw" or "hermes".');
  }
}

// ============ 列表功能 ============

async function listSessions(from: 'openclaw' | 'hermes'): Promise<void> {
  let sessions: any[];
  
  if (from === 'openclaw') {
    sessions = loadOpenClawSessions();
    console.log('Sessions in OpenClaw:');
    sessions.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.sessionKey} (${s.messageCount || 0} messages, last: ${s.lastActivity || 'unknown'})`);
    });
  } else if (from === 'hermes') {
    sessions = await loadHermesSessions();
    console.log('Sessions in Hermes:');
    sessions.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.id} (${s.title || 'no title'}, created: ${s.created_at})`);
    });
  }
}

// ============ CLI 入口 ============

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'export') {
    const fromIndex = args.indexOf('--from');
    const from = fromIndex > -1 ? args[fromIndex + 1] : undefined;
    const outputIndex = args.indexOf('--output');
    const output = outputIndex > -1 ? args[outputIndex + 1] : 'sessions-export.json';
    
    if (!from || (from !== 'openclaw' && from !== 'hermes')) {
      console.error('Error: Specify --from openclaw or --from hermes');
      process.exit(1);
    }
    
    exportSessions(from as 'openclaw' | 'hermes', output).catch(console.error);
    
  } else if (command === 'import') {
    const toIndex = args.indexOf('--to');
    const to = toIndex > -1 ? args[toIndex + 1] : undefined;
    const inputIndex = args.indexOf('--input');
    const input = inputIndex > -1 ? args[inputIndex + 1] : 'sessions-export.json';
    
    if (!to || (to !== 'openclaw' && to !== 'hermes')) {
      console.error('Error: Specify --to openclaw or --to hermes');
      process.exit(1);
    }
    
    importSessions(to as 'openclaw' | 'hermes', input).catch(console.error);
    
  } else if (command === 'list') {
    const fromIndex = args.indexOf('--from');
    const from = fromIndex > -1 ? args[fromIndex + 1] : undefined;
    
    if (!from || (from !== 'openclaw' && from !== 'hermes')) {
      console.error('Error: Specify --from openclaw or --from hermes');
      process.exit(1);
    }
    
    listSessions(from as 'openclaw' | 'hermes').catch(console.error);
    
  } else if (command === 'sync') {
    console.log('Sync functionality not yet implemented');
    process.exit(1);
    
  } else {
    console.log('Session Sync Tool');
    console.log('\nUsage:');
    console.log('  session-sync export --from <source> --output <file>');
    console.log('  session-sync import --to <target> --input <file>');
    console.log('  session-sync list --from <source>');
    console.log('  session-sync sync [--direction <direction>]');
    process.exit(1);
  }
}

// 导出函数
export { 
  exportSessions, 
  importSessions, 
  listSessions,
  loadOpenClawSessions,
  loadHermesSessions,
};

if (require.main === module) {
  main();
}
