module.exports = {
  apps: [
    {
      name: 'ai-music-service',
      script: './dist/index.js',
      instances: 1,
      exec_mode: 'cluster',

      // 环境变量
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },

      // 自动重启配置
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',

      // 日志配置
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // 重启策略
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,

      // 优雅关闭
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    }
  ]
};

