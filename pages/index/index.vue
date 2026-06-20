<template>
  <view class="page">
    <scroll-view class="scroll-body" scroll-y :style="{ height: scrollHeight + 'px' }">
      <view :style="{ height: statusBarHeight + 'px' }" />

      <!-- 顶部 Header -->
      <view class="header">
        <view class="header-brand">
          <view class="brand-logo">
            <image class="brand-logo-img" :src="icons.logo" mode="aspectFit" />
          </view>
          <view class="brand-text">
            <text class="brand-title">{{ t('index.brandTitle') }}</text>
            <text class="brand-subtitle">{{ t('index.brandSubtitle') }}</text>
          </view>
          
        </view>
        <view class="header-right" @click="removeLook">
        </view>
       <view class="header-search">
          <image class="search-icon" :src="icons.search" mode="aspectFit" />
          <input
            v-model="Keywords"
            class="search-input"
            type="text"
            :placeholder="t('index.keywordsPlaceholder')"
            placeholder-class="search-placeholder"
            @input="inputKeywords"
          />
        </view>

       <!-- <view class="header-menu" @click="handleMenu">
          <image class="menu-icon" :src="icons.menu" mode="aspectFit" />
        </view> -->
      </view>

      <!-- 分类网格 -->
    <!--  <view class="section-wrap">
        <view class="category-grid">
			<template v-for="(item,index) in categories"
			  :key="item.id">
				<view v-if="(typeShowAll&&index>-1)||(!typeShowAll&&index<8)"
				  class="category-item"
				  @click="handleCategory(item)">
				  <view class="category-btn">
				    <text class="category-text">{{ item.name }}</text>
				  </view>
				</view>
			</template>
        </view>
        <view class="category-all" @click="handleAllCategories">
          <text class="category-all-text">All Categories</text>
        </view>
      </view> -->

      <!-- 公告栏 -->
      <view class="notice-bar">
        <image class="notice-icon" :src="icons.speaker" mode="aspectFit" />
        <view class="notice-scroll">
          <view
            class="notice-track"
            :style="{ animationDuration: noticeDuration + 's' }"
          >
            <text class="notice-text" v-for="item in noticeText">{{ item }}</text>
          </view>
        </view>
      </view>

      <!-- 热门电影 -->
      <view class="section-wrap">
        <view class="section-title">
          <text class="section-title-text">{{ t('index.hotMovies') }}</text>
        </view>
        <view class="section-sub">
         <!-- <view class="section-sub-side" />
          <text class="section-sub-text">• Premium Zone •</text>
          <view class="section-sub-side section-sub-side--right">
            <text class="section-more" @click="handleMore">More ></text>
          </view> -->
        </view>
      </view>

      <!-- 大图卡片 -->
      <view class="section-wrap" v-if="featured">
        <video-card
          :views="featured.views"
          :video-id="'card-video-' + featured.id"
          size="large"
          :favorited="isFavorited(featured.id)"
          :video="getVideoUrl(featured)"
          :description="featured.description"
          :autoplay="false"
          :muted="false"
          @click="handleCard(featured)"
          @favorite="handleFavorite(featured)"
        />
      </view>

      <!-- 双列卡片 -->
      <view class="card-grid section-wrap" v-if="gridCards.length>0">
        <view class="card-grid-item" v-for="item in gridCards" :key="item.id">
            <video-card
            :views="item.views"
            :video-id="'card-video-' + item.id"
            :favorited="isFavorited(item.id)"
            :video="getVideoUrl(item)"
            :description="item.description"
            :autoplay="false"
            :muted="false"
            @click="handleCard(item)"
            @favorite="handleFavorite(item)"
            />
        </view>
      </view>

      <view class="bottom-space" :style="{ height: bottomSpaceHeight + 'px' }" />
    </scroll-view>

    <tabbar />

    <member-intro v-model:visible="showMemberIntro" @confirm="handleMemberRecharge" />
    <member-sheet v-model:visible="showMemberSheet" />
  </view>
</template>

