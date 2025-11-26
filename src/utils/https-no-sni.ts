/**
 * HTTPS 请求工具（无 SNI）
 *
 * 解决某些服务器不接受 SNI 导致的 ECONNRESET 问题
 * 通过手动控制 TLS 连接和 HTTP 请求来绕过 Node.js https 模块的限制
 */

import * as tls from 'tls';
import { URL } from 'url';

export interface HttpsRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string | Buffer;
  timeout?: number;
}

export interface HttpsResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  json?: any;
}

/**
 * 发送 HTTPS 请求（不使用 SNI）
 * @param url - 完整的 URL
 * @param options - 请求选项
 * @returns Promise<HttpsResponse>
 */
export async function httpsRequestNoSNI(
  url: string,
  options: HttpsRequestOptions = {}
): Promise<HttpsResponse> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const method = options.method || 'GET';
    const customHeaders = options.headers || {};
    const body = options.body || '';
    const timeout = options.timeout || 30000;

    // 建立 TLS 连接（关键：不设置 servername）
    const socket = tls.connect(
      {
        host: urlObj.hostname,
        port: parseInt(urlObj.port) || 443,
        rejectUnauthorized: false
        // 关键：不设置 servername，因为目标服务器不接受 SNI
      },
      () => {
        // TLS 连接成功，构造并发送 HTTP 请求
        const defaultHeaders: Record<string, string> = {
          Host: urlObj.hostname,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
          Accept: '*/*',
          Connection: 'close'
        };

        // 合并请求头
        const headers = { ...defaultHeaders, ...customHeaders };

        // 如果有请求体，添加 Content-Length
        if (body) {
          const bodyBuffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
          headers['Content-Length'] = bodyBuffer.length.toString();
        }

        // 构造 HTTP 请求
        const path = urlObj.pathname + urlObj.search;
        const requestLines = [`${method} ${path} HTTP/1.1`];

        for (const [key, value] of Object.entries(headers)) {
          requestLines.push(`${key}: ${value}`);
        }

        requestLines.push('', '');

        const httpRequest = requestLines.join('\r\n');

        // 发送请求头
        socket.write(httpRequest);

        // 如果有请求体，发送请求体
        if (body) {
          socket.write(body);
        }
      }
    );

    let responseData = '';

    socket.on('data', (chunk) => {
      responseData += chunk.toString();
    });

    socket.on('end', () => {
      try {
        // 解析 HTTP 响应
        const headerEnd = responseData.indexOf('\r\n\r\n');
        if (headerEnd === -1) {
          reject(new Error('Invalid HTTP response: no header end found'));
          return;
        }

        const headerSection = responseData.substring(0, headerEnd);
        const bodySection = responseData.substring(headerEnd + 4);

        // 解析状态行
        const lines = headerSection.split('\r\n');
        const statusLine = lines[0];
        const statusMatch = statusLine.match(/HTTP\/\d\.\d (\d+)/);
        const statusCode = statusMatch ? parseInt(statusMatch[1]) : 0;

        // 解析响应头
        const responseHeaders: Record<string, string> = {};
        for (let i = 1; i < lines.length; i++) {
          const colonIndex = lines[i].indexOf(':');
          if (colonIndex > 0) {
            const key = lines[i].substring(0, colonIndex).trim().toLowerCase();
            const value = lines[i].substring(colonIndex + 1).trim();
            responseHeaders[key] = value;
          }
        }

        // 尝试解析 JSON
        let json: any = undefined;
        if (responseHeaders['content-type']?.includes('application/json')) {
          try {
            json = JSON.parse(bodySection);
          } catch (e) {
            // JSON 解析失败，保持 undefined
          }
        }

        resolve({
          statusCode,
          headers: responseHeaders,
          body: bodySection,
          json
        });
      } catch (error: any) {
        reject(new Error(`Failed to parse HTTP response: ${error.message}`));
      }
    });

    socket.on('error', (err) => {
      reject(new Error(`Socket error: ${err.message}`));
    });

    socket.setTimeout(timeout, () => {
      socket.destroy();
      reject(new Error(`Request timeout after ${timeout}ms`));
    });
  });
}

