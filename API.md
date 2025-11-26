# AI 音乐服务 API 文档

## 基础信息

- **服务地址**: `http://47.252.36.81:3001`
- **协议**: HTTP
- **数据格式**: JSON
- **字符编码**: UTF-8

---

## 1. 生成音乐

### 接口说明
创建音乐生成任务，支持自定义模式和纯音乐模式。

### 请求信息
- **URL**: `/api/music/generate`
- **方法**: `POST`
- **Content-Type**: `application/json`

### 请求参数

| 参数名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| prompt | string | 是 | 音乐描述或歌词内容 | "一首轻快的流行歌曲" |
| callbackUrl | string | 是 | 任务完成后的回调地址 | "http://your-server.com/callback" |
| customMode | boolean | 否 | 是否使用自定义模式（默认 false） | true |
| instrumental | boolean | 否 | 是否生成纯音乐（默认 false） | false |
| model | string | 否 | 使用的模型版本（默认 "V4"） | "V4" |
| title | string | 否 | 音乐标题 | "夏日回忆" |
| tags | string | 否 | 音乐风格标签 | "pop, upbeat, summer" |
| negativeTags | string | 否 | 排除的风格标签 | "sad, slow" |

### 请求示例

```json
{
  "prompt": "一首关于夏天海边的轻快流行歌曲",
  "callbackUrl": "http://your-server.com/api/music/callback",
  "customMode": false,
  "instrumental": false,
  "model": "V4",
  "title": "夏日海滩",
  "tags": "pop, upbeat, summer, beach"
}
```

### 响应示例

**成功响应 (200)**:
```json
{
  "success": true,
  "data": {
    "taskId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "PENDING",
    "message": "任务已创建，正在处理中"
  }
}
```

**失败响应 (400/500)**:
```json
{
  "success": false,
  "error": "prompt 参数必填"
}
```

---

## 2. 生成歌词

### 接口说明
根据描述生成歌词内容。

### 请求信息
- **URL**: `/api/music/generate-lyrics`
- **方法**: `POST`
- **Content-Type**: `application/json`

### 请求参数

| 参数名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| prompt | string | 是 | 歌词主题描述 | "一首关于友情的歌" |
| callbackUrl | string | 是 | 任务完成后的回调地址 | "http://your-server.com/callback" |

### 请求示例

```json
{
  "prompt": "一首关于友情和青春的歌词",
  "callbackUrl": "http://your-server.com/api/lyrics/callback"
}
```

### 响应示例

**成功响应 (200)**:
```json
{
  "success": true,
  "data": {
    "taskId": "550e8400-e29b-41d4-a716-446655440001",
    "status": "PENDING",
    "message": "任务已创建，正在处理中"
  }
}
```

---

## 3. 添加人声

### 接口说明
为纯音乐添加人声演唱。

### 请求信息
- **URL**: `/api/music/add-vocals`
- **方法**: `POST`
- **Content-Type**: `application/json`

### 请求参数

| 参数名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| audioUrl | string | 是 | 原始音频文件URL | "https://example.com/audio.mp3" |
| prompt | string | 是 | 人声描述或歌词 | "温柔的女声演唱" |
| callbackUrl | string | 是 | 任务完成后的回调地址 | "http://your-server.com/callback" |

### 请求示例

```json
{
  "audioUrl": "https://cdn.sunoapi.org/audio/12345.mp3",
  "prompt": "用温柔的女声演唱这首歌",
  "callbackUrl": "http://your-server.com/api/vocals/callback"
}
```

### 响应示例

**成功响应 (200)**:
```json
{
  "success": true,
  "data": {
    "taskId": "550e8400-e29b-41d4-a716-446655440002",
    "status": "PENDING",
    "message": "任务已创建，正在处理中"
  }
}
```

---

## 4. 查询任务状态

### 接口说明
查询任务的当前状态和结果。

### 请求信息
- **URL**: `/api/music/tasks/:taskId`
- **方法**: `GET`

### 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| taskId | string | 是 | 任务ID |

### 请求示例

```
GET /api/music/tasks/550e8400-e29b-41d4-a716-446655440000
```

### 响应示例

**任务处理中**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "PROCESSING",
    "type": "MUSIC_GENERATION",
    "progress": 45,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:02:30.000Z"
  }
}
```

**任务完成**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "COMPLETED",
    "type": "MUSIC_GENERATION",
    "progress": 100,
    "output": {
      "id": "suno-12345",
      "title": "夏日海滩",
      "audio_url": "https://cdn.sunoapi.org/audio/12345.mp3",
      "ossFileName": "a1b2c3d4e5f6.mp3",
      "image_url": "https://cdn.sunoapi.org/image/12345.jpg",
      "lyric": "歌词内容...",
      "tags": "pop, upbeat, summer, beach",
      "duration": 180
    },
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:05:00.000Z",
    "completedAt": "2024-01-01T10:05:00.000Z"
  }
}
```

