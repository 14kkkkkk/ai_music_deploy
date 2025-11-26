# AI 音乐服务使用手册

## 一键部署

```bash
# 1. 进入项目目录
cd /root/ai_music

# 2. 赋予执行权限并启动
chmod +x start.sh
./start.sh
```

---

## 服务管理命令

### 查看服务状态
```bash
pm2 status
```

### 查看实时日志
```bash
# 查看所有日志
pm2 logs ai-music-service

# 只看最近100行
pm2 logs ai-music-service --lines 100

# 只看错误日志
pm2 logs ai-music-service --err
```

### 重启服务
```bash
pm2 restart ai-music-service
```

### 停止服务
```bash
pm2 stop ai-music-service
```

### 删除服务
```bash
pm2 delete ai-music-service
```

---

## 日志文件位置

```bash
# 应用日志
tail -f logs/app-$(date +%Y-%m-%d).log

# 错误日志
tail -f logs/error-$(date +%Y-%m-%d).log

# PM2 日志
tail -f logs/pm2-out.log
tail -f logs/pm2-error.log
```

---

## 接口测试

### 1. 健康检查
```bash
curl http://47.252.36.81:3001/health
```

### 2. 获取服务统计
```bash
curl http://47.252.36.81:3001/api/music/stats
```

### 3. 生成歌词
```bash
curl -X POST http://47.252.36.81:3001/api/music/generate-lyrics \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "一首关于友情的歌词",
    "callbackUrl": "https://ai.mediaio.net/api/v1/ai/update-music-lyrics-project-info"
  }'
```

### 4. 生成音乐
```bash
curl -X POST http://47.252.36.81:3001/api/music/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "一首轻快的流行歌曲",
    "callbackUrl": "https://ai.mediaio.net/api/v1/ai/update-music-project-info",
    "title": "夏日回忆",
    "tags": "pop, upbeat, summer",
    "customMode": false,
    "instrumental": false,
    "model": "V4"
  }'
```

### 5. 添加人声
```bash
curl -X POST http://47.252.36.81:3001/api/music/add-vocals \
  -H "Content-Type: application/json" \
  -d '{
    "audioUrl": "https://example.com/music.mp3",
    "prompt": "用温柔的女声演唱",
    "callbackUrl": "https://ai.mediaio.net/api/v1/ai/update-music-vocals-project-info"
  }'
```

### 6. 查询任务状态
```bash
# 将 {taskId} 替换为实际的任务ID
curl http://47.252.36.81:3001/api/music/tasks/{taskId}
```

---

## 回调接口说明

中台需要提供以下回调接口接收任务结果：

| 功能 | 回调地址 |
|------|----------|
| 生成歌词 | `https://ai.mediaio.net/api/v1/ai/update-music-lyrics-project-info` |
| 生成音乐 | `https://ai.mediaio.net/api/v1/ai/update-music-project-info` |
| 添加人声 | `https://ai.mediaio.net/api/v1/ai/update-music-vocals-project-info` |

### 回调数据格式

**成功回调：**
```json
{
  "taskId": "任务ID",
  "status": "success",
  "taskType": "MUSIC_GENERATION",
  "data": {
    "id": "suno-12345",
    "title": "歌曲标题",
    "audio_url": "https://cdn.sunoapi.org/audio/xxx.mp3",
    "ossFileName": "上传到OSS后的文件名.mp3",
    "image_url": "封面图URL",
    "lyric": "歌词内容",
    "duration": 180
  }
}
```

**失败回调：**
```json
{
  "taskId": "任务ID",
  "status": "failed",
  "taskType": "MUSIC_GENERATION",
  "error": "错误信息"
}
```

