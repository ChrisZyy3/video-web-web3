<template>
	<view class="page">
		<scroll-view class="scroll-body" scroll-y :style="{ height: scrollHeight + 'px' }">
			<view :style="{ height: statusBarHeight + 'px' }" />

			<view class="page-content">
				<text class="page-title">{{ t('purchased.title') }}</text>
			</view>

			<view class="bottom-space" :style="{ height: bottomSpaceHeight + 'px' }" />
		</scroll-view>

		<tabbar />
	</view>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import tabbar from '@/components/tabbar/index'
import { getMobilePageLayout, getTabbarInsetPx, bindViewportResize } from '@/utils/h5-compat'

const { t } = useI18n()

const TABBAR_CONTENT_RPX = 110
const BULGE_EXTRA_RPX = 36

const statusBarHeight = ref(0)
const scrollHeight = ref(0)
const bottomSpaceHeight = ref(60)

const calcLayout = () => {
	const layout = getMobilePageLayout()
	statusBarHeight.value = layout.statusBarHeight
	scrollHeight.value = layout.windowHeight
	bottomSpaceHeight.value = getTabbarInsetPx(TABBAR_CONTENT_RPX, BULGE_EXTRA_RPX)
}

let unbindViewport = null

onMounted(() => {
	calcLayout()
	// #ifdef H5
	unbindViewport = bindViewportResize(calcLayout)
	// #endif
})

onUnmounted(() => {
	// #ifdef H5
	unbindViewport?.()
	// #endif
})
</script>

<style>
.page {
	min-height: 100vh;
	min-height: calc(var(--vh, 1vh) * 100);
	min-height: -webkit-fill-available;
	background: #F8F8F8;
}

.scroll-body {
	width: 100%;
}

.page-content {
	padding: 40rpx;
}

.page-title {
	font-size: 36rpx;
	color: #333;
}

.bottom-space {
	flex-shrink: 0;
}
</style>
