import 'dotenv/config';
import express from 'express';
import { TaskManager } from './services/task-manager';
import { createMusicRoutes } from './routes/music-routes';
import { logger } from './utils/logger';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// 中间件
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// 请求日志
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    body: req.method === 'POST' ? req.body : undefined
  });
  next();
});

// 初始化服务
const taskManager = new TaskManager();

// 注册路由
app.use('/api/music', createMusicRoutes(taskManager));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'ai-music-service'
  });
});

// 根路径
app.get('/', (req, res) => {
  const stats = taskManager.getStats();
  res.json({
    service: 'AI 音乐生成服务',
    version: '1.0.0',
    description: '提供音乐生成、歌词创作、音频处理等功能',
    endpoints: {
      // 音乐生成
      generateMusic: 'POST /api/music/generate',
      generateLyrics: 'POST /api/music/generate-lyrics',
      // 音频处理
      addVocals: 'POST /api/music/add-vocals',
      addInstrumental: 'POST /api/music/add-instrumental',
      // 任务查询
      getTask: 'GET /api/music/tasks/:taskId',
      getStats: 'GET /api/music/stats',
      // 健康检查
      health: 'GET /health'
    },
    stats: {
      totalTasks: stats.total,
      pendingTasks: stats.pending,
      processingTasks: stats.processing,
      completedTasks: stats.completed,
      failedTasks: stats.failed,
      queueSize: stats.queueSize,
      queuePending: stats.queuePending
    },
    config: {
      maxConcurrency: process.env.MAX_CONCURRENCY || '10',
      maxQueueSize: process.env.MAX_QUEUE_SIZE || '2500',
      ossEnabled: !!process.env.OSS_SIGNED_URL_API
    }
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在',
    path: req.path
  });
});

// 错误处理
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('服务器错误', { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
    message: err.message
  });
});

// 启动服务（监听0.0.0.0，允许外网访问）
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🎵 AI 音乐服务已启动`);
  logger.info(`📍 本地访问: http://localhost:${PORT}`);
  logger.info(`📍 外网访问: http://${process.env.SERVER_IP || '你的外网IP'}:${PORT}`);
  logger.info(`📊 健康检查: http://localhost:${PORT}/health`);
  logger.info(`🔧 环境: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`⚙️  任务管理器: 并发=${process.env.MAX_CONCURRENCY || '10'}, 队列=${process.env.MAX_QUEUE_SIZE || '2500'}`);
  logger.info(`☁️  OSS上传: ${process.env.OSS_SIGNED_URL_API ? '已启用' : '未启用'}`);
  logger.info(`⚠️  请确保防火墙已开放 ${PORT} 端口`);
});

