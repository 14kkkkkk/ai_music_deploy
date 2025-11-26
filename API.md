# AI 音乐服务 API 文档

## 基础信息

- **服务地址**: `http://47.252.36.81:3001`
- **协议**: HTTP
- **数据格式**: JSON
- **字符编码**: UTF-8

---

## 1. 生成音乐

### 接口说明
创建音乐生成任务，支持两种模式：
- **非自定义模式** (`customMode: false`)：只需提供 `prompt`，歌词将自动生成
- **自定义模式** (`customMode: true`)：需要提供 `style` 和 `title`，可精确控制歌词

### 请求信息
- **URL**: `/api/music/generate`
- **方法**: `POST`
- **Content-Type**: `application/json`

### 请求参数

#### 必填参数

| 参数名 | 类型 | 说明 | 示例值 |
|--------|------|------|--------|
| customMode | boolean | 是否使用自定义模式 | false |
| instrumental | boolean | 是否生成纯音乐（无人声） | false |
| model | string | 模型版本，可选值: `V3_5`, `V4`, `V4_5`, `V4_5PLUS`, `V5` | "V4" |
| callbackUrl | string | 任务完成后的回调地址 | "https://your-server.com/callback" |

#### 条件必填参数

| 参数名 | 类型 | 条件 | 说明 | 示例值 |
|--------|------|------|------|--------|
| prompt | string | 非自定义模式必填；自定义模式下 instrumental=false 时必填 | 音乐描述或精确歌词 | "一首轻快的流行歌曲" |
| style | string | 自定义模式必填 | 音乐风格标签 | "pop, upbeat, summer" |
| title | string | 自定义模式必填 | 歌曲标题 | "夏日海滩" |

#### 可选参数

| 参数名 | 类型 | 说明 | 示例值 |
|--------|------|------|--------|
| negativeTags | string | 排除的风格标签 | "sad, slow" |
| personaId | string | 人格ID（仅自定义模式可用） | "persona_123" |
| vocalGender | string | 人声性别，可选值: `m`(男), `f`(女) | "f" |
| styleWeight | number | 风格权重，范围 0.00-1.00 | 0.65 |
| weirdnessConstraint | number | 创意发散度，范围 0.00-1.00 | 0.50 |
| audioWeight | number | 音频影响力权重，范围 0.00-1.00 | 0.70 |

### 模式说明

#### 非自定义模式 (customMode: false)
- 只需要提供 `prompt` 参数
- 系统会根据 prompt 自动生成歌词和音乐
- 适合快速生成，不需要精确控制歌词内容

#### 自定义模式 (customMode: true)
- 必须提供 `style` 和 `title` 参数
- 如果 `instrumental: false`（有人声），必须提供 `prompt` 作为精确歌词
- 如果 `instrumental: true`（纯音乐），不需要 `prompt`
- 适合需要精确控制歌词和风格的场景

### 请求示例

#### 示例1：非自定义模式（自动生成歌词）
```bash
curl -X POST "http://47.252.36.81:3001/api/music/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "customMode": false,
    "instrumental": false,
    "model": "V4",
    "prompt": "一首关于夏天海边的轻快流行歌曲",
    "callbackUrl": "https://your-server.com/api/music/callback"
  }'
```

#### 示例2：自定义模式 + 有人声（精确歌词）
```bash
curl -X POST "http://47.252.36.81:3001/api/music/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "customMode": true,
    "instrumental": false,
    "model": "V4",
    "style": "pop, upbeat, summer",
    "title": "夏日海滩",
    "prompt": "[Verse]\n阳光照耀在沙滩上\n海浪轻轻拍打着岸边\n\n[Chorus]\n这是最美的夏天\n和你一起在海边",
    "negativeTags": "悲伤, 慢节奏",
    "callbackUrl": "https://your-server.com/api/music/callback"
  }'
```

