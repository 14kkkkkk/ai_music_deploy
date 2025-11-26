# AI 音乐服务项目总结

## 项目概述

本项目是一个基于 Suno API 的音乐生成中台服务，采用 TypeScript + Express 开发，提供音乐生成、歌词创作、音频处理等功能。

## 项目特点

### 1. 架构清晰
- **分层设计**：路由层、服务层、工具层分离
- **类型安全**：使用 TypeScript 确保类型安全
- **模块化**：每个功能独立成模块，易于维护和扩展

### 2. 日志简洁明了
- **结构化日志**：使用 Winston，日志格式统一
- **分级记录**：info、warn、error 分级记录
- **关键信息**：只记录关键操作和错误信息
- **日志轮转**：按日期自动分割日志文件

### 3. 并发控制
- **队列管理**：使用 p-queue 管理任务队列
- **并发限制**：最大 10 个并发任务
- **队列容量**：最大 2500 个任务
- **超时控制**：单个任务最长 10 分钟

### 4. OSS 集成
- **自动上传**：音频文件自动上传到 OSS
- **MD5 命名**：使用 MD5 哈希值作为文件名，避免重复
- **临时文件清理**：上传后自动删除临时文件

### 5. 回调机制
- **异步通知**：任务完成后自动回调通知
- **重试机制**：最多重试 3 次
- **指数退避**：重试间隔递增（2秒、4秒、6秒）

## 项目结构

```
ai_music_deploy/
├── src/                          # 源代码目录
│   ├── index.ts                  # 应用入口
│   ├── types/                    # 类型定义
│   │   └── task.ts               # 任务相关类型
│   ├── utils/                    # 工具函数
│   │   └── logger.ts             # 日志工具
│   ├── services/                 # 服务层
│   │   ├── suno-api.ts           # Suno API 服务
│   │   ├── oss-service.ts        # OSS 上传服务
│   │   ├── callback-service.ts   # 回调通知服务
│   │   └── task-manager.ts       # 任务管理器
│   └── routes/                   # 路由层
│       └── music-routes.ts       # 音乐路由
├── logs/                         # 日志目录
├── temp_audio/                   # 临时音频文件目录
├── dist/                         # 编译输出目录
├── .env                          # 环境变量配置
├── .env.example                  # 环境变量示例
├── .gitignore                    # Git 忽略文件
├── package.json                  # 项目依赖
├── tsconfig.json                 # TypeScript 配置
├── ecosystem.config.js           # PM2 配置
├── test-api.js                   # API 测试脚本
├── API.md                        # API 文档
├── README.md                     # 项目说明
├── DEPLOY.md                     # 部署指南
└── PROJECT_SUMMARY.md            # 项目总结（本文件）
```

## 核心功能

### 1. 音乐生成
- 支持自定义模式和纯音乐模式
- 支持指定音乐风格、标题、标签
- 自动上传到 OSS
- 异步回调通知

### 2. 歌词生成
- 根据描述生成歌词
- 支持多种风格
- 异步回调通知

### 3. 添加人声
- 为纯音乐添加人声
- 支持自定义人声描述
- 自动上传到 OSS
- 异步回调通知

### 4. 任务管理
- 任务状态查询
- 任务进度跟踪
- 自动清理已完成任务

### 5. 统计信息
- 实时任务统计
- 队列状态监控

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 18+ | 运行环境 |
| TypeScript | 5.3+ | 开发语言 |
| Express | 4.18+ | Web 框架 |
| p-queue | 8.0+ | 任务队列 |
| Winston | 3.11+ | 日志系统 |
| Axios | 1.6+ | HTTP 客户端 |
| PM2 | 5.3+ | 进程管理 |

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
| OSS_SIGNED_URL_API | OSS 签名URL接口 | https://ai.mediaio.net/api/v1/ai/signed-upload-url |
| CALLBACK_TIMEOUT | 回调超时时间(ms) | 10000 |
| CALLBACK_MAX_RETRIES | 回调最大重试次数 | 3 |

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/music/generate | POST | 生成音乐 |
| /api/music/generate-lyrics | POST | 生成歌词 |
| /api/music/add-vocals | POST | 添加人声 |
| /api/music/tasks/:taskId | GET | 查询任务状态 |
| /api/music/stats | GET | 获取统计信息 |
| /health | GET | 健康检查 |
| / | GET | 服务信息 |

详细 API 文档请查看 [API.md](./API.md)

## 部署信息

- **服务器 IP**: 47.252.36.81
- **服务端口**: 3001
- **进程管理**: PM2
- **日志目录**: logs/
- **临时文件**: temp_audio/

详细部署指南请查看 [DEPLOY.md](./DEPLOY.md)

## 日志示例

```
2024-01-01 10:00:00 [info]: 🎵 AI 音乐服务已启动
2024-01-01 10:00:00 [info]: 📍 外网访问: http://47.252.36.81:3001
2024-01-01 10:00:01 [info]: POST /api/music/generate {"ip":"::1"}
2024-01-01 10:00:01 [info]: 音乐生成任务已创建 {"taskId":"xxx","queueSize":1}
2024-01-01 10:00:01 [info]: 开始处理音乐生成任务 {"taskId":"xxx"}
2024-01-01 10:00:05 [info]: 开始轮询任务状态 {"taskId":"xxx","sunoTaskId":"yyy"}
2024-01-01 10:02:30 [info]: Suno任务完成 {"sunoTaskId":"yyy"}
2024-01-01 10:02:30 [info]: 开始上传音频到 OSS {"taskId":"xxx"}
2024-01-01 10:02:35 [info]: OSS 上传成功
2024-01-01 10:02:35 [info]: 音乐生成任务完成 {"taskId":"xxx","ossFileName":"abc.mp3"}
2024-01-01 10:02:35 [info]: 回调后端成功 {"taskId":"xxx","statusCode":200}
```

## 测试

使用提供的测试脚本快速测试 API：

```bash
node test-api.js
```

## 维护建议

1. **定期检查日志**：查看错误日志，及时发现问题
2. **监控磁盘空间**：定期清理临时文件和日志
3. **更新依赖**：定期运行 `npm audit` 检查安全漏洞
4. **备份配置**：定期备份 `.env` 配置文件
5. **性能监控**：使用 PM2 监控服务性能

## 未来优化方向

1. **添加数据库**：持久化任务信息
2. **添加认证**：API 接口添加认证机制
3. **添加限流**：防止恶意请求
4. **添加缓存**：缓存常用数据
5. **添加监控**：集成 Prometheus 等监控工具
6. **添加测试**：编写单元测试和集成测试

## 总结

本项目采用现代化的技术栈和清晰的架构设计，提供了完整的音乐生成服务。代码结构清晰，日志简洁明了，易于部署和维护。通过合理的并发控制和队列管理，确保服务的稳定性和可靠性。

