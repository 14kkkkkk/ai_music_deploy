import axios from 'axios';
import { logger } from '../utils/logger';
import { CallbackPayload } from '../types/task';

/**
 * Callback Service - Notify backend when task is completed
 */
export class CallbackService {
  private callbackTimeout: number;

  constructor() {
    this.callbackTimeout = parseInt(process.env.CALLBACK_TIMEOUT || '60000', 10);

    logger.info('Callback Service initialized', {
      timeout: `${this.callbackTimeout}ms`
    });
  }

  /**
   * Notify backend when task is completed
   */
  async notifyBackend(callbackUrl: string, payload: CallbackPayload): Promise<void> {
    if (!callbackUrl) {
      logger.warn('Callback URL is empty, skipping callback');
      return;
    }

    logger.info('Start callback to backend', {
      url: callbackUrl,
      taskId: payload.taskId,
      status: payload.status,
      hasResult: !!payload.result,
      resultKeys: payload.result ? Object.keys(payload.result) : [],
      hasMetadata: !!payload.metadata
    });

    // Print full callback content for debugging
    logger.info('AI Music callback payload', payload);

    try {
      const startTime = Date.now();
      const response = await axios.post(callbackUrl, payload, {
        timeout: this.callbackTimeout,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AI-Music-Service/1.0'
        }
      });
      const duration = Date.now() - startTime;

      logger.info('Callback to backend success', {
        taskId: payload.taskId,
        statusCode: response.status,
        duration: `${duration}ms`
      });

    } catch (error: any) {
      logger.error('Callback to backend failed', {
        taskId: payload.taskId,
        error: error.message,
        code: error.code,
        statusCode: error.response?.status
      });
      // Callback failure does not affect task status, only log
    }
  }
}

