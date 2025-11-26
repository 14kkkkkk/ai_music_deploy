#!/bin/bash

# ============================================
# AI 音乐服务一键启动脚本
# ============================================

set -e

echo "=========================================="
echo "   AI 音乐服务启动脚本"
echo "=========================================="

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未安装 Node.js"
    echo "请先安装 Node.js 18+: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ 错误: Node.js 版本过低，需要 18+"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "❌ 错误: 未找到 .env 配置文件"
    exit 1
fi

echo "✅ 配置文件存在"

# 创建必要目录
mkdir -p logs temp_audio
echo "✅ 目录已创建"

# 安装依赖
echo ""
echo "📦 安装依赖..."
npm install --production=false

# 全局安装 PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装 PM2..."
    npm install -g pm2
fi

echo "✅ PM2 版本: $(pm2 -v)"

# 编译 TypeScript
echo ""
echo "🔨 编译 TypeScript..."
npm run build

# 停止旧服务（如果存在）
echo ""
echo "🔄 重启服务..."
pm2 delete ai-music-service 2>/dev/null || true

# 启动服务
pm2 start ecosystem.config.js

# 保存 PM2 进程列表
pm2 save

echo ""
echo "=========================================="
echo "✅ 服务启动成功!"
echo "=========================================="
echo ""
echo "服务地址: http://47.252.36.81:3001"
echo ""
echo "常用命令:"
echo "  查看状态: pm2 status"
echo "  查看日志: pm2 logs ai-music-service"
echo "  重启服务: pm2 restart ai-music-service"
echo "  停止服务: pm2 stop ai-music-service"
echo ""

