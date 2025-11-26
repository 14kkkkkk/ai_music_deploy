/**
 * 中台模拟测试脚本
 * 模拟中台调用 AI 音乐服务接口，并启动本地服务器接收回调
 */

const http = require('http');
const axios = require('axios');

// ============== 配置 ==============
const CONFIG = {
  // 服务器地址
  SERVER_URL: 'http://47.252.36.81:3001',
  // 本地回调服务端口
  CALLBACK_PORT: 8888,
  // 本地回调服务地址（需要能被服务器访问到的公网地址，如使用内网穿透）
  CALLBACK_HOST: 'localhost',
  // 测试超时时间（毫秒）
  TIMEOUT: 10 * 60 * 1000, // 10分钟

  // 真实中台回调地址
  REAL_CALLBACK: {
    MUSIC: 'https://ai.mediaio.net/api/v1/ai/update-music-project-inf',
    LYRICS: 'https://ai.mediaio.net/api/v1/ai/update-music-lyrics-project-info'
  }
};

// 获取回调URL (测试用本地地址或真实中台地址)
const getCallbackUrl = (type = 'music', useReal = false) => {
  if (useReal) {
    return type === 'lyrics' ? CONFIG.REAL_CALLBACK.LYRICS : CONFIG.REAL_CALLBACK.MUSIC;
  }
  return `http://${CONFIG.CALLBACK_HOST}:${CONFIG.CALLBACK_PORT}/callback/${type}`;
};

// 存储回调结果
const callbackResults = new Map();
// 存储回调Promise的resolve函数
const callbackResolvers = new Map();

// ============== 本地回调服务器 ==============
function startCallbackServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            console.log('\n📥 收到回调:', {
              taskId: data.taskId,
              status: data.status,
              taskType: data.taskType,
            });
            console.log('📦 回调数据:', JSON.stringify(data, null, 2));

            // 存储回调结果
            callbackResults.set(data.taskId, data);

            // 触发等待的Promise
            if (callbackResolvers.has(data.taskId)) {
              callbackResolvers.get(data.taskId)(data);
              callbackResolvers.delete(data.taskId);
            }

            // 返回成功响应（模拟中台接口返回）
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: '回调接收成功' }));
          } catch (error) {
            console.error('❌ 解析回调数据失败:', error.message);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: '解析失败' }));
          }
        });
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ service: '中台模拟回调服务', status: 'running' }));
      }
    });

    server.listen(CONFIG.CALLBACK_PORT, () => {
      console.log(`\n🚀 回调服务器启动: http://localhost:${CONFIG.CALLBACK_PORT}`);
      console.log('📢 注意: 如果服务器在远程，需要使用内网穿透工具暴露此端口\n');
      resolve(server);
    });
  });
}

// 延迟函数
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 根据任务类型和输入构建 metadata
function buildMetadata(task) {
  const input = task.input || {};

  if (task.type === 'MUSIC_GENERATION') {
    return {
      type: 'music',
      prompt: input.prompt || '',
      model: input.model || '',
      customMode: input.customMode ?? false,
      instrumental: input.instrumental ?? false,
      style: input.style || '',
      title: input.title || ''
    };
  } else if (task.type === 'LYRICS_GENERATION') {
    return {
      type: 'lyrics',
      prompt: input.prompt || ''
    };
  } else if (task.type === 'ADD_VOCALS') {
    return {
      type: 'vocals',
      prompt: input.prompt || '',
      audioUrl: input.audioUrl || '',
      title: input.title || '',
      style: input.style || ''
    };
  }

  return { type: 'unknown', prompt: input.prompt || '' };
}

// 轮询等待任务完成
async function pollTaskStatus(taskId, maxAttempts = 120, intervalMs = 3000) {
  console.log(`\n⏳ 轮询任务状态 (任务ID: ${taskId})...`);

  for (let i = 0; i < maxAttempts; i++) {
    await sleep(intervalMs);
    try {
      const response = await axios.get(`${CONFIG.SERVER_URL}/api/music/tasks/${taskId}`);
      const task = response.data.data;
      console.log(`[${i + 1}] 状态: ${task.status}, 进度: ${task.progress}%`);

      if (task.status === 'COMPLETED') {
        console.log('\n✅ 任务完成!');
        return {
          taskId,
          status: 'success',
          taskType: task.type,
          result: task.output,
          metadata: buildMetadata(task)
        };
      } else if (task.status === 'FAILED') {
        console.log('\n❌ 任务失败:', task.error);
        return {
          taskId,
          status: 'failed',
          taskType: task.type,
          error: task.error,
          metadata: buildMetadata(task)
        };
      }
    } catch (error) {
      console.error(`[${i + 1}] 查询失败:`, error.message);
    }
  }

  throw new Error(`轮询超时: ${taskId}`);
}

