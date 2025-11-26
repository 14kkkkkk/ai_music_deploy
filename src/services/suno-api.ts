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
   */
  async generateLyrics(params: any): Promise<any> {
    try {
      logger.info('调用 Suno API /generate/lyrics', { 
        prompt: params.prompt?.substring(0, 50) 
      });
      
      const response = await this.client.post('/generate/lyrics', params);
      
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
   */
  async addVocals(params: any): Promise<any> {
    try {
      logger.info('调用 Suno API /generate/add-vocals', { 
        audioUrl: params.audioUrl?.substring(0, 50) 
      });
      
      const response = await this.client.post('/generate/add-vocals', params);
      
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
   * 查询任务详情
   */
  async getTaskDetail(taskId: string): Promise<any> {
    try {
      const response = await this.client.get(`/generate/detail?taskId=${taskId}`);
      return response.data;
    } catch (error: any) {
      logger.error('查询任务详情失败', {
        taskId,
        error: error.response?.data || error.message
      });
      throw new Error(error.response?.data?.msg || 'Failed to get task detail');
    }
  }
}

