/**
 * 多终端后端支持
 * 
 * 实现本地、Docker、SSH、Modal、Cloud Run 等多种后端执行环境
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ============ 类型定义 ============

type BackendType = 'local' | 'docker' | 'ssh' | 'modal' | 'cloudrun';

interface BackendConfig {
  type: BackendType;
  enabled: boolean;
  name: string;
  maxConcurrent?: number;
  [key: string]: any;
}

interface TaskResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  backend: string;
  exitCode: number;
}

interface BackendMetrics {
  name: string;
  uptime: number;
  successRate: number;
  avgLatency: number;
  tasksExecuted: number;
  tasksFailed: number;
}

// ============ 基类：Executor ============

abstract class Executor {
  protected config: BackendConfig;
  protected metrics: BackendMetrics;
  
  constructor(config: BackendConfig) {
    this.config = config;
    this.metrics = {
      name: config.name,
      uptime: 0,
      successRate: 1.0,
      avgLatency: 0,
      tasksExecuted: 0,
      tasksFailed: 0,
    };
  }
  
  abstract execute(command: string, cwd?: string): Promise<TaskResult>;
  abstract healthCheck(): Promise<boolean>;
  
  protected updateMetrics(result: TaskResult): void {
    this.metrics.tasksExecuted++;
    if (!result.success) {
      this.metrics.tasksFailed++;
    }
    this.metrics.successRate = 1 - (this.metrics.tasksFailed / this.metrics.tasksExecuted);
    
    // 更新平均延迟
    const totalLatency = this.metrics.avgLatency * (this.metrics.tasksExecuted - 1) + result.duration;
    this.metrics.avgLatency = totalLatency / this.metrics.tasksExecuted;
  }
  
  getMetrics(): BackendMetrics {
    return { ...this.metrics };
  }
}

// ============ 本地执行器 ============

class LocalExecutor extends Executor {
  constructor(config: BackendConfig) {
    super(config);
  }
  
  async execute(command: string, cwd?: string): Promise<TaskResult> {
    const startTime = Date.now();
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: cwd || process.cwd(),
        maxBuffer: 10 * 1024 * 1024, // 10MB
      });
      
      const duration = Date.now() - startTime;
      const result: TaskResult = {
        success: true,
        output: stdout,
        duration,
        backend: 'local',
        exitCode: 0,
      };
      
      this.updateMetrics(result);
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const result: TaskResult = {
        success: false,
        output: error.stdout || '',
        error: error.stderr || error.message,
        duration,
        backend: 'local',
        exitCode: error.code || 1,
      };
      
      this.updateMetrics(result);
      return result;
    }
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      await execAsync('echo health_check');
      return true;
    } catch {
      return false;
    }
  }
}

// ============ Docker 执行器 ============

class DockerExecutor extends Executor {
  private image: string;
  private memory: string;
  private cpu: number;
  
  constructor(config: BackendConfig) {
    super(config);
    this.image = config.image || 'node:20-alpine';
    this.memory = config.memory || '2g';
    this.cpu = config.cpu || 2;
  }
  
  async execute(command: string, cwd?: string): Promise<TaskResult> {
    const startTime = Date.now();
    const workdir = '/workspace';
    const hostCwd = cwd || process.cwd();
    
    const dockerCommand = `docker run --rm ` +
      `--memory=${this.memory} ` +
      `--cpus=${this.cpu} ` +
      `-v "${hostCwd}:${workdir}" ` +
      `-w ${workdir} ` +
      `${this.image} sh -c "${command}"`;
    
    try {
      const { stdout, stderr } = await execAsync(dockerCommand);
      
      const duration = Date.now() - startTime;
      const result: TaskResult = {
        success: true,
        output: stdout,
        duration,
        backend: 'docker',
        exitCode: 0,
      };
      
      this.updateMetrics(result);
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const result: TaskResult = {
        success: false,
        output: error.stdout || '',
        error: error.stderr || error.message,
        duration,
        backend: 'docker',
        exitCode: error.code || 1,
      };
      
      this.updateMetrics(result);
      return result;
    }
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      await execAsync('docker info');
      return true;
    } catch {
      return false;
    }
  }
}

// ============ SSH 执行器 ============

class SSHExecutor extends Executor {
  private host: string;
  private port: number;
  private user: string;
  private keyPath: string;
  private workingDir: string;
  
  constructor(config: BackendConfig) {
    super(config);
    this.host = config.host;
    this.port = config.port || 22;
    this.user = config.user;
    this.keyPath = config.keyPath;
    this.workingDir = config.working_dir || '/tmp';
  }
  
  async execute(command: string, cwd?: string): Promise<TaskResult> {
    const startTime = Date.now();
    const targetDir = cwd || this.workingDir;
    
    const sshCommand = `ssh -i ${this.keyPath} -p ${this.port} ` +
      `-o StrictHostKeyChecking=no ` +
      `${this.user}@${this.host} ` +
      `cd ${targetDir} && ${command}`;
    
    try {
      const { stdout, stderr } = await execAsync(sshCommand);
      
      const duration = Date.now() - startTime;
      const result: TaskResult = {
        success: true,
        output: stdout,
        duration,
        backend: 'ssh',
        exitCode: 0,
      };
      
      this.updateMetrics(result);
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const result: TaskResult = {
        success: false,
        output: error.stdout || '',
        error: error.stderr || error.message,
        duration,
        backend: 'ssh',
        exitCode: error.code || 1,
      };
      
      this.updateMetrics(result);
      return result;
    }
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      await execAsync(`ssh -i ${this.keyPath} -p ${this.port} -o ConnectTimeout=5 ${this.user}@${this.host} echo health_check`);
      return true;
    } catch {
      return false;
    }
  }
}

// ============ Modal 执行器 ============

class ModalExecutor extends Executor {
  private appId: string;
  private apiToken: string;
  private gpu?: string;
  private timeout: number;
  
  constructor(config: BackendConfig) {
    super(config);
    this.appId = config.appId;
    this.apiToken = config.apiToken || process.env.MODAL_API_TOKEN || '';
    this.gpu = config.gpu;
    this.timeout = config.timeout || 3600;
  }
  
  async execute(command: string, cwd?: string): Promise<TaskResult> {
    const startTime = Date.now();
    
    // Modal 执行需要通过 API 调用
    // 这里简化为调用 modal CLI
    const modalCommand = `modal run --app-id ${this.appId} --token ${this.apiToken} "${command}"`;
    
    try {
      const { stdout, stderr } = await execAsync(modalCommand);
      
      const duration = Date.now() - startTime;
      const result: TaskResult = {
        success: true,
        output: stdout,
        duration,
        backend: 'modal',
        exitCode: 0,
      };
      
      this.updateMetrics(result);
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const result: TaskResult = {
        success: false,
        output: error.stdout || '',
        error: error.stderr || error.message,
        duration,
        backend: 'modal',
        exitCode: error.code || 1,
      };
      
      this.updateMetrics(result);
      return result;
    }
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      await execAsync(`modal token verify --token ${this.apiToken}`);
      return true;
    } catch {
      return false;
    }
  }
}

// ============ Cloud Run 执行器 ============

class CloudRunExecutor extends Executor {
  private projectId: string;
  private region: string;
  private service: string;
  
  constructor(config: BackendConfig) {
    super(config);
    this.projectId = config.projectId;
    this.region = config.region || 'us-central1';
    this.service = config.service;
  }
  
  async execute(command: string, cwd?: string): Promise<TaskResult> {
    const startTime = Date.now();
    
    // Cloud Run 执行需要通过 gcloud CLI 或 API
    const gcloudCommand = `gcloud run services invoke ${this.service} ` +
      `--project=${this.projectId} ` +
      `--region=${this.region} ` +
      `--data={"command": "${command}"}`;
    
    try {
      const { stdout, stderr } = await execAsync(gcloudCommand);
      
      const duration = Date.now() - startTime;
      const result: TaskResult = {
        success: true,
        output: stdout,
        duration,
        backend: 'cloudrun',
        exitCode: 0,
      };
      
      this.updateMetrics(result);
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const result: TaskResult = {
        success: false,
        output: error.stdout || '',
        error: error.stderr || error.message,
        duration,
        backend: 'cloudrun',
        exitCode: error.code || 1,
      };
      
      this.updateMetrics(result);
      return result;
    }
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      await execAsync(`gcloud run services describe ${this.service} --project=${this.projectId} --region=${this.region}`);
      return true;
    } catch {
      return false;
    }
  }
}

// ============ 后端管理器 ============

class BackendManager {
  private executors: Map<string, Executor> = new Map();
  private defaultBackend: string = 'local';
  
  constructor(configPath: string) {
    this.loadConfig(configPath);
  }
  
  private loadConfig(configPath: string): void {
    if (!fs.existsSync(configPath)) {
      console.warn(`Config file not found: ${configPath}, using default local backend`);
      this.executors.set('local', new LocalExecutor({ type: 'local', enabled: true, name: 'local' }));
      return;
    }
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    this.defaultBackend = config.default || 'local';
    
    for (const [name, backendConfig] of Object.entries(config.backends || {})) {
      const cfg = backendConfig as BackendConfig;
      if (!cfg.enabled) continue;
      
      cfg.name = name;
      
      const executor = this.createExecutor(cfg);
      if (executor) {
        this.executors.set(name, executor);
      }
    }
  }
  
  private createExecutor(config: BackendConfig): Executor | null {
    switch (config.type) {
      case 'local':
        return new LocalExecutor(config);
      case 'docker':
        return new DockerExecutor(config);
      case 'ssh':
        return new SSHExecutor(config);
      case 'modal':
        return new ModalExecutor(config);
      case 'cloudrun':
        return new CloudRunExecutor(config);
      default:
        console.warn(`Unknown backend type: ${config.type}`);
        return null;
    }
  }
  
  async execute(backend: string | undefined, command: string, cwd?: string): Promise<TaskResult> {
    const backendName = backend || this.defaultBackend;
    const executor = this.executors.get(backendName);
    
    if (!executor) {
      return {
        success: false,
        output: '',
        error: `Backend not found: ${backendName}`,
        duration: 0,
        backend: backendName,
        exitCode: 1,
      };
    }
    
    return executor.execute(command, cwd);
  }
  
  async healthCheck(backend?: string): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    if (backend) {
      const executor = this.executors.get(backend);
      if (executor) {
        results.set(backend, await executor.healthCheck());
      }
    } else {
      for (const [name, executor] of this.executors.entries()) {
        results.set(name, await executor.healthCheck());
      }
    }
    
    return results;
  }
  
  getMetrics(backend?: string): Map<string, BackendMetrics> {
    const results = new Map<string, BackendMetrics>();
    
    if (backend) {
      const executor = this.executors.get(backend);
      if (executor) {
        results.set(backend, executor.getMetrics());
      }
    } else {
      for (const [name, executor] of this.executors.entries()) {
        results.set(name, executor.getMetrics());
      }
    }
    
    return results;
  }
}

// ============ CLI 入口 ============

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const configPath = path.join(process.env.HOME || '', '.openclaw', 'config', 'backends.json');
  const manager = new BackendManager(configPath);
  
  if (command === 'exec') {
    const backend = args.find(a => a === '--backend')?.split('=')[1];
    const command = args.find(a => !a.startsWith('-'));
    
    if (!command) {
      console.error('Error: command is required');
      process.exit(1);
    }
    
    manager.execute(backend, command).then(result => {
      console.log(result.output);
      if (result.error) {
        console.error(result.error);
      }
      console.error(`\n[${result.backend}] ${result.success ? '✅' : '❌'} Duration: ${result.duration}ms`);
      process.exit(result.success ? 0 : 1);
    }).catch(console.error);
    
  } else if (command === 'health') {
    const backend = args.find(a => a === '--backend')?.split('=')[1];
    
    manager.healthCheck(backend).then(results => {
      console.log('Backend Health Status:');
      for (const [name, healthy] of results.entries()) {
        console.log(`  ${healthy ? '✅' : '❌'} ${name}`);
      }
    }).catch(console.error);
    
  } else if (command === 'metrics') {
    const backend = args.find(a => a === '--backend')?.split('=')[1];
    
    manager.getMetrics(backend).forEach((metrics, name) => {
      console.log(`\n${name}:`);
      console.log(`  Tasks: ${metrics.tasksExecuted} (${metrics.tasksFailed} failed)`);
      console.log(`  Success Rate: ${(metrics.successRate * 100).toFixed(1)}%`);
      console.log(`  Avg Latency: ${metrics.avgLatency.toFixed(0)}ms`);
    });
    
  } else {
    console.log('Multi-Backend Executor');
    console.log('\nUsage:');
    console.log('  backend exec [--backend=<name>] <command>');
    console.log('  backend health [--backend=<name>]');
    console.log('  backend metrics [--backend=<name>]');
    process.exit(1);
  }
}

// 导出
export { 
  BackendManager,
  LocalExecutor,
  DockerExecutor,
  SSHExecutor,
  ModalExecutor,
  CloudRunExecutor,
};

if (require.main === module) {
  main();
}
