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
				<view class="page-content">
					<text class="page-title">{{ t('purchased.title') }}</text>
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
import tabbar from '@/components/tabbar/index'
import { calcTabbarPageLayout, setupMobileLayout } from '@/utils/h5-compat'

const { t } = useI18n()

const statusBarHeight = ref(0)
const scrollHeight = ref(0)
const pageHeight = ref(0)

const calcLayout = () => {
	const layout = calcTabbarPageLayout()
	statusBarHeight.value = layout.statusBarHeight
	scrollHeight.value = layout.scrollHeight
	pageHeight.value = layout.windowHeight
}

let unbindViewport = null

onMounted(() => {
	unbindViewport = setupMobileLayout(calcLayout)
})

onUnmounted(() => {
	unbindViewport?.()
})
</script>

<style>
.page {
	min-height: 100vh;
	min-height: calc(var(--vh, 1vh) * 100);
	min-height: -webkit-fill-available;
	background: #F8F8F8;
}

.page-content {
	padding: 40rpx;
}

.page-title {
	font-size: 36rpx;
	color: #333;
}

.bottom-space {
	height: 24rpx;
}
</style>
