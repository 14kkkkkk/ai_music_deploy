# 快速启动指南

## 本地开发

### 1. 安装依赖

```bash
cd ai_music_deploy
npm install
```

### 2. 配置环境变量

`.env` 文件已经配置好，包含以下关键配置：

```env
SUNO_API_KEY=28f61cf2a6012f2a1204f8569768f979
SERVER_IP=47.252.36.81
PORT=3001
MAX_CONCURRENCY=10
MAX_QUEUE_SIZE=2500
OSS_SIGNED_URL_API=https://ai.mediaio.net/api/v1/ai/signed-upload-url
```

### 3. 启动开发服务器

```bash
npm run dev
```

服务将在 `http://localhost:3001` 启动。

### 4. 测试接口

打开浏览器访问：
```
http://localhost:3001
```

或使用测试脚本：
```bash
node test-api.js
```

---

## 服务器部署

### 1. 上传代码到服务器

```bash
# 使用 SCP
scp -r ai_music_deploy/ user@47.252.36.81:/path/to/deploy/

# 或使用 Git
ssh user@47.252.36.81
cd /path/to/deploy/
git clone <repository-url>
cd ai_music_deploy
```

### 2. 安装依赖

```bash
npm install
```

### 3. 编译 TypeScript

```bash
npm run build
```

### 4. 启动服务

```bash
npm run pm2:start
```

### 5. 验证服务

```bash
# 检查服务状态
pm2 status

# 查看日志
pm2 logs ai-music-service

# 测试接口
curl http://47.252.36.81:3001/health
```

---

## 常用命令

### 开发命令

```bash
# 开发模式（热重载）
npm run dev

# 编译 TypeScript
npm run build

# 直接运行编译后的代码
npm start
```

### PM2 命令

```bash
# 启动服务
npm run pm2:start

# 停止服务
npm run pm2:stop

# 重启服务
npm run pm2:restart

# 删除服务
npm run pm2:delete

# 查看日志
npm run pm2:logs

# 查看状态
npm run pm2:status
```

---

## API 测试示例

### 1. 健康检查

```bash
curl http://47.252.36.81:3001/health
```

### 2. 获取服务信息

```bash
curl http://47.252.36.81:3001/
```

### 3. 获取统计信息

```bash
curl http://47.252.36.81:3001/api/music/stats
```

### 4. 生成音乐

```bash
curl -X POST http://47.252.36.81:3001/api/music/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "一首轻快的流行歌曲",
    "callbackUrl": "http://your-server.com/callback",
    "title": "夏日回忆",
    "tags": "pop, upbeat, summer"
  }'
```

### 5. 查询任务状态

```bash
# 替换 {taskId} 为实际的任务ID
curl http://47.252.36.81:3001/api/music/tasks/{taskId}
```

---

## 目录说明

```
ai_music_deploy/
├── src/                    # 源代码
│   ├── index.ts            # 入口文件
│   ├── types/              # 类型定义
│   ├── utils/              # 工具函数
│   ├── services/           # 服务层
│   └── routes/             # 路由层
├── dist/                   # 编译输出（npm run build 后生成）
├── logs/                   # 日志文件（运行后生成）
├── temp_audio/             # 临时音频文件（运行后生成）
├── node_modules/           # 依赖包（npm install 后生成）
├── .env                    # 环境变量配置
├── package.json            # 项目配置
├── tsconfig.json           # TypeScript 配置
├── ecosystem.config.js     # PM2 配置
├── test-api.js             # API 测试脚本
├── API.md                  # API 文档
├── README.md               # 项目说明
├── DEPLOY.md               # 部署指南
├── PROJECT_SUMMARY.md      # 项目总结
└── QUICKSTART.md           # 快速启动指南（本文件）
```

---

## 故障排查

### 问题：端口被占用

```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux
lsof -i :3001
kill -9 <PID>
```

### 问题：服务无法启动

1. 检查 Node.js 版本：`node -v`（需要 >= 18.0.0）
2. 检查依赖是否安装：`npm install`
3. 检查环境变量：`cat .env`
4. 查看错误日志：`tail -f logs/error-*.log`

### 问题：任务一直 PENDING

1. 检查 Suno API 密钥是否正确
2. 检查网络连接：`ping api.sunoapi.org`
3. 查看应用日志：`tail -f logs/app-*.log`

---

## 下一步

- 📖 阅读 [API.md](./API.md) 了解详细的 API 文档
- 🚀 阅读 [DEPLOY.md](./DEPLOY.md) 了解部署细节
- 📊 阅读 [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) 了解项目架构

---

## 技术支持

如有问题，请查看：
1. 应用日志：`logs/app-*.log`
2. 错误日志：`logs/error-*.log`
3. PM2 日志：`pm2 logs ai-music-service`

