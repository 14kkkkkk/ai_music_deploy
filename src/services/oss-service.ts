import axios from 'axios';
import { logger } from '../utils/logger';
import { httpsRequestNoSNI } from '../utils/https-no-sni';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { v4 as uuidv4 } from 'uuid';
import { URL } from 'url';

/**
 * OSS上传服务 - 负责文件上传到OSS
 */
export class OSSService {
  private signedUrlApi: string;
  private uploadTimeout: number;
  private tempDir: string;

  constructor() {
    this.signedUrlApi = process.env.OSS_SIGNED_URL_API || 'https://ai.mediaio.net/api/v1/ai/signed-upload-url';
    this.uploadTimeout = parseInt(process.env.OSS_UPLOAD_TIMEOUT || '60000', 10);
    this.tempDir = process.env.TEMP_DIR || './temp_audio';

    // 确保临时目录存在
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }

    logger.info('OSS Service 初始化完成', {
      signedUrlApi: this.signedUrlApi,
      uploadTimeout: `${this.uploadTimeout}ms`
    });
  }

  /**
   * 获取预签名上传URL
   * 使用自定义 HTTPS 请求（无 SNI）来解决 ECONNRESET 问题
   */
  private async getSignedUploadUrl(fileName: string): Promise<string> {
    try {
      logger.info('请求签名上传URL', { fileName });

      // 构造完整的 URL（使用 GET 请求 + 查询参数）
      const url = `${this.signedUrlApi}?fileName=${encodeURIComponent(fileName)}`;

      // 使用无 SNI 的 HTTPS 请求
      const response = await httpsRequestNoSNI(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      // 检查状态码
      if (response.statusCode !== 200) {
        throw new Error(`HTTP ${response.statusCode}: ${response.body}`);
      }

      // 获取签名 URL
      const signedUrl = response.json?.signedUrl;

      if (!signedUrl) {
        throw new Error('签名URL响应中缺少signedUrl字段');
      }

      logger.info('获取签名URL成功', { fileName, signedUrl: signedUrl.substring(0, 50) + '...' });
      return signedUrl;

    } catch (error: any) {
      logger.error('获取签名URL失败', { fileName, error: error.message });
      throw new Error(`获取签名URL失败: ${error.message}`);
    }
  }

  /**
   * 使用原生 https 模块上传文件到 OSS
   */
  private async uploadToOSS(signedUrl: string, filePath: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(filePath)) {
        reject(new Error(`文件不存在: ${filePath}`));
        return;
      }

      const fileStats = fs.statSync(filePath);
      const fileSize = fileStats.size;
      const urlObj = new URL(signedUrl);
      const isHttps = urlObj.protocol === 'https:';
      const httpModule = isHttps ? https : http;
      const fileStream = fs.createReadStream(filePath);

      const options = {
        method: 'PUT',
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        headers: {
          'Content-Length': fileSize
        }
      };

      logger.info('开始上传到 OSS', {
        hostname: urlObj.hostname,
        sizeMB: (fileSize / 1024 / 1024).toFixed(2) + ' MB'
      });

      const req = httpModule.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => { responseData += chunk.toString(); });
        res.on('end', () => {
          if (res.statusCode === 200) {
            logger.info('OSS 上传成功');
            resolve(true);
          } else {
            logger.error('OSS 上传失败', { statusCode: res.statusCode });
            reject(new Error(`上传失败，状态码: ${res.statusCode}`));
          }
        });
      });

      req.on('error', (error) => {
        logger.error('OSS 上传请求错误', { error: error.message });
        reject(error);
      });

      fileStream.pipe(req);
    });
  }

  /**
   * 从URL下载文件并上传到OSS
   */
  async downloadAndUploadToOSS(audioUrl: string): Promise<string> {
    const fileExtension = path.extname(new URL(audioUrl).pathname) || '.mp3';
    const tempFilePath = path.join(this.tempDir, `temp_${Date.now()}${fileExtension}`);

    try {
      // 1. 下载文件
      logger.info('开始下载音频文件', { audioUrl: audioUrl.substring(0, 100) });
      const response = await axios.get(audioUrl, {
        responseType: 'stream',
        timeout: this.uploadTimeout
      });

      const writer = fs.createWriteStream(tempFilePath);
      response.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', () => resolve());
        writer.on('error', reject);
      });

      const fileSize = fs.statSync(tempFilePath).size;
      logger.info('音频文件下载完成', {
        tempFilePath,
        size: fileSize,
        sizeMB: (fileSize / 1024 / 1024).toFixed(2) + ' MB'
      });

      // 2. 生成唯一文件名
      const fileName = `${uuidv4()}${fileExtension}`;
      logger.info('生成文件名', { fileName });

      // 3. 获取预签名URL
      const signedUrl = await this.getSignedUploadUrl(fileName);

      // 4. 上传到OSS
      await this.uploadToOSS(signedUrl, tempFilePath);

      logger.info('✅ 音频文件上传OSS成功', { fileName });
      return fileName;
    } finally {
      // 清理临时文件
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
        logger.info('临时文件已删除', { tempFilePath });
      }
    }
  }
}

