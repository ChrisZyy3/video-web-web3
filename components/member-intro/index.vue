<template>
	<view v-if="visible" class="intro-mask" @click="handleClose">
		<view class="intro-panel" @click.stop>
			<view class="intro-close" @click="handleClose">
				<text class="intro-close-text">×</text>
			</view>

			<!-- <view class="intro-badge">
				<text class="intro-badge-text">VIP</text>
			</view> -->

			<text class="intro-title">Membership</text>
			<text class="intro-slogan">Recharge to watch all videos for free</text>

			<view class="intro-list">
				<text class="intro-item">· Unlock unlimited access to all videos</text>
				<text class="intro-item">· New users can try 2 videos for free first</text>
			</view>

			<view class="intro-submit" @click="handleConfirm">
				<text class="intro-submit-text">Recharge Now</text>
			</view>
			<view class="intro-later" @click="handleClose">
				<text class="intro-later-text">Maybe Later</text>
			</view>
		</view>
	</view>
</template>

<script setup>
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
</style>
