import winston from 'winston';
import path from 'path';
import fs from 'fs';

const logLevel = process.env.LOG_LEVEL || 'info';
const logDir = process.env.LOG_DIR || 'logs';

// 确保日志目录存在
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 获取北京时间的时间戳格式化函数
const getBeijingTimestamp = (): string => {
  const now = new Date();
  // 转换为北京时间 (UTC+8)
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const year = beijingTime.getUTCFullYear();
  const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(beijingTime.getUTCDate()).padStart(2, '0');
  const hours = String(beijingTime.getUTCHours()).padStart(2, '0');
  const minutes = String(beijingTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(beijingTime.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// 定义简洁的日志格式（用于文件）
const logFormat = winston.format.combine(
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, ...meta }) => {
    const timestamp = getBeijingTimestamp();
    let msg = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    // 只在有额外信息时才添加
    const metaKeys = Object.keys(meta).filter(key => key !== 'service');
    if (metaKeys.length > 0) {
      const cleanMeta: any = {};
      metaKeys.forEach(key => {
        cleanMeta[key] = meta[key];
      });
      msg += ` ${JSON.stringify(cleanMeta)}`;
    }

    return msg;
  })
);

// 控制台格式（pm2 友好，不带颜色以确保时间戳正确显示）
const consoleFormat = winston.format.combine(
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, ...meta }) => {
    const timestamp = getBeijingTimestamp();
    let msg = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    // 只在有额外信息时才添加
    const metaKeys = Object.keys(meta).filter(key => key !== 'service');
    if (metaKeys.length > 0) {
      const cleanMeta: any = {};
      metaKeys.forEach(key => {
        cleanMeta[key] = meta[key];
      });
      msg += ` ${JSON.stringify(cleanMeta)}`;
    }

    return msg;
  })
);

// 创建日志传输器
const transports: winston.transport[] = [
  // 控制台输出（pm2 友好格式）
  new winston.transports.Console({
    format: consoleFormat
  })
];

// 生产环境添加文件日志
if (process.env.NODE_ENV === 'production') {
  transports.push(
    // 所有日志
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      format: logFormat
    }),
    // 错误日志
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      format: logFormat
    })
  );
}

export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { service: 'ai-music-service' },
  transports
});

