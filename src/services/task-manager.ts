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

    logger.info('TaskManager initialized', {
      concurrency: this.queue.concurrency,
      timeout: '10min'
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
      throw new Error(`Queue is full, current tasks: ${this.queue.size + this.queue.pending}`);
    }

    const task: Task = {
      id: uuidv4(),
      status: TaskStatus.PENDING,
      type: TaskType.MUSIC_GENERATION,
      input: {
        customMode: request.customMode,
        instrumental: request.instrumental,
        model: request.model,
        prompt: request.prompt || '',
        style: request.style || '',
        title: request.title || '',
        negativeTags: request.negativeTags || '',
        // 可选高级参数
        ...(request.personaId && { personaId: request.personaId }),
        ...(request.vocalGender && { vocalGender: request.vocalGender }),
        ...(typeof request.styleWeight === 'number' && { styleWeight: request.styleWeight }),
        ...(typeof request.weirdnessConstraint === 'number' && { weirdnessConstraint: request.weirdnessConstraint }),
        ...(typeof request.audioWeight === 'number' && { audioWeight: request.audioWeight }),
        // 上传音乐参考（自定义模式可选）
        ...(request.referenceType && { referenceType: request.referenceType }),
        ...(request.audioUrl && { audioUrl: request.audioUrl }),
      },
      callbackUrl: request.callbackUrl,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.tasks.set(task.id, task);
    this.queue.add(() => this.processMusicGenerationTask(task.id)).catch((error: any) => {
      logger.error('Music generation task queue error', { taskId: task.id, error: error.message });
      this.handleTaskError(task.id, error, 'MUSIC_GENERATION');
    });

    logger.info('Music generation task created', {
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
      throw new Error(`Queue is full, current tasks: ${this.queue.size + this.queue.pending}`);
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
      logger.error('Lyrics generation task queue error', { taskId: task.id, error: error.message });
      this.handleTaskError(task.id, error, 'LYRICS_GENERATION');
    });

    logger.info('Lyrics generation task created', {
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
      throw new Error(`Queue is full, current tasks: ${this.queue.size + this.queue.pending}`);
    }

    const task: Task = {
      id: uuidv4(),
      status: TaskStatus.PENDING,
      type: TaskType.ADD_VOCALS,
      input: {
        audioUrl: request.audioUrl,
        prompt: request.prompt,
        title: request.title,
        style: request.style,
        negativeTags: request.negativeTags || '',
        model: request.model || 'V4_5PLUS',
        // 可选高级参数
        ...(request.vocalGender && { vocalGender: request.vocalGender }),
        ...(typeof request.styleWeight === 'number' && { styleWeight: request.styleWeight }),
        ...(typeof request.weirdnessConstraint === 'number' && { weirdnessConstraint: request.weirdnessConstraint }),
        ...(typeof request.audioWeight === 'number' && { audioWeight: request.audioWeight }),
      },
      callbackUrl: request.callbackUrl,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.tasks.set(task.id, task);
    this.queue.add(() => this.processAddVocalsTask(task.id)).catch((error: any) => {
      logger.error('Add vocals task queue error', { taskId: task.id, error: error.message });
      this.handleTaskError(task.id, error, 'ADD_VOCALS');
    });

    logger.info('Add vocals task created', {
      taskId: task.id,
      queueSize: this.queue.size
    });

    return task;
  }

  /**
   * 创建添加伴奏任务
   */
  async createAddInstrumentalTask(request: AddInstrumentalRequest): Promise<Task> {
    const maxQueueSize = parseInt(process.env.MAX_QUEUE_SIZE || '2500');
    if (this.queue.size + this.queue.pending >= maxQueueSize) {
      throw new Error(`Queue is full, current tasks: ${this.queue.size + this.queue.pending}`);
    }

    const task: Task = {
      id: uuidv4(),
      status: TaskStatus.PENDING,
      type: TaskType.ADD_INSTRUMENTAL,
      input: {
        audioUrl: request.audioUrl,
        prompt: request.prompt,
        title: request.title,
        style: request.style,
        negativeTags: request.negativeTags || '',
        model: request.model || 'V4_5PLUS',
        // 可选高级参数
        ...(typeof request.styleWeight === 'number' && { styleWeight: request.styleWeight }),
        ...(typeof request.weirdnessConstraint === 'number' && { weirdnessConstraint: request.weirdnessConstraint }),
        ...(typeof request.audioWeight === 'number' && { audioWeight: request.audioWeight }),
      },
      callbackUrl: request.callbackUrl,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.tasks.set(task.id, task);
    this.queue.add(() => this.processAddInstrumentalTask(task.id)).catch((error: any) => {
      logger.error('Add instrumental task queue error', { taskId: task.id, error: error.message });
      this.handleTaskError(task.id, error, 'ADD_INSTRUMENTAL');
    });

    logger.info('Add instrumental task created', {
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
      logger.error('Task not found', { taskId });
      return;
    }

    let sunoTaskId: string = '';

    try {
      // 1. 更新状态为处理中
      this.updateTask(taskId, {
        status: TaskStatus.PROCESSING,
        progress: 10
      });

      logger.info('Processing music generation task', {
        taskId,
        referenceType: task.input.referenceType || 'none'
      });

      // 2. 调用 Suno API 生成音乐（根据 referenceType 选择不同接口）
      this.updateTask(taskId, { progress: 20 });

      let response: any;
      const referenceType = task.input.referenceType;

      if (referenceType === 'add-vocals') {
        // 添加人声
        const params = {
          audioUrl: task.input.audioUrl,
          prompt: task.input.prompt,
          title: task.input.title,
          style: task.input.style,
          negativeTags: task.input.negativeTags || '',
          model: task.input.model || 'V4_5PLUS',
          callBackUrl: `${process.env.CALLBACK_BASE_URL}/api/music/callback/music-internal/${taskId}`,
          ...(task.input.vocalGender && { vocalGender: task.input.vocalGender }),
          ...(typeof task.input.styleWeight === 'number' && { styleWeight: task.input.styleWeight }),
          ...(typeof task.input.weirdnessConstraint === 'number' && { weirdnessConstraint: task.input.weirdnessConstraint }),
          ...(typeof task.input.audioWeight === 'number' && { audioWeight: task.input.audioWeight }),
        };
        response = await this.sunoApi.addVocals(params);
      } else if (referenceType === 'add-instrumental') {
        // 添加伴奏
        const params = {
          audioUrl: task.input.audioUrl,
          prompt: task.input.prompt,
          title: task.input.title,
          style: task.input.style,
          negativeTags: task.input.negativeTags || '',
          model: task.input.model || 'V4_5PLUS',
          callBackUrl: `${process.env.CALLBACK_BASE_URL}/api/music/callback/music-internal/${taskId}`,
          ...(typeof task.input.styleWeight === 'number' && { styleWeight: task.input.styleWeight }),
          ...(typeof task.input.weirdnessConstraint === 'number' && { weirdnessConstraint: task.input.weirdnessConstraint }),
          ...(typeof task.input.audioWeight === 'number' && { audioWeight: task.input.audioWeight }),
        };
        response = await this.sunoApi.addInstrumental(params);
      } else if (referenceType === 'extend') {
        // 延长音乐 - TODO: 需要确认 Suno API 的延长接口
        const params = {
          ...task.input,
          callBackUrl: `${process.env.CALLBACK_BASE_URL}/api/music/callback/music-internal/${taskId}`
        };
        response = await this.sunoApi.generateMusic(params);
      } else {
        // 普通音乐生成
        const params = {
          ...task.input,
          callBackUrl: `${process.env.CALLBACK_BASE_URL}/api/music/callback/music-internal/${taskId}`
        };
        response = await this.sunoApi.generateMusic(params);
      }

      if (response.code !== 200 || !response.data?.taskId) {
        throw new Error(response.msg || 'Suno API call failed');
      }

      sunoTaskId = response.data.taskId;
      this.updateTask(taskId, { progress: 30 });

      // 3. 轮询等待任务完成
      logger.info('Start polling task status', { taskId, sunoTaskId });
      const result = await this.pollTaskUntilComplete(sunoTaskId);

      this.updateTask(taskId, { progress: 70 });

      logger.info('Music polling result', {
        taskId,
        resultKeys: Object.keys(result || {}),
        hasResponse: !!result?.response,
        responseType: typeof result?.response
      });

      // 4. 上传音频到 OSS
      // pollTaskUntilComplete 返回 result.data，其结构为:
      // { taskId, param, response, status, type, errorCode, errorMessage }
      // 音频数据在 response 字段里
      let audioList: any[] | undefined;

      // 尝试从 response 字段获取数据
      let responseData = result?.response;

      logger.info('Music raw response data', {
        taskId,
        responseDataType: typeof responseData,
        responseDataPreview: typeof responseData === 'string'
          ? responseData.substring(0, 300)
          : JSON.stringify(responseData)?.substring(0, 300)
      });

      if (typeof responseData === 'string') {
        try {
          responseData = JSON.parse(responseData);
          logger.info('Parse response string success', { taskId });
        } catch (e) {
          logger.warn('Parse response string failed', { taskId });
        }
      }

      // response 可能是多种结构：
      // 1. 直接是数组 [...]
      // 2. {data: [...]}
      // 3. {taskId: ..., data: [...]}
      // 4. {taskId: ..., sunoData: [...]}  ← Suno API 实际返回的格式
      if (Array.isArray(responseData)) {
        audioList = responseData;
        logger.info('Music data from responseData array', { taskId });
      } else if (responseData?.sunoData && Array.isArray(responseData.sunoData)) {
        // Suno API 返回的实际格式：{taskId, sunoData: [...]}
        audioList = responseData.sunoData;
        logger.info('Music data from responseData.sunoData', { taskId });
      } else if (responseData?.data && Array.isArray(responseData.data)) {
        audioList = responseData.data;
        logger.info('Music data from responseData.data', { taskId });
      } else if (Array.isArray(result?.data)) {
        // 兼容其他格式：result.data 直接是数组
        audioList = result.data;
        logger.info('Music data from result.data', { taskId });
      } else if (result?.data?.data && Array.isArray(result.data.data)) {
        // 兼容其他格式：result.data.data 是数组
        audioList = result.data.data;
        logger.info('Music data from result.data.data', { taskId });
      } else {
        logger.warn('Music array data not found', {
          taskId,
          responseDataIsArray: Array.isArray(responseData),
          responseDataKeys: responseData ? Object.keys(responseData) : [],
          responseDataHasData: !!responseData?.data,
          responseDataHasSunoData: !!responseData?.sunoData,
          resultHasData: !!result?.data
        });
      }

      logger.info('Parsed music data', {
        taskId,
        hasData: !!audioList,
        dataLength: audioList?.length,
        firstItem: audioList?.[0] ? {
          title: audioList[0].title,
          hasAudioUrl: !!(audioList[0].audio_url || audioList[0].audioUrl)
        } : null
      });

      if (audioList && Array.isArray(audioList) && audioList.length > 0) {
        const rawAudioData = audioList[0];

        // 统一字段名：Suno API 返回的是驼峰命名（audioUrl），需要转换为下划线命名（audio_url）
        const audioData = {
          audio_url: rawAudioData.audio_url || rawAudioData.audioUrl,
          image_url: rawAudioData.image_url || rawAudioData.imageUrl,
          duration: rawAudioData.duration,
          title: rawAudioData.title,
          id: rawAudioData.id,
          // 保留原始数据
          ...rawAudioData
        };

        if (audioData.audio_url) {
          // 下载音频文件并上传到 OSS
          logger.info('Start uploading audio to OSS', { taskId, audioUrl: audioData.audio_url });
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

          logger.info('Music generation task completed', { taskId, ossFileName });

          // 5. 回调通知后端
          if (task.callbackUrl) {
            const musicResult = {
              audio_url: audioData.audio_url,
              ossFileName,
              duration: audioData.duration,
              title: audioData.title || task.input.title || '',
              image_url: audioData.image_url
            };
            await this.callbackService.notifyBackend(task.callbackUrl, {
              taskId: task.id,
              status: 'success',
              taskType: 'MUSIC_GENERATION',
              result: musicResult,
              data: musicResult,  // 兼容中台期望的 data 字段
              metadata: {
                type: 'music',
                prompt: task.input.prompt || '',
                model: task.input.model || '',
                customMode: task.input.customMode ?? false,
                instrumental: task.input.instrumental ?? false,
                style: task.input.style || '',
                title: task.input.title || '',
                referenceType: task.input.referenceType || '',
                audioUrl: task.input.audioUrl || ''
              }
            });
          }
        } else {
          throw new Error('Audio URL not found');
        }
      } else {
        throw new Error('Failed to get audio data');
      }

    } catch (error: any) {
      logger.error('Music generation task failed', {
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
          error: error.message,
          metadata: {
            type: 'music',
            prompt: task.input.prompt || '',
            model: task.input.model || '',
            customMode: task.input.customMode ?? false,
            instrumental: task.input.instrumental ?? false,
            style: task.input.style || '',
            title: task.input.title || '',
            referenceType: task.input.referenceType || '',
            audioUrl: task.input.audioUrl || ''
          }
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
        throw new Error(response.msg || 'Suno API call failed');
      }

      const sunoTaskId = response.data.taskId;
      this.updateTask(taskId, { progress: 40 });

      // 轮询等待歌词任务完成
      const result = await this.pollLyricsTaskUntilComplete(sunoTaskId);

      logger.info('Lyrics polling result', {
        taskId,
        resultKeys: Object.keys(result || {}),
        hasResponse: !!result?.response,
        responseType: typeof result?.response,
        fullResult: JSON.stringify(result).substring(0, 500)
      });

      // 解析歌词数据 - result 结构是 {taskId, param, response, status, ...}
      // 歌词数据在 response 字段里，可能是字符串(JSON)或对象
      let lyricsData: any[] = [];

      // 尝试从 response 字段获取数据
      let responseData = result?.response;
      logger.info('Lyrics raw response data', {
        taskId,
        responseDataType: typeof responseData,
        responseDataPreview: typeof responseData === 'string'
          ? responseData.substring(0, 200)
          : JSON.stringify(responseData)?.substring(0, 200)
      });

      if (typeof responseData === 'string') {
        try {
          responseData = JSON.parse(responseData);
          logger.info('Parse response string success', { taskId });
        } catch (e) {
          logger.warn('Parse response string failed', { taskId, response: responseData?.substring(0, 100) });
        }
      }

      // response 可能是 {data: [...]} 或直接是数组
      if (Array.isArray(responseData)) {
        lyricsData = responseData;
        logger.info('Lyrics data from responseData array', { taskId });
      } else if (responseData?.data && Array.isArray(responseData.data)) {
        lyricsData = responseData.data;
        logger.info('Lyrics data from responseData.data', { taskId });
      } else if (result?.data && Array.isArray(result.data)) {
        // 兼容其他格式
        lyricsData = result.data;
        logger.info('Lyrics data from result.data', { taskId });
      } else {
        logger.warn('Lyrics array data not found', {
          taskId,
          responseDataIsArray: Array.isArray(responseData),
          responseDataHasData: !!responseData?.data,
          resultHasData: !!result?.data
        });
      }

      logger.info('Parsed lyrics data', {
        taskId,
        lyricsCount: lyricsData.length,
        firstItem: lyricsData[0] ? { text: lyricsData[0].text?.substring(0, 50), title: lyricsData[0].title } : null
      });

      const firstLyrics = lyricsData[0] || {};
      const lyricsText = firstLyrics.text || '';
      const lyricsTitle = firstLyrics.title || '';

      this.updateTask(taskId, {
        status: TaskStatus.COMPLETED,
        progress: 100,
        output: {
          lyrics: lyricsText,
          title: lyricsTitle,
          allResults: lyricsData  // 保留所有结果供需要时使用
        },
        completedAt: new Date()
      });

      logger.info('Lyrics generation task completed', { taskId });

      // 回调通知后端
      if (task.callbackUrl) {
        const lyricsResult = {
          lyrics: lyricsText,
          title: lyricsTitle
        };
        await this.callbackService.notifyBackend(task.callbackUrl, {
          taskId: task.id,
          status: 'success',
          taskType: 'LYRICS_GENERATION',
          result: lyricsResult,
          data: lyricsResult,  // 兼容中台期望的 data 字段
          metadata: {
            type: 'lyrics',
            prompt: task.input.prompt || ''
          }
        });
      }

    } catch (error: any) {
      logger.error('Lyrics generation task failed', {
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
          error: error.message,
          metadata: {
            type: 'lyrics',
            prompt: task.input.prompt || ''
          }
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

      const params: any = {
        audioUrl: task.input.audioUrl,
        prompt: task.input.prompt,
        title: task.input.title,
        style: task.input.style,
        negativeTags: task.input.negativeTags || '',
        model: task.input.model || 'V4_5PLUS',
        callBackUrl: `${process.env.CALLBACK_BASE_URL}/api/music/callback/vocals-internal/${taskId}`
      };

      // 添加可选参数
      if (task.input.vocalGender) {
        params.vocalGender = task.input.vocalGender;
      }
      if (typeof task.input.styleWeight === 'number') {
        params.styleWeight = task.input.styleWeight;
      }
      if (typeof task.input.weirdnessConstraint === 'number') {
        params.weirdnessConstraint = task.input.weirdnessConstraint;
      }
      if (typeof task.input.audioWeight === 'number') {
        params.audioWeight = task.input.audioWeight;
      }

      const response = await this.sunoApi.addVocals(params);

      if (response.code !== 200 || !response.data?.taskId) {
        throw new Error(response.msg || 'Suno API call failed');
      }

      const sunoTaskId = response.data.taskId;
      this.updateTask(taskId, { progress: 40 });

      // 轮询等待任务完成
      const result = await this.pollTaskUntilComplete(sunoTaskId);
      this.updateTask(taskId, { progress: 70 });

      logger.info('Add vocals polling result', {
        taskId,
        resultKeys: Object.keys(result || {}),
        hasResponse: !!result?.response
      });

      // 上传音频到 OSS - 解析数据结构
      // result 结构为 {taskId, param, response, status, ...}，数据在 response 字段
      let audioList: any[] | undefined;

      let responseData = result?.response;
      if (typeof responseData === 'string') {
        try {
          responseData = JSON.parse(responseData);
        } catch (e) {
          logger.warn('Parse response string failed', { taskId });
        }
      }

      // 支持多种数据结构：data, sunoData 等
      if (Array.isArray(responseData)) {
        audioList = responseData;
      } else if (responseData?.sunoData && Array.isArray(responseData.sunoData)) {
        audioList = responseData.sunoData;
      } else if (responseData?.data && Array.isArray(responseData.data)) {
        audioList = responseData.data;
      } else if (Array.isArray(result?.data)) {
        audioList = result.data;
      } else if (result?.data?.data && Array.isArray(result.data.data)) {
        audioList = result.data.data;
      }

      logger.info('Parsed vocals data', {
        taskId,
        hasData: !!audioList,
        dataLength: audioList?.length
      });

      if (audioList && audioList.length > 0) {
        const rawAudioData = audioList[0];

        // 统一字段名：驼峰命名转下划线命名
        const audioData = {
          audio_url: rawAudioData.audio_url || rawAudioData.audioUrl,
          image_url: rawAudioData.image_url || rawAudioData.imageUrl,
          duration: rawAudioData.duration,
          title: rawAudioData.title,
          id: rawAudioData.id,
          ...rawAudioData
        };

        if (audioData.audio_url) {
          // 下载音频文件并上传到 OSS
          logger.info('Start uploading audio to OSS', { taskId, audioUrl: audioData.audio_url });
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

          logger.info('Add vocals task completed', { taskId, ossFileName });

          if (task.callbackUrl) {
            const vocalsResult = {
              audio_url: audioData.audio_url,
              ossFileName,
              duration: audioData.duration,
              title: audioData.title || task.input.title || '',
              image_url: audioData.image_url
            };
            await this.callbackService.notifyBackend(task.callbackUrl, {
              taskId: task.id,
              status: 'success',
              taskType: 'ADD_VOCALS',
              result: vocalsResult,
              data: vocalsResult,  // 兼容中台期望的 data 字段
              metadata: {
                type: 'vocals',
                prompt: task.input.prompt || '',
                audioUrl: task.input.audioUrl || '',
                title: task.input.title || '',
                style: task.input.style || ''
              }
            });
          }
        } else {
          throw new Error('Audio URL not found');
        }
      } else {
        throw new Error('Failed to get audio data');
      }

    } catch (error: any) {
      logger.error('Add vocals task failed', {
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
          error: error.message,
          metadata: {
            type: 'vocals',
            prompt: task.input.prompt || '',
            audioUrl: task.input.audioUrl || '',
            title: task.input.title || '',
            style: task.input.style || ''
          }
        });
      }
    }
  }

  /**
   * 处理添加伴奏任务
   */
  private async processAddInstrumentalTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    try {
      this.updateTask(taskId, {
        status: TaskStatus.PROCESSING,
        progress: 20
      });

      const params: any = {
        audioUrl: task.input.audioUrl,
        prompt: task.input.prompt,
        title: task.input.title,
        style: task.input.style,
        negativeTags: task.input.negativeTags || '',
        model: task.input.model || 'V4_5PLUS',
        callBackUrl: `${process.env.CALLBACK_BASE_URL}/api/music/callback/instrumental-internal/${taskId}`
      };

      // 添加可选参数
      if (typeof task.input.styleWeight === 'number') {
        params.styleWeight = task.input.styleWeight;
      }
      if (typeof task.input.weirdnessConstraint === 'number') {
        params.weirdnessConstraint = task.input.weirdnessConstraint;
      }
      if (typeof task.input.audioWeight === 'number') {
        params.audioWeight = task.input.audioWeight;
      }

      const response = await this.sunoApi.addInstrumental(params);

      if (response.code !== 200 || !response.data?.taskId) {
        throw new Error(response.msg || 'Suno API call failed');
      }

      const sunoTaskId = response.data.taskId;
      this.updateTask(taskId, { progress: 40 });

      // 轮询等待任务完成
      const result = await this.pollTaskUntilComplete(sunoTaskId);
      this.updateTask(taskId, { progress: 70 });

      logger.info('Add instrumental polling result', {
        taskId,
        resultKeys: Object.keys(result || {}),
        hasResponse: !!result?.response
      });

      // 上传音频到 OSS - 解析数据结构
      let audioList: any[] | undefined;

      let responseData = result?.response;
      if (typeof responseData === 'string') {
        try {
          responseData = JSON.parse(responseData);
        } catch (e) {
          logger.warn('Parse response string failed', { taskId });
        }
      }

      // 支持多种数据结构：data, sunoData 等
      if (Array.isArray(responseData)) {
        audioList = responseData;
      } else if (responseData?.sunoData && Array.isArray(responseData.sunoData)) {
        audioList = responseData.sunoData;
      } else if (responseData?.data && Array.isArray(responseData.data)) {
        audioList = responseData.data;
      } else if (Array.isArray(result?.data)) {
        audioList = result.data;
      } else if (result?.data?.data && Array.isArray(result.data.data)) {
        audioList = result.data.data;
      }

      logger.info('Parsed instrumental data', {
        taskId,
        hasData: !!audioList,
        dataLength: audioList?.length
      });

      if (audioList && audioList.length > 0) {
        const rawAudioData = audioList[0];

        // 统一字段名：驼峰命名转下划线命名
        const audioData = {
          audio_url: rawAudioData.audio_url || rawAudioData.audioUrl,
          image_url: rawAudioData.image_url || rawAudioData.imageUrl,
          duration: rawAudioData.duration,
          title: rawAudioData.title,
          id: rawAudioData.id,
          ...rawAudioData
        };

        if (audioData.audio_url) {
          // 下载音频文件并上传到 OSS
          logger.info('Start uploading audio to OSS', { taskId, audioUrl: audioData.audio_url });
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

          logger.info('Add instrumental task completed', { taskId, ossFileName });

          // 回调通知后端
          if (task.callbackUrl) {
            const instrumentalResult = {
              audio_url: audioData.audio_url,
              ossFileName,
              duration: audioData.duration,
              title: audioData.title || task.input.title || '',
              image_url: audioData.image_url
            };
            await this.callbackService.notifyBackend(task.callbackUrl, {
              taskId: task.id,
              status: 'success',
              taskType: 'ADD_INSTRUMENTAL',
              result: instrumentalResult,
              data: instrumentalResult,  // 兼容中台期望的 data 字段
              metadata: {
                type: 'instrumental',
                prompt: task.input.prompt || '',
                audioUrl: task.input.audioUrl || '',
                title: task.input.title || '',
                style: task.input.style || ''
              }
            });
          }
        } else {
          throw new Error('Audio URL not found');
        }
      } else {
        throw new Error('Failed to get audio data');
      }

    } catch (error: any) {
      logger.error('Add instrumental task failed', {
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
          taskType: 'ADD_INSTRUMENTAL',
          error: error.message,
          metadata: {
            type: 'instrumental',
            prompt: task.input.prompt || '',
            audioUrl: task.input.audioUrl || '',
            title: task.input.title || '',
            style: task.input.style || ''
          }
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
            logger.info('Suno music task completed', { sunoTaskId });
            return result.data;
          } else if (status === 'FAILED') {
            throw new Error('Suno task failed');
          }

          // 继续轮询
          logger.info('Suno music task processing', {
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
        logger.warn('Query music task status failed, retrying', { sunoTaskId, attempt, error: error.message });
        await this.sleep(pollInterval);
      }
    }

    throw new Error('Task timeout');
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
            logger.info('Suno lyrics task completed', { sunoTaskId });
            return result.data;
          } else if (status === 'FAILED') {
            throw new Error('Suno lyrics task failed');
          }

          // 继续轮询
          logger.info('Suno lyrics task processing', {
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
        logger.warn('Query lyrics task status failed, retrying', { sunoTaskId, attempt, error: error.message });
        await this.sleep(pollInterval);
      }
    }

    throw new Error('Lyrics task timeout');
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
      logger.info('Cleanup completed tasks', { cleanedCount, remainingTasks: this.tasks.size });
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

    const errorMessage = error.message || 'Task execution failed';

    this.updateTask(taskId, {
      status: TaskStatus.FAILED,
      error: errorMessage,
      completedAt: new Date()
    });

    // 根据任务类型构建 metadata
    let metadata: any = { type: 'unknown', prompt: '' };
    if (taskType === 'MUSIC_GENERATION') {
      metadata = {
        type: 'music',
        prompt: task.input.prompt || '',
        model: task.input.model || '',
        customMode: task.input.customMode ?? false,
        instrumental: task.input.instrumental ?? false,
        style: task.input.style || '',
        title: task.input.title || ''
      };
    } else if (taskType === 'LYRICS_GENERATION') {
      metadata = {
        type: 'lyrics',
        prompt: task.input.prompt || ''
      };
    } else if (taskType === 'ADD_VOCALS') {
      metadata = {
        type: 'vocals',
        prompt: task.input.prompt || '',
        audioUrl: task.input.audioUrl || ''
      };
    }

    // 回调通知失败
    if (task.callbackUrl) {
      try {
        await this.callbackService.notifyBackend(task.callbackUrl, {
          taskId: task.id,
          status: 'failed',
          taskType: taskType,
          error: errorMessage,
          metadata
        });
      } catch (callbackError: any) {
        logger.error('Callback notification failed', {
          taskId,
          error: callbackError.message
        });
      }
    }
  }
}
