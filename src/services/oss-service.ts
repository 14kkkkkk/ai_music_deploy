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
 * OSS Upload Service - Upload files to OSS
 */
export class OSSService {
  private signedUrlApi: string;
  private uploadTimeout: number;
  private tempDir: string;

  constructor() {
    this.signedUrlApi = process.env.OSS_SIGNED_URL_API || 'https://ai.mediaio.net/api/v1/ai/signed-upload-url';
    this.uploadTimeout = parseInt(process.env.OSS_UPLOAD_TIMEOUT || '60000', 10);
    this.tempDir = process.env.TEMP_DIR || './temp_audio';

    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }

    logger.info('OSS Service initialized', {
      signedUrlApi: this.signedUrlApi,
      uploadTimeout: `${this.uploadTimeout}ms`
    });
  }

  /**
   * Get presigned upload URL
   * Use custom HTTPS request (no SNI) to solve ECONNRESET issue
   */
  private async getSignedUploadUrl(fileName: string): Promise<string> {
    try {
      logger.info('Request signed upload URL', { fileName });

      // Build full URL (use GET request + query params)
      const url = `${this.signedUrlApi}?fileName=${encodeURIComponent(fileName)}`;

      // Use HTTPS request without SNI
      const response = await httpsRequestNoSNI(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      // Check status code
      if (response.statusCode !== 200) {
        throw new Error(`HTTP ${response.statusCode}: ${response.body}`);
      }

      // Get signed URL
      const signedUrl = response.json?.signedUrl;

      if (!signedUrl) {
        throw new Error('Missing signedUrl field in response');
      }

      logger.info('Get signed URL success', { fileName, signedUrl: signedUrl.substring(0, 50) + '...' });
      return signedUrl;

    } catch (error: any) {
      logger.error('Get signed URL failed', { fileName, error: error.message });
      throw new Error(`Get signed URL failed: ${error.message}`);
    }
  }

  /**
   * Upload file to OSS using native https module
   */
  private async uploadToOSS(signedUrl: string, filePath: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(filePath)) {
        reject(new Error(`File not found: ${filePath}`));
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

      logger.info('Start uploading to OSS', {
        hostname: urlObj.hostname,
        sizeMB: (fileSize / 1024 / 1024).toFixed(2) + ' MB'
      });

      const req = httpModule.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => { responseData += chunk.toString(); });
        res.on('end', () => {
          if (res.statusCode === 200) {
            logger.info('OSS upload success');
            resolve(true);
          } else {
            logger.error('OSS upload failed', { statusCode: res.statusCode });
            reject(new Error(`Upload failed, status code: ${res.statusCode}`));
          }
        });
      });

      req.on('error', (error) => {
        logger.error('OSS upload request error', { error: error.message });
        reject(error);
      });

      fileStream.pipe(req);
    });
  }

  /**
   * Download file from URL and upload to OSS
   */
  async downloadAndUploadToOSS(audioUrl: string): Promise<string> {
    const fileExtension = path.extname(new URL(audioUrl).pathname) || '.mp3';
    const tempFilePath = path.join(this.tempDir, `temp_${Date.now()}${fileExtension}`);

    try {
      // 1. Download file
      logger.info('Start downloading audio file', { audioUrl: audioUrl.substring(0, 100) });
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
      logger.info('Audio file download completed', {
        tempFilePath,
        size: fileSize,
        sizeMB: (fileSize / 1024 / 1024).toFixed(2) + ' MB'
      });

      // 2. Generate unique file name
      const fileName = `${uuidv4()}${fileExtension}`;
      logger.info('Generated file name', { fileName });

      // 3. Get presigned URL
      const signedUrl = await this.getSignedUploadUrl(fileName);

      // 4. Upload to OSS
      await this.uploadToOSS(signedUrl, tempFilePath);

      logger.info('Audio file uploaded to OSS successfully', { fileName });
      return fileName;
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
        logger.info('Temp file deleted', { tempFilePath });
      }
    }
  }
}