<script setup>
import { ref, computed, onMounted, getCurrentInstance } from 'vue'
import { useI18n } from 'vue-i18n'
import { onShow } from '@dcloudio/uni-app'
import tabbar from '@/components/tabbar/index'
import videoCard from '@/components/video-card/index'
import memberIntro from '@/components/member-intro/index'
import memberSheet from '@/components/member-sheet/index'
import { getFavorites, toggleFavorite } from '@/utils/favorites'
import { getLookVideo, setLookVideo, removeLookVideo } from '@/utils/look-video'
import { getLookMember, setLookMember } from '@/utils/look-member'

const { t } = useI18n()
const { proxy } = getCurrentInstance()
const baseUrl = proxy.$baseUrl

const TABBAR_CONTENT_RPX = 110
const BULGE_EXTRA_RPX = 36

const statusBarHeight = ref(0)
const scrollHeight = ref(0)
const bottomSpaceHeight = ref(60)
const showMemberIntro = ref(false)
const showMemberSheet = ref(false)

const COVER_SRC = '/static/images/video-cover.png'
const noticeText = computed(() => [t('index.notice1'), t('index.notice2')])
const noticeDuration = computed(() => Math.max(14, noticeText.value.length * 0.32))

const categories = Array.from({ length: 24 }, (_, i) => ({
  id: i + 1,
  name: 'Category'
}))

const featured = ref({})
// {
//   id: 1,
//   views: 8702,
//   video: VIDEO_SRC,
//   cover: COVER_SRC,
//   title: '内容'
// }

const gridCards = ref([])
// [
//   { id: 2, views: 19930, video: VIDEO_SRC, cover: COVER_SRC, title: '内容' },
//   { id: 3, views: 12580, video: VIDEO_SRC, cover: COVER_SRC, title: '内容' },
//   { id: 4, views: 9860, video: VIDEO_SRC, cover: COVER_SRC, title: '内容' },
//   { id: 5, views: 7540, video: VIDEO_SRC, cover: COVER_SRC, title: '内容' },
//   { id: 6, views: 6320, video: VIDEO_SRC, cover: COVER_SRC, title: '内容' }
// ]

const dataList = ref([])

const favoriteMap = ref({})

const Keywords = ref('')

const removeLook = () => {
  removeLookVideo()
}

const syncFavorites = () => {
  const map = {}
  getFavorites().forEach((item) => {
    map[item.id] = true
  })
  favoriteMap.value = map
}

const isFavorited = (id) => !!favoriteMap.value[id]

const getVideoUrl = (item) => {
  if (!item?.play_url) return ''
  if (item.play_url.startsWith('http')) return item.play_url
  return `${baseUrl}${item.play_url}`
}

const handleFavorite = (item) => {
  const added = toggleFavorite(item)
  if (added) {
    favoriteMap.value = { ...favoriteMap.value, [item.id]: true }
    uni.showToast({ title: t('common.addedToFavorites'), icon: 'none' })
  } else {
    const next = { ...favoriteMap.value }
    delete next[item.id]
    favoriteMap.value = next
    uni.showToast({ title: t('common.removedFromFavorites'), icon: 'none' })
  }
}

const icons = {
  logo: svgIcon('<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M10 9l5 3-5 3V9z"/>', '#BF9566'),
  search: svgIcon('<circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/>', '#8B867C'),
  menu: svgIcon('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>', '#BF9566'),
  speaker: svgIcon('<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/>', '#BF9566')
}

function svgIcon(paths, color, fill = 'none') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const calcLayout = () => {
  const sys = uni.getSystemInfoSync()
  statusBarHeight.value = sys.statusBarHeight || 0
  scrollHeight.value = sys.windowHeight || sys.screenHeight

  let insetBottom = sys.safeAreaInsets?.bottom || 0
  if (insetBottom === 0 && sys.safeArea && sys.screenHeight) {
    insetBottom = Math.max(sys.screenHeight - sys.safeArea.bottom, 0)
  }
  const rpxToPx = (sys.windowWidth || 375) / 750
  bottomSpaceHeight.value = Math.ceil((TABBAR_CONTENT_RPX + BULGE_EXTRA_RPX) * rpxToPx) + insetBottom
}

const handleMenu = () => {
  uni.showToast({ title: t('index.menu'), icon: 'none' })
}

