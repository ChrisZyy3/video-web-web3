<template>
  <view v-show="visible" class="player-mask">
    <video
      :id="videoId"
      :key="video"
      class="player-video"
      :class="{ 'player-video--ios': useIosNativeControls }"
      :src="video"
      :poster="framePoster"
      :autoplay="false"
      :loop="false"
      :muted="false"
      :playsinline="true"
      :controls="true"
      :show-center-play-btn="!useIosNativeControls"
      :show-fullscreen-btn="!useIosNativeControls"
      :enable-progress-gesture="true"
      preload="metadata"
      :object-fit="useIosNativeControls ? 'contain' : 'cover'"
      @canplay="onCanPlay"
      @play="onPlay"
      @waiting="onWaiting"
      @timeupdate="onTimeUpdate"
      @error="onError"
    />
    <!-- Custom loading spinner overlay shown when the video is loading or buffering -->
    <!-- 当视频加载中或缓冲时显示的自定义加载动画遮罩层 -->
    <view v-if="videoLoading" class="player-loading-overlay">
      <!-- Spinner circle element with rotating animation -->
      <!-- 旋转的圆形加载动画元素 -->
      <view class="loading-spinner" />
      <!-- Loading text translation display -->
      <!-- 正在加载的国际化提示文字 -->
      <text class="loading-text">{{ t('videoDetail.loading') || 'Loading...' }}</text>
    </view>
    <view class="player-close" :style="{ top: closeTop + 'px' }" @click="handleClose">
      <text class="player-close-text">×</text>
    </view>
  </view>
</template>

<script setup>
// Import core composition APIs from Vue
// 从 Vue 中导入核心组合式 API
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
// Import useI18n helper from vue-i18n for localization support
// 从 vue-i18n 中导入 useI18n 辅助方法以支持国际化翻译
import { useI18n } from 'vue-i18n'
// Import H5 device and layout utilities
// 导入 H5 移动设备及布局适配相关方法
import {
  getMobilePageLayout,
  bindViewportResize,
  shouldUseIosNativeVideoControls,
  patchNativeVideoControlsForIOS
} from '@/utils/h5-compat'
// Import hook for generating video first-frame poster
// 导入生成视频首帧封面的自定义 Hook
import { useVideoFirstFramePoster } from '@/utils/use-video-poster'

// Define incoming properties for the component
// 定义组件的外部输入属性 Props
const props = defineProps({
  // Control visibility of the player modal
  // 控制播放器遮罩弹窗是否可见
  visible: {
    type: Boolean,
    default: false
  },
  // Video source playback URL string
  // 视频播放地址 URL 字符串
  video: {
    type: String,
    default: ''
  },
  // Optional video placeholder/cover image
  // 视频封面图片地址（可选）
  cover: {
    type: String,
    default: ''
  },
  // Unique DOM identifier for the video tag
  // 视频标签的唯一 DOM 属性 ID
  videoId: {
    type: String,
    default: 'videoPlayer'
  }
})

// Define component custom event emitters
// 定义组件向外派发的自定义事件
const emit = defineEmits(['close', 'update:visible'])

// Access internationalization translation function
// 初始化并获取国际化语言包翻译函数
const { t } = useI18n()

// Vertical offset of the close button (adjusted for status bar)
// 关闭按钮距离顶部的像素高度（根据状态栏动态调整）
const closeTop = ref(20)
// Flag indicating if playback should auto-start once ready
// 用于标记视频加载完毕后是否需要自动开始播放
const needPlay = ref(false)
// Determine if native iOS controls should be rendered
// 标记是否使用 iOS 原生视频播放控制条
const useIosNativeControls = ref(false)
// Track loading or buffering state of the video
// 标记视频是否处于数据加载中或缓冲状态的响应式变量
const videoLoading = ref(false)

// Initialize custom hook to retrieve or generate video cover/poster
// 初始化首帧封面图生成的 Hook 逻辑
const framePoster = useVideoFirstFramePoster(
  () => props.video,
  () => props.cover,
  () => props.videoId
)

// Auto-detect browser/platform configurations
// 自动检测当前平台以决定播放器参数
const detectVideoPlatform = () => {
  // #ifdef H5
  // Check if H5 client runs on iOS browser/webview
  // 校验当前 H5 是否运行在 iOS 环境中
  useIosNativeControls.value = shouldUseIosNativeVideoControls()
  // #endif
}

// Adjust video elements for iOS native control compatibility
// 调整视频标签以适配 iOS 原生控制条
const patchVideoControls = () => {
  // #ifdef H5
  // Run compatibility script on next tick to ensure DOM is ready
  // 在 DOM 更新循环的下一次 tick 中执行适配脚本
  nextTick(() => patchNativeVideoControlsForIOS(props.videoId))
  // #endif
}

