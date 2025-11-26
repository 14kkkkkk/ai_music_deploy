import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';

/**
 * Suno API 客户端服务
 */
export class SunoApiService {
  private apiKey: string;
  private client: AxiosInstance;

  constructor() {
    this.apiKey = process.env.SUNO_API_KEY || '';
    const baseURL = process.env.SUNO_API_BASE_URL || 'https://api.sunoapi.org/api/v1';

    if (!this.apiKey) {
      logger.error('SUNO_API_KEY 未配置');
      throw new Error('SUNO_API_KEY is required');
    }

    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      timeout: 30000
    });

    logger.info('Suno API 已初始化', { baseURL });
  }

  /**
   * 生成音乐
   */
  async generateMusic(params: any): Promise<any> {
    try {
      logger.info('调用 Suno API /generate', { 
        prompt: params.prompt?.substring(0, 50),
        model: params.model 
      });
      
      const response = await this.client.post('/generate', params);
      
      logger.info('Suno API 响应成功', { 
        taskId: response.data?.data?.taskId 
      });
      
      return response.data;
    } catch (error: any) {
      logger.error('生成音乐失败', {
        error: error.response?.data || error.message
      });
      throw new Error(error.response?.data?.msg || 'Failed to generate music');
    }
  }

  /**
   * 生成歌词
   * 注意：歌词接口是 /lyrics 而不是 /generate/lyrics
   */
  async generateLyrics(params: any): Promise<any> {
    try {
      logger.info('调用 Suno API /lyrics', {
        prompt: params.prompt?.substring(0, 50)
      });

      const response = await this.client.post('/lyrics', params);

      logger.info('Suno API 响应成功', {
        taskId: response.data?.data?.taskId
      });

      return response.data;
    } catch (error: any) {
      logger.error('生成歌词失败', {
        error: error.response?.data || error.message
      });
      throw new Error(error.response?.data?.msg || 'Failed to generate lyrics');
    }
  }

  /**
   * 添加人声
   * Suno API 使用 uploadUrl 而不是 audioUrl
   */
  async addVocals(params: any): Promise<any> {
    try {
      // 构建 Suno API 请求参数，将 audioUrl 映射为 uploadUrl
      const sunoParams: any = {
        uploadUrl: params.audioUrl,  // Suno API 使用 uploadUrl
        prompt: params.prompt,
        title: params.title,
        style: params.style,
        negativeTags: params.negativeTags || '',
        model: params.model || 'V4_5PLUS',
        callBackUrl: params.callBackUrl,
      };

      // 添加可选参数
      if (params.vocalGender) {
        sunoParams.vocalGender = params.vocalGender;
      }
      if (typeof params.styleWeight === 'number') {
        sunoParams.styleWeight = params.styleWeight;
      }
      if (typeof params.weirdnessConstraint === 'number') {
        sunoParams.weirdnessConstraint = params.weirdnessConstraint;
      }
      if (typeof params.audioWeight === 'number') {
        sunoParams.audioWeight = params.audioWeight;
      }

      logger.info('调用 Suno API /generate/add-vocals', {
        uploadUrl: params.audioUrl?.substring(0, 50),
        title: params.title,
        style: params.style
      });

      const response = await this.client.post('/generate/add-vocals', sunoParams);

      logger.info('Suno API 响应成功', {
        taskId: response.data?.data?.taskId
      });

      return response.data;
    } catch (error: any) {
      logger.error('添加人声失败', {
        error: error.response?.data || error.message
      });
      throw new Error(error.response?.data?.msg || 'Failed to add vocals');
    }
  }

  /**
   * 添加伴奏
   */
  async addInstrumental(params: any): Promise<any> {
    try {
      logger.info('调用 Suno API /generate/add-instrumental', { 
        audioUrl: params.audioUrl?.substring(0, 50) 
      });
      
      const response = await this.client.post('/generate/add-instrumental', params);
      
      logger.info('Suno API 响应成功', { 
        taskId: response.data?.data?.taskId 
      });
      
      return response.data;
    } catch (error: any) {
      logger.error('添加伴奏失败', {
        error: error.response?.data || error.message
      });
      throw new Error(error.response?.data?.msg || 'Failed to add instrumental');
    }
  }

  /**
   * 查询音乐生成任务详情
   */
  async getTaskDetail(taskId: string): Promise<any> {
    try {
      const response = await this.client.get(`/generate/record-info?taskId=${taskId}`);
      return response.data;
    } catch (error: any) {
      logger.error('查询音乐任务详情失败', {
        taskId,
        error: error.response?.data || error.message
      });
      throw new Error(error.response?.data?.msg || 'Failed to get task detail');
    }
  }

  /**
   * 查询歌词生成任务详情
   */
  async getLyricsTaskDetail(taskId: string): Promise<any> {
    try {
      const response = await this.client.get(`/lyrics/record-info?taskId=${taskId}`);
      return response.data;
    } catch (error: any) {
      logger.error('查询歌词任务详情失败', {
        taskId,
        error: error.response?.data || error.message
      });
      throw new Error(error.response?.data?.msg || 'Failed to get lyrics task detail');
    }
  }
}

