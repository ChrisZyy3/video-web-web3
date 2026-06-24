<template>
	<view v-if="visible" class="intro-mask" @click="handleClose">
		<view class="intro-panel" @click.stop>
			<view class="intro-close" @click="handleClose">
				<text class="intro-close-text">×</text>
			</view>

			<!-- <view class="intro-badge">
				<text class="intro-badge-text">VIP</text>
			</view> -->

			<!-- Promotional Banner Image Container / 宣传海报图片容器，引导用户了解充值特权 -->
			<view class="intro-banner-wrap">
				<!-- Banner Image / 宣传图片本身，使用静态资源占位，已替换为新会员海报背景图 (member-banner.jpg) -->
				<image class="intro-banner-img" src="/static/images/member-banner.jpg" mode="aspectFill" />
			</view>

			<text class="intro-title">{{ t('memberIntro.title') }}</text>
			<text class="intro-slogan">{{ t('memberIntro.slogan') }}</text>

			<view class="intro-list">
				<text class="intro-item">{{ t('memberIntro.benefit2') }}</text>
				<text class="intro-item">{{ t('memberIntro.benefit1') }}</text>
			</view>

			<view class="intro-submit" @click="handleConfirm">
				<text class="intro-submit-text">{{ t('memberIntro.rechargeNow') }}</text>
			</view>
			<view class="intro-later" @click="handleClose">
				<text class="intro-later-text">{{ t('memberIntro.maybeLater') }}</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps({
	visible: { type: Boolean, default: false }
})

const emit = defineEmits(['update:visible', 'close', 'confirm'])

const handleClose = () => {
	emit('update:visible', false)
	emit('close')
}

const handleConfirm = () => {
	emit('confirm')
	emit('update:visible', false)
}
</script>

<style>
.intro-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 1000002;
	background: rgba(0, 0, 0, 0.72);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 48rpx;
	box-sizing: border-box;
}

.intro-panel {
	position: relative;
	width: 100%;
	max-width: 620rpx;
	padding: 48rpx 40rpx 40rpx;
	border-radius: 28rpx;
	background: linear-gradient(180deg, #141414 0%, #0A0A0A 100%);
	border: 1rpx solid rgba(191, 149, 102, 0.35);
	box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.45);
}

.intro-close {
	position: absolute;
	top: 20rpx;
	right: 20rpx;
	width: 56rpx;
	height: 56rpx;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.06);
	display: flex;
	align-items: center;
	justify-content: center;
}

.intro-close-text {
	font-size: 40rpx;
	color: #8B867C;
	line-height: 1;
}

.intro-badge {
	width: 96rpx;
	height: 96rpx;
	margin: 0 auto;
	border-radius: 50%;
	background: linear-gradient(180deg, #D4B896 0%, #BF9566 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 8rpx 24rpx rgba(191, 149, 102, 0.4);
}

.intro-badge-text {
	font-size: 32rpx;
	font-weight: 700;
	color: #1A1A1A;
	letter-spacing: 2rpx;
}

.intro-title {
	display: block;
	margin-top: 28rpx;
	text-align: center;
	font-size: 40rpx;
	font-weight: 700;
	color: #F0E6D8;
}

.intro-slogan {
	display: block;
	margin-top: 16rpx;
	text-align: center;
	font-size: 32rpx;
	font-weight: 600;
	color: #C9A86C;
	line-height: 1.4;
}

.intro-list {
	margin-top: 32rpx;
	padding: 24rpx;
	border-radius: 16rpx;
	background: rgba(191, 149, 102, 0.08);
	border: 1rpx solid rgba(191, 149, 102, 0.18);
}

.intro-item {
	display: block;
	font-size: 26rpx;
	color: #8B867C;
	line-height: 1.8;
}

.intro-item + .intro-item {
	margin-top: 8rpx;
}

.intro-submit {
	margin-top: 36rpx;
	height: 96rpx;
	border-radius: 48rpx;
	background: linear-gradient(90deg, #A8845A 0%, #BF9566 50%, #D4B896 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 8rpx 24rpx rgba(191, 149, 102, 0.35);
}

.intro-submit-text {
	font-size: 32rpx;
	color: #1A1A1A;
	font-weight: 700;
}

.intro-later {
	margin-top: 20rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.intro-later-text {
	font-size: 26rpx;
	color: #8B867C;
}

/* Promotional Banner Wrapper / 宣传海报外部容器样式 */
.intro-banner-wrap {
	width: 100%; /* Force container width to be 100% / 铺满面板宽度 */
	height: 320rpx; /* Fixed banner height / 固定海报高度 */
	border-radius: 16rpx; /* Rounded card corners / 圆角卡片 */
	overflow: hidden; /* Hide overflow children / 隐藏内部溢出 */
	margin-bottom: 24rpx; /* Bottom spacing to separate from title / 底部间距 */
	border: 1rpx solid rgba(191, 149, 102, 0.25); /* Subtle gold accent border / 淡淡的金色描边 */
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.3); /* Subtle card drop shadow / 阴影效果 */
}

/* Promotional Banner Image / 宣传海报图片元素样式 */
.intro-banner-img {
	width: 100%; /* Make image fill wrapper width / 宽度100%铺满 */
	height: 100%; /* Make image fill wrapper height / 高度100%铺满 */
	display: block; /* Remove baseline block gaps / 消除底边间隙 */
}
</style>
