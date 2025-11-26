/**
 * API 测试脚本
 * 用于快速测试 AI 音乐服务的各个接口
 */

const axios = require('axios');

// 配置
const BASE_URL = 'http://47.252.36.81:3001';
const CALLBACK_URL = 'http://your-server.com/callback'; // 替换为实际的回调地址

// 延迟函数
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 1. 测试生成音乐
async function testGenerateMusic() {
  console.log('\n========== 测试生成音乐 ==========');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/music/generate`, {
      prompt: '一首轻快的流行歌曲，关于夏天和海滩',
      callbackUrl: CALLBACK_URL,
      customMode: false,
      instrumental: false,
      model: 'V4',
      title: '夏日海滩',
      tags: 'pop, upbeat, summer, beach'
    });

    console.log('✅ 任务创建成功:', response.data);
    const taskId = response.data.data.taskId;

    // 轮询查询任务状态
    console.log('\n开始轮询任务状态...');
    for (let i = 0; i < 120; i++) {
      await sleep(5000);
      
      const statusResponse = await axios.get(`${BASE_URL}/api/music/tasks/${taskId}`);
      const task = statusResponse.data.data;
      
      console.log(`[${i + 1}] 状态: ${task.status}, 进度: ${task.progress}%`);
      
      if (task.status === 'COMPLETED') {
        console.log('\n✅ 任务完成!');
        console.log('输出结果:', JSON.stringify(task.output, null, 2));
        return task;
      } else if (task.status === 'FAILED') {
        console.log('\n❌ 任务失败:', task.error);
        return null;
      }
    }
    
    console.log('\n⏱️ 任务超时');
    return null;
    
  } catch (error) {
    console.error('❌ 错误:', error.response?.data || error.message);
    return null;
  }
}

// 2. 测试生成歌词
async function testGenerateLyrics() {
  console.log('\n========== 测试生成歌词 ==========');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/music/generate-lyrics`, {
      prompt: '一首关于友情和青春的歌词',
      callbackUrl: CALLBACK_URL
    });

    console.log('✅ 任务创建成功:', response.data);
    const taskId = response.data.data.taskId;

    // 轮询查询任务状态
    console.log('\n开始轮询任务状态...');
    for (let i = 0; i < 60; i++) {
      await sleep(5000);
      
      const statusResponse = await axios.get(`${BASE_URL}/api/music/tasks/${taskId}`);
      const task = statusResponse.data.data;
      
      console.log(`[${i + 1}] 状态: ${task.status}, 进度: ${task.progress}%`);
      
      if (task.status === 'COMPLETED') {
        console.log('\n✅ 任务完成!');
        console.log('歌词内容:', task.output);
        return task;
      } else if (task.status === 'FAILED') {
        console.log('\n❌ 任务失败:', task.error);
        return null;
      }
    }
    
    console.log('\n⏱️ 任务超时');
    return null;
    
  } catch (error) {
    console.error('❌ 错误:', error.response?.data || error.message);
    return null;
  }
}

// 3. 测试查询任务状态
async function testGetTaskStatus(taskId) {
  console.log('\n========== 测试查询任务状态 ==========');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/music/tasks/${taskId}`);
    console.log('✅ 任务信息:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ 错误:', error.response?.data || error.message);
    return null;
  }
}

// 4. 测试获取统计信息
async function testGetStats() {
  console.log('\n========== 测试获取统计信息 ==========');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/music/stats`);
    console.log('✅ 统计信息:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ 错误:', error.response?.data || error.message);
    return null;
  }
}

// 5. 测试健康检查
async function testHealthCheck() {
  console.log('\n========== 测试健康检查 ==========');
  
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ 服务健康:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ 服务不可用:', error.message);
    return null;
  }
}

// 主函数
async function main() {
  console.log('='.repeat(50));
  console.log('AI 音乐服务 API 测试');
  console.log('='.repeat(50));
  console.log(`服务地址: ${BASE_URL}`);
  console.log(`回调地址: ${CALLBACK_URL}`);
  console.log('='.repeat(50));

  // 1. 健康检查
  await testHealthCheck();

  // 2. 获取统计信息
  await testGetStats();

  // 3. 测试生成歌词（较快）
  // await testGenerateLyrics();

  // 4. 测试生成音乐（较慢，需要等待）
  // await testGenerateMusic();

  console.log('\n='.repeat(50));
  console.log('测试完成');
  console.log('='.repeat(50));
}

// 运行测试
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testGenerateMusic,
  testGenerateLyrics,
  testGetTaskStatus,
  testGetStats,
  testHealthCheck
};

