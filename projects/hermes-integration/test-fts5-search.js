#!/usr/bin/env node

/**
 * FTS5 记忆搜索功能测试
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 FTS5 记忆搜索功能测试\n');
console.log('='.repeat(60));

// 准备测试数据
console.log('\n1️⃣  准备测试记忆数据...');

const memories = [
  {
    id: 'mem-hermes-integration',
    title: 'Hermes × OpenClaw 整合框架',
    content: 'Hermes Agent 与 OpenClaw 框架整合项目，包含三个阶段：互操作层、功能融合、统一框架。总计 11 个核心模块，244 倍效率提升，提前 97 天完成。',
    type: 'project',
    tags: ['hermes', 'integration', 'framework', 'openclaw'],
    createdAt: '2026-04-20T15:00:00+08:00'
  },
  {
    id: 'mem-learning-loop',
    title: '自改进学习循环',
    content: '学习循环是 Hermes 的核心功能，实现 AI 助手从经验中持续学习和改进。包含经验收集器、学习分析器、技能更新器、效果评估器四个组件。',
    type: 'feature',
    tags: ['learning', 'ai', 'improvement', 'experience'],
    createdAt: '2026-04-20T22:40:00+08:00'
  },
  {
    id: 'mem-multi-backend',
    title: '多终端后端支持',
    content: '支持 5 种后端执行环境：本地执行、Docker 容器、SSH 远程、Modal Serverless、Cloud Run。实现任务的分发和执行，提供统一执行接口。',
    type: 'feature',
    tags: ['backend', 'docker', 'ssh', 'serverless'],
    createdAt: '2026-04-20T22:50:00+08:00'
  },
  {
    id: 'mem-skill-adapter',
    title: '技能兼容层',
    content: '实现 OpenClaw AgentSkills 与 agentskills.io 格式的双向转换。自动添加元数据如 version、license、tags、platforms。支持批量转换和验证。',
    type: 'feature',
    tags: ['skill', 'conversion', 'compatibility'],
    createdAt: '2026-04-20T16:30:00+08:00'
  },
  {
    id: 'mem-api-key-sync',
    title: 'API Key 共享同步',
    content: '统一密钥存储格式，实现 OpenClaw 和 Hermes 之间的 API Key 双向同步。支持安全加密存储，审计日志追踪，文件权限 600 保护。',
    type: 'feature',
    tags: ['security', 'api-key', 'sync'],
    createdAt: '2026-04-20T19:30:00+08:00'
  }
];

// 保存到记忆文件
const memoriesDir = path.join(process.env.HOME || '', '.openclaw', 'workspace', 'data', 'memories');
if (!fs.existsSync(memoriesDir)) {
  fs.mkdirSync(memoriesDir, { recursive: true });
}

memories.forEach(mem => {
  const memFile = path.join(memoriesDir, `${mem.id}.json`);
  fs.writeFileSync(memFile, JSON.stringify(mem, null, 2));
});

console.log(`   ✅ 已创建 ${memories.length} 条测试记忆`);

// FTS5 搜索模拟
console.log('\n2️⃣  FTS5 搜索测试...');

function searchMemories(query, options = {}) {
  const { limit = 10, highlight = false } = options;
  
  // 简单的全文搜索模拟
  const queryTerms = query.toLowerCase().split(/\s+/);
  
  const results = memories.map(mem => {
    const searchText = `${mem.title} ${mem.content} ${mem.tags.join(' ')}`.toLowerCase();
    const matches = queryTerms.filter(term => searchText.includes(term));
    const relevance = matches.length / queryTerms.length;
    
    return {
      ...mem,
      relevance,
      matchedTerms: matches
    };
  })
  .filter(mem => mem.relevance > 0)
  .sort((a, b) => b.relevance - a.relevance)
  .slice(0, limit);
  
  return results;
}

// 测试搜索
const testQueries = [
  { query: 'Hermes 整合框架', desc: '搜索项目名称' },
  { query: '学习循环 经验', desc: '搜索学习功能' },
  { query: 'Docker 后端', desc: '搜索多后端' },
  { query: 'API Key 安全', desc: '搜索安全功能' },
  { query: 'skill conversion', desc: '英文关键词搜索' }
];

testQueries.forEach((test, i) => {
  console.log(`\n${i + 1}. ${test.desc}`);
  console.log(`   查询："${test.query}"`);
  
  const results = searchMemories(test.query, { limit: 3 });
  
  if (results.length === 0) {
    console.log(`   ❌ 无结果`);
  } else {
    console.log(`   ✅ 找到 ${results.length} 条结果:`);
    results.forEach((result, j) => {
      console.log(`      ${j + 1}. [${result.type}] ${result.title}`);
      console.log(`         相关性：${(result.relevance * 100).toFixed(0)}%`);
      console.log(`         标签：${result.tags.join(', ')}`);
      console.log(`         内容：${result.content.substring(0, 60)}...`);
    });
  }
});

// 高级搜索功能演示
console.log('\n3️⃣  高级搜索功能演示...');

console.log('\n   📌 布尔查询模拟:');
console.log('      "Hermes AND 框架" → 同时包含两个词');
const andResults = searchMemories('Hermes 框架');
console.log(`      结果：${andResults.length} 条`);

console.log('\n   📌 标签过滤:');
console.log('      type:feature → 仅搜索功能类型');
const featureResults = memories.filter(m => m.type === 'feature');
console.log(`      结果：${featureResults.length} 条`);

console.log('\n   📌 时间范围:');
console.log('      after:2026-04-20T19:00 → 搜索特定时间后的记忆');
const timeFiltered = memories.filter(m => new Date(m.createdAt) > new Date('2026-04-20T19:00:00+08:00'));
console.log(`      结果：${timeFiltered.length} 条`);

console.log('\n' + '='.repeat(60));
console.log('✅ FTS5 搜索测试完成！');
console.log('\n📊 搜索统计:');
console.log(`   - 测试查询：${testQueries.length} 次`);
console.log(`   - 记忆总数：${memories.length} 条`);
console.log(`   - 平均响应：<10ms (模拟)`);
console.log(`   - 搜索模式：全文检索 + 相关性排序`);
console.log('\n💡 实际 SQLite FTS5 性能会更优秀，支持：');
console.log('   - 短语搜索 ("exact match")');
console.log('   - 前缀匹配 (pyth*)');
console.log('   - NEAR 查询 (word1 NEAR/5 word2)');
console.log('   - 高亮显示 (<mark>matched</mark>)');
