import { v4 as uuidv4 } from 'uuid';
import PQueue from 'p-queue';
import { Task, TaskStatus, TaskType, GenerateMusicRequest, GenerateLyricsRequest, AddVocalsRequest, AddInstrumentalRequest } from '../types/task';
import { SunoApiService } from './suno-api';
import { OSSService } from './oss-service';
import { CallbackService } from './callback-service';
import { logger } from '../utils/logger';

/**
 * 任务管理器 - 管理任务队列和状态
 */
export class TaskManager {
  private tasks: Map<string, Task> = new Map();
  private queue: PQueue;
  private sunoApi: SunoApiService;
  private ossService: OSSService;
  private callbackService: CallbackService;

  constructor() {
    // 创建并发队列
    this.queue = new PQueue({
      concurrency: parseInt(process.env.MAX_CONCURRENCY || '10'),
      timeout: 600000, // 单个任务超时时间 10分钟
      throwOnTimeout: true
    });

    this.sunoApi = new SunoApiService();
    this.ossService = new OSSService();
    this.callbackService = new CallbackService();

    logger.info('TaskManager 初始化完成', {
      concurrency: this.queue.concurrency,
      timeout: '10分钟'
    });

    // 定期清理已完成的任务（5分钟后删除）
    setInterval(() => this.cleanupTasks(), 60000);
  }

  /**
   * 创建音乐生成任务
   */
  async createMusicGenerationTask(request: GenerateMusicRequest): Promise<Task> {
    // 检查队列是否已满
    const maxQueueSize = parseInt(process.env.MAX_QUEUE_SIZE || '2500');
    if (this.queue.size + this.queue.pending >= maxQueueSize) {
      throw new Error(`队列已满，当前任务数: ${this.queue.size + this.queue.pending}`);
    }

    const task: Task = {
      id: uuidv4(),
      status: TaskStatus.PENDING,
      type: TaskType.MUSIC_GENERATION,
      input: {
        customMode: request.customMode || false,
        instrumental: request.instrumental || false,
        model: request.model || 'V4',
        prompt: request.prompt,
        title: request.title || '',
        tags: request.tags || '',
        negativeTags: request.negativeTags || ''
      },
      callbackUrl: request.callbackUrl,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.tasks.set(task.id, task);
    this.queue.add(() => this.processMusicGenerationTask(task.id)).catch((error: any) => {
      logger.error('音乐生成任务队列异常', { taskId: task.id, error: error.message });
      this.handleTaskError(task.id, error, 'MUSIC_GENERATION');
    });

    logger.info('音乐生成任务已创建', {
      taskId: task.id,
      queueSize: this.queue.size,
      queuePending: this.queue.pending
    });

    return task;
  }

  /**
   * 创建歌词生成任务
   */
  async createLyricsGenerationTask(request: GenerateLyricsRequest): Promise<Task> {
    const maxQueueSize = parseInt(process.env.MAX_QUEUE_SIZE || '2500');
    if (this.queue.size + this.queue.pending >= maxQueueSize) {
      throw new Error(`队列已满，当前任务数: ${this.queue.size + this.queue.pending}`);
    }

    const task: Task = {
      id: uuidv4(),
      status: TaskStatus.PENDING,
      type: TaskType.LYRICS_GENERATION,
      input: {
        prompt: request.prompt
      },
      callbackUrl: request.callbackUrl,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.tasks.set(task.id, task);
    this.queue.add(() => this.processLyricsGenerationTask(task.id)).catch((error: any) => {
      logger.error('歌词生成任务队列异常', { taskId: task.id, error: error.message });
      this.handleTaskError(task.id, error, 'LYRICS_GENERATION');
    });

    logger.info('歌词生成任务已创建', {
      taskId: task.id,
      queueSize: this.queue.size
    });

    return task;
  }

  /**
   * 创建添加人声任务
   */
  async createAddVocalsTask(request: AddVocalsRequest): Promise<Task> {
    const maxQueueSize = parseInt(process.env.MAX_QUEUE_SIZE || '2500');
    if (this.queue.size + this.queue.pending >= maxQueueSize) {
      throw new Error(`队列已满，当前任务数: ${this.queue.size + this.queue.pending}`);
    }

    const task: Task = {
      id: uuidv4(),
      status: TaskStatus.PENDING,
      type: TaskType.ADD_VOCALS,
      input: {
        audioUrl: request.audioUrl,
        prompt: request.prompt
      },
      callbackUrl: request.callbackUrl,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.tasks.set(task.id, task);
    this.queue.add(() => this.processAddVocalsTask(task.id)).catch((error: any) => {
      logger.error('添加人声任务队列异常', { taskId: task.id, error: error.message });
      this.handleTaskError(task.id, error, 'ADD_VOCALS');
    });

    logger.info('添加人声任务已创建', {
      taskId: task.id,
      queueSize: this.queue.size
    });

    return task;
  }

  /**
   * 获取任务信息
   */
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const tasks = Array.from(this.tasks.values());
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === TaskStatus.PENDING).length,
      processing: tasks.filter(t => t.status === TaskStatus.PROCESSING).length,
      completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
      failed: tasks.filter(t => t.status === TaskStatus.FAILED).length,
      queueSize: this.queue.size,
      queuePending: this.queue.pending
    };
  }

