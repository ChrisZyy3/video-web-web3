<template>
  <view class="video-card" @click="$emit('click')">
    <view class="card-cover" :class="{ 'card-cover--large': size === 'large' }">
      <video
        :id="videoId"
        class="cover-video"
        :src="video"
        :poster="framePoster"
        :autoplay="autoplay"
        :loop="loop"
        :muted="muted"
        :playsinline="true"
        :show-center-play-btn="false"
        :show-play-btn="false"
        :show-fullscreen-btn="false"
        :show-progress="false"
        :controls="false"
        :enable-progress-gesture="false"
        preload="metadata"
        object-fit="cover"
        @canplay="onCanPlay"
        @loadedmetadata="onVideoMeta"
        @error="onError"
      />
   <!--   <view
        class="cover-fav"
        :class="{ 'cover-fav--active': favorited }"
        @click.stop="$emit('favorite')"
      >
        <image class="cover-fav-icon" :src="heartIcon" mode="aspectFit" />
      </view> -->
     <!-- <view class="cover-views">
        <image class="cover-play-icon" :src="playIcon" mode="aspectFit" />
        <text class="cover-views-text">{{ views }}</text>
      </view> -->
    </view>
    <view class="card-footer">
      <text class="card-footer-text">{{description}}</text>
    </view>
  </view>
</template>

<script setup>
// 引入 Vue 响应式与生命周期 API，新增 watch 以监听数据源变化
// Import Vue reactivity and lifecycle APIs, adding watch to listen for source changes
import { ref, computed, onMounted, watch } from 'vue'
import { useVideoFirstFramePoster } from '@/utils/use-video-poster'
import { applyNativeVideoPoster } from '@/utils/video-poster'

const props = defineProps({
  views: {
    type: [String, Number],
    default: '0'
  },
  size: {
    type: String,
    default: 'normal'
  },
  cover: {
    type: String,
    default: ''
  },
  video: {
    type: String,
    default: ''
  },
  videoId: {
    type: String,
    required: true
  },
  autoplay: {
    type: Boolean,
    default: true
  },
  loop: {
    type: Boolean,
    default: true
  },
  muted: {
    type: Boolean,
    default: true
  },
  title: {
  	  type: String,
  	  default: ''
  },
  description: {
  	  type: String,
  	  default: ''
  },
  favorited: {
    type: Boolean,
    default: false
  },
})

defineEmits(['click', 'favorite'])

const framePoster = useVideoFirstFramePoster(
  () => props.video,
  () => props.cover,
  () => props.videoId
)

const HEART_PATH = '<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>'

const hasPlayed = ref(false)

const heartIcon = computed(() => {
	if (props.favorited) {
		return svgIcon(HEART_PATH, '#FFFFFF', '#E53935')
	}
	return svgIcon(HEART_PATH, '#FFFFFF')
})
const playIcon = svgIcon('<polygon points="5 3 19 12 5 21 5 3"/>', '#FFFFFF', '#FFFFFF')

function svgIcon(paths, color, fill = 'none') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

// 尝试开始自动播放视频
// Attempt to autoplay the video
const tryPlay = () => {
  // 如果不允许自动播放、已经播放过、或者视频播放源（video src）为空，则直接拦截返回以避免报错
  // If autoplay is disabled, already played, or the video source is empty, return early to prevent errors
  if (!props.autoplay || hasPlayed.value || !props.video) return
  
  // 安全获取视频元素上下文并调用播放接口
  // Safely get video context and trigger playback
  const ctx = uni.createVideoContext(props.videoId)
  if (ctx) {
    ctx.play()
    hasPlayed.value = true
  }
}

// 当视频加载到足够可播放的帧数据时，触发尝试播放
// Trigger attempt play when enough frames are loaded (onCanPlay event)
const onCanPlay = () => {
  tryPlay()
}

const onVideoMeta = () => {
  if (framePoster.value) applyNativeVideoPoster(props.videoId, framePoster.value)
}

const onError = (e) => {
  console.error('列表视频加载失败', props.videoId, e.detail)
}

// 监听视频源变动：若由空（API 尚未返回）变为有效地址，重置标记并触发播放
// Watch for video source changes: reset hasPlayed and try play if source becomes valid
watch(
  () => props.video,
  (newVal) => {
    if (newVal) {
      hasPlayed.value = false
      setTimeout(tryPlay, 200)
    }
  }
)

onMounted(() => {
  // 组件加载挂载 300ms 后，安全触发播放尝试
  // Safely trigger playback attempt 300ms after mounting
  setTimeout(tryPlay, 300)
})
</script>

<style>
.video-card {
  overflow: hidden;
  border-radius: 16rpx;
  background: #1A1A1A;
}

.card-cover {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 56.25%;
  overflow: hidden;
}

.card-cover--large {
  padding-bottom: 52%;
}

.cover-video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: block;
  background: #141414;
}

.cover-fav {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  z-index: 2;
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-fav--active {
  background: rgba(229, 57, 53, 0.85);
}

.cover-fav-icon {
  width: 28rpx;
  height: 28rpx;
}

.cover-views {
  position: absolute;
  left: 16rpx;
  bottom: 16rpx;
  z-index: 2;
  display: flex;
  flex-direction: row;
  align-items: center;
}

.cover-play-icon {
  width: 24rpx;
  height: 24rpx;
  margin-right: 8rpx;
}

.cover-views-text {
  font-size: 24rpx;
  color: #fff;
}

.card-footer {
  height: 56rpx;
  background: #E8D5B5;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 20rpx;
}

.card-footer-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #2a2218;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
