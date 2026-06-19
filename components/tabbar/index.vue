<template>
  <view class="tabbar-wrap">
  <!-- :style="{ height: placeholderHeight + 'px', paddingBottom: safeBottom > 0 ? safeBottom + 'px' : '' }" -->
    <view
      class="tabbar-placeholder"
      
    />
    <!--  :style="safeBottom > 0 ? { paddingBottom: safeBottom + 'px' } : {}" -->
    <view
      class="tabbarMain"
     
    >
      <view class="tabBtnMina">
        <view
          v-for="(item, index) in navs"
          :key="item.path"
          class="itmMain"
          @click="goUrl(item, index)"
        >
          <view
            v-if="active === index"
            class="icon-bulge icon-bulge--active"
          >
            <image
              class="icon-bulge-img"
              :src="item.iconActive"
              mode="aspectFit"
            />
          </view>
          <image
            v-else
            class="imgse"
            :src="item.iconDefault"
            mode="aspectFit"
          />
          <text
            class="txtBtn"
            :class="{ txtBtnSel: active === index }"
          >{{ item.title }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'

const COLOR_DEFAULT = '#8B867C'
const COLOR_WHITE = '#FFFFFF'

const TABBAR_CONTENT_RPX = 110
const BULGE_EXTRA_RPX = 36

function svgIcon(paths, color, fill = 'none') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const MINE_ICON = '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>'

const navs = [
  {
    title: 'Home',
    path: 'pages/index/index',
    iconDefault: svgIcon('<path d="M3 10.5L12 4l9 6.5V19a2 2 0 01-2 2H5a2 2 0 01-2-2v-8.5z"/><polyline points="9 22 9 12 15 12 15 22"/>', COLOR_DEFAULT),
    iconActive: svgIcon('<path d="M3 10.5L12 4l9 6.5V19a2 2 0 01-2 2H5a2 2 0 01-2-2v-8.5z"/><polyline points="9 22 9 12 15 12 15 22"/>', COLOR_WHITE)
  },
  // {
  //   title: '已购',
  //   path: 'pages/purchased/index',
  //   iconDefault: svgIcon('<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>', COLOR_DEFAULT),
  //   iconActive: svgIcon('<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>', COLOR_WHITE)
  // },
  // {
  //   title: '收藏',
  //   path: 'pages/favorite/index',
  //   iconDefault: svgIcon('<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>', COLOR_DEFAULT),
  //   iconActive: svgIcon('<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>', COLOR_WHITE)
  // },
  // {
  //   title: '分享',
  //   path: 'pages/share/index',
  //   iconDefault: svgIcon('<rect x="5" y="11" width="14" height="10" rx="1.5"/><polyline points="12 11 12 5"/><polyline points="9 8 12 5 15 8"/>', COLOR_DEFAULT),
  //   iconActive: svgIcon('<rect x="5" y="11" width="14" height="10" rx="1.5"/><polyline points="12 11 12 5"/><polyline points="9 8 12 5 15 8"/>', COLOR_WHITE)
  // },
  {
    title: 'Profile',
    path: 'pages/mine/index',
    iconDefault: svgIcon(MINE_ICON, COLOR_DEFAULT),
    iconActive: svgIcon(MINE_ICON, COLOR_WHITE)
  }
]

const active = ref(0)
const safeBottom = ref(0)
const placeholderHeight = ref(60)
const currentPath = ref('')

const calcSafeArea = () => {
  const { safeAreaInsets, windowWidth, screenHeight, safeArea } = uni.getSystemInfoSync()
  let insetBottom = safeAreaInsets?.bottom || 0
  if (insetBottom === 0 && safeArea && screenHeight) {
    insetBottom = Math.max(screenHeight - safeArea.bottom, 0)
  }
  safeBottom.value = insetBottom
  const rpxToPx = windowWidth / 750
  placeholderHeight.value = Math.ceil((TABBAR_CONTENT_RPX + BULGE_EXTRA_RPX) * rpxToPx)
}

const activeHandler = () => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  if (!currentPage) return
  currentPath.value = currentPage.route
  const matchIndex = navs.findIndex(item => item.path === currentPath.value)
  if (matchIndex !== -1) {
    active.value = matchIndex
  }
}

const goUrl = (item, index) => {
  if (active.value === index) return
  uni.reLaunch({ url: `/${item.path}` })
}

onMounted(() => {
  calcSafeArea()
  activeHandler()
})

onShow(() => {
  activeHandler()
})
</script>

<style>
.tabbar-wrap {
  width: 100%;
  position: fixed;
  bottom: 0;
}

.tabbar-placeholder {
  box-sizing: content-box;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.tabbarMain {
  position: fixed;
  z-index: 999999;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1rpx solid #EBEBEB;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.06);
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.tabBtnMina {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  height: 110rpx;
}

.itmMain {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: 10rpx;
}

.imgse {
  width: 44rpx;
  height: 44rpx;
}

.icon-bulge {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  margin-top: -36rpx;
  margin-bottom: 4rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.icon-bulge--active {
  background: linear-gradient(180deg, #D4B896 0%, #BF9566 50%, #A8845A 100%);
  box-shadow: 0 6rpx 20rpx rgba(191, 149, 102, 0.45);
}

.icon-bulge-img {
  width: 44rpx;
  height: 44rpx;
}

.txtBtn {
  font-size: 22rpx;
  color: #8B867C;
  margin-top: 6rpx;
  line-height: 1;
}

.txtBtnSel {
  color: #BF9566;
}
</style>
