# 部署指南

本文档详细说明如何将 AI 音乐服务部署到服务器。

## 服务器信息

- **服务器 IP**: 47.252.36.81
- **服务端口**: 3001
- **Node.js 版本**: 18.x 或更高

## 部署步骤

### 1. 准备服务器环境

确保服务器已安装以下软件：

```bash
# 检查 Node.js 版本
node -v  # 应该 >= 18.0.0

# 检查 npm 版本
npm -v   # 应该 >= 9.0.0

# 如果未安装 PM2，全局安装
npm install -g pm2
```

### 2. 上传代码到服务器

使用 FTP、SCP 或 Git 将代码上传到服务器：

```bash
# 方式1：使用 SCP
scp -r ai_music_deploy/ user@47.252.36.81:/path/to/deploy/

# 方式2：使用 Git
cd /path/to/deploy/
git clone <repository-url>
cd ai_music_deploy
```

### 3. 安装依赖

```bash
cd ai_music_deploy
npm install
```

### 4. 配置环境变量

编辑 `.env` 文件，确保配置正确：

```bash
# 编辑环境变量
nano .env

# 或使用 vim
vim .env
```

**重要配置项**：
- `SUNO_API_KEY`: 已配置为 `28f61cf2a6012f2a1204f8569768f979`
- `SERVER_IP`: 已配置为 `47.252.36.81`
- `PORT`: 已配置为 `3001`
- `OSS_SIGNED_URL_API`: 已配置为 `https://ai.mediaio.net/api/v1/ai/signed-upload-url`

### 5. 编译 TypeScript

```bash
npm run build
```

编译后会在 `dist/` 目录生成 JavaScript 文件。

### 6. 启动服务

```bash
# 使用 PM2 启动服务
npm run pm2:start

# 或直接使用 PM2 命令
pm2 start ecosystem.config.js
```

### 7. 验证服务

```bash
# 检查服务状态
pm2 status

# 查看日志
pm2 logs ai-music-service

# 测试接口
curl http://47.252.36.81:3001/api/music/stats
```

### 8. 设置开机自启动

```bash
# 保存 PM2 进程列表
pm2 save

# 生成开机启动脚本
pm2 startup

# 按照提示执行命令（通常需要 sudo）
```

## 常用命令

### PM2 管理命令

```bash
# 查看服务状态
npm run pm2:status
# 或
pm2 status

# 查看日志
npm run pm2:logs
# 或
pm2 logs ai-music-service

# 重启服务
npm run pm2:restart
# 或
pm2 restart ai-music-service

# 停止服务
npm run pm2:stop
# 或
pm2 stop ai-music-service

# 删除服务
npm run pm2:delete
# 或
pm2 delete ai-music-service

# 查看详细信息
pm2 show ai-music-service

# 监控
pm2 monit
```

### 日志管理

```bash
# 查看应用日志
tail -f logs/app-*.log

# 查看错误日志
tail -f logs/error-*.log

# 查看 PM2 日志
tail -f logs/pm2-out.log
tail -f logs/pm2-error.log

# 清空 PM2 日志
pm2 flush
```

## 更新部署

当代码有更新时：

```bash
# 1. 拉取最新代码（如果使用 Git）
git pull

# 2. 安装新依赖（如果有）
npm install

# 3. 重新编译
npm run build

# 4. 重启服务
npm run pm2:restart
```

## 防火墙配置

确保服务器防火墙允许 3001 端口访问：

```bash
# Ubuntu/Debian
sudo ufw allow 3001/tcp
sudo ufw reload

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload
```

## 监控和告警

### 设置 PM2 监控

```bash
# 启用 PM2 Plus（可选）
pm2 link <secret_key> <public_key>
```

### 磁盘空间监控

定期检查磁盘空间，特别是 `temp_audio/` 和 `logs/` 目录：

```bash
# 查看磁盘使用情况
df -h

# 查看目录大小
du -sh temp_audio/
du -sh logs/
```

### 日志轮转

建议配置日志轮转以防止日志文件过大：

```bash
# 安装 logrotate（如果未安装）
sudo apt-get install logrotate  # Ubuntu/Debian
sudo yum install logrotate      # CentOS/RHEL

# 创建配置文件
sudo nano /etc/logrotate.d/ai-music-service
```

配置内容：
```
/path/to/ai_music_deploy/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 user user
}
```

## 故障排查

### 服务无法启动

1. 检查端口是否被占用：
```bash
netstat -tuln | grep 3001
# 或
lsof -i :3001
```

2. 检查环境变量配置：
```bash
cat .env
```

3. 查看错误日志：
```bash
tail -f logs/error-*.log
pm2 logs ai-music-service --err
```

### 服务频繁重启

1. 查看 PM2 日志：
```bash
pm2 logs ai-music-service
```

2. 检查内存使用：
```bash
pm2 monit
```

3. 检查系统资源：
```bash
top
free -h
```

### 任务处理缓慢

1. 检查网络连接：
```bash
ping api.sunoapi.org
curl -I https://api.sunoapi.org
```

2. 检查并发配置：
```bash
# 查看 .env 中的 MAX_CONCURRENCY 配置
grep MAX_CONCURRENCY .env
```

3. 查看队列状态：
```bash
curl http://47.252.36.81:3001/api/music/stats
```

## 备份和恢复

### 备份

```bash
# 备份配置文件
cp .env .env.backup

# 备份日志（可选）
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/
```

### 恢复

```bash
# 恢复配置文件
cp .env.backup .env

# 重启服务
npm run pm2:restart
```

## 安全建议

1. **不要暴露 .env 文件**：确保 `.env` 文件不被公开访问
2. **定期更新依赖**：运行 `npm audit` 检查安全漏洞
3. **使用 HTTPS**：建议在生产环境使用 HTTPS（可通过 Nginx 反向代理）
4. **限制访问**：配置防火墙规则，只允许必要的 IP 访问

## 性能优化

1. **调整并发数**：根据服务器性能调整 `MAX_CONCURRENCY`
2. **启用集群模式**：在 `ecosystem.config.js` 中调整 `instances` 参数
3. **配置 Nginx 反向代理**：提高性能和安全性

## 联系支持

如遇到问题，请查看：
- 应用日志：`logs/app-*.log`
- 错误日志：`logs/error-*.log`
- PM2 日志：`pm2 logs ai-music-service`