#### 示例3：自定义模式 + 纯音乐
```bash
curl -X POST "http://47.252.36.81:3001/api/music/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "customMode": true,
    "instrumental": true,
    "model": "V4",
    "style": "classical, piano, peaceful",
    "title": "宁静钢琴曲",
    "callbackUrl": "https://your-server.com/api/music/callback"
  }'
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

**失败响应 (400)**:
```json
{
  "success": false,
  "error": "自定义模式下 style 参数必填"
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

#### 必填参数

| 参数名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| audioUrl | string | 是 | 原始音频文件URL（公网可访问） | "https://example.com/audio.mp3" |
| prompt | string | 是 | 人声描述或歌词内容 | "温柔的女声演唱" |
| title | string | 是 | 歌曲标题（最多80字符） | "夏日海边" |
| style | string | 是 | 音乐风格 | "Pop, Soft, Ballad" |
| callbackUrl | string | 是 | 任务完成后的回调地址 | "http://your-server.com/callback" |

#### 可选参数

| 参数名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| negativeTags | string | 否 | 排除的风格标签 | "Heavy Metal, Screaming" |
| vocalGender | string | 否 | 人声性别: "m"=男, "f"=女 | "f" |
| model | string | 否 | 模型版本: V4_5PLUS, V5 | "V4_5PLUS" |
| styleWeight | number | 否 | 风格权重 0.00-1.00 | 0.65 |
| weirdnessConstraint | number | 否 | 创意发散度 0.00-1.00 | 0.65 |
| audioWeight | number | 否 | 音频影响力权重 0.00-1.00 | 0.65 |

### 请求示例

```json
{
  "audioUrl": "https://cdn.sunoapi.org/audio/12345.mp3",
  "prompt": "用温柔的女声演唱这首歌",
  "title": "夏日海边",
  "style": "Pop, Soft, Ballad",
  "callbackUrl": "http://your-server.com/api/vocals/callback",
  "vocalGender": "f",
  "model": "V4_5PLUS"
}
```

### curl 示例

```bash
curl -X POST "http://47.252.36.81:3001/api/music/add-vocals" \
  -H "Content-Type: application/json" \
  -d '{
    "audioUrl": "https://cdn.sunoapi.org/audio/12345.mp3",
    "prompt": "用温柔的女声演唱这首歌",
    "title": "夏日海边",
    "style": "Pop, Soft, Ballad",
    "callbackUrl": "http://your-server.com/api/vocals/callback",
    "vocalGender": "f"
  }'
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

**参数错误 (400)**:
```json
{
  "success": false,
  "error": "title 参数必填（歌曲标题，最多80字符）"
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

所有回调都包含 `metadata` 字段，用于返回任务的原始请求信息。

#### 音乐生成回调

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
  },
  "metadata": {
    "type": "music",
    "prompt": "一首关于夏天海边的歌",
    "model": "V4",
    "customMode": false,
    "instrumental": false,
    "style": "",
    "title": ""
  }
}
```

**失败回调**:
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "taskType": "MUSIC_GENERATION",
  "error": "Suno任务失败",
  "metadata": {
    "type": "music",
    "prompt": "一首关于夏天海边的歌",
    "model": "V4",
    "customMode": false,
    "instrumental": false,
    "style": "",
    "title": ""
  }
}
```

#### 歌词生成回调

**成功回调**:
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "success",
  "taskType": "LYRICS_GENERATION",
  "data": {
    "text": "[Verse 1]\n海风轻轻吹过...\n\n[Chorus]\n夏天的海边...",
    "title": "夏日海边"
  },
  "metadata": {
    "type": "lyrics",
    "prompt": "一首关于夏天海边的歌"
  }
}
```

**失败回调**:
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "taskType": "LYRICS_GENERATION",
  "error": "Suno歌词任务失败",
  "metadata": {
    "type": "lyrics",
    "prompt": "一首关于夏天海边的歌"
  }
}
```

#### 添加人声回调

**成功回调**:
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "success",
  "taskType": "ADD_VOCALS",
  "data": {
    "id": "suno-12345",
    "audio_url": "https://cdn.sunoapi.org/audio/12345.mp3",
    "ossFileName": "a1b2c3d4e5f6.mp3"
  },
  "metadata": {
    "type": "vocals",
    "prompt": "温柔的女声演唱",
    "audioUrl": "https://example.com/original.mp3"
  }
}
```

**失败回调**:
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "taskType": "ADD_VOCALS",
  "error": "添加人声失败",
  "metadata": {
    "type": "vocals",
    "prompt": "温柔的女声演唱",
    "audioUrl": "https://example.com/original.mp3"
  }
}
```

### metadata 字段说明

| 字段 | 类型 | 说明 | 适用于 |
|------|------|------|--------|
| type | string | 任务类型: `music`、`lyrics`、`vocals` | 所有 |
| prompt | string | 原始提示词 | 所有 |
| model | string | 模型版本 | 音乐生成 |
| customMode | boolean | 是否自定义模式 | 音乐生成 |
| instrumental | boolean | 是否纯音乐 | 音乐生成 |
| style | string | 音乐风格 | 音乐生成 |
| title | string | 歌曲标题 | 音乐生成 |
| audioUrl | string | 原始音频URL | 添加人声 |

### 回调说明
- 调用一次，不重试
- 超时时间：60秒
- `metadata` 字段始终存在，不会为 `undefined`

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

