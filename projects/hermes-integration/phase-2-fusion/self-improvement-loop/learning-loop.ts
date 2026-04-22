/**
 * 自改进学习循环核心实现
 * 
 * 实现经验收集、学习分析、技能更新、效果评估的完整循环
 */

import * as fs from 'fs';
import * as path from 'path';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

// ============ 类型定义 ============

interface Experience {
  id: string;
  timestamp: string;
  taskId: string;
  taskType: 'coding' | 'writing' | 'analysis' | 'conversation' | 'other';
  outcome: 'success' | 'partial' | 'failure';
  duration: number;
  tokensUsed: number;
  userFeedback?: UserFeedback;
  context: ExperienceContext;
  artifacts: Artifacts;
}

interface UserFeedback {
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  type: 'explicit' | 'implicit';
}

interface ExperienceContext {
  sessionKey: string;
  model: string;
  toolsUsed: string[];
  skillsApplied: string[];
}

interface Artifacts {
  input: string;
  output: string;
  intermediateSteps?: string[];
}

interface LearningInsight {
  id: string;
  experienceIds: string[];
  pattern: 'success_pattern' | 'failure_pattern' | 'optimization';
  category: 'skill' | 'tool' | 'workflow' | 'communication';
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  recommendation: Recommendation;
  createdAt: string;
}

interface Recommendation {
  action: 'add_skill' | 'modify_skill' | 'remove_skill' | 'adjust_workflow' | 'reinforce';
  details: string;
  priority: number;
}

interface SkillUpdate {
  id: string;
  skillName: string;
  changeType: string;
  content: string;
  rationale: string;
  sourceExperiences: string[];
  status: 'pending_review' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

// ============ 路径配置 ============

const PATHS = {
  learningDb: path.join(process.env.HOME || '', '.openclaw', 'learning.db'),
  skillsDir: path.join(process.env.HOME || '', '.openclaw', 'workspace', 'skills'),
  experiencesDir: path.join(process.env.HOME || '', '.openclaw', 'workspace', 'data', 'experiences'),
};

// ============ 数据库初始化 ============

async function initDatabase(): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(PATHS.learningDb, (err) => {
      if (err) reject(err);
    });
    
    // 创建经验表
    db.run(`CREATE TABLE IF NOT EXISTS experiences (
      id TEXT PRIMARY KEY,
      timestamp TEXT,
      task_id TEXT,
      task_type TEXT,
      outcome TEXT,
      duration INTEGER,
      tokens_used INTEGER,
      user_feedback_rating INTEGER,
      user_feedback_comment TEXT,
      context_json TEXT,
      artifacts_json TEXT
    )`, (err) => {
      if (err) reject(err);
    });
    
    // 创建学习洞察表
    db.run(`CREATE TABLE IF NOT EXISTS insights (
      id TEXT PRIMARY KEY,
      experience_ids TEXT,
      pattern TEXT,
      category TEXT,
      description TEXT,
      confidence REAL,
      impact TEXT,
      recommendation_json TEXT,
      created_at TEXT
    )`, (err) => {
      if (err) reject(err);
    });
    
    // 创建技能更新表
    db.run(`CREATE TABLE IF NOT EXISTS skill_updates (
      id TEXT PRIMARY KEY,
      skill_name TEXT,
      change_type TEXT,
      content TEXT,
      rationale TEXT,
      source_experiences TEXT,
      status TEXT,
      reviewed_by TEXT,
      reviewed_at TEXT,
      created_at TEXT
    )`, (err) => {
      if (err) reject(err);
    });
    
    // 创建索引
    db.run(`CREATE INDEX IF NOT EXISTS idx_experiences_task_type ON experiences(task_type)`, (err) => {
      if (err) reject(err);
    });
    
    db.run(`CREATE INDEX IF NOT EXISTS idx_experiences_outcome ON experiences(outcome)`, (err) => {
      if (err) reject(err);
    });
    
    db.run(`CREATE INDEX IF NOT EXISTS idx_skill_updates_status ON skill_updates(status)`, (err) => {
      if (err) {
        db.close();
        reject(err);
      } else {
        resolve(db);
      }
    });
  });
}

// ============ 经验收集 ============

