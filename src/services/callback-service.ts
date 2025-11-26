import axios from 'axios';
import { logger } from '../utils/logger';
import { CallbackPayload } from '../types/task';

/**
 * 回调服务 - 负责通知后端任务完成
 */
export class CallbackService {
  private callbackTimeout: number;

  constructor() {
    this.callbackTimeout = parseInt(process.env.CALLBACK_TIMEOUT || '60000', 10);

    logger.info('Callback Service 初始化完成', {
      timeout: `${this.callbackTimeout}ms`
    });
  }

  /**
   * 通知后端任务完成
   */
  async notifyBackend(callbackUrl: string, payload: CallbackPayload): Promise<void> {
    if (!callbackUrl) {
      logger.warn('回调URL为空，跳过回调');
      return;
    }

    logger.info('开始回调后端', {
      url: callbackUrl,
      taskId: payload.taskId,
      status: payload.status
    });

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

      logger.info('回调后端成功', {
        taskId: payload.taskId,
        statusCode: response.status,
        duration: `${duration}ms`
      });

    } catch (error: any) {
      logger.error('回调后端失败', {
        taskId: payload.taskId,
        error: error.message,
        code: error.code,
        statusCode: error.response?.status
      });
      // 回调失败不影响任务状态，只记录日志
    }
  }
}

