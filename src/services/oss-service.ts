import axios from 'axios';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import * as crypto from 'crypto';
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
   * 生成文件的 MD5 哈希值作为文件名
   */
  private async generateMD5FileName(filePath: string, fileExtension: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('md5');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => {
        const md5Hash = hash.digest('hex');
        const fileName = `${md5Hash}${fileExtension}`;
        logger.info('生成MD5文件名', { fileName, md5: md5Hash });
        resolve(fileName);
      });
      stream.on('error', reject);
    });
  }

  /**
   * 获取预签名上传URL
   */
  private async getSignedUploadUrl(fileName: string): Promise<string> {
    try {
      const response = await axios.post(
        this.signedUrlApi,
        { fileName },
        { timeout: 10000 }
      );

      if (response.data?.code === 200 && response.data?.data?.signedUrl) {
        return response.data.data.signedUrl;
      }

      throw new Error('获取预签名URL失败');
    } catch (error: any) {
      logger.error('获取预签名URL失败', { error: error.message });
      throw error;
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

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      logger.info('音频文件下载完成', { tempFilePath });

      // 2. 生成MD5文件名
      const fileName = await this.generateMD5FileName(tempFilePath, fileExtension);

      // 3. 获取预签名URL
      const signedUrl = await this.getSignedUploadUrl(fileName);

      // 4. 上传到OSS
      await this.uploadToOSS(signedUrl, tempFilePath);

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

