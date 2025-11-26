# AI 音乐生成服务

基于 Suno API 的音乐生成中台服务，提供音乐生成、歌词生成、添加人声等功能。

## 功能特性

- ✅ **音乐生成**：支持自定义模式和纯音乐模式
- ✅ **歌词生成**：根据描述生成歌词内容
- ✅ **添加人声**：为纯音乐添加人声演唱
- ✅ **任务管理**：异步任务处理，支持任务状态查询
- ✅ **并发控制**：支持最大 10 个并发任务
- ✅ **队列管理**：最大队列容量 2500 个任务
- ✅ **OSS 上传**：自动上传音频文件到 OSS
- ✅ **回调通知**：任务完成后自动回调通知
- ✅ **日志记录**：简洁明了的日志输出

## 技术栈

- **运行环境**：Node.js 18+
- **开发语言**：TypeScript
- **Web 框架**：Express
- **任务队列**：p-queue
- **日志系统**：Winston
- **进程管理**：PM2

## 项目结构

```
ai_music_deploy/
├── src/
│   ├── index.ts                 # 应用入口
│   ├── types/
│   │   └── task.ts              # 类型定义
│   ├── utils/
│   │   └── logger.ts            # 日志工具
│   ├── services/
│   │   ├── suno-api.ts          # Suno API 服务
│   │   ├── oss-service.ts       # OSS 上传服务
│   │   ├── callback-service.ts  # 回调通知服务
│   │   └── task-manager.ts      # 任务管理器
│   └── routes/
│       └── music-routes.ts      # 音乐路由
├── logs/                        # 日志目录
├── temp_audio/                  # 临时音频文件目录
├── .env                         # 环境变量配置
├── .env.example                 # 环境变量示例
├── package.json                 # 项目依赖
├── tsconfig.json                # TypeScript 配置
├── ecosystem.config.js          # PM2 配置
├── API.md                       # API 文档
└── README.md                    # 项目说明
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

重要配置项：
- `SUNO_API_KEY`：Suno API 密钥
- `SERVER_IP`：服务器 IP 地址
- `PORT`：服务端口（默认 3001）

### 3. 开发模式运行

```bash
npm run dev
```

### 4. 生产环境部署

```bash
# 编译 TypeScript
npm run build

# 使用 PM2 启动
npm run pm2:start

# 查看日志
npm run pm2:logs

# 查看状态
npm run pm2:status

# 重启服务
npm run pm2:restart

# 停止服务
npm run pm2:stop
```

## API 文档

详细的 API 文档请查看 [API.md](./API.md)

### 主要接口

1. **生成音乐**：`POST /api/music/generate`
2. **生成歌词**：`POST /api/music/generate-lyrics`
3. **添加人声**：`POST /api/music/add-vocals`
4. **查询任务**：`GET /api/music/tasks/:taskId`
5. **获取统计**：`GET /api/music/stats`

### 快速示例

```bash
# 生成音乐
curl -X POST http://47.252.36.81:3001/api/music/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "一首轻快的流行歌曲",
    "callbackUrl": "http://your-server.com/callback",
    "title": "夏日回忆",
    "tags": "pop, upbeat, summer"
  }'

# 查询任务状态
curl http://47.252.36.81:3001/api/music/tasks/{taskId}

# 获取统计信息
curl http://47.252.36.81:3001/api/music/stats
```

## 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| SUNO_API_KEY | Suno API 密钥 | - |
| SUNO_API_BASE_URL | Suno API 基础URL | https://api.sunoapi.org/api/v1 |
| PORT | 服务端口 | 3001 |
| SERVER_IP | 服务器IP | 47.252.36.81 |
| MAX_CONCURRENCY | 最大并发数 | 10 |
| MAX_QUEUE_SIZE | 最大队列容量 | 2500 |
| OSS_SIGNED_URL_API | OSS 签名URL接口 | - |
| CALLBACK_TIMEOUT | 回调超时时间(ms) | 60000 |

## 日志说明

日志文件位于 `logs/` 目录：

- `app-YYYY-MM-DD.log`：应用日志
- `error-YYYY-MM-DD.log`：错误日志
- `pm2-out.log`：PM2 标准输出
- `pm2-error.log`：PM2 错误输出

日志格式：
```
2024-01-01 10:00:00 [info]: 音乐生成任务已创建 {"taskId":"xxx","queueSize":5}
```

## 监控和维护

### 查看服务状态

```bash
npm run pm2:status
```

### 查看实时日志

```bash
npm run pm2:logs
```

### 重启服务

```bash
npm run pm2:restart
```

## 注意事项

1. **服务器配置**：确保服务器 IP 和端口配置正确
2. **回调地址**：提供的回调地址必须可从服务器访问
3. **磁盘空间**：确保有足够的磁盘空间存储临时音频文件
4. **网络连接**：确保服务器可以访问 Suno API 和 OSS 服务
5. **任务清理**：已完成的任务会在 5 分钟后自动清理

## 故障排查

### 服务无法启动

1. 检查端口是否被占用
2. 检查环境变量配置是否正确
3. 检查日志文件查看错误信息

### 任务一直处于 PENDING 状态

1. 检查 Suno API 密钥是否正确
2. 检查网络连接是否正常
3. 查看错误日志

### 回调失败

1. 检查回调地址是否可访问
2. 检查回调服务是否正常运行
3. 查看回调日志

## 许可证

MIT

