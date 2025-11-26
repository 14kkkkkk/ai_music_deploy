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
 *
 * 参数说明：
 * - customMode=false（非自定义模式）：只需要 prompt，歌词将自动生成
 * - customMode=true（自定义模式）：
 *   - 必须提供 style 和 title
 *   - 如果 instrumental=false，prompt 必填（将作为精确歌词使用）
 *   - 如果 instrumental=true，只需 style 和 title
 */
export interface GenerateMusicRequest {
  prompt: string;                // 音乐描述/歌词（非自定义模式必填，自定义模式下 instrumental=false 时必填）
  customMode: boolean;           // 自定义模式（必填）
  instrumental: boolean;         // 纯音乐/无歌词（必填）
  model: string;                 // 模型版本（必填）: V3_5, V4, V4_5, V4_5PLUS, V5
  callbackUrl: string;           // 回调URL（必填）
  style?: string;                // 音乐风格（自定义模式必填）
  title?: string;                // 歌曲标题（自定义模式必填）
  negativeTags?: string;         // 排除的风格标签
  personaId?: string;            // 人格ID（仅自定义模式可用）
  vocalGender?: 'm' | 'f';       // 人声性别 m=男, f=女
  styleWeight?: number;          // 风格权重 0.00-1.00
  weirdnessConstraint?: number;  // 创意发散度 0.00-1.00
  audioWeight?: number;          // 音频影响力权重 0.00-1.00
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
 * 回调元数据
 */
export interface CallbackMetadata {
  type: string;                  // 任务类型: 'music' | 'lyrics' | 'vocals'
  prompt: string;                // 原始提示词
  model?: string;                // 模型版本（音乐生成）
  customMode?: boolean;          // 自定义模式（音乐生成）
  instrumental?: boolean;        // 纯音乐（音乐生成）
  style?: string;                // 音乐风格（音乐生成）
  title?: string;                // 歌曲标题（音乐生成）
  audioUrl?: string;             // 原始音频URL（添加人声）
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
  metadata: CallbackMetadata;    // 元数据（必填）
}

