<template>
  <view class="page">
    <view
      class="page-shell page-shell--tabbar"
      :style="{
        paddingTop: statusBarHeight + 'px',
        height: pageHeight + 'px'
      }"
    >
    <view class="scroll-slot" :style="{ height: scrollHeight + 'px' }">
    <scroll-view class="scroll-body" scroll-y>

      <!-- 顶部 Header -->
      <view class="nav-bar">
				<view class="back-btn" @click="handleBack">
					<text class="back-icon"></text>
				</view>
			<text class="nav-title">{{ t('favorite.title') }}</text>
			<view class="nav-placeholder" />
	  </view>

      <!-- 双列卡片 -->
      <view v-if="gridCards.length" class="card-grid section-wrap">
        <view v-for="item in gridCards" :key="item.id" class="card-grid-item">
          <video-card
            :views="item.views"
            :video="item.video"
            :cover="item.cover"
            :video-id="'card-video-' + item.id"
            :favorited="true"
            @click="handleCard(item)"
            @favorite="handleFavorite(item)"
          />
        </view>
      </view>
      <view v-else class="empty-wrap">
        <text class="empty-text">{{ t('favorite.empty') }}</text>
      </view>

      <view class="bottom-space" />
    </scroll-view>
    </view>

    <tabbar />
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { onShow } from '@dcloudio/uni-app'
import tabbar from '@/components/tabbar/index'
import videoCard from '@/components/video-card/index'
import { getFavorites, toggleFavorite } from '@/utils/favorites'
import { calcTabbarPageLayout, setupMobileLayout } from '@/utils/h5-compat'

const { t } = useI18n()

const COVER_SRC = '/static/images/video-cover.png'

const statusBarHeight = ref(0)
const scrollHeight = ref(0)
const pageHeight = ref(0)
const gridCards = ref([])

const loadFavorites = () => {
  gridCards.value = getFavorites()
}

const calcLayout = () => {
  const layout = calcTabbarPageLayout()
  statusBarHeight.value = layout.statusBarHeight
  scrollHeight.value = layout.scrollHeight
  pageHeight.value = layout.windowHeight
}

let unbindViewport = null

const handleBack = () => {
  uni.navigateBack()
}

const handleFavorite = (item) => {
  toggleFavorite(item)
  loadFavorites()
  uni.showToast({ title: t('common.removedFromFavorites'), icon: 'none' })
}

const pauseListVideos = () => {
  gridCards.value.forEach((item) => {
    try {
      uni.createVideoContext(`card-video-${item.id}`).pause()
    } catch (e) {}
  })
}

const handleCard = (item) => {
  pauseListVideos()
  uni.setStorageSync('videoDetailCache', {
    id: item.id,
    title: item.description || item.title || t('common.content'),
    description: item.description || '',
    views: item.views || 0,
    play_url: item.play_url || '',
    video: item.video || '',
    cover: item.cover || COVER_SRC
  })
  uni.navigateTo({ url: `/pages/video-detail/index?id=${item.id}` })
}

onMounted(() => {
  unbindViewport = setupMobileLayout(calcLayout)
  loadFavorites()
})

onUnmounted(() => {
  unbindViewport?.()
})

onShow(() => {
  loadFavorites()
})
</script>

<style>
.page {
  min-height: 100vh;
  min-height: calc(var(--vh, 1vh) * 100);
  min-height: -webkit-fill-available;
  background: #121212;
}

.scroll-body {
  width: 100%;
}

.section-wrap {
  padding: 0 24rpx;
}

.nav-bar {
	display: flex;
	flex-direction: row;
	align-items: center;
	height: 88rpx;
	padding: 0 24rpx;
}

.back-btn {
	width: 64rpx;
	height: 64rpx;
	display: flex;
	align-items: center;
	justify-content: flex-start;
	flex-shrink: 0;
}

.back-icon {
	font-size: 56rpx;
	color: #C9A86C;
	line-height: 1;
	font-weight: 200;
}

.nav-title {
	flex: 1;
	text-align: center;
	font-size: 36rpx;
	font-weight: 600;
	color: #C9A86C;
	letter-spacing: 4rpx;
}

.nav-placeholder {
	width: 64rpx;
	flex-shrink: 0;
}

.page-head {
	padding: 8rpx 28rpx 24rpx;
	text-align: center;
}

.page-title {
	display: block;
	font-size: 40rpx;
	font-weight: 700;
	color: #F0E6D8;
}

.page-sub {
	display: block;
	margin-top: 8rpx;
	font-size: 26rpx;
	color: #8B867C;
}


.category-grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  margin: 0 -8rpx;
}

.category-item {
  width: 25%;
  padding: 8rpx;
  box-sizing: border-box;
}

.category-btn {
  height: 64rpx;
  background: #1A1A1A;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.category-text {
  font-size: 24rpx;
  color: #BF9566;
}

.category-all {
  margin-top: 24rpx;
  height: 72rpx;
  border-radius: 36rpx;
  border: 1rpx solid #BF9566;
  display: flex;
  align-items: center;
  justify-content: center;
}

.category-all-text {
  font-size: 28rpx;
  color: #BF9566;
}

.notice-bar {
  margin: 24rpx 24rpx 0;
  height: 72rpx;
  padding: 0 24rpx;
  border-radius: 12rpx;
  background: #1A1A1A;
  display: flex;
  flex-direction: row;
  align-items: center;
}

.notice-icon {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
  margin-right: 12rpx;
}

.notice-text {
  flex: 1;
  font-size: 24rpx;
  color: #8B867C;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.section-title {
  margin-top: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.section-title-text {
  font-size: 36rpx;
  font-weight: 700;
  color: #BF9566;
}

.section-sub {
  margin-top: 16rpx;
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 20rpx;
}

.section-sub-side {
  flex: 1;
}

.section-sub-side--right {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
}

.section-sub-text {
  font-size: 24rpx;
  color: rgba(191, 149, 102, 0.9);
}

.section-more {
  font-size: 24rpx;
  color: #8B867C;
}

.card-grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  margin: 24rpx -12rpx 0;
}

.card-grid-item {
  width: 50%;
  padding: 12rpx;
  box-sizing: border-box;
}

.empty-wrap {
  padding: 120rpx 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-text {
  font-size: 28rpx;
  color: #8B867C;
}

.bottom-space {
  height: 24rpx;
}
</style>