// Helper to create and retrieve video context sync
// 快速获取当前组件绑定的视频上下文对象
const getCtx = () => uni.createVideoContext(props.videoId)

// Programmatically initiate video playback
// 触发视频播放动作
const play = () => {
  // Guard clause: stop if the source URL is not yet bound/available
  // 守卫子句：若视频播放地址为空，则不调用播放以防止触发 NotSupportedError 错误
  if (!props.video) {
    // Log warning to console for debugging
    // 在控制台中输出警告日志
    console.warn('Video source is empty, play() deferred.')
    // Set auto-play flag to true so it plays automatically once loaded
    // 标记为需要播放，以便后续触发 canplay 事件时能自动播放
    needPlay.value = true
    // Exit early
    // 提前结束函数
    return
  }
  // Enable auto-play flag
  // 将自动播放标识置为真
  needPlay.value = true
  // Start playback using the context
  // 执行视频上下文的播放动作
  getCtx().play()
}

// Attempt to start playing if the play flag is active
// 尝试启动播放，仅在播放标识为真时起效
const tryPlay = () => {
  // Exit if playback has not been requested
  // 如果当前未请求播放则退出
  if (!needPlay.value) return
  // Invoke play
  // 触发播放
  getCtx().play()
}

// Triggered when video element can play through
// 视频元素已经加载足够数据可以开始播放时的回调
const onCanPlay = () => {
  // Apply platform patches for controls
  // 应用平台相关的控制栏补丁
  patchVideoControls()
  // Attempt playback
  // 尝试启动播放
  tryPlay()
  // Disable loading spinner
  // 隐去缓冲加载动画
  videoLoading.value = false
}

// Triggered when video playback is initiated
// 视频正式开始播放时的回调
const onPlay = () => {
  // Clear the auto-play requested flag
  // 清空自动播放请求标记
  needPlay.value = false
  // Start buffering overlay in case frames take time to render
  // 开启缓冲加载层，等待第一帧画面真正渲染完成
  videoLoading.value = true
}

// Triggered when video is buffering
// 视频播放卡顿正在缓冲数据的回调
const onWaiting = () => {
  // Display the localized loading spinner
  // 显示缓冲加载动画
  videoLoading.value = true
}

// Triggered as progress updates (guarantees frames are playing)
// 视频进度时间改变的回调（代表画面成功播放中）
const onTimeUpdate = () => {
  // If loading overlay is active, dismiss it since media is moving forward
  // 如果加载动画仍在显示，说明缓冲结束，隐去加载动画
  if (videoLoading.value) {
    // Dismiss loading status
    // 隐去加载状态
    videoLoading.value = false
  }
}

// Triggered when video loading fails
// 视频加载异常时的错误回调
const onError = (e) => {
  // Log specific detail object for errors
  // 在控制台中输出具体的资源加载异常日志
  console.error('全屏视频加载失败', e.detail)
  // Clear auto-play flag
  // 清除播放标识
  needPlay.value = false
  // Clear loading state
  // 关闭加载动画
  videoLoading.value = false
  // Notify user with a localized warning toast
  // 弹出加载失败的 Toast 提示
  uni.showToast({
    title: t('videoDetail.videoLoadError') || 'Video failed to load',
    icon: 'none',
    duration: 3000
  })
}

// Handle close button click interaction
// 处理点击关闭按钮的退出逻辑
const handleClose = () => {
  // Pause video
  // 暂停当前播放
  getCtx().pause()
  // Reset video seek timeline to start
  // 重置播放时间轴至起始位置
  getCtx().seek(0)
  // Clear play flag
  // 清空自动播放标记
  needPlay.value = false
  // Reset loading status
  // 重置加载状态
  videoLoading.value = false
  // Emit state close events to parent component
  // 触发自定义事件通知父级组件隐藏弹窗
  emit('update:visible', false)
  // Emit close event
  // 派发关闭事件
  emit('close')
}

// Recalculate top margin based on system safe area insets
// 结合安全区布局动态更新关闭按钮的顶部偏移量
const updateCloseTop = () => {
  // Adjust close button placement by adding 10px safe margin
  // 顶部状态栏高度加 10 像素偏移以防止重合
  closeTop.value = getMobilePageLayout().statusBarHeight + 10
}

// Variable to store unbind callback of resize listeners
// 用于保存视口尺寸监听注销函数
let unbindViewport = null

// Lifecycle hook after element is mounted to DOM
// 组件挂载阶段生命周期钩子
onMounted(() => {
  // Check and setup platform compatibility parameters
  // 检测并设置适配平台的参数
  detectVideoPlatform()
  // Adjust close button location
  // 调整关闭按钮位置
  updateCloseTop()
  // Apply iOS native controller patches
  // 处理原生控件补丁
  patchVideoControls()
  // #ifdef H5
  // Bind screen resize events to keep offsets correct
  // 监听 H5 端视口拉伸事件以动态刷新关闭按钮位置
  unbindViewport = bindViewportResize(updateCloseTop)
  // #endif
})