async function collectExperience(experience: Experience): Promise<void> {
  const db = await initDatabase();
  
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`INSERT OR REPLACE INTO experiences 
      (id, timestamp, task_id, task_type, outcome, duration, tokens_used, 
       user_feedback_rating, user_feedback_comment, context_json, artifacts_json) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    
    stmt.run(
      experience.id,
      experience.timestamp,
      experience.taskId,
      experience.taskType,
      experience.outcome,
      experience.duration,
      experience.tokensUsed,
      experience.userFeedback?.rating || null,
      experience.userFeedback?.comment || null,
      JSON.stringify(experience.context),
      JSON.stringify(experience.artifacts),
      function(err) {
        stmt.finalize();
        db.close();
        if (err) reject(err);
        else {
          console.log(`✅ Collected experience: ${experience.id} (${experience.taskType}, ${experience.outcome})`);
          resolve();
        }
      }
    );
  });
}

async function listExperiences(limit: number = 10): Promise<Experience[]> {
  const db = await initDatabase();
  
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM experiences ORDER BY timestamp DESC LIMIT ?', [limit], (err, rows: any[]) => {
      db.close();
      if (err) reject(err);
      else {
        const experiences: Experience[] = rows.map(row => ({
          id: row.id,
          timestamp: row.timestamp,
          taskId: row.task_id,
          taskType: row.task_type as Experience['taskType'],
          outcome: row.outcome as Experience['outcome'],
          duration: row.duration,
          tokensUsed: row.tokens_used,
          userFeedback: row.user_feedback_rating ? {
            rating: row.user_feedback_rating as 1|2|3|4|5,
            comment: row.user_feedback_comment,
            type: 'explicit' as const,
          } : undefined,
          context: JSON.parse(row.context_json),
          artifacts: JSON.parse(row.artifacts_json),
        }));
        resolve(experiences);
      }
    });
  });
}

// ============ 学习分析 ============

async function analyzeExperiences(): Promise<LearningInsight[]> {
  const db = await initDatabase();
  const insights: LearningInsight[] = [];
  
  // 分析失败模式
  const failurePatterns = await analyzeFailurePatterns(db);
  insights.push(...failurePatterns);
  
  // 分析成功模式
  const successPatterns = await analyzeSuccessPatterns(db);
  insights.push(...successPatterns);
  
  // 生成优化建议
  const optimizations = await generateOptimizations(db);
  insights.push(...optimizations);
  
  db.close();
  
  console.log(`✅ Generated ${insights.length} learning insights`);
  return insights;
}

async function analyzeFailurePatterns(db: sqlite3.Database): Promise<LearningInsight[]> {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT task_type, skills_applied, COUNT(*) as failure_count
      FROM experiences
      WHERE outcome = 'failure'
      GROUP BY task_type
      HAVING failure_count >= 2
      ORDER BY failure_count DESC
      LIMIT 5
    `, [], (err, rows: any[]) => {
      if (err) reject(err);
      else {
        const insights: LearningInsight[] = rows.map((row, idx) => ({
          id: `failure-pattern-${Date.now()}-${idx}`,
          experienceIds: [],
          pattern: 'failure_pattern',
          category: 'skill',
          description: `High failure rate in ${row.task_type} tasks (${row.failure_count} failures)`,
          confidence: 0.8,
          impact: 'high' as const,
          recommendation: {
            action: 'modify_skill',
            details: `Review and improve skills used in ${row.task_type} tasks`,
            priority: 8,
          },
          createdAt: new Date().toISOString(),
        }));
        resolve(insights);
      }
    });
  });
}

async function analyzeSuccessPatterns(db: sqlite3.Database): Promise<LearningInsight[]> {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT task_type, skills_applied, COUNT(*) as success_count
      FROM experiences
      WHERE outcome = 'success'
      GROUP BY task_type
      HAVING success_count >= 3
      ORDER BY success_count DESC
      LIMIT 5
    `, [], (err, rows: any[]) => {
      if (err) reject(err);
      else {
        const insights: LearningInsight[] = rows.map((row, idx) => ({
          id: `success-pattern-${Date.now()}-${idx}`,
          experienceIds: [],
          pattern: 'success_pattern',
          category: 'skill',
          description: `High success rate in ${row.task_type} tasks (${row.success_count} successes)`,
          confidence: 0.9,
          impact: 'medium' as const,
          recommendation: {
            action: 'reinforce',
            details: `Continue using current approach for ${row.task_type} tasks`,
            priority: 5,
          },
          createdAt: new Date().toISOString(),
        }));
        resolve(insights);
      }
    });
  });
}

async function generateOptimizations(db: sqlite3.Database): Promise<LearningInsight[]> {
  // 分析平均耗时，识别优化机会
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT task_type, AVG(duration) as avg_duration, COUNT(*) as count
      FROM experiences
      WHERE outcome = 'success'
      GROUP BY task_type
      HAVING count >= 5
      ORDER BY avg_duration DESC
    `, [], (err, rows: any[]) => {
      if (err) reject(err);
      else {
        const insights: LearningInsight[] = rows.slice(0, 3).map((row, idx) => ({
          id: `optimization-${Date.now()}-${idx}`,
          experienceIds: [],
          pattern: 'optimization',
          category: 'workflow',
          description: `Optimization opportunity: ${row.task_type} tasks average ${Math.round(row.avg_duration / 1000)}s`,
          confidence: 0.7,
          impact: 'medium' as const,
          recommendation: {
            action: 'adjust_workflow',
            details: `Analyze and optimize workflow for ${row.task_type} tasks`,
            priority: 6,
          },
          createdAt: new Date().toISOString(),
        }));
        resolve(insights);
      }
    });
  });
}

// ============ 技能更新 ============