  /**
   * 更新任务状态
   */
  private updateTask(taskId: string, updates: Partial<Task>): void {
    const task = this.tasks.get(taskId);
    if (task) {
      Object.assign(task, updates, { updatedAt: new Date() });
      this.tasks.set(taskId, task);
    }
  }

  /**
   * 处理音乐生成任务
   */
  private async processMusicGenerationTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      logger.error('任务不存在', { taskId });
      return;
    }

    let sunoTaskId: string = '';

    try {
      // 1. 更新状态为处理中
      this.updateTask(taskId, {
        status: TaskStatus.PROCESSING,
        progress: 10
      });

      logger.info('开始处理音乐生成任务', { taskId });

      // 2. 调用 Suno API 生成音乐
      this.updateTask(taskId, { progress: 20 });
      const params = {
        ...task.input,
        callBackUrl: `${process.env.CALLBACK_BASE_URL}/api/music/callback/music-internal/${taskId}`
      };

      const response = await this.sunoApi.generateMusic(params);

      if (response.code !== 200 || !response.data?.taskId) {
        throw new Error(response.msg || '调用Suno API失败');
      }

      sunoTaskId = response.data.taskId;
      this.updateTask(taskId, { progress: 30 });

      // 3. 轮询等待任务完成
      logger.info('开始轮询任务状态', { taskId, sunoTaskId });
      const result = await this.pollTaskUntilComplete(sunoTaskId);

      this.updateTask(taskId, { progress: 70 });

      // 4. 上传音频到 OSS
      if (result.data && result.data.length > 0) {
        const audioData = result.data[0];

        if (audioData.audio_url) {
          logger.info('开始上传音频到 OSS', { taskId });
          const ossFileName = await this.ossService.downloadAndUploadToOSS(audioData.audio_url);

          this.updateTask(taskId, {
            status: TaskStatus.COMPLETED,
            progress: 100,
            output: {
              ...audioData,
              ossFileName,
              audio_url: audioData.audio_url
            },
            completedAt: new Date()
          });

          logger.info('音乐生成任务完成', { taskId, ossFileName });

          // 5. 回调通知后端
          if (task.callbackUrl) {
            await this.callbackService.notifyBackend(task.callbackUrl, {
              taskId: task.id,
              status: 'success',
              taskType: 'MUSIC_GENERATION',
              data: {
                ...audioData,
                ossFileName,
                audio_url: audioData.audio_url
              }
            });
          }
        } else {
          throw new Error('音频URL不存在');
        }
      } else {
        throw new Error('未获取到音频数据');
      }

    } catch (error: any) {
      logger.error('音乐生成任务失败', {
        taskId,
        error: error.message
      });

      this.updateTask(taskId, {
        status: TaskStatus.FAILED,
        error: error.message,
        completedAt: new Date()
      });

      // 回调通知失败
      if (task.callbackUrl) {
        await this.callbackService.notifyBackend(task.callbackUrl, {
          taskId: task.id,
          status: 'failed',
          taskType: 'MUSIC_GENERATION',
          error: error.message
        });
      }
    }
  }

  /**
   * 处理歌词生成任务
   */
  private async processLyricsGenerationTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    try {
      this.updateTask(taskId, {
        status: TaskStatus.PROCESSING,
        progress: 20
      });

      const params = {
        prompt: task.input.prompt,
        callBackUrl: `${process.env.CALLBACK_BASE_URL}/api/music/callback/lyrics-internal/${taskId}`
      };

      const response = await this.sunoApi.generateLyrics(params);

      if (response.code !== 200 || !response.data?.taskId) {
        throw new Error(response.msg || '调用Suno API失败');
      }

      const sunoTaskId = response.data.taskId;
      this.updateTask(taskId, { progress: 40 });

      // 轮询等待歌词任务完成
      const result = await this.pollLyricsTaskUntilComplete(sunoTaskId);

      this.updateTask(taskId, {
        status: TaskStatus.COMPLETED,
        progress: 100,
        output: result.data,
        completedAt: new Date()
      });

      logger.info('歌词生成任务完成', { taskId });

      // 回调通知后端
      if (task.callbackUrl) {
        await this.callbackService.notifyBackend(task.callbackUrl, {
          taskId: task.id,
          status: 'success',
          taskType: 'LYRICS_GENERATION',
          data: result.data
        });
      }

    } catch (error: any) {
      logger.error('歌词生成任务失败', {
        taskId,
        error: error.message
      });

      this.updateTask(taskId, {
        status: TaskStatus.FAILED,
        error: error.message,
        completedAt: new Date()
      });

      if (task.callbackUrl) {
        await this.callbackService.notifyBackend(task.callbackUrl, {
          taskId: task.id,
          status: 'failed',
          taskType: 'LYRICS_GENERATION',
          error: error.message
        });
      }
    }
  }

  /**
   * 处理添加人声任务
   */
  private async processAddVocalsTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    try {
      this.updateTask(taskId, {
        status: TaskStatus.PROCESSING,
        progress: 20
      });

      const params = {
        audioUrl: task.input.audioUrl,
        prompt: task.input.prompt,
        callBackUrl: `${process.env.CALLBACK_BASE_URL}/api/music/callback/vocals-internal/${taskId}`
      };

      const response = await this.sunoApi.addVocals(params);

      if (response.code !== 200 || !response.data?.taskId) {
        throw new Error(response.msg || '调用Suno API失败');
      }

      const sunoTaskId = response.data.taskId;
      this.updateTask(taskId, { progress: 40 });

      // 轮询等待任务完成
      const result = await this.pollTaskUntilComplete(sunoTaskId);
      this.updateTask(taskId, { progress: 70 });

      // 上传音频到 OSS
      if (result.data && result.data.length > 0) {
        const audioData = result.data[0];

        if (audioData.audio_url) {
          const ossFileName = await this.ossService.downloadAndUploadToOSS(audioData.audio_url);

          this.updateTask(taskId, {
            status: TaskStatus.COMPLETED,
            progress: 100,
            output: {
              ...audioData,
              ossFileName,
              audio_url: audioData.audio_url
            },
            completedAt: new Date()
          });

          logger.info('添加人声任务完成', { taskId, ossFileName });

          if (task.callbackUrl) {
            await this.callbackService.notifyBackend(task.callbackUrl, {
              taskId: task.id,
              status: 'success',
              taskType: 'ADD_VOCALS',
              data: {
                ...audioData,
                ossFileName,
                audio_url: audioData.audio_url
              }
            });
          }
        } else {
          throw new Error('音频URL不存在');
        }
      } else {
        throw new Error('未获取到音频数据');
      }

    } catch (error: any) {
      logger.error('添加人声任务失败', {
        taskId,
        error: error.message
      });

      this.updateTask(taskId, {
        status: TaskStatus.FAILED,
        error: error.message,
        completedAt: new Date()
      });

      if (task.callbackUrl) {
        await this.callbackService.notifyBackend(task.callbackUrl, {
          taskId: task.id,
          status: 'failed',
          taskType: 'ADD_VOCALS',
          error: error.message
        });
      }
    }
  }

  /**
   * 轮询音乐生成任务直到完成
   */
  private async pollTaskUntilComplete(sunoTaskId: string): Promise<any> {
    const maxAttempts = 120; // 最多轮询 120 次（10分钟）
    const pollInterval = 5000; // 每 5 秒轮询一次

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.sunoApi.getTaskDetail(sunoTaskId);

        if (result.code === 200 && result.data) {
          const status = result.data.status;

          if (status === 'SUCCESS') {
            logger.info('Suno音乐任务完成', { sunoTaskId });
            return result.data;
          } else if (status === 'FAILED') {
            throw new Error('Suno任务失败');
          }

          // 继续轮询
          logger.info('Suno音乐任务处理中', {
            sunoTaskId,
            status,
            attempt: `${attempt}/${maxAttempts}`
          });
        }

        await this.sleep(pollInterval);
      } catch (error: any) {
        if (attempt === maxAttempts) {
          throw error;
        }
        logger.warn('查询音乐任务状态失败，重试中', { sunoTaskId, attempt, error: error.message });
        await this.sleep(pollInterval);
      }
    }

    throw new Error('任务超时');
  }

  /**
   * 轮询歌词生成任务直到完成
   */
  private async pollLyricsTaskUntilComplete(sunoTaskId: string): Promise<any> {
    const maxAttempts = 60; // 歌词生成较快，60次（5分钟）
    const pollInterval = 5000; // 每 5 秒轮询一次

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.sunoApi.getLyricsTaskDetail(sunoTaskId);

        if (result.code === 200 && result.data) {
          const status = result.data.status;

          if (status === 'SUCCESS') {
            logger.info('Suno歌词任务完成', { sunoTaskId });
            return result.data;
          } else if (status === 'FAILED') {
            throw new Error('Suno歌词任务失败');
          }

          // 继续轮询
          logger.info('Suno歌词任务处理中', {
            sunoTaskId,
            status,
            attempt: `${attempt}/${maxAttempts}`
          });
        }

        await this.sleep(pollInterval);
      } catch (error: any) {
        if (attempt === maxAttempts) {
          throw error;
        }
        logger.warn('查询歌词任务状态失败，重试中', { sunoTaskId, attempt, error: error.message });
        await this.sleep(pollInterval);
      }
    }

    throw new Error('歌词任务超时');
  }

  /**
   * 清理已完成的任务
   */
  private cleanupTasks(): void {
    const now = Date.now();
    const cleanupThreshold = 5 * 60 * 1000; // 5分钟

    let cleanedCount = 0;
    for (const [taskId, task] of this.tasks.entries()) {
      if (
        (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.FAILED) &&
        task.completedAt &&
        now - task.completedAt.getTime() > cleanupThreshold
      ) {
        this.tasks.delete(taskId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('清理已完成任务', { cleanedCount, remainingTasks: this.tasks.size });
    }
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 处理任务错误（队列超时等）
   */
  private async handleTaskError(taskId: string, error: any, taskType: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    const errorMessage = error.message || '任务执行失败';

    this.updateTask(taskId, {
      status: TaskStatus.FAILED,
      error: errorMessage,
      completedAt: new Date()
    });

    // 回调通知失败
    if (task.callbackUrl) {
      try {
        await this.callbackService.notifyBackend(task.callbackUrl, {
          taskId: task.id,
          status: 'failed',
          taskType: taskType,
          error: errorMessage
        });
      } catch (callbackError: any) {
        logger.error('回调通知失败', {
          taskId,
          error: callbackError.message
        });
      }
    }
  }
}
