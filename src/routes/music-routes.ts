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
          error: 'customMode is required (boolean type)'
        });
      }

      if (typeof request.instrumental !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'instrumental is required (boolean type)'
        });
      }

      const validModels = ['V3_5', 'V4', 'V4_5', 'V4_5PLUS', 'V5'];
      if (!request.model || !validModels.includes(request.model)) {
        return res.status(400).json({
          success: false,
          error: `model is required, valid values: ${validModels.join(', ')}`
        });
      }

      if (!request.callbackUrl) {
        return res.status(400).json({
          success: false,
          error: 'callbackUrl is required'
        });
      }

      // 根据模式验证参数
      if (request.customMode) {
        // 自定义模式：style 和 title 必填
        if (!request.style) {
          return res.status(400).json({
            success: false,
            error: 'style is required in custom mode'
          });
        }
        if (!request.title) {
          return res.status(400).json({
            success: false,
            error: 'title is required in custom mode'
          });
        }
        // 自定义模式下，如果不是纯音乐，prompt 必填（作为歌词）
        if (!request.instrumental && !request.prompt) {
          return res.status(400).json({
            success: false,
            error: 'prompt is required in custom mode for non-instrumental music (used as lyrics)'
          });
        }
        // 如果有上传音乐参考，验证 referenceType 和 audioUrl
        if (request.referenceType) {
          const validReferenceTypes = ['extend', 'add-vocals', 'add-instrumental'];
          if (!validReferenceTypes.includes(request.referenceType)) {
            return res.status(400).json({
              success: false,
              error: `Invalid referenceType, valid values: ${validReferenceTypes.join(', ')}`
            });
          }
          if (!request.audioUrl) {
            return res.status(400).json({
              success: false,
              error: 'audioUrl is required when using music reference'
            });
          }
        }
      } else {
        // 非自定义模式：prompt 必填
        if (!request.prompt) {
          return res.status(400).json({
            success: false,
            error: 'prompt is required in non-custom mode'
          });
        }
      }

      // 创建任务
      const task = await taskManager.createMusicGenerationTask(request);

      logger.info('Music generation task created', { taskId: task.id });

      return res.json({
        success: true,
        data: {
          taskId: task.id,
          status: task.status,
          message: 'Task created, processing'
        }
      });

    } catch (error: any) {
      logger.error('Failed to create music generation task', { error: error.message });
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
          error: 'prompt is required'
        });
      }

      if (!request.callbackUrl) {
        return res.status(400).json({
          success: false,
          error: 'callbackUrl is required'
        });
      }

      const task = await taskManager.createLyricsGenerationTask(request);

      logger.info('Lyrics generation task created', { taskId: task.id });

      return res.json({
        success: true,
        data: {
          taskId: task.id,
          status: task.status,
          message: 'Task created, processing'
        }
      });

    } catch (error: any) {
      logger.error('Failed to create lyrics generation task', { error: error.message });
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
          error: 'audioUrl is required'
        });
      }

      if (!request.prompt) {
        return res.status(400).json({
          success: false,
          error: 'prompt is required'
        });
      }

      if (!request.title) {
        return res.status(400).json({
          success: false,
          error: 'title is required (song title, max 80 characters)'
        });
      }

      if (!request.style) {
        return res.status(400).json({
          success: false,
          error: 'style is required (music style, e.g.: Jazz, Pop, Classical)'
        });
      }

      if (!request.callbackUrl) {
        return res.status(400).json({
          success: false,
          error: 'callbackUrl is required'
        });
      }

      const task = await taskManager.createAddVocalsTask(request);

      logger.info('Add vocals task created', { taskId: task.id });

      return res.json({
        success: true,
        data: {
          taskId: task.id,
          status: task.status,
          message: 'Task created, processing'
        }
      });

    } catch (error: any) {
      logger.error('Failed to create add vocals task', { error: error.message });
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/music/add-instrumental
   * 添加伴奏
   */
  router.post('/add-instrumental', async (req: Request, res: Response) => {
    try {
      const request: AddInstrumentalRequest = req.body;

      // 必填参数验证
      if (!request.audioUrl) {
        return res.status(400).json({
          success: false,
          error: 'audioUrl is required'
        });
      }

      if (!request.prompt) {
        return res.status(400).json({
          success: false,
          error: 'prompt is required'
        });
      }

      if (!request.title) {
        return res.status(400).json({
          success: false,
          error: 'title is required (song title, max 80 characters)'
        });
      }

      if (!request.style) {
        return res.status(400).json({
          success: false,
          error: 'style is required (music style, e.g.: Jazz, Pop, Classical)'
        });
      }

      if (!request.callbackUrl) {
        return res.status(400).json({
          success: false,
          error: 'callbackUrl is required'
        });
      }

      const task = await taskManager.createAddInstrumentalTask(request);

      logger.info('Add instrumental task created', { taskId: task.id });

      return res.json({
        success: true,
        data: {
          taskId: task.id,
          status: task.status,
          message: 'Task created, processing'
        }
      });

    } catch (error: any) {
      logger.error('Failed to create add instrumental task', { error: error.message });
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
          error: 'Task not found'
        });
      }

      return res.json({
        success: true,
        data: task
      });

    } catch (error: any) {
      logger.error('Failed to query task', { error: error.message });
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
      logger.error('Failed to get stats', { error: error.message });
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
}

