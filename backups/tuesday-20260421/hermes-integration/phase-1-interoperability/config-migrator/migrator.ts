/**
 * OpenClaw ↔ Hermes 配置迁移工具
 * 
 * 支持双向配置转换，保留备份，生成迁移报告
 */

import * as fs from 'fs';
import * as path from 'path';

// ============ 类型定义 ============

interface OpenClawConfig {
  gateway?: {
    bind?: string;
    trustedProxies?: string[];
    nodes?: Record<string, unknown>;
  };
  channels?: {
    feishu?: { appId?: string; appSecret?: string; groupPolicy?: string };
    telegram?: { botToken?: string };
    discord?: { token?: string };
    [key: string]: Record<string, unknown> | undefined;
  };
  agents?: {
    defaults?: {
      model?: string;
      userTimezone?: string;
    };
  };
  plugins?: {
    entries?: Record<string, unknown>;
    allow?: string[];
  };
  tools?: {
    elevated?: boolean;
    fs?: { workspaceOnly?: boolean };
  };
  memory?: {
    provider?: string;
  };
}

interface HermesConfig {
  profiles?: {
    [key: string]: {
      HERMES_HOME?: string;
      model?: {
        provider?: string;
        model?: string;
      };
      timezone?: string;
      terminal?: {
        backend?: string;
        sandbox?: boolean;
      };
      gateway?: {
        platforms?: string[];
        auth?: {
          dmPolicy?: string;
          groupPolicy?: string;
        };
        port?: number;
      };
      memory?: {
        provider?: string;
        path?: string;
      };
      skills?: {
        autoCreate?: boolean;
        directory?: string;
      };
    };
  };
}

interface MigrationReport {
  timestamp: string;
  direction: 'openclaw-to-hermes' | 'hermes-to-openclaw';
  migrated: Record<string, boolean>;
  skipped: Array<{ field: string; reason: string }>;
  warnings: string[];
  backupPath?: string;
}

// ============ 工具函数 ============

function parseModel(modelString: string): { provider: string; model: string } {
  const parts = modelString.split('/');
  if (parts.length >= 2) {
    return { provider: parts[0], model: parts.slice(1).join('/') };
  }
  return { provider: 'unknown', model: modelString };
}

function formatModel(provider: string, model: string): string {
  return `${provider}/${model}`;
}

function extractPort(bindUrl: string): number {
  const match = bindUrl.match(/:(\d+)$/);
  return match ? parseInt(match[1], 10) : 18789;
}

function backupFile(filePath: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupPath = `${filePath}.backup-${timestamp}`;
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, backupPath);
  }
  return backupPath;
}

// ============ OpenClaw → Hermes ============

function openclawToHermes(openclawConfig: OpenClawConfig): { hermes: HermesConfig; report: MigrationReport } {
  const report: MigrationReport = {
    timestamp: new Date().toISOString(),
    direction: 'openclaw-to-hermes',
    migrated: {},
    skipped: [],
    warnings: [],
  };

  const hermes: HermesConfig = {
    profiles: {
      default: {},
    },
  };

  // 迁移模型配置
  if (openclawConfig.agents?.defaults?.model) {
    const { provider, model } = parseModel(openclawConfig.agents.defaults.model);
    hermes.profiles!.default.model = { provider, model };
    report.migrated.models = true;
  } else {
    report.skipped.push({ field: 'agents.defaults.model', reason: '未配置' });
  }

  // 迁移时区
  if (openclawConfig.agents?.defaults?.userTimezone) {
    hermes.profiles!.default.timezone = openclawConfig.agents.defaults.userTimezone;
    report.migrated.timezone = true;
  }

  // 迁移网关端口
  if (openclawConfig.gateway?.bind) {
    hermes.profiles!.default.gateway = {
      port: extractPort(openclawConfig.gateway.bind),
    };
    report.migrated.gateway = true;
  }

  // 迁移通道配置
  const platforms: string[] = [];
  if (openclawConfig.channels?.feishu) {
    platforms.push('feishu');
    if (!openclawConfig.channels.feishu.appSecret) {
      report.warnings.push('Feishu 配置需要手动填写 appSecret');
    }
  }
  if (openclawConfig.channels?.telegram) {
    platforms.push('telegram');
  }
  if (openclawConfig.channels?.discord) {
    platforms.push('discord');
  }
  
  if (platforms.length > 0) {
    if (!hermes.profiles!.default.gateway) {
      hermes.profiles!.default.gateway = {};
    }
    hermes.profiles!.default.gateway.platforms = platforms;
    report.migrated.channels = true;
  }

  // 迁移工具配置
  if (openclawConfig.tools?.fs?.workspaceOnly !== undefined) {
    hermes.profiles!.default.terminal = {
      sandbox: openclawConfig.tools.fs.workspaceOnly,
    };
    report.migrated.tools = true;
  }

  // 跳过的字段
  if (openclawConfig.plugins?.entries) {
    report.skipped.push({ field: 'plugins.entries', reason: '不兼容的插件系统' });
  }

  return { hermes, report };
}

