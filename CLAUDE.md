# Global CLAUDE.md

## 核心原则

### 文件编码 (IMPORTANT)
- **所有生成的文件必须使用 UTF-8 编码（无 BOM）**
- 禁止使用 GBK/GB2312/Shift-JIS 等编码
- 特别注意：.md、.json、.yaml、.txt、plan 文件

### 语言偏好
- 代码注释和变量名：英文
- 与用户交流：中文（除非用户用英文提问）
- 文档内容：根据项目需求

## 错误处理规则 (CRITICAL)

### 失败重试策略
- 文件编辑失败时，**必须**尝试至少 3 种不同方法
- 方法 1：重新读取文件，确认内容后再编辑
- 方法 2：使用不同的编辑策略（整体替换 vs 局部修改）
- 方法 3：写入到用户指定的备用路径

### 备用方案执行
- **当用户提供了备用方案时，必须执行**
- 禁止在失败后静默停止或放弃任务
- 每次失败后必须：报告原因 → 尝试下一种方法 → 或执行备用方案

### 错误报告
- 明确说明失败的具体原因
- 列出已尝试的方法
- 提出下一步建议或请求用户指导

## 开发规范

### 通用命令 (按优先级)
```bash
# 包管理器优先级
pnpm > npm > yarn

# 常用命令
pnpm dev          # 开发模式
pnpm build        # 构建
pnpm test         # 测试
pnpm lint         # 代码检查
pnpm typecheck    # 类型检查
pnpm format       # 代码格式化
```

### 代码风格
- 使用 ES Modules (import/export)，非 CommonJS (require)
- 优先使用解构导入：`import { foo } from 'bar'`
- TypeScript 严格模式
- 函数式组件 + Hooks（React 项目）

## Git 工作流

### Commit 消息格式
```
feat: 新功能
fix: Bug 修复
docs: 文档更新
refactor: 代码重构
test: 测试相关
chore: 构建/配置
style: 代码格式（无功能变化）
```

### 提交前检查
1. `git status` - 确认变更内容
2. `git diff` - 检查具体修改
3. 确保没有敏感信息（.env、密钥等）

### 冲突解决
- 业务代码：仔细分析，保留双方有价值的变更
- Lock 文件：使用 `git checkout --theirs` 后重新 install
- 生成文件：接受上游版本或删除重建

## 禁止读取的文件

以下文件过大或无意义，请勿直接读取：
- `package-lock.json` / `pnpm-lock.yaml` / `yarn.lock`
- `*.min.js` / `*.min.css`
- `dist/` / `build/` / `node_modules/` 目录下的文件
- 二进制文件

**替代方案**：
- 使用 `head -100 <file>` 查看部分内容
- 使用 git 命令查看变更
- 使用 grep 搜索特定内容

## 任务执行原则

### 自主执行
- 独立完成所有步骤
- 遇到错误时尝试自我修复
- 最小化中途确认，减少打断用户
- **禁止在任务中途无故停止**

### 多步骤任务
- 明确列出所有步骤
- 按顺序执行，完成一步确认一步
- 遇到阻塞时，先尝试绕过，再报告

### 完成验证
- 任务完成后验证所有步骤
- 运行相关测试确保没有破坏现有功能
- 检查 git status 确认状态

## 常见错误提醒

### TypeScript/JavaScript
- ❌ useEffect 中直接调用 async 函数
- ❌ 使用 any 类型
- ❌ 在 render 中创建新对象/函数
- ✅ 使用 useMemo/useCallback 优化
- ✅ 正确处理 Promise 错误

### 文件操作
- ❌ 不检查文件是否存在就操作
- ❌ 硬编码绝对路径
- ❌ 编辑失败后直接放弃
- ✅ 使用相对路径或环境变量
- ✅ 操作前检查文件/目录存在性
- ✅ 失败时尝试备用方案

### 安全
- ❌ 提交 .env 文件
- ❌ 在代码中硬编码密钥
- ❌ 对共享分支 force push
- ✅ 使用环境变量管理敏感信息