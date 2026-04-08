#!/usr/bin/env node

/**
 * Exa API 使用量追踪脚本
 * 监控 Exa 搜索使用量，接近限额时自动提醒
 * 
 * 用法:
 *   node exa-usage-tracker.js log      # 记录一次使用
 *   node exa-usage-tracker.js status   # 查看当前状态
 *   node exa-usage-tracker.js reset    # 重置计数器
 *   node exa-usage-tracker.js check    # 检查是否超额（用于自动化）
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  monthlyLimit: 1000,           // 每月限额
  warningThresholds: [50, 80, 95], // 警告阈值百分比
  resetDay: 1,                  // 每月重置日（1 号）
  dataFile: path.join(__dirname, '../data/exa-usage.json'),
  logFile: path.join(__dirname, '../logs/exa-usage.log')
};

// 确保目录存在
function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 读取使用数据
function loadUsage() {
  try {
    if (fs.existsSync(CONFIG.dataFile)) {
      const data = JSON.parse(fs.readFileSync(CONFIG.dataFile, 'utf8'));
      // 检查是否需要月度重置
      const now = new Date();
      const lastReset = new Date(data.lastReset);
      
      if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        console.log('📅 检测到新月份，已自动重置计数器');
        return createFreshData();
      }
      return data;
    }
  } catch (err) {
    console.error('⚠️ 读取使用数据失败:', err.message);
  }
  return createFreshData();
}

// 创建新的使用数据
function createFreshData() {
  const now = new Date();
  return {
    count: 0,
    lastReset: now.toISOString(),
    month: now.getMonth(),
    year: now.getFullYear(),
    lastUsed: null,
    history: []
  };
}

// 保存使用数据
function saveUsage(data) {
  ensureDir(CONFIG.dataFile);
  fs.writeFileSync(CONFIG.dataFile, JSON.stringify(data, null, 2), 'utf8');
}

// 记录日志
function logMessage(message, level = 'INFO') {
  ensureDir(CONFIG.logFile);
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${level}] ${message}\n`;
  fs.appendFileSync(CONFIG.logFile, logLine);
}

// 计算使用百分比
function calculatePercentage(count) {
  return Math.round((count / CONFIG.monthlyLimit) * 100);
}

// 获取警告级别
function getWarningLevel(percentage) {
  if (percentage >= 95) return 'CRITICAL';
  if (percentage >= 80) return 'WARNING';
  if (percentage >= 50) return 'NOTICE';
  return 'OK';
}

// 生成状态报告
function generateStatusReport(data) {
  const percentage = calculatePercentage(data.count);
  const remaining = CONFIG.monthlyLimit - data.count;
  const warningLevel = getWarningLevel(percentage);
  const daysInMonth = new Date(data.year, data.month + 1, 0).getDate();
  const today = new Date().getDate();
  const dailyAverage = (data.count / today).toFixed(1);
  const projectedEndCount = Math.round(data.count * (daysInMonth / today));
  
  let statusEmoji = '✅';
  if (warningLevel === 'NOTICE') statusEmoji = '⚠️';
  if (warningLevel === 'WARNING') statusEmoji = '🚨';
  if (warningLevel === 'CRITICAL') statusEmoji = '🛑';
  
  const report = {
    emoji: statusEmoji,
    count: data.count,
    limit: CONFIG.monthlyLimit,
    remaining: remaining,
    percentage: percentage,
    warningLevel: warningLevel,
    dailyAverage: dailyAverage,
    projectedEndCount: projectedEndCount,
    lastUsed: data.lastUsed,
    resetDate: new Date(data.year, data.month + 1, CONFIG.resetDay).toLocaleDateString('zh-CN')
  };
  
  return report;
}

// 打印状态
function printStatus(data) {
  const report = generateStatusReport(data);
  
  console.log('\n' + '='.repeat(50));
  console.log(`${report.emoji}  Exa API 使用量监控`);
  console.log('='.repeat(50));
  console.log(`📊 当前使用：${report.count} / ${report.limit} 次`);
  console.log(`📈 使用进度：${report.percentage}%`);
  console.log(`🔄 剩余额度：${report.remaining} 次`);
  console.log(`📅 本月重置：${report.resetDate}`);
  console.log(`📉 日均使用：${report.dailyAverage} 次/天`);
  console.log(`🔮 预计月底：${report.projectedEndCount} 次`);
  
  if (data.lastUsed) {
    console.log(`⏰ 最后使用：${new Date(data.lastUsed).toLocaleString('zh-CN')}`);
  }
  
  console.log('-'.repeat(50));
  
  // 警告信息
  if (report.warningLevel === 'CRITICAL') {
    console.log('🛑 严重警告：额度即将耗尽！');
    console.log('   建议：立即停止使用 Exa，切换到替代方案');
    console.log('');
    console.log('   替代方案:');
    console.log('   1. web_fetch - 抓取已知 URL（无限制）');
    console.log('   2. 手动搜索 + AI 分析');
    console.log('   3. 配置 SearXNG 自托管实例');
  } else if (report.warningLevel === 'WARNING') {
    console.log('🚨 警告：额度使用超过 80%！');
    console.log('   建议：减少非必要搜索，优先使用 web_fetch');
  } else if (report.warningLevel === 'NOTICE') {
    console.log('⚠️ 注意：额度使用超过 50%');
    console.log('   建议：关注使用量，避免浪费');
  } else {
    console.log('✅ 状态健康，可正常使用');
  }
  
  console.log('='.repeat(50) + '\n');
}

// 记录一次使用
function logUsage(query = '') {
  const data = loadUsage();
  data.count++;
  data.lastUsed = new Date().toISOString();
  data.history.push({
    timestamp: data.lastUsed,
    query: query.substring(0, 100) || 'unknown'
  });
  
  // 保留最近 100 条记录
  if (data.history.length > 100) {
    data.history = data.history.slice(-100);
  }
  
  saveUsage(data);
  
  const report = generateStatusReport(data);
  logMessage(`使用 #${data.count} - ${query.substring(0, 50) || 'search'}`);
  
  // 检查是否需要警告
  if (report.warningLevel === 'CRITICAL') {
    logMessage(`🛑 严重警告：额度仅剩 ${report.remaining} 次！`, 'CRITICAL');
    console.log('\n🛑 警告：Exa 额度即将耗尽！');
    console.log(`   剩余：${report.remaining} 次`);
    console.log('   请切换到替代方案！\n');
  } else if (report.warningLevel === 'WARNING') {
    logMessage(`🚨 警告：额度使用 ${report.percentage}%`, 'WARNING');
    console.log(`\n🚨 警告：Exa 额度使用已达 ${report.percentage}%`);
    console.log(`   剩余：${report.remaining} 次\n`);
  }
  
  return report;
}

// 检查是否超额（用于自动化脚本）
function checkLimit() {
  const data = loadUsage();
  const report = generateStatusReport(data);
  
  if (data.count >= CONFIG.monthlyLimit) {
    console.log('EXCEEDED');
    logMessage('额度已超额！', 'CRITICAL');
    process.exit(1);
  } else if (report.warningLevel === 'CRITICAL') {
    console.log('CRITICAL');
    process.exit(2);
  } else if (report.warningLevel === 'WARNING') {
    console.log('WARNING');
    process.exit(3);
  } else {
    console.log('OK');
    process.exit(0);
  }
}

// 重置计数器
function resetUsage() {
  const data = createFreshData();
  saveUsage(data);
  logMessage('计数器已手动重置');
  console.log('✅ Exa 使用量计数器已重置');
  printStatus(data);
}

// 显示帮助
function showHelp() {
  console.log(`
Exa API 使用量追踪脚本

用法:
  node exa-usage-tracker.js <command> [options]

命令:
  log [query]     记录一次 Exa 使用（可选：搜索关键词）
  status          查看当前使用状态
  check           检查是否超额（用于自动化，返回退出码）
  reset           重置计数器
  help            显示此帮助信息

退出码 (check 命令):
  0 - OK (正常使用)
  1 - EXCEEDED (已超额)
  2 - CRITICAL (<5% 剩余)
  3 - WARNING (<20% 剩余)

示例:
  node exa-usage-tracker.js log "一念逍遥 攻略"
  node exa-usage-tracker.js status
  node exa-usage-tracker.js check && echo "可以使用 Exa"
`);
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';
  
  switch (command) {
    case 'log':
      const query = args.slice(1).join(' ');
      const report = logUsage(query);
      printStatus(loadUsage());
      break;
    case 'status':
      printStatus(loadUsage());
      break;
    case 'check':
      checkLimit();
      break;
    case 'reset':
      resetUsage();
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      console.error(`未知命令：${command}`);
      showHelp();
      process.exit(1);
  }
}

main();