// ============ Hermes → OpenClaw ============

function hermesToOpenclaw(hermesConfig: HermesConfig): { openclaw: OpenClawConfig; report: MigrationReport } {
  const report: MigrationReport = {
    timestamp: new Date().toISOString(),
    direction: 'hermes-to-openclaw',
    migrated: {},
    skipped: [],
    warnings: [],
  };

  const openclaw: OpenClawConfig = {};

  const profile = hermesConfig.profiles?.default || {};

  // 迁移模型配置
  if (profile.model?.provider && profile.model?.model) {
    openclaw.agents = {
      defaults: {
        model: formatModel(profile.model.provider, profile.model.model),
      },
    };
    report.migrated.models = true;
  } else {
    report.skipped.push({ field: 'profiles.default.model', reason: '未配置' });
  }

  // 迁移时区
  if (profile.timezone) {
    if (!openclaw.agents) openclaw.agents = {};
    if (!openclaw.agents.defaults) openclaw.agents.defaults = {};
    openclaw.agents.defaults.userTimezone = profile.timezone;
    report.migrated.timezone = true;
  }

  // 迁移网关配置
  if (profile.gateway?.port) {
    openclaw.gateway = {
      bind: `ws://127.0.0.1:${profile.gateway.port}`,
    };
    report.migrated.gateway = true;
  }

  // 迁移通道配置
  if (profile.gateway?.platforms) {
    openclaw.channels = {};
    for (const platform of profile.gateway.platforms) {
      openclaw.channels[platform] = {};
    }
    report.migrated.channels = true;
  }

  // 迁移终端配置
  if (profile.terminal?.sandbox !== undefined) {
    openclaw.tools = {
      fs: {
        workspaceOnly: profile.terminal.sandbox,
      },
    };
    report.migrated.tools = true;
  }

  // 跳过的字段
  if (profile.skills) {
    report.skipped.push({ field: 'profiles.default.skills', reason: '技能系统差异，需手动迁移' });
  }

  return { openclaw, report };
}

// ============ CLI 入口 ============

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'to-hermes') {
    const inputPath = args.find((a, i) => args[i - 1] === '--config' || args[i - 1] === '-c') || '~/.openclaw/config.json';
    const outputPath = args.find((a, i) => args[i - 1] === '--output' || args[i - 1] === '-o') || '~/.hermes/config.json';

    const expandedInput = inputPath.replace('~', process.env.HOME || process.env.USERPROFILE || '');
    const expandedOutput = outputPath.replace('~', process.env.HOME || process.env.USERPROFILE || '');

    const openclawConfig = JSON.parse(fs.readFileSync(expandedInput, 'utf-8'));
    const { hermes, report } = openclawToHermes(openclawConfig);

    // 备份
    if (fs.existsSync(expandedOutput)) {
      report.backupPath = backupFile(expandedOutput);
    }

    // 写入
    fs.writeFileSync(expandedOutput, JSON.stringify(hermes, null, 2));

    // 生成报告
    const reportPath = path.join(path.dirname(expandedOutput), `migration-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`✅ 迁移完成: ${expandedOutput}`);
    console.log(`📄 迁移报告: ${reportPath}`);
    if (report.warnings.length > 0) {
      console.log('⚠️ 警告:');
      report.warnings.forEach(w => console.log(`   - ${w}`));
    }
  } else if (command === 'to-openclaw') {
    const inputPath = args.find((a, i) => args[i - 1] === '--config' || args[i - 1] === '-c') || '~/.hermes/config.json';
    const outputPath = args.find((a, i) => args[i - 1] === '--output' || args[i - 1] === '-o') || '~/.openclaw/config.json';

    const expandedInput = inputPath.replace('~', process.env.HOME || process.env.USERPROFILE || '');
    const expandedOutput = outputPath.replace('~', process.env.HOME || process.env.USERPROFILE || '');

    const hermesConfig = JSON.parse(fs.readFileSync(expandedInput, 'utf-8'));
    const { openclaw, report } = hermesToOpenclaw(hermesConfig);

    // 备份
    if (fs.existsSync(expandedOutput)) {
      report.backupPath = backupFile(expandedOutput);
    }

    // 写入
    fs.writeFileSync(expandedOutput, JSON.stringify(openclaw, null, 2));

    // 生成报告
    const reportPath = path.join(path.dirname(expandedOutput), `migration-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`✅ 迁移完成：${expandedOutput}`);
    console.log(`📄 迁移报告：${reportPath}`);
    if (report.warnings.length > 0) {
      console.log('⚠️ 警告:');
      report.warnings.forEach(w => console.log(`   - ${w}`));
    }
  } else {
    console.log('用法:');
    console.log('  migrator to-hermes --config <openclaw-config> --output <hermes-config>');
    console.log('  migrator to-openclaw --config <hermes-config> --output <openclaw-config>');
    process.exit(1);
  }
}

// 导出函数供其他模块使用
export { openclawToHermes, hermesToOpenclaw, parseModel, formatModel };

// 如果是直接运行则执行 main
if (require.main === module) {
  main();
}
