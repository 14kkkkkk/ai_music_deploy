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
    service: 'AI Music Generation Service',
    version: '1.0.0',
    description: 'Music generation, lyrics creation, audio processing',
    endpoints: {
      generateMusic: 'POST /api/music/generate',
      generateLyrics: 'POST /api/music/generate-lyrics',
      addVocals: 'POST /api/music/add-vocals',
      addInstrumental: 'POST /api/music/add-instrumental',
      getTask: 'GET /api/music/tasks/:taskId',
      getStats: 'GET /api/music/stats',
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
    error: 'Endpoint not found',
    path: req.path
  });
});

// 错误处理
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Server error', { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// 启动服务（监听0.0.0.0，允许外网访问）
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`AI Music Service started`);
  logger.info(`Local: http://localhost:${PORT}`);
  logger.info(`External: http://${process.env.SERVER_IP || 'YOUR_IP'}:${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Task manager: concurrency=${process.env.MAX_CONCURRENCY || '10'}, queue=${process.env.MAX_QUEUE_SIZE || '2500'}`);
  logger.info(`OSS upload: ${process.env.OSS_SIGNED_URL_API ? 'enabled' : 'disabled'}`);
});

