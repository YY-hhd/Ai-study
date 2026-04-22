/**
 * API Key 共享同步工具
 * 
 * 实现 OpenClaw ↔ Hermes 密钥双向同步
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ============ 类型定义 ============

interface KeyEntry {
  apiKey?: string;
  botToken?: string;
  secret?: string;
  password?: string;
  endpoint?: string;
  lastUpdated: string;
}

interface SharedKeys {
  version: string;
  createdAt: string;
  updatedAt: string;
  keys: Record<string, KeyEntry>;
  syncTargets: string[];
  auditLog: AuditEntry[];
}

interface AuditEntry {
  timestamp: string;
  action: string;
  service?: string;
  target?: string;
  result: 'success' | 'error';
  error?: string;
}

// ============ 路径配置 ============

const PATHS = {
  sharedKeys: path.join(process.env.HOME || '', '.openclaw', 'shared-keys', 'keys.json'),
  openclawKeys: path.join(process.env.HOME || '', '.openclaw', 'keys.json'),
  hermesKeysDir: path.join(process.env.HOME || '', '.hermes', 'keys'),
  hermesEnv: path.join(process.env.HOME || '', '.hermes', '.env'),
};

// ============ 工具函数 ============

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 });
  }
}

function setSecurePermissions(filePath: string): void {
  try {
    fs.chmodSync(filePath, 0o600); // 仅所有者可读写
  } catch (error) {
    console.warn(`⚠️  Failed to set secure permissions on ${filePath}`);
  }
}

function now(): string {
  return new Date().toISOString();
}

function logAudit(log: AuditEntry[], action: string, service?: string, target?: string, result: 'success' | 'error' = 'success', error?: string): void {
  log.push({
    timestamp: now(),
    action,
    service,
    target,
    result,
    error,
  });
  // 保留最近 100 条记录
  if (log.length > 100) {
    log.splice(0, log.length - 100);
  }
}

// ============ 核心功能 ============

function initSharedKeys(): SharedKeys {
  return {
    version: '1.0',
    createdAt: now(),
    updatedAt: now(),
    keys: {},
    syncTargets: ['openclaw', 'hermes'],
    auditLog: [],
  };
}

function loadSharedKeys(): SharedKeys {
  if (!fs.existsSync(PATHS.sharedKeys)) {
    throw new Error('Shared keys file not found. Run "init" first.');
  }
  const content = fs.readFileSync(PATHS.sharedKeys, 'utf-8');
  return JSON.parse(content) as SharedKeys;
}

function saveSharedKeys(keys: SharedKeys): void {
  ensureDir(path.dirname(PATHS.sharedKeys));
  fs.writeFileSync(PATHS.sharedKeys, JSON.stringify(keys, null, 2), 'utf-8');
  setSecurePermissions(PATHS.sharedKeys);
  keys.updatedAt = now();
}

// ============ 导入功能 ============

function importFromOpenClaw(): SharedKeys {
  const sharedKeys = initSharedKeys();
  logAudit(sharedKeys.auditLog, 'init', undefined, undefined, 'success');
  
  // 尝试从 keys.json 导入
  if (fs.existsSync(PATHS.openclawKeys)) {
    const openclawKeys = JSON.parse(fs.readFileSync(PATHS.openclawKeys, 'utf-8'));
    
    for (const [service, config] of Object.entries(openclawKeys)) {
      if (typeof config === 'object' && config !== null) {
        sharedKeys.keys[service] = {
          ...config,
          lastUpdated: now(),
        };
      }
    }
    
    logAudit(sharedKeys.auditLog, 'import', 'openclaw', undefined, 'success');
    console.log(`✅ Imported ${Object.keys(sharedKeys.keys).length} keys from OpenClaw`);
  } else {
    logAudit(sharedKeys.auditLog, 'import', 'openclaw', undefined, 'error', 'keys.json not found');
    console.log('⚠️  OpenClaw keys.json not found');
  }
  
  saveSharedKeys(sharedKeys);
  return sharedKeys;
}

function importFromHermes(): SharedKeys {
  const sharedKeys = initSharedKeys();
  logAudit(sharedKeys.auditLog, 'init', undefined, undefined, 'success');
  
  // 尝试从 Hermes .env 导入
  if (fs.existsSync(PATHS.hermesEnv)) {
    const envContent = fs.readFileSync(PATHS.hermesEnv, 'utf-8');
    const envVars = parseEnvFile(envContent);
    
    // 映射 Hermes 环境变量到服务
    const serviceMapping: Record<string, string> = {
      'HERMES_BAILIAN_API_KEY': 'bailian',
      'HERMES_TELEGRAM_BOT_TOKEN': 'telegram',
      'HERMES_DISCORD_TOKEN': 'discord',
      'HERMES_SLACK_BOT_TOKEN': 'slack',
    };
    
    for (const [envVar, value] of Object.entries(envVars)) {
      const service = serviceMapping[envVar];
      if (service) {
        const keyName = envVar.replace('HERMES_', '').replace('_TOKEN', '').replace('_KEY', '').toLowerCase();
        sharedKeys.keys[service] = {
          [keyName]: value,
          lastUpdated: now(),
        };
      }
    }
    
    logAudit(sharedKeys.auditLog, 'import', 'hermes', undefined, 'success');
    console.log(`✅ Imported ${Object.keys(sharedKeys.keys).length} keys from Hermes`);
  } else {
    logAudit(sharedKeys.auditLog, 'import', 'hermes', undefined, 'error', '.env not found');
    console.log('⚠️  Hermes .env not found');
  }
  
  saveSharedKeys(sharedKeys);
  return sharedKeys;
}

function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        result[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  }
  
  return result;
}

// ============ 导出功能 ============

function exportToOpenClaw(): void {
  const sharedKeys = loadSharedKeys();
  
  // 转换为 OpenClaw 格式
  const openclawKeys: Record<string, any> = {};
  for (const [service, entry] of Object.entries(sharedKeys.keys)) {
    const { lastUpdated, ...keyData } = entry;
    openclawKeys[service] = keyData;
  }
  
  ensureDir(path.dirname(PATHS.openclawKeys));
  fs.writeFileSync(PATHS.openclawKeys, JSON.stringify(openclawKeys, null, 2), 'utf-8');
  setSecurePermissions(PATHS.openclawKeys);
  
  logAudit(sharedKeys.auditLog, 'export', 'openclaw', undefined, 'success');
  saveSharedKeys(sharedKeys);
  
  console.log(`✅ Exported ${Object.keys(openclawKeys).length} keys to OpenClaw`);
}

function exportToHermes(): void {
  const sharedKeys = loadSharedKeys();
  
  // 创建 Hermes keys 目录
  ensureDir(PATHS.hermesKeysDir);
  
  // 为每个服务创建单独的密钥文件
  for (const [service, entry] of Object.entries(sharedKeys.keys)) {
    const keyFile = path.join(PATHS.hermesKeysDir, `${service}.key`);
    const keyValue = entry.apiKey || entry.botToken || entry.secret || entry.password;
    
    if (keyValue) {
      fs.writeFileSync(keyFile, keyValue, 'utf-8');
      setSecurePermissions(keyFile);
    }
  }
  
  // 更新 .env 文件
  let envContent = fs.existsSync(PATHS.hermesEnv) 
    ? fs.readFileSync(PATHS.hermesEnv, 'utf-8') 
    : '';
  
  const envMapping: Record<string, string> = {
    'bailian': 'HERMES_BAILIAN_API_KEY',
    'telegram': 'HERMES_TELEGRAM_BOT_TOKEN',
    'discord': 'HERMES_DISCORD_TOKEN',
    'slack': 'HERMES_SLACK_BOT_TOKEN',
  };
  
  for (const [service, envVar] of Object.entries(envMapping)) {
    if (sharedKeys.keys[service]) {
      const keyValue = sharedKeys.keys[service].apiKey || sharedKeys.keys[service].botToken;
      if (keyValue) {
        // 移除旧值并添加新值
        const lines = envContent.split('\n').filter(line => !line.startsWith(`${envVar}=`));
        lines.push(`${envVar}=${keyValue}`);
        envContent = lines.join('\n');
      }
    }
  }
  
  fs.writeFileSync(PATHS.hermesEnv, envContent, 'utf-8');
  setSecurePermissions(PATHS.hermesEnv);
  
  logAudit(sharedKeys.auditLog, 'export', 'hermes', undefined, 'success');
  saveSharedKeys(sharedKeys);
  
  console.log(`✅ Exported ${Object.keys(sharedKeys.keys).length} keys to Hermes`);
}

// ============ 同步功能 ============

function syncKeys(target?: 'openclaw' | 'hermes'): void {
  const sharedKeys = loadSharedKeys();
  
  if (!target || target === 'openclaw') {
    exportToOpenClaw();
    logAudit(sharedKeys.auditLog, 'sync', undefined, 'openclaw', 'success');
  }
  
  if (!target || target === 'hermes') {
    exportToHermes();
    logAudit(sharedKeys.auditLog, 'sync', undefined, 'hermes', 'success');
  }
  
  saveSharedKeys(sharedKeys);
  console.log('✅ Sync complete');
}

// ============ 验证功能 ============

function validateKeys(service?: string): void {
  const sharedKeys = loadSharedKeys();
  let allValid = true;
  
  const services = service ? [service] : Object.keys(sharedKeys.keys);
  
  for (const svc of services) {
    const entry = sharedKeys.keys[svc];
    if (!entry) {
      console.log(`❌ ${svc}: Not found`);
      allValid = false;
      continue;
    }
    
    const hasKey = entry.apiKey || entry.botToken || entry.secret || entry.password;
    if (hasKey) {
      console.log(`✅ ${svc}: Valid (last updated: ${entry.lastUpdated})`);
    } else {
      console.log(`❌ ${svc}: No key value found`);
      allValid = false;
    }
  }
  
  process.exit(allValid ? 0 : 1);
}

// ============ CLI 入口 ============

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case 'init':
        initSharedKeys();
        saveSharedKeys(initSharedKeys());
        console.log('✅ Shared keys initialized at', PATHS.sharedKeys);
        break;
        
      case 'import':
        const importFrom = args.find(a => a === '--from' || a === '-f');
        const importSource = args[args.indexOf(importFrom!) + 1];
        if (importSource === 'openclaw') {
          importFromOpenClaw();
        } else if (importSource === 'hermes') {
          importFromHermes();
        } else {
          console.error('Error: Specify --from openclaw or --from hermes');
          process.exit(1);
        }
        break;
        
      case 'export':
        const exportTo = args.find(a => a === '--to' || a === '-t');
        const exportTarget = args[args.indexOf(exportTo!) + 1];
        if (exportTarget === 'openclaw') {
          exportToOpenClaw();
        } else if (exportTarget === 'hermes') {
          exportToHermes();
        } else {
          console.error('Error: Specify --to openclaw or --to hermes');
          process.exit(1);
        }
        break;
        
      case 'sync':
        const syncTarget = args.find(a => a === '--to' || a === '-t') as 'openclaw' | 'hermes' | undefined;
        const targetIndex = args.indexOf(syncTarget || '') + 1;
        const target = targetIndex > 0 && targetIndex < args.length ? args[targetIndex] : undefined;
        syncKeys(target as 'openclaw' | 'hermes' | undefined);
        break;
        
      case 'validate':
        const validateService = args[1];
        validateKeys(validateService);
        break;
        
      default:
        console.log('API Key Sync Tool');
        console.log('\nUsage:');
        console.log('  sync init                      Initialize shared keys storage');
        console.log('  sync import --from <source>    Import from openclaw or hermes');
        console.log('  sync export --to <target>      Export to openclaw or hermes');
        console.log('  sync sync [--to <target>]      Sync keys (default: both)');
        console.log('  sync validate [service]        Validate keys');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// 导出函数
export { 
  initSharedKeys, 
  loadSharedKeys, 
  saveSharedKeys,
  importFromOpenClaw, 
  importFromHermes,
  exportToOpenClaw,
  exportToHermes,
  syncKeys,
  validateKeys,
};

if (require.main === module) {
  main();
}
