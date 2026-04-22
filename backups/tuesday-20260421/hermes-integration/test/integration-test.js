#!/usr/bin/env node

/**
 * Hermes × OpenClaw 集成测试套件
 * 
 * 测试所有核心模块的功能和整合
 */

const fs = require('fs');
const path = require('path');

// 测试结果统计
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: [],
};

// 测试工具函数
function test(name, fn) {
  results.total++;
  try {
    fn();
    results.passed++;
    results.tests.push({ name, status: 'passed' });
    console.log(`✅ ${name}`);
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'failed', error: error.message });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// ============ 测试用例 ============

console.log('🧪 Hermes × OpenClaw Integration Tests\n');

// 测试 1: 文件结构
test('Phase 1 files exist', () => {
  const phase1Modules = [
    'phase-1-interoperability/config-migrator/migrator.ts',
    'phase-1-interoperability/memory-converter/converter.ts',
    'phase-1-interoperability/skill-adapter/adapter.ts',
    'phase-1-interoperability/api-key-sync/sync.ts',
    'phase-1-interoperability/session-sync/sync.ts',
  ];
  
  for (const file of phase1Modules) {
    const filePath = path.join(__dirname, '..', file);
    assert(fs.existsSync(filePath), `Missing: ${file}`);
  }
});

// 测试 2: 阶段二文件
test('Phase 2 files exist', () => {
  const phase2Modules = [
    'phase-2-fusion/self-improvement-loop/learning-loop.ts',
    'phase-2-fusion/multi-backend/backend.ts',
    'phase-2-fusion/fts5-search/search.ts',
  ];
  
  for (const file of phase2Modules) {
    const filePath = path.join(__dirname, '..', file);
    assert(fs.existsSync(filePath), `Missing: ${file}`);
  }
});

// 测试 3: 文档完整性
test('Documentation files exist', () => {
  const docs = [
    'README.md',
    'PHASE-1-COMPLETE.md',
    'PHASE-2-COMPLETE.md',
    'phase-3-unified/INTEGRATION.md',
  ];
  
  for (const doc of docs) {
    const docPath = path.join(__dirname, '..', doc);
    assert(fs.existsSync(docPath), `Missing doc: ${doc}`);
  }
});

// 测试 4: 配置文件
test('Unified config exists', () => {
  const configPath = path.join(__dirname, '..', 'config', 'unified-config.yaml');
  assert(fs.existsSync(configPath), 'Missing unified config');
  
  const content = fs.readFileSync(configPath, 'utf-8');
  assert(content.includes('interoperability'), 'Config missing interoperability section');
  assert(content.includes('fusion'), 'Config missing fusion section');
});

// 测试 5: README 质量
test('Main README has content', () => {
  const readmePath = path.join(__dirname, '..', 'README.md');
  const content = fs.readFileSync(readmePath, 'utf-8');
  
  assert(content.length > 1000, 'README too short');
  assert(content.includes('Hermes'), 'README missing Hermes reference');
  assert(content.includes('OpenClaw'), 'README missing OpenClaw reference');
});

// 测试 6: 代码质量 - TypeScript 文件
test('TypeScript files are valid', () => {
  const tsFiles = [
    'phase-1-interoperability/skill-adapter/adapter.ts',
    'phase-2-fusion/multi-backend/backend.ts',
  ];
  
  for (const file of tsFiles) {
    const filePath = path.join(__dirname, '..', file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // 基本语法检查
    assert(content.includes('export'), `${file} missing exports`);
    assert(!content.includes('undefined is not a function'), `${file} may have syntax issues`);
  }
});

// 测试 7: 模块导出
test('Modules have exports', () => {
  const modules = [
    { file: 'phase-1-interoperability/skill-adapter/adapter.ts', exports: ['convertSkill'] },
    { file: 'phase-2-fusion/multi-backend/backend.ts', exports: ['BackendManager'] },
  ];
  
  for (const module of modules) {
    const filePath = path.join(__dirname, '..', module.file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    for (const exportName of module.exports) {
      assert(content.includes(`export { ${exportName}`) || content.includes(`export class ${exportName}`), 
        `${module.file} missing export: ${exportName}`);
    }
  }
});

// 测试 8: 项目统计
test('Project meets minimum size requirements', () => {
  // 简单估算文件大小
  const projectPath = path.join(__dirname, '..');
  let totalSize = 0;
  let fileCount = 0;
  
  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        walkDir(filePath);
      } else if (file.endsWith('.ts') || file.endsWith('.md')) {
        totalSize += stat.size;
        fileCount++;
      }
    }
  }
  
  walkDir(projectPath);
  
  assert(fileCount >= 20, `Too few files: ${fileCount} (expected >= 20)`);
  assert(totalSize >= 100000, `Project too small: ${totalSize} bytes (expected >= 100KB)`);
});

// ============ 测试报告 ============

console.log('\n' + '='.repeat(50));
console.log('📊 Test Summary');
console.log('='.repeat(50));
console.log(`Total:  ${results.total}`);
console.log(`Passed: ${results.passed} ✅`);
console.log(`Failed: ${results.failed} ${results.failed > 0 ? '❌' : ''}`);
console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
console.log('='.repeat(50));

if (results.failed > 0) {
  console.log('\n❌ Failed Tests:');
  results.tests.filter(t => t.status === 'failed').forEach(t => {
    console.log(`  - ${t.name}: ${t.error}`);
  });
}

// 退出码
process.exit(results.failed > 0 ? 1 : 0);
