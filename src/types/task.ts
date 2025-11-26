/**
 * 任务状态枚举
 */
export enum TaskStatus {
  PENDING = 'PENDING',           // 等待处理
  PROCESSING = 'PROCESSING',     // 处理中
  COMPLETED = 'COMPLETED',       // 已完成
  FAILED = 'FAILED'              // 失败
}

/**
 * 任务类型枚举
 */
export enum TaskType {
  MUSIC_GENERATION = 'MUSIC_GENERATION',           // 音乐生成
  LYRICS_GENERATION = 'LYRICS_GENERATION',         // 歌词生成
  ADD_VOCALS = 'ADD_VOCALS',                       // 添加人声
  ADD_INSTRUMENTAL = 'ADD_INSTRUMENTAL'            // 添加伴奏
}

/**
 * 任务接口
 */
export interface Task {
  id: string;                    // 任务ID
  status: TaskStatus;            // 任务状态
  type: TaskType;                // 任务类型
  input: any;                    // 输入参数
  output?: any;                  // 输出结果
  error?: string;                // 错误信息
  callbackUrl?: string;          // 回调URL
  progress: number;              // 进度 (0-100)
  createdAt: Date;               // 创建时间
  updatedAt: Date;               // 更新时间
  completedAt?: Date;            // 完成时间
}

/**
 * 音乐生成请求
 */
export interface GenerateMusicRequest {
  prompt: string;                // 音乐描述
  customMode?: boolean;          // 自定义模式
  instrumental?: boolean;        // 纯音乐（无人声）
  model?: string;                // 模型版本 (V3_5, V4, V4_5, V4_5PLUS, V5)
  title?: string;                // 歌曲标题
  tags?: string;                 // 音乐风格标签
  negativeTags?: string;         // 负面标签
  callbackUrl: string;           // 回调URL（必填）
}

/**
 * 歌词生成请求
 */
export interface GenerateLyricsRequest {
  prompt: string;                // 歌词主题描述
  callbackUrl: string;           // 回调URL（必填）
}

/**
 * 添加人声请求
 */
export interface AddVocalsRequest {
  audioUrl: string;              // 伴奏音频URL
  prompt: string;                // 人声描述
  callbackUrl: string;           // 回调URL（必填）
}

/**
 * 添加伴奏请求
 */
export interface AddInstrumentalRequest {
  audioUrl: string;              // 人声音频URL
  prompt: string;                // 伴奏描述
  callbackUrl: string;           // 回调URL（必填）
}

/**
 * 回调数据格式
 */
export interface CallbackPayload {
  taskId: string;                // 任务ID
  status: 'success' | 'failed';  // 任务状态
  taskType: string;              // 任务类型
  data?: any;                    // 成功时的数据
  error?: string;                // 失败时的错误信息
}