**任务失败**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "FAILED",
    "type": "MUSIC_GENERATION",
    "progress": 30,
    "error": "Suno任务失败",
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:03:00.000Z",
    "completedAt": "2024-01-01T10:03:00.000Z"
  }
}
```

**任务不存在 (404)**:
```json
{
  "success": false,
  "error": "任务不存在"
}
```

---

## 5. 获取服务统计信息

### 接口说明
获取当前服务的任务统计信息。

### 请求信息
- **URL**: `/api/music/stats`
- **方法**: `GET`

### 请求示例

```
GET /api/music/stats
```

### 响应示例

```json
{
  "success": true,
  "data": {
    "total": 150,
    "pending": 5,
    "processing": 10,
    "completed": 130,
    "failed": 5,
    "queueSize": 3,
    "queuePending": 2
  }
}
```

---

## 回调通知

### 说明
当任务完成（成功或失败）时，系统会向您提供的 `callbackUrl` 发送 POST 请求。

### 回调请求格式

**成功回调**:
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "success",
  "taskType": "MUSIC_GENERATION",
  "data": {
    "id": "suno-12345",
    "title": "夏日海滩",
    "audio_url": "https://cdn.sunoapi.org/audio/12345.mp3",
    "ossFileName": "a1b2c3d4e5f6.mp3",
    "image_url": "https://cdn.sunoapi.org/image/12345.jpg",
    "lyric": "歌词内容...",
    "tags": "pop, upbeat, summer, beach",
    "duration": 180
  }
}
```

**失败回调**:
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "taskType": "MUSIC_GENERATION",
  "error": "Suno任务失败"
}
```

### 回调说明
- 调用一次，不重试
- 超时时间：60秒

---

## 任务状态说明

| 状态 | 说明 |
|------|------|
| PENDING | 任务已创建，等待处理 |
| PROCESSING | 任务正在处理中 |
| COMPLETED | 任务已完成 |
| FAILED | 任务失败 |

---

## 任务类型说明

| 类型 | 说明 |
|------|------|
| MUSIC_GENERATION | 音乐生成任务 |
| LYRICS_GENERATION | 歌词生成任务 |
| ADD_VOCALS | 添加人声任务 |

---

## 错误码说明

| HTTP状态码 | 说明 |
|-----------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 使用示例

### Node.js 示例

```javascript
const axios = require('axios');

// 1. 创建音乐生成任务
async function generateMusic() {
  try {
    const response = await axios.post('http://47.252.36.81:3001/api/music/generate', {
      prompt: '一首轻快的流行歌曲',
      callbackUrl: 'http://your-server.com/api/music/callback',
      customMode: false,
      instrumental: false,
      model: 'V4',
      title: '夏日回忆',
      tags: 'pop, upbeat, summer'
    });

    console.log('任务已创建:', response.data);
    const taskId = response.data.data.taskId;

    // 2. 轮询查询任务状态
    const checkStatus = setInterval(async () => {
      const statusResponse = await axios.get(
        `http://47.252.36.81:3001/api/music/tasks/${taskId}`
      );

      console.log('任务状态:', statusResponse.data);

      if (statusResponse.data.data.status === 'COMPLETED') {
        console.log('任务完成:', statusResponse.data.data.output);
        clearInterval(checkStatus);
      } else if (statusResponse.data.data.status === 'FAILED') {
        console.log('任务失败:', statusResponse.data.data.error);
        clearInterval(checkStatus);
      }
    }, 5000);

  } catch (error) {
    console.error('错误:', error.response?.data || error.message);
  }
}

generateMusic();
```

### Python 示例

```python
import requests
import time

# 1. 创建音乐生成任务
def generate_music():
    url = 'http://47.252.36.81:3001/api/music/generate'
    payload = {
        'prompt': '一首轻快的流行歌曲',
        'callbackUrl': 'http://your-server.com/api/music/callback',
        'customMode': False,
        'instrumental': False,
        'model': 'V4',
        'title': '夏日回忆',
        'tags': 'pop, upbeat, summer'
    }

    response = requests.post(url, json=payload)
    result = response.json()

    print('任务已创建:', result)
    task_id = result['data']['taskId']

    # 2. 轮询查询任务状态
    while True:
        status_url = f'http://47.252.36.81:3001/api/music/tasks/{task_id}'
        status_response = requests.get(status_url)
        status_data = status_response.json()

        print('任务状态:', status_data)

        if status_data['data']['status'] == 'COMPLETED':
            print('任务完成:', status_data['data']['output'])
            break
        elif status_data['data']['status'] == 'FAILED':
            print('任务失败:', status_data['data']['error'])
            break

        time.sleep(5)

if __name__ == '__main__':
    generate_music()
```

---

## 注意事项

1. **回调地址必须可访问**：确保提供的 `callbackUrl` 可以从服务器访问
2. **任务超时**：单个任务最长处理时间为 10 分钟
3. **并发限制**：最大并发处理任务数为 10
4. **队列限制**：最大队列容量为 2500 个任务
5. **文件存储**：生成的音频文件会自动上传到 OSS，返回 `ossFileName`
6. **任务清理**：已完成的任务会在 5 分钟后自动清理

---

## 技术支持

如有问题，请联系技术支持团队。

---

## 更新日志

### v1.0.0 (2024-01-01)
- 初始版本发布
- 支持音乐生成、歌词生成、添加人声功能
- 支持任务状态查询和统计信息获取
- 支持回调通知机制
```