async function createSkillUpdate(update: SkillUpdate): Promise<void> {
  const db = await initDatabase();
  
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`INSERT INTO skill_updates 
      (id, skill_name, change_type, content, rationale, source_experiences, 
       status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    
    stmt.run(
      update.id,
      update.skillName,
      update.changeType,
      update.content,
      update.rationale,
      JSON.stringify(update.sourceExperiences),
      update.status,
      update.createdAt,
      function(err) {
        stmt.finalize();
        db.close();
        if (err) reject(err);
        else {
          console.log(`✅ Created skill update: ${update.id} (${update.skillName})`);
          resolve();
        }
      }
    );
  });
}

async function listPendingUpdates(): Promise<SkillUpdate[]> {
  const db = await initDatabase();
  
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM skill_updates WHERE status = ?', ['pending_review'], (err, rows: any[]) => {
      db.close();
      if (err) reject(err);
      else {
        const updates: SkillUpdate[] = rows.map(row => ({
          id: row.id,
          skillName: row.skill_name,
          changeType: row.change_type,
          content: row.content,
          rationale: row.rationale,
          sourceExperiences: JSON.parse(row.source_experiences),
          status: row.status as SkillUpdate['status'],
          reviewedBy: row.reviewed_by,
          reviewedAt: row.reviewed_at,
          createdAt: row.created_at,
        }));
        resolve(updates);
      }
    });
  });
}

async function approveUpdate(updateId: string, reviewer: string): Promise<void> {
  const db = await initDatabase();
  
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE skill_updates 
       SET status = 'approved', reviewed_by = ?, reviewed_at = ? 
       WHERE id = ?`,
      [reviewer, new Date().toISOString(), updateId],
      function(err) {
        db.close();
        if (err) reject(err);
        else {
          console.log(`✅ Approved update: ${updateId}`);
          resolve();
        }
      }
    );
  });
}

async function rejectUpdate(updateId: string, reviewer: string, reason: string): Promise<void> {
  const db = await initDatabase();
  
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE skill_updates 
       SET status = 'rejected', reviewed_by = ?, reviewed_at = ? 
       WHERE id = ?`,
      [reviewer, new Date().toISOString(), updateId],
      function(err) {
        db.close();
        if (err) reject(err);
        else {
          console.log(`✅ Rejected update: ${updateId} (reason: ${reason})`);
          resolve();
        }
      }
    );
  });
}

// ============ CLI 入口 ============

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'collect') {
    // 示例：收集经验
    const experience: Experience = {
      id: `exp-${Date.now()}`,
      timestamp: new Date().toISOString(),
      taskId: 'task-123',
      taskType: 'coding',
      outcome: 'success',
      duration: 5000,
      tokensUsed: 1500,
      userFeedback: {
        rating: 5,
        type: 'explicit',
      },
      context: {
        sessionKey: 'agent:main:main',
        model: 'bailian/qwen3.5-plus',
        toolsUsed: ['read', 'write'],
        skillsApplied: ['python'],
      },
      artifacts: {
        input: 'Write a Python function',
        output: 'def hello(): ...',
      },
    };
    
    collectExperience(experience).catch(console.error);
    
  } else if (command === 'analyze') {
    analyzeExperiences().catch(console.error);
    
  } else if (command === 'experiences') {
    const subcommand = args[1];
    if (subcommand === 'list') {
      const limit = parseInt(args.find(a => a === '--limit')?.split('=')[1] || '10');
      listExperiences(limit).then(exps => {
        console.log(`Found ${exps.length} experiences:`);
        exps.forEach(exp => {
          console.log(`  - ${exp.id} (${exp.taskType}, ${exp.outcome}, ${exp.timestamp})`);
        });
      }).catch(console.error);
    }
    
  } else if (command === 'updates') {
    const subcommand = args[1];
    if (subcommand === 'pending') {
      listPendingUpdates().then(updates => {
        console.log(`Found ${updates.length} pending updates:`);
        updates.forEach(update => {
          console.log(`  - ${update.id} (${update.skillName}): ${update.rationale}`);
        });
      }).catch(console.error);
    } else if (subcommand === 'approve') {
      const updateId = args[2];
      approveUpdate(updateId, 'user').catch(console.error);
    } else if (subcommand === 'reject') {
      const updateId = args[2];
      const reason = args.find(a => a === '--reason')?.split('=')[1] || 'No reason';
      rejectUpdate(updateId, 'user', reason).catch(console.error);
    }
    
  } else {
    console.log('Self-Improvement Learning Loop');
    console.log('\nUsage:');
    console.log('  learning-loop collect              Collect experience (demo)');
    console.log('  learning-loop analyze              Analyze experiences and generate insights');
    console.log('  learning-loop experiences list     List experiences');
    console.log('  learning-loop updates pending      List pending skill updates');
    console.log('  learning-loop updates approve <id> Approve update');
    console.log('  learning-loop updates reject <id>  Reject update');
    process.exit(1);
  }
}

// 导出函数
export { 
  initDatabase,
  collectExperience, 
  listExperiences,
  analyzeExperiences,
  createSkillUpdate,
  listPendingUpdates,
  approveUpdate,
  rejectUpdate,
};

if (require.main === module) {
  main();
}
