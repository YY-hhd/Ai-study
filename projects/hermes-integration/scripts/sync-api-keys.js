#!/usr/bin/env node

/**
 * 从 OpenClaw 配置同步 API Key 到共享密钥文件
 */

const fs = require('fs');
const path = require('path');

const OPENCLAW_CONFIG_PATH = path.join(process.env.HOME || '', '.openclaw', 'openclaw.json');
const SHARED_KEYS_PATH = path.join(process.env.HOME || '', '.openclaw', 'shared-keys', 'keys.json');

console.log('🔄 从 OpenClaw 配置同步 API Key...\n');

// 读取 OpenClaw 配置
if (!fs.existsSync(OPENCLAW_CONFIG_PATH)) {
  console.error('❌ OpenClaw 配置文件不存在:', OPENCLAW_CONFIG_PATH);
  process.exit(1);
}

const openclawConfig = JSON.parse(fs.readFileSync(OPENCLAW_CONFIG_PATH, 'utf-8'));

// 提取百炼 API 配置
const bailianConfig = openclawConfig?.models?.providers?.bailian;

if (!bailianConfig) {
  console.error('❌ 未在 OpenClaw 配置中找到百炼 API 配置');
  process.exit(1);
}

console.log('✅ 找到百炼 API 配置:');
console.log(`   Base URL: ${bailianConfig.baseUrl}`);
console.log(`   API Key: ${bailianConfig.apiKey ? '***' + bailianConfig.apiKey.slice(-4) : '未配置'}`);

// 读取或创建共享密钥文件
let sharedKeys = {
  version: '1.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  keys: {},
  syncTargets: ['openclaw', 'hermes'],
  auditLog: []
};

if (fs.existsSync(SHARED_KEYS_PATH)) {
  sharedKeys = JSON.parse(fs.readFileSync(SHARED_KEYS_PATH, 'utf-8'));
}

// 更新百炼 API Key
sharedKeys.keys.bailian = {
  apiKey: bailianConfig.apiKey,
  endpoint: bailianConfig.baseUrl,
  lastUpdated: new Date().toISOString(),
  source: 'openclaw-config'
};

// 添加审计日志
sharedKeys.auditLog.push({
  timestamp: new Date().toISOString(),
  action: 'sync_from_openclaw',
  service: 'bailian',
  result: 'success'
});

// 保留最近 100 条记录
if (sharedKeys.auditLog.length > 100) {
  sharedKeys.auditLog = sharedKeys.auditLog.slice(-100);
}

// 写入共享密钥文件
sharedKeys.updatedAt = new Date().toISOString();
fs.writeFileSync(SHARED_KEYS_PATH, JSON.stringify(sharedKeys, null, 2), 'utf-8');
fs.chmodSync(SHARED_KEYS_PATH, 0o600);

console.log('\n✅ API Key 已同步到共享密钥文件');
console.log(`   文件路径：${SHARED_KEYS_PATH}`);
console.log(`   权限设置：600 (仅所有者可读写)`);
console.log('\n🎉 同步完成！Hermes 整合框架现在可以使用 OpenClaw 的千问 API Key 了！');
