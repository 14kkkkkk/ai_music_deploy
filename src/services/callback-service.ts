import axios from 'axios';
import { logger } from '../utils/logger';
import { CallbackPayload } from '../types/task';

/**
 * 回调服务 - 负责通知后端任务完成
 */
export class CallbackService {
  private callbackTimeout: number;
  private maxRetries: number;
  private retryDelay: number;

  constructor() {
    this.callbackTimeout = parseInt(process.env.CALLBACK_TIMEOUT || '10000', 10);
    this.maxRetries = parseInt(process.env.CALLBACK_MAX_RETRIES || '3', 10);
    this.retryDelay = parseInt(process.env.CALLBACK_RETRY_DELAY || '2000', 10);

    logger.info('Callback Service 初始化完成', {
      timeout: `${this.callbackTimeout}ms`,
      maxRetries: this.maxRetries
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

    // 带重试的回调
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
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
          duration: `${duration}ms`,
          attempt: attempt > 1 ? `第${attempt}次尝试` : '首次尝试'
        });

        return; // 成功后直接返回

      } catch (error: any) {
        const isLastAttempt = attempt === this.maxRetries;

        const errorDetails = {
          taskId: payload.taskId,
          attempt: `${attempt}/${this.maxRetries}`,
          error: error.message,
          code: error.code,
          statusCode: error.response?.status
        };

        if (!isLastAttempt) {
          logger.warn('回调后端失败，准备重试', errorDetails);
          await this.sleep(this.retryDelay * attempt); // 指数退避
          continue;
        }

        // 最后一次尝试失败
        logger.error('回调后端失败（已重试多次）', errorDetails);
        // 回调失败不影响任务状态，只记录日志
      }
    }
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

