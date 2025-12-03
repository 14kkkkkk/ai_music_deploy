import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';

/**
 * Suno API Client Service
 */
export class SunoApiService {
  private apiKey: string;
  private client: AxiosInstance;

  constructor() {
    this.apiKey = process.env.SUNO_API_KEY || '';
    const baseURL = process.env.SUNO_API_BASE_URL || 'https://api.sunoapi.org/api/v1';

    if (!this.apiKey) {
      logger.error('SUNO_API_KEY not configured');
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

    logger.info('Suno API initialized', { baseURL });
  }

  /**
   * Generate music
   */
  async generateMusic(params: any): Promise<any> {
    try {
      logger.info('Call Suno API /generate', {
        prompt: params.prompt?.substring(0, 50),
        model: params.model
      });

      const response = await this.client.post('/generate', params);

      logger.info('Suno API response success', {
        taskId: response.data?.data?.taskId
      });

      return response.data;
    } catch (error: any) {
      logger.error('Generate music failed', {
        error: error.response?.data || error.message
      });
      throw new Error(error.response?.data?.msg || 'Failed to generate music');
    }
  }

  /**
   * Generate lyrics
   * Note: lyrics endpoint is /lyrics not /generate/lyrics
   */
  async generateLyrics(params: any): Promise<any> {
    try {
      logger.info('Call Suno API /lyrics', {
        prompt: params.prompt?.substring(0, 50)
      });

      const response = await this.client.post('/lyrics', params);

      logger.info('Suno API response success', {
        taskId: response.data?.data?.taskId
      });

      return response.data;
    } catch (error: any) {
      logger.error('Generate lyrics failed', {
        error: error.response?.data || error.message
      });
      throw new Error(error.response?.data?.msg || 'Failed to generate lyrics');
    }
  }

  /**
   * Add vocals
   * Suno API uses uploadUrl instead of audioUrl
   */
  async addVocals(params: any): Promise<any> {
    try {
      // Build Suno API request params, map audioUrl to uploadUrl
      const sunoParams: any = {
        uploadUrl: params.audioUrl,  // Suno API uses uploadUrl
        prompt: params.prompt,
        title: params.title,
        style: params.style,
        negativeTags: params.negativeTags || '',
        model: params.model || 'V4_5PLUS',
        callBackUrl: params.callBackUrl,
      };

      // Add optional params
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

      logger.info('Call Suno API /generate/add-vocals', {
        uploadUrl: params.audioUrl?.substring(0, 50),
        title: params.title,
        style: params.style
      });

      const response = await this.client.post('/generate/add-vocals', sunoParams);

      logger.info('Suno API response success', {
        taskId: response.data?.data?.taskId
      });

      return response.data;
    } catch (error: any) {
      logger.error('Add vocals failed', {
        error: error.response?.data || error.message
      });
      throw new Error(error.response?.data?.msg || 'Failed to add vocals');
    }
  }

  /**
   * Add instrumental
   * Suno API uses uploadUrl instead of audioUrl
   */
  async addInstrumental(params: any): Promise<any> {
    try {
      // Build Suno API request params, map audioUrl to uploadUrl
      const sunoParams: any = {
        uploadUrl: params.audioUrl,  // Suno API uses uploadUrl
        prompt: params.prompt,
        title: params.title,
        style: params.style,
        negativeTags: params.negativeTags || '',
        model: params.model || 'V4_5PLUS',
        callBackUrl: params.callBackUrl,
      };

      // Add optional params
      if (typeof params.styleWeight === 'number') {
        sunoParams.styleWeight = params.styleWeight;
      }
      if (typeof params.weirdnessConstraint === 'number') {
        sunoParams.weirdnessConstraint = params.weirdnessConstraint;
      }
      if (typeof params.audioWeight === 'number') {
        sunoParams.audioWeight = params.audioWeight;
      }

      logger.info('Call Suno API /generate/add-instrumental', {
        uploadUrl: params.audioUrl?.substring(0, 50),
        title: params.title,
        style: params.style
      });

      const response = await this.client.post('/generate/add-instrumental', sunoParams);

      logger.info('Suno API response success', {
        taskId: response.data?.data?.taskId
      });

      return response.data;
    } catch (error: any) {
      logger.error('Add instrumental failed', {
        error: error.response?.data || error.message
      });
      throw new Error(error.response?.data?.msg || 'Failed to add instrumental');
    }
  }

  /**
   * Query music generation task detail
   */
  async getTaskDetail(taskId: string): Promise<any> {
    try {
      const response = await this.client.get(`/generate/record-info?taskId=${taskId}`);
      return response.data;
    } catch (error: any) {
      logger.error('Query music task detail failed', {
        taskId,
        error: error.response?.data || error.message
      });
      throw new Error(error.response?.data?.msg || 'Failed to get task detail');
    }
  }

  /**
   * Query lyrics generation task detail
   */
  async getLyricsTaskDetail(taskId: string): Promise<any> {
    try {
      const response = await this.client.get(`/lyrics/record-info?taskId=${taskId}`);
      return response.data;
    } catch (error: any) {
      logger.error('Query lyrics task detail failed', {
        taskId,
        error: error.response?.data || error.message
      });
      throw new Error(error.response?.data?.msg || 'Failed to get lyrics task detail');
    }
  }
}

