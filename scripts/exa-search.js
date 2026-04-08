#!/usr/bin/env node

/**
 * Exa Search Wrapper - 自动记录使用量的搜索封装
 * 
 * 用法:
 *   node exa-search.js "搜索关键词"
 *   node exa-search.js --status     # 查看状态
 *   node exa-search.js --help       # 帮助
 * 
 * 功能:
 *   1. 自动检查使用量是否超额
 *   2. 执行搜索前记录使用量
 *   3. 超额时自动阻止搜索并提示替代方案
 */

const { execSync } = require('child_process');
const path = require('path');

const TRACKER_PATH = path.join(__dirname, 'exa-usage-tracker.js');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 检查使用量
function checkUsage() {
  try {
    const result = execSync(`node "${TRACKER_PATH}" check`, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    
    return {
      status: result,
      ok: result === 'OK',
      warning: result === 'WARNING',
      critical: result === 'CRITICAL',
      exceeded: result === 'EXCEEDED'
    };
  } catch (err) {
    // check 命令会通过退出码返回状态
    const output = err.stdout?.trim() || 'UNKNOWN';
    return {
      status: output,
      ok: output === 'OK',
      warning: output === 'WARNING',
      critical: output === 'CRITICAL',
      exceeded: output === 'EXCEEDED'
    };
  }
}

// 记录使用量
function logUsage(query) {
  try {
    execSync(`node "${TRACKER_PATH}" log "${query.replace(/"/g, '\\"')}"`, {
      encoding: 'utf8',
      stdio: 'inherit'
    });
  } catch (err) {
    log('⚠️ 记录使用量失败', 'yellow');
  }
}

// 显示状态
function showStatus() {
  execSync(`node "${TRACKER_PATH}" status`, {
    encoding: 'utf8',
    stdio: 'inherit'
  });
}

// 显示帮助
function showHelp() {
  console.log(`
${colors.cyan}Exa Search Wrapper - 自动记录使用量的搜索封装${colors.reset}

用法:
  node exa-search.js "搜索关键词"     执行搜索并自动记录
  node exa-search.js --status         查看当前使用量状态
  node exa-search.js --check          仅检查是否超额
  node exa-search.js --help           显示此帮助信息

功能:
  ✅ 自动检查使用量是否超额
  ✅ 执行搜索前自动记录使用量
  ✅ 超额时自动阻止搜索并提示替代方案
  ✅ 显示当前使用量状态

示例:
  node exa-search.js "一念逍遥 攻略"
  node exa-search.js --status

退出码:
  0 - 成功
  1 - 超额或错误
  2 - 严重警告（<5% 剩余）
  3 - 警告（<20% 剩余）
`);
}

// 显示替代方案
function showAlternatives() {
  console.log(`
${colors.yellow}💡 推荐的替代方案：${colors.reset}

  ${colors.green}1. web_fetch${colors.reset} - 抓取已知 URL（无限制）
     用法：直接提供攻略链接，我来抓取分析

  ${colors.green}2. 手动搜索 + AI 分析${colors.reset} - 最灵活
     你在浏览器搜索，复制内容给我整理

  ${colors.green}3. 配置 SearXNG${colors.reset} - 技术向
     自托管搜索引擎，完全免费

${colors.cyan}📖 详细文档：${colors.reset}~/.openclaw/workspace/docs/exa-usage-guide.md
`);
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showHelp();
    process.exit(0);
  }
  
  const firstArg = args[0];
  
  // 特殊命令
  if (firstArg === '--help' || firstArg === '-h') {
    showHelp();
    process.exit(0);
  }
  
  if (firstArg === '--status' || firstArg === '-s') {
    showStatus();
    process.exit(0);
  }
  
  if (firstArg === '--check' || firstArg === '-c') {
    const checkResult = checkUsage();
    log(`\n检查结果：${checkResult.status}`, checkResult.ok ? 'green' : 'yellow');
    
    if (!checkResult.ok) {
      showAlternatives();
    }
    
    process.exit(checkResult.ok ? 0 : (checkResult.exceeded ? 1 : checkResult.critical ? 2 : 3));
  }
  
  // 执行搜索
  const query = args.join(' ');
  
  log(`\n${colors.cyan}🔍 搜索查询：${colors.reset}${query}`);
  log('-'.repeat(50), 'cyan');
  
  // 检查使用量
  const checkResult = checkUsage();
  
  if (checkResult.exceeded) {
    log('\n🛑 错误：Exa 额度已耗尽！', 'red');
    log('无法执行搜索，请使用替代方案。', 'red');
    showAlternatives();
    process.exit(1);
  }
  
  if (checkResult.critical) {
    log('\n🛑 严重警告：Exa 额度即将耗尽（<5% 剩余）', 'red');
    log('建议取消本次搜索，使用替代方案。', 'yellow');
    log('\n按 Ctrl+C 取消，或等待 5 秒后继续...', 'yellow');
    
    // 给用户 5 秒取消时间
    setTimeout(() => {
      log('\n继续执行搜索...', 'cyan');
      executeSearch(query);
    }, 5000);
  } else if (checkResult.warning) {
    log('\n🚨 警告：Exa 额度使用超过 80%', 'yellow');
    log('建议减少非必要搜索。', 'yellow');
    log('\n继续执行搜索...', 'cyan');
    executeSearch(query);
  } else {
    executeSearch(query);
  }
}

// 执行实际搜索（这里需要调用实际的搜索 API）
function executeSearch(query) {
  // 记录使用量
  logUsage(query);
  
  log('\n✅ 使用量已记录', 'green');
  log('\n💡 提示：实际搜索需要调用 web_search 工具', 'cyan');
  log('   此脚本负责记录使用量，搜索由 OpenClaw 执行\n');
  
  // 输出查询内容，供用户复制到其他工具
  console.log(`搜索查询：${query}`);
  console.log('\n你可以：');
  console.log('1. 在 OpenClaw 中直接使用 web_search 工具');
  console.log('2. 在浏览器中搜索此关键词');
  console.log('3. 使用其他搜索引擎\n');
}

main();
