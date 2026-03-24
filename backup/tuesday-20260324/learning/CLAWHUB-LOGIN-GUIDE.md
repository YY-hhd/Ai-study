# ClawHub 登录指南

**问题**: ClawHub CLI 未登录，无法安装技能  
**创建时间**: 2026-03-20 08:40

---

## 🔐 登录步骤

### 方法一：手动获取 Token (推荐)

1. **访问 ClawHub 网站**:
   - 打开浏览器访问：https://clawhub.com
   - 使用 Windows Chrome: `/mnt/c/Program Files/Google/Chrome/Application/chrome.exe`

2. **登录账户**:
   - 点击右上角 "Login"
   - 使用 GitHub/Google 账户登录

3. **获取 API Token**:
   - 进入账户设置 (Settings / Profile)
   - 找到 "API Tokens" 或 "CLI Access" 部分
   - 点击 "Generate New Token"
   - 复制生成的 token (格式类似：`chk_xxxxx...`)

4. **配置到 CLI**:
   ```bash
   cd /home/yyreal/.openclaw/workspace
   clawhub login --token <你的 token>
   ```

5. **验证登录**:
   ```bash
   clawhub whoami
   ```

---

### 方法二：自动浏览器登录 (需要配置)

**问题**: WSL2 环境无法自动打开 Windows Chrome

**解决方案**: 在 Windows 侧手动运行登录命令

1. **在 Windows PowerShell 中运行**:
   ```powershell
   cd C:\path\to\workspace
   clawhub login
   ```

2. **浏览器会自动打开**，完成登录后 token 会保存

3. **WSL2 中验证**:
   ```bash
   clawhub whoami
   ```

---

## 📋 待安装技能列表

登录成功后执行:

```bash
cd /home/yyreal/.openclaw/workspace

# 核心技能
clawhub install python
clawhub install python-patterns
clawhub install writer

# 后端开发技能
clawhub install java
clawhub install mysql
clawhub install database
```

---

## ✅ 验证安装

```bash
# 列出已安装技能
clawhub list

# 检查技能文件
ls -la /home/yyreal/.openclaw/workspace/skills/
```

---

**下一步**: 用户需手动完成登录，然后继续技能安装