const handleCategory = (item) => {
  uni.showToast({ title: item.name, icon: 'none' })
}

const typeShowAll = ref(false)

const handleAllCategories = () => {
  typeShowAll.value = !typeShowAll.value
}

const handleMore = () => {
  uni.showToast({ title: t('index.more'), icon: 'none' })
}

const pauseListVideos = () => {
  const ids = [
    ...(featured.value?.id ? [`card-video-${featured.value.id}`] : []),
    ...gridCards.value.map(item => `card-video-${item.id}`)
  ]
  ids.forEach((id) => {
    try {
      uni.createVideoContext(id).pause()
    } catch (e) {}
  })
}

const goVideoDetail = (item) => {
	const lookList = getLookVideo()
  const index = lookList.findIndex(x => x.id === item.id)
  if(index==-1){
    if(lookList.length>1&&!getLookMember()){
      showMemberIntro.value = true
      return
    }
  }
  uni.navigateTo({ url: `/pages/video-detail/index?id=${item.id}` })
}

const handleCard = (item) => {
  goVideoDetail(item)
}

const inputKeywords = ()=> {
  let list = []
  if(Keywords.value){
    list = dataList.value.filter((item) => {
      let text = item.title+item.description
      return item.description.toLowerCase().includes(Keywords.value.toLowerCase())
    })
    gridCards.value = []
    if(list.length>1) gridCards.value = list.slice(1)
    if(list.length>0) featured.value = list[0]
  }else{
    if(dataList.value.length>1) gridCards.value = dataList.value.slice(1)
    if(dataList.value.length>0) featured.value = dataList.value[0]
  }
}

const getList = async () => {
  const res = await proxy.$http.get('/api/videos')
  dataList.value = res.items
  if(res.items.length>1) gridCards.value = res.items.slice(1)
  if(res.items.length>0) featured.value = res.items[0]
}

const handleMemberRecharge = () => {
  showMemberSheet.value = true
}

onMounted(() => {
  calcLayout()
  syncFavorites()
  getList()
  showMemberIntro.value = true
})

onShow(() => {
  syncFavorites()
})
</script>

<style>
.page {
  min-height: 100vh;
  background: #121212;
}

.scroll-body {
  width: 100%;
}

.section-wrap {
  padding: 0 24rpx;
}

.header {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 16rpx 24rpx 24rpx;
}

.header-brand {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-shrink: 0;
  margin-right: 16rpx;
}

.brand-logo {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  border: 1rpx solid rgba(191, 149, 102, 0.6);
  background: #0D0D0D;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12rpx;
}

.brand-logo-img {
  width: 48rpx;
  height: 48rpx;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #BF9566;
  line-height: 1.3;
}

.brand-subtitle {
  font-size: 20rpx;
  color: rgba(191, 149, 102, 0.8);
  line-height: 1.3;
  margin-top: 4rpx;
}


.header-right{
  flex: 0 0 50rpx;
  height: 72rpx;
  display: flex;
  flex-direction: row;
  align-items: center;
}

.header-search {
  flex: 1;
  height: 72rpx;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0 24rpx;
  border-radius: 36rpx;
  border: 1rpx solid rgba(191, 149, 102, 0.7);
  background: #0D0D0D;
}

.search-icon {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
  margin-right: 12rpx;
}

.search-input {
  flex: 1;
  height: 72rpx;
  font-size: 24rpx;
  color: #BF9566;
}

.search-placeholder {
  color: #8B867C;
  font-size: 24rpx;
}

.header-menu {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: 16rpx;
}

.menu-icon {
  width: 40rpx;
  height: 40rpx;
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
  overflow: hidden;
}

.notice-icon {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
  margin-right: 12rpx;
}

.notice-scroll {
  flex: 1;
  overflow: hidden;
  min-width: 0;
}

.notice-track {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  white-space: nowrap;
  animation: notice-marquee linear infinite;
  will-change: transform;
}

.notice-text {
  font-size: 24rpx;
  color: #8B867C;
  line-height: 1;
  padding-right: 80rpx;
  flex-shrink: 0;
}

@keyframes notice-marquee {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
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

.bottom-space {
  flex-shrink: 0;
}
</style>