// Lifecycle hook before element is unmounted from DOM
// 组件销毁阶段生命周期钩子
onUnmounted(() => {
  // #ifdef H5
  // Unbind visual viewport listeners to avoid memory leaks
  // 移除视口大小变化事件监听，避免内存泄漏
  unbindViewport?.()
  // #endif
})

// Watcher for component visibility state changes
// 监听组件可见状态属性的改变
watch(() => props.visible, (val) => {
  // If modal is hidden, pause video immediately to save traffic
  // 若播放弹窗被关闭，立即暂停视频以节省用户流量
  if (!val) {
    // Call pause on video context
    // 暂停视频播放
    getCtx().pause()
    // Reset flags
    // 重置相关标记
    needPlay.value = false
    // Clear loader status
    // 清除加载状态
    videoLoading.value = false
    // Return early
    // 提前退出
    return
  }
  // If visible, apply platform compatibility adjustments
  // 如果弹窗被打开，应用平台控件补丁
  patchVideoControls()
})

// Watcher for video URL changes
// 监听视频源 URL 地址的改变
watch(() => props.video, () => {
  // Refresh player settings and controls
  // 刷新视频设置和原生播放控件
  patchVideoControls()
})

// Expose internal play function for parent usage
// 暴露内部 play 方法以允许父级组件直接控制播放
defineExpose({ play })
</script>

<style>
/* Full screen translucent mask overlay */
/* 全屏黑色遮罩底层样式 */
.player-mask {
  position: fixed; /* Fix to viewport */
  top: 0; /* Align top */
  left: 0; /* Align left */
  right: 0; /* Align right */
  bottom: 0; /* Align bottom */
  z-index: 1000000; /* Set very high z-index to stay on top */
  background: #000; /* Dark black background */
}

/* Video tag layout */
/* 视频标签主容器布局 */
.player-video {
  width: 100%; /* Stretch width */
  height: 100%; /* Stretch height */
  display: block; /* Render block element */
  background: #000; /* Fallback black background */
}

/* Specific scaling fit for iOS native media layout */
/* 适配 iOS 设备的原生缩放模式 */
.player-video--ios {
  object-fit: contain; /* Contain mode ensures full control visibility */
}

/* Loading overlay container covering player space */
/* 覆盖整个播放器区域的缓冲加载遮罩 */
.player-loading-overlay {
  position: absolute; /* Set absolute position relative to player-mask */
  top: 0; /* Align top */
  left: 0; /* Align left */
  right: 0; /* Align right */
  bottom: 0; /* Align bottom */
  background: rgba(0, 0, 0, 0.65); /* Translucent dark mask */
  display: flex; /* Flex layout */
  flex-direction: column; /* Stack vertically */
  align-items: center; /* Center horizontally */
  justify-content: center; /* Center vertically */
  z-index: 5; /* Lay above video player */
}

/* Throttled gold spin ring style */
/* 旋转的黄金加载动画圈 */
.loading-spinner {
  width: 64rpx; /* Diameter in rpx */
  height: 64rpx; /* Diameter in rpx */
  border: 4rpx solid rgba(191, 149, 102, 0.25); /* Muted gold border base */
  border-top-color: #BF9566; /* Vibrant theme gold accent border */
  border-radius: 50%; /* Make circular */
  animation: video-spin 0.8s linear infinite; /* Spin animation cycle */
}

/* Informative text below spinner */
/* 加载圈底部的提示文字样式 */
.loading-text {
  margin-top: 18rpx; /* Spacing */
  font-size: 24rpx; /* Text size */
  color: #BF9566; /* Match theme gold color */
}

/* Spin animation keyframe declarations */
/* 控制旋转动画的关键帧定义 */
@keyframes video-spin {
  from {
    transform: rotate(0deg); /* Start at 0 degrees */
  }
  to {
    transform: rotate(360deg); /* End at 360 degrees */
  }
}

/* Circular close button styling */
/* 圆形关闭按钮样式 */
.player-close {
  position: absolute; /* Place over video mask */
  right: 24rpx; /* Spacing from right */
  z-index: 10; /* Set z-index above loading and video layers */
  width: 64rpx; /* Button width */
  height: 64rpx; /* Button height */
  border-radius: 50%; /* Circular boundaries */
  background: rgba(0, 0, 0, 0.5); /* Semi-transparent black background */
  display: flex; /* Flex alignment */
  align-items: center; /* Center text vertically */
  justify-content: center; /* Center text horizontally */
}

/* Close symbol styling */
/* 关闭按钮的叉号文字样式 */
.player-close-text {
  font-size: 48rpx; /* Scale font size */
  color: #fff; /* White color */
  line-height: 1; /* Reset line height */
  margin-top: -4rpx; /* Vertical align adjustment */
}
</style>
