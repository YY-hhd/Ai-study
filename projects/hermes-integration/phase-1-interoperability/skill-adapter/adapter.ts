/**
 * OpenClaw AgentSkills ↔ agentskills.io 技能格式转换器
 * 
 * 支持双向转换，保留元数据，生成验证报告
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// ============ 类型定义 ============

interface SkillMetadata {
  name: string;
  description: string;
  version?: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  tags?: string[];
  platforms?: string[];
  allowedTools?: string;
}

interface ConversionReport {
  timestamp: string;
  direction: 'openclaw-to-agentskills' | 'agentskills-to-openclaw';
  skills: Record<string, {
    status: 'converted' | 'skipped' | 'error';
    input?: string;
    output?: string;
    changes?: {
      added: string[];
      modified: string[];
      removed: string[];
    };
    error?: string;
  }>;
  validation: {
    passed: boolean;
    warnings: string[];
    errors: string[];
  };
}

// ============ 验证函数 ============

function validateName(name: string): { valid: boolean; error?: string } {
  if (!name || name.length === 0) {
    return { valid: false, error: 'Name is required' };
  }
  if (name.length > 64) {
    return { valid: false, error: 'Name must be ≤64 characters' };
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
    return { 
      valid: false, 
      error: 'Name must be lowercase alphanumeric with hyphens only (e.g., my-skill)' 
    };
  }
  if (name.startsWith('-') || name.endsWith('-')) {
    return { valid: false, error: 'Name must not start or end with hyphen' };
  }
  if (name.includes('--')) {
    return { valid: false, error: 'Name must not contain consecutive hyphens' };
  }
  return { valid: true };
}

function validateDescription(desc: string): { valid: boolean; error?: string; warning?: string } {
  if (!desc || desc.length === 0) {
    return { valid: false, error: 'Description is required' };
  }
  if (desc.length > 1024) {
    return { valid: false, error: 'Description must be ≤1024 characters' };
  }
  if (!desc.toLowerCase().includes('use when')) {
    return { valid: true, warning: 'Description should include "Use when..." for better discovery' };
  }
  return { valid: true };
}

function validateDirectoryStructure(skillPath: string): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const allowedSubdirs = ['scripts', 'references', 'assets'];
  const items = fs.readdirSync(skillPath);
  
  for (const item of items) {
    if (item === 'SKILL.md') continue;
    
    const fullPath = path.join(skillPath, item);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!allowedSubdirs.includes(item)) {
        errors.push(`Disallowed subdirectory: ${item}. Allowed: ${allowedSubdirs.join(', ')}`);
      }
    }
  }
  
  return { valid: errors.length === 0, errors, warnings };
}

// ============ 解析函数 ============

function parseSkillMd(filePath: string): { metadata: SkillMetadata; body: string } {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // 查找 YAML frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  
  if (!frontmatterMatch) {
    throw new Error('Invalid SKILL.md format: missing YAML frontmatter');
  }
  
  const [, yamlContent, body] = frontmatterMatch;
  const metadata = yaml.load(yamlContent) as SkillMetadata;
  
  return { metadata, body: body.trim() };
}

function generateSkillMd(metadata: SkillMetadata, body: string): string {
  const yamlContent = yaml.dump(metadata, {
    lineWidth: -1,  // 不自动换行
    noRefs: true,   // 不使用引用
  });
  
  return `---\n${yamlContent}---\n\n${body}`;
}

// ============ 转换函数 ============

function openclawToAgentskills(metadata: SkillMetadata, body: string): { metadata: SkillMetadata; body: string; changes: string[] } {
  const changes: string[] = [];
  const newMetadata = { ...metadata };
  let newBody = body;
  
  // 1. 验证并修正 name
  const nameValidation = validateName(metadata.name);
  if (!nameValidation.valid) {
    // 自动修正：转小写，替换空格为连字符
    newMetadata.name = metadata.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    changes.push(`name: "${metadata.name}" → "${newMetadata.name}"`);
  }
  
  // 2. 确保 description 包含 "Use when..."
  if (!metadata.description.toLowerCase().includes('use when')) {
    newMetadata.description = `${metadata.description} Use when working with ${metadata.name} related tasks.`;
    changes.push('description: added "Use when..." clause');
  }
  
  // 3. 添加默认 version
  if (!metadata.version) {
    newMetadata.version = '1.0.0';
    changes.push('version: added "1.0.0"');
  }
  
  // 4. 添加默认 license
  if (!metadata.license) {
    newMetadata.license = 'Apache-2.0';
    changes.push('license: added "Apache-2.0"');
  }
  
  // 5. 添加 metadata
  if (!metadata.metadata) {
    newMetadata.metadata = {};
  }
  if (!newMetadata.metadata['author']) {
    newMetadata.metadata['author'] = 'openclaw';
    changes.push('metadata.author: added "openclaw"');
  }
  if (!newMetadata.metadata['spec-version']) {
    newMetadata.metadata['spec-version'] = '1.0';
    changes.push('metadata.spec-version: added "1.0"');
  }
  
  // 6. 自动提取 tags
  if (!metadata.tags) {
    const keywords = extractKeywords(metadata.name, metadata.description);
    newMetadata.tags = keywords;
    changes.push(`tags: added [${keywords.join(', ')}]`);
  }
  
  // 7. 添加默认 platforms
  if (!metadata.platforms) {
    newMetadata.platforms = ['openclaw', 'claude-code', 'cursor', 'github-copilot'];
    changes.push('platforms: added default platforms');
  }
  
  // 8. 在正文开头添加 "When to use" 章节 (如果不存在)
  if (!body.toLowerCase().includes('when to use')) {
    const useWhenSection = `## When to use this skill\n\n${metadata.description}\n\n`;
    newBody = useWhenSection + body;
    changes.push('body: added "When to use this skill" section');
  }
  
  return { metadata: newMetadata, body: newBody, changes };
}

function agentskillsToOpenclaw(metadata: SkillMetadata, body: string): { metadata: SkillMetadata; body: string; changes: string[] } {
  const changes: string[] = [];
  const newMetadata = { ...metadata };
  let newBody = body;
  
  // OpenClaw 只需要 name 和 description
  // 其他字段保留在正文中作为注释
  
  // 1. 保留 license 和 compatibility 作为注释
  const headerComments: string[] = [];
  if (metadata.license) {
    headerComments.push(`License: ${metadata.license}`);
    changes.push('license: moved to body comment');
  }
  if (metadata.compatibility) {
    headerComments.push(`Compatibility: ${metadata.compatibility}`);
    changes.push('compatibility: moved to body comment');
  }
  
  if (headerComments.length > 0) {
    const commentBlock = `<!-- Skill Metadata (agentskills.io format)\n${headerComments.join('\n')}\n-->\n\n`;
    newBody = commentBlock + body;
  }
  
  // 2. 移除 agentskills.io 特有字段
  delete (newMetadata as any).version;
  delete (newMetadata as any).license;
  delete (newMetadata as any).compatibility;
  delete (newMetadata as any).metadata;
  delete (newMetadata as any).tags;
  delete (newMetadata as any).platforms;
  delete (newMetadata as any).allowedTools;
  changes.push('metadata: removed agentskills.io specific fields');
  
  return { metadata: newMetadata, body: newBody, changes };
}

function extractKeywords(name: string, description: string): string[] {
  const words = new Set<string>();
  
  // 从 name 提取
  name.split(/[-\s]+/).forEach(w => {
    if (w.length > 2) words.add(w.toLowerCase());
  });
  
  // 从 description 提取关键词
  const commonWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'use', 'when', 'with', 'for', 'and', 'or', 'to', 'in', 'on', 'at'];
  description.split(/[\s,.-]+/).forEach(w => {
    const clean = w.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (clean.length > 3 && !commonWords.includes(clean)) {
      words.add(clean);
    }
  });
  
  return Array.from(words).slice(0, 5);  // 最多 5 个 tags
}

// ============ 主转换函数 ============

function convertSkill(
  inputPath: string,
  outputPath: string,
  direction: 'openclaw-to-agentskills' | 'agentskills-to-openclaw'
): ConversionReport {
  const report: ConversionReport = {
    timestamp: new Date().toISOString(),
    direction,
    skills: {},
    validation: { passed: true, warnings: [], errors: [] },
  };
  
  try {
    // 解析输入
    const { metadata, body } = parseSkillMd(path.join(inputPath, 'SKILL.md'));
    
    // 转换
    const { metadata: newMetadata, body: newBody, changes } = 
      direction === 'openclaw-to-agentskills' 
        ? openclawToAgentskills(metadata, body)
        : agentskillsToOpenclaw(metadata, body);
    
    // 验证输出目录结构
    const dirValidation = validateDirectoryStructure(inputPath);
    report.validation.warnings.push(...dirValidation.warnings);
    if (!dirValidation.valid) {
      report.validation.errors.push(...dirValidation.errors);
      report.validation.passed = false;
    }
    
    // 验证名称
    const nameValidation = validateName(newMetadata.name);
    if (!nameValidation.valid) {
      report.validation.errors.push(nameValidation.error!);
      report.validation.passed = false;
    }
    
    // 验证描述
    const descValidation = validateDescription(newMetadata.description);
    if (!descValidation.valid) {
      report.validation.errors.push(descValidation.error!);
      report.validation.passed = false;
    }
    if (descValidation.warning) {
      report.validation.warnings.push(descValidation.warning);
    }
    
    // 生成输出
    const outputContent = generateSkillMd(newMetadata, newBody);
    
    // 确保输出目录存在
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }
    
    // 写入 SKILL.md
    fs.writeFileSync(path.join(outputPath, 'SKILL.md'), outputContent);
    
    // 复制子目录 (scripts/, references/, assets/)
    const subdirs = ['scripts', 'references', 'assets'];
    for (const subdir of subdirs) {
      const srcDir = path.join(inputPath, subdir);
      const dstDir = path.join(outputPath, subdir);
      if (fs.existsSync(srcDir)) {
        fs.cpSync(srcDir, dstDir, { recursive: true });
      }
    }
    
    // 记录结果
    const skillName = path.basename(inputPath);
    report.skills[skillName] = {
      status: 'converted',
      input: inputPath,
      output: outputPath,
      changes: {
        added: changes.filter(c => c.includes('added')),
        modified: changes.filter(c => c.includes('→') || c.includes('modified')),
        removed: changes.filter(c => c.includes('removed')),
      },
    };
    
  } catch (error) {
    const skillName = path.basename(inputPath);
    report.skills[skillName] = {
      status: 'error',
      input: inputPath,
      error: String(error),
    };
    report.validation.passed = false;
    report.validation.errors.push(`Failed to convert ${skillName}: ${error}`);
  }
  
  return report;
}

// ============ CLI 入口 ============

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'to-agentskills' || command === 'to-openclaw') {
    const inputPath = args.find((a, i) => args[i - 1] === '--input' || args[i - 1] === '-i');
    const outputPath = args.find((a, i) => args[i - 1] === '--output' || args[i - 1] === '-o');
    const batch = args.includes('--batch') || args.includes('-b');
    
    if (!inputPath || !outputPath) {
      console.error('Error: --input and --output are required');
      console.log('Usage:');
      console.log('  adapter to-agentskills --input <skill-dir> --output <output-dir> [--batch]');
      console.log('  adapter to-openclaw --input <skill-dir> --output <output-dir> [--batch]');
      process.exit(1);
    }
    
    const direction = command === 'to-agentskills' ? 'openclaw-to-agentskills' : 'agentskills-to-openclaw';
    
    if (batch) {
      // 批量转换
      const skills = fs.readdirSync(inputPath).filter(item => {
        const itemPath = path.join(inputPath, item);
        return fs.statSync(itemPath).isDirectory() && fs.existsSync(path.join(itemPath, 'SKILL.md'));
      });
      
      console.log(`Found ${skills.length} skills to convert...`);
      
      const allReports: ConversionReport[] = [];
      for (const skill of skills) {
        console.log(`Converting ${skill}...`);
        const report = convertSkill(
          path.join(inputPath, skill),
          path.join(outputPath, skill),
          direction
        );
        allReports.push(report);
      }
      
      // 生成汇总报告
      const summaryReport = {
        timestamp: new Date().toISOString(),
        direction,
        totalSkills: skills.length,
        successful: allReports.filter(r => r.validation.passed).length,
        failed: allReports.filter(r => !r.validation.passed).length,
        reports: allReports,
      };
      
      const reportPath = path.join(outputPath, `conversion-report-${Date.now()}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(summaryReport, null, 2));
      
      console.log(`\n✅ Conversion complete!`);
      console.log(`   Successful: ${summaryReport.successful}/${summaryReport.totalSkills}`);
      console.log(`   Report: ${reportPath}`);
      
    } else {
      // 单个转换
      const report = convertSkill(inputPath, outputPath, direction);
      
      const reportPath = path.join(outputPath, `conversion-report-${Date.now()}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      
      if (report.validation.passed) {
        console.log(`✅ Conversion complete: ${outputPath}`);
      } else {
        console.log(`⚠️ Conversion completed with issues: ${outputPath}`);
      }
      
      if (report.validation.warnings.length > 0) {
        console.log('\nWarnings:');
        report.validation.warnings.forEach(w => console.log(`  - ${w}`));
      }
      
      if (report.validation.errors.length > 0) {
        console.log('\nErrors:');
        report.validation.errors.forEach(e => console.log(`  - ${e}`));
      }
      
      console.log(`\n📄 Report: ${reportPath}`);
    }
    
  } else if (command === 'validate') {
    const skillPath = args.find((a, i) => !a.startsWith('-'));
    
    if (!skillPath) {
      console.error('Error: skill path is required');
      console.log('Usage: adapter validate <skill-dir>');
      process.exit(1);
    }
    
    const dirValidation = validateDirectoryStructure(skillPath);
    const { metadata } = parseSkillMd(path.join(skillPath, 'SKILL.md'));
    const nameValidation = validateName(metadata.name);
    const descValidation = validateDescription(metadata.description);
    
    const allValid = dirValidation.valid && nameValidation.valid && descValidation.valid;
    
    console.log(`Validation: ${skillPath}`);
    console.log(`\nDirectory Structure: ${dirValidation.valid ? '✅' : '❌'}`);
    dirValidation.errors.forEach(e => console.log(`  ❌ ${e}`));
    dirValidation.warnings.forEach(w => console.log(`  ⚠️ ${w}`));
    
    console.log(`\nName: ${nameValidation.valid ? '✅' : '❌'}`);
    if (!nameValidation.valid) console.log(`  ❌ ${nameValidation.error}`);
    
    console.log(`\nDescription: ${descValidation.valid ? '✅' : '❌'}`);
    if (!descValidation.valid) console.log(`  ❌ ${descValidation.error}`);
    if (descValidation.warning) console.log(`  ⚠️ ${descValidation.warning}`);
    
    process.exit(allValid ? 0 : 1);
    
  } else {
    console.log('AgentSkills ↔ agentskills.io Converter');
    console.log('\nUsage:');
    console.log('  adapter to-agentskills --input <skill-dir> --output <output-dir> [--batch]');
    console.log('  adapter to-openclaw --input <skill-dir> --output <output-dir> [--batch]');
    console.log('  adapter validate <skill-dir>');
    process.exit(1);
  }
}

// 导出函数
export { 
  validateName, 
  validateDescription, 
  validateDirectoryStructure,
  parseSkillMd, 
  generateSkillMd,
  openclawToAgentskills, 
  agentskillsToOpenclaw,
  convertSkill 
};

if (require.main === module) {
  main();
}