// 等待回调（带轮询回退）
async function waitForResult(taskId, useCallback = false) {
  if (useCallback && CONFIG.CALLBACK_HOST !== 'localhost') {
    // 尝试等待回调
    return new Promise((resolve, reject) => {
      if (callbackResults.has(taskId)) {
        resolve(callbackResults.get(taskId));
        return;
      }
      callbackResolvers.set(taskId, resolve);
      setTimeout(() => {
        if (callbackResolvers.has(taskId)) {
          callbackResolvers.delete(taskId);
          console.log('⚠️ 回调超时，切换到轮询模式...');
          pollTaskStatus(taskId).then(resolve).catch(reject);
        }
      }, 30000); // 30秒等待回调
    });
  } else {
    // 直接使用轮询
    return pollTaskStatus(taskId);
  }
}

// ============== 测试用例 ==============

// 测试生成音乐 - 非自定义模式
async function testGenerateMusic(useRealCallback = false) {
  console.log('\n' + '='.repeat(50));
  console.log('🎵 测试: 生成音乐（非自定义模式）');
  console.log('='.repeat(50));

  const callbackUrl = useRealCallback
    ? CONFIG.REAL_CALLBACK.MUSIC
    : getCallbackUrl('music');
  console.log('📞 回调地址:', callbackUrl);

  try {
    // 非自定义模式：只需要 prompt，歌词自动生成
    const response = await axios.post(`${CONFIG.SERVER_URL}/api/music/generate`, {
      prompt: '一首轻快的流行歌曲，关于夏天和海滩',
      callbackUrl: callbackUrl,
      customMode: false,    // 必填：非自定义模式
      instrumental: false,  // 必填：包含人声
      model: 'V4'           // 必填：模型版本
    });

    console.log('✅ 任务创建成功:', response.data);
    const taskId = response.data.data.taskId;

    const callbackData = await waitForResult(taskId);
    console.log('\n✅ 音乐生成完成!');
    console.log('📦 结果:', JSON.stringify(callbackData, null, 2));
    return { success: true, taskId, data: callbackData };
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

// 测试生成音乐 - 自定义模式（有人声）
async function testGenerateMusicCustom(useRealCallback = false) {
  console.log('\n' + '='.repeat(50));
  console.log('🎵 测试: 生成音乐（自定义模式+人声）');
  console.log('='.repeat(50));

  const callbackUrl = useRealCallback
    ? CONFIG.REAL_CALLBACK.MUSIC
    : getCallbackUrl('music');
  console.log('📞 回调地址:', callbackUrl);

  try {
    // 自定义模式+人声：需要 style, title, prompt（作为歌词）
    const response = await axios.post(`${CONFIG.SERVER_URL}/api/music/generate`, {
      customMode: true,     // 必填：自定义模式
      instrumental: false,  // 必填：包含人声
      model: 'V4',          // 必填：模型版本
      callbackUrl: callbackUrl,
      style: 'pop, upbeat, summer', // 自定义模式必填
      title: '夏日海滩',             // 自定义模式必填
      prompt: '[Verse]\n阳光照耀在沙滩上\n海浪轻轻拍打着岸边\n\n[Chorus]\n这是最美的夏天\n和你一起在海边', // 作为歌词
      negativeTags: '悲伤, 慢节奏'    // 可选：排除的风格
    });

    console.log('✅ 任务创建成功:', response.data);
    const taskId = response.data.data.taskId;

    const callbackData = await waitForResult(taskId);
    console.log('\n✅ 音乐生成完成!');
    console.log('📦 结果:', JSON.stringify(callbackData, null, 2));
    return { success: true, taskId, data: callbackData };
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

// 测试生成纯音乐 - 非自定义模式
async function testGenerateMusicInstrumental(useRealCallback = false) {
  console.log('\n' + '='.repeat(50));
  console.log('🎵 测试: 生成纯音乐（非自定义模式）');
  console.log('='.repeat(50));

  const callbackUrl = useRealCallback
    ? CONFIG.REAL_CALLBACK.MUSIC
    : getCallbackUrl('music');
  console.log('📞 回调地址:', callbackUrl);

  try {
    // 非自定义模式+纯音乐：只需要 prompt
    const response = await axios.post(`${CONFIG.SERVER_URL}/api/music/generate`, {
      prompt: '一首轻柔的钢琴曲，适合冥想和放松',
      callbackUrl: callbackUrl,
      customMode: false,    // 必填：非自定义模式
      instrumental: true,   // 必填：纯音乐（无人声）
      model: 'V4'           // 必填：模型版本
    });

    console.log('✅ 任务创建成功:', response.data);
    const taskId = response.data.data.taskId;

    const callbackData = await waitForResult(taskId);
    console.log('\n✅ 音乐生成完成!');
    console.log('📦 结果:', JSON.stringify(callbackData, null, 2));
    return { success: true, taskId, data: callbackData };
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

// 测试生成歌词
async function testGenerateLyrics(useRealCallback = false) {
  console.log('\n' + '='.repeat(50));
  console.log('📝 测试: 生成歌词');
  console.log('='.repeat(50));

  const callbackUrl = useRealCallback
    ? CONFIG.REAL_CALLBACK.LYRICS
    : getCallbackUrl('lyrics');
  console.log('📞 回调地址:', callbackUrl);

  try {
    const response = await axios.post(`${CONFIG.SERVER_URL}/api/music/generate-lyrics`, {
      prompt: '一首关于友情和青春的歌词',
      callbackUrl: callbackUrl
    });

    console.log('✅ 任务创建成功:', response.data);
    const taskId = response.data.data.taskId;

    const callbackData = await waitForResult(taskId);
    console.log('\n✅ 歌词生成完成!');
    console.log('📦 结果:', JSON.stringify(callbackData, null, 2));
    return { success: true, taskId, data: callbackData };
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

// 测试添加人声（需要先有一个音频URL）
async function testAddVocals(audioUrl) {
  console.log('\n' + '='.repeat(50));
  console.log('🎤 测试: 添加人声');
  console.log('='.repeat(50));

  if (!audioUrl) {
    console.log('⚠️ 跳过: 需要提供 audioUrl 参数');
    return { success: false, error: '需要 audioUrl' };
  }

  try {
    const response = await axios.post(`${CONFIG.SERVER_URL}/api/music/add-vocals`, {
      audioUrl: audioUrl,
      prompt: '用温柔的女声演唱这首歌',
      callbackUrl: getCallbackUrl('/callback/vocals')
    });

    console.log('✅ 任务创建成功:', response.data);
    const taskId = response.data.data.taskId;

    const callbackData = await waitForResult(taskId);
    console.log('\n✅ 添加人声完成!');
    console.log('📦 结果:', JSON.stringify(callbackData, null, 2));
    return { success: true, taskId, data: callbackData };
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

// 测试健康检查
async function testHealthCheck() {
  console.log('\n' + '='.repeat(50));
  console.log('💚 测试: 健康检查');
  console.log('='.repeat(50));

  try {
    const response = await axios.get(`${CONFIG.SERVER_URL}/health`);
    console.log('✅ 服务健康:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ 服务不可用:', error.message);
    return { success: false, error: error.message };
  }
}

// 测试获取统计信息
async function testGetStats() {
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试: 获取统计信息');
  console.log('='.repeat(50));

  try {
    const response = await axios.get(`${CONFIG.SERVER_URL}/api/music/stats`);
    console.log('✅ 统计信息:', JSON.stringify(response.data, null, 2));
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ 获取失败:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

// 测试查询任务状态
async function testGetTask(taskId) {
  console.log('\n' + '='.repeat(50));
  console.log('🔍 测试: 查询任务状态');
  console.log('='.repeat(50));

  try {
    const response = await axios.get(`${CONFIG.SERVER_URL}/api/music/tasks/${taskId}`);
    console.log('✅ 任务信息:', JSON.stringify(response.data, null, 2));
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ 查询失败:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

// ============== 主函数 ==============

async function runAllTests() {
  console.log('\n' + '🎯'.repeat(25));
  console.log('     中台模拟测试 - AI 音乐服务接口');
  console.log('🎯'.repeat(25));
  console.log(`\n📡 服务器地址: ${CONFIG.SERVER_URL}`);
  console.log('📋 模式: 自动轮询（无需公网回调地址）\n');

  const results = {
    healthCheck: null,
    stats: null,
    generateLyrics: null,
    generateMusic: null,
  };

  try {
    // 1. 健康检查
    results.healthCheck = await testHealthCheck();

    // 2. 获取统计信息
    results.stats = await testGetStats();

    // 3. 测试生成歌词（通常较快）
    results.generateLyrics = await testGenerateLyrics();

    // 4. 测试生成音乐（通常较慢）
    results.generateMusic = await testGenerateMusic();

    // 5. 如果音乐生成成功，可以测试添加人声
    // if (results.generateMusic.success && results.generateMusic.data?.data?.audio_url) {
    //   results.addVocals = await testAddVocals(results.generateMusic.data.data.audio_url);
    // }

  } finally {
    // 打印测试总结
    console.log('\n' + '='.repeat(50));
    console.log('📋 测试结果总结');
    console.log('='.repeat(50));

    for (const [name, result] of Object.entries(results)) {
      if (result) {
        const status = result.success ? '✅ 通过' : '❌ 失败';
        console.log(`  ${name}: ${status}`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('测试完成!');
    console.log('='.repeat(50));

    process.exit(0);
  }
}

// 测试添加人声（使用公网音频URL）
async function testAddVocalsWithUrl(audioUrl, useRealCallback = false) {
  console.log('\n' + '='.repeat(50));
  console.log('🎤 测试: 添加人声');
  console.log('='.repeat(50));

  if (!audioUrl) {
    console.log('⚠️ 需要提供音频URL参数');
    console.log('用法: node test-with-callback.js vocals <音频URL>');
    console.log('示例: node test-with-callback.js vocals https://example.com/audio.mp3');
    return { success: false, error: '需要 audioUrl' };
  }

  // 如果使用真实回调，使用音乐回调地址（添加人声算作音乐类）
  // 注意: getCallbackUrl 已经添加了 /callback/ 前缀，所以只传 'vocals'
  const callbackUrl = useRealCallback
    ? CONFIG.REAL_CALLBACK.MUSIC
    : getCallbackUrl('vocals');

  // 添加人声需要的完整参数
  const requestParams = {
    audioUrl: audioUrl,
    prompt: '用温柔的女声演唱这首歌',
    title: '温柔女声版',           // 必填：歌曲标题
    style: 'Pop, Soft, Ballad',   // 必填：音乐风格
    callbackUrl: callbackUrl,
    vocalGender: 'f',             // 可选：女声
    model: 'V4_5PLUS'             // 可选：模型版本
  };

  try {
    console.log('📤 请求参数:');
    console.log(JSON.stringify(requestParams, null, 2));

    const response = await axios.post(`${CONFIG.SERVER_URL}/api/music/add-vocals`, requestParams);

    console.log('✅ 任务创建成功:', response.data);
    const taskId = response.data.data.taskId;

    const callbackData = await waitForResult(taskId);
    console.log('\n✅ 添加人声完成!');
    console.log('📦 结果:', JSON.stringify(callbackData, null, 2));
    return { success: true, taskId, data: callbackData };
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

// 单独测试函数（可通过命令行参数选择）
async function runSingleTest(testName, useRealCallback = false, extraArgs = []) {
  console.log(`\n📡 服务器地址: ${CONFIG.SERVER_URL}`);
  if (useRealCallback) {
    console.log('📞 使用真实中台回调地址');
  }

  try {
    switch (testName) {
      case 'health':
        await testHealthCheck();
        break;
      case 'stats':
        await testGetStats();
        break;
      case 'lyrics':
        await testGenerateLyrics(useRealCallback);
        break;
      case 'music':
        await testGenerateMusic(useRealCallback);
        break;
      case 'music-custom':
        await testGenerateMusicCustom(useRealCallback);
        break;
      case 'music-instrumental':
        await testGenerateMusicInstrumental(useRealCallback);
        break;
      case 'vocals':
        const audioUrl = extraArgs[0];
        await testAddVocalsWithUrl(audioUrl, useRealCallback);
        break;
      default:
        console.log('可用的测试: health, stats, lyrics, music, music-custom, music-instrumental, vocals');
    }
  } finally {
    console.log('\n测试完成!');
    process.exit(0);
  }
}

// ============== 入口 ==============
const args = process.argv.slice(2);
const useRealCallback = args.includes('--real');
const filteredArgs = args.filter(a => a !== '--real');
const testName = filteredArgs[0];
const extraArgs = filteredArgs.slice(1);

console.log(`
====================================================
  中台模拟测试脚本（自动轮询模式）
====================================================
使用方法:
  node test-with-callback.js                    # 运行所有测试
  node test-with-callback.js health             # 只测试健康检查
  node test-with-callback.js stats              # 只测试统计信息
  node test-with-callback.js lyrics             # 只测试生成歌词
  node test-with-callback.js music              # 生成音乐（非自定义模式+人声）
  node test-with-callback.js music-custom       # 生成音乐（自定义模式+人声）
  node test-with-callback.js music-instrumental # 生成纯音乐（非自定义模式）
  node test-with-callback.js vocals <音频URL>   # 添加人声（需要公网可访问的音频URL）

  添加 --real 参数使用真实中台回调地址:
  node test-with-callback.js music --real       # 生成音乐并回调真实中台
  node test-with-callback.js lyrics --real      # 生成歌词并回调真实中台
  node test-with-callback.js vocals <URL> --real # 添加人声并回调真实中台

真实回调地址:
  音乐: ${CONFIG.REAL_CALLBACK.MUSIC}
  歌词: ${CONFIG.REAL_CALLBACK.LYRICS}
====================================================
`);

switch (testName) {
  case 'health':
  case 'stats':
  case 'lyrics':
  case 'music':
  case 'music-custom':
  case 'music-instrumental':
  case 'vocals':
    runSingleTest(testName, useRealCallback, extraArgs);
    break;
  default:
    runAllTests();
}

