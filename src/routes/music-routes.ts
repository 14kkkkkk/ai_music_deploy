import { Router, Request, Response } from 'express';
import { TaskManager } from '../services/task-manager';
import { GenerateMusicRequest, GenerateLyricsRequest, AddVocalsRequest, AddInstrumentalRequest } from '../types/task';
import { logger } from '../utils/logger';

/**
 * 创建音乐相关路由
 */
export function createMusicRoutes(taskManager: TaskManager): Router {
  const router = Router();

  /**
   * POST /api/music/generate
   * 生成音乐
   *
   * 参数验证规则：
   * - customMode 和 instrumental 必填
   * - model 必填，可选值: V3_5, V4, V4_5, V4_5PLUS, V5
   * - callbackUrl 必填
   *
   * 非自定义模式 (customMode=false):
   * - prompt 必填（歌词将自动生成）
   *
   * 自定义模式 (customMode=true):
   * - style 和 title 必填
   * - 如果 instrumental=false，prompt 必填（作为精确歌词）
   */
  router.post('/generate', async (req: Request, res: Response) => {
    try {
      const request: GenerateMusicRequest = req.body;

      // 验证必填参数
      if (typeof request.customMode !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'customMode 参数必填（boolean 类型）'
        });
      }

      if (typeof request.instrumental !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'instrumental 参数必填（boolean 类型）'
        });
      }

      const validModels = ['V3_5', 'V4', 'V4_5', 'V4_5PLUS', 'V5'];
      if (!request.model || !validModels.includes(request.model)) {
        return res.status(400).json({
          success: false,
          error: `model 参数必填，可选值: ${validModels.join(', ')}`
        });
      }

      if (!request.callbackUrl) {
        return res.status(400).json({
          success: false,
          error: 'callbackUrl 参数必填'
        });
      }

      // 根据模式验证参数
      if (request.customMode) {
        // 自定义模式：style 和 title 必填
        if (!request.style) {
          return res.status(400).json({
            success: false,
            error: '自定义模式下 style 参数必填'
          });
        }
        if (!request.title) {
          return res.status(400).json({
            success: false,
            error: '自定义模式下 title 参数必填'
          });
        }
        // 自定义模式下，如果不是纯音乐，prompt 必填（作为歌词）
        if (!request.instrumental && !request.prompt) {
          return res.status(400).json({
            success: false,
            error: '自定义模式下非纯音乐时 prompt 参数必填（作为歌词使用）'
          });
        }
      } else {
        // 非自定义模式：prompt 必填
        if (!request.prompt) {
          return res.status(400).json({
            success: false,
            error: '非自定义模式下 prompt 参数必填'
          });
        }
      }

      // 创建任务
      const task = await taskManager.createMusicGenerationTask(request);

      logger.info('音乐生成任务已创建', { taskId: task.id });

      return res.json({
        success: true,
        data: {
          taskId: task.id,
          status: task.status,
          message: '任务已创建，正在处理中'
        }
      });

    } catch (error: any) {
      logger.error('创建音乐生成任务失败', { error: error.message });
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/music/generate-lyrics
   * 生成歌词
   */
  router.post('/generate-lyrics', async (req: Request, res: Response) => {
    try {
      const request: GenerateLyricsRequest = req.body;

      if (!request.prompt) {
        return res.status(400).json({
          success: false,
          error: 'prompt 参数必填'
        });
      }

      if (!request.callbackUrl) {
        return res.status(400).json({
          success: false,
          error: 'callbackUrl 参数必填'
        });
      }

      const task = await taskManager.createLyricsGenerationTask(request);

      logger.info('歌词生成任务已创建', { taskId: task.id });

      return res.json({
        success: true,
        data: {
          taskId: task.id,
          status: task.status,
          message: '任务已创建，正在处理中'
        }
      });

    } catch (error: any) {
      logger.error('创建歌词生成任务失败', { error: error.message });
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/music/add-vocals
   * 添加人声
   */
  router.post('/add-vocals', async (req: Request, res: Response) => {
    try {
      const request: AddVocalsRequest = req.body;

      // 必填参数验证
      if (!request.audioUrl) {
        return res.status(400).json({
          success: false,
          error: 'audioUrl 参数必填'
        });
      }

      if (!request.prompt) {
        return res.status(400).json({
          success: false,
          error: 'prompt 参数必填'
        });
      }

      if (!request.title) {
        return res.status(400).json({
          success: false,
          error: 'title 参数必填（歌曲标题，最多80字符）'
        });
      }

      if (!request.style) {
        return res.status(400).json({
          success: false,
          error: 'style 参数必填（音乐风格，如: Jazz, Pop, Classical）'
        });
      }

      if (!request.callbackUrl) {
        return res.status(400).json({
          success: false,
          error: 'callbackUrl 参数必填'
        });
      }

      const task = await taskManager.createAddVocalsTask(request);

      logger.info('添加人声任务已创建', { taskId: task.id });

      return res.json({
        success: true,
        data: {
          taskId: task.id,
          status: task.status,
          message: '任务已创建，正在处理中'
        }
      });

    } catch (error: any) {
      logger.error('创建添加人声任务失败', { error: error.message });
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/music/tasks/:taskId
   * 查询任务状态
   */
  router.get('/tasks/:taskId', (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;
      const task = taskManager.getTask(taskId);

      if (!task) {
        return res.status(404).json({
          success: false,
          error: '任务不存在'
        });
      }

      return res.json({
        success: true,
        data: task
      });

    } catch (error: any) {
      logger.error('查询任务失败', { error: error.message });
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/music/stats
   * 获取统计信息
   */
  router.get('/stats', (req: Request, res: Response) => {
    try {
      const stats = taskManager.getStats();
      return res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      logger.error('获取统计信息失败', { error: error.message });
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
}

