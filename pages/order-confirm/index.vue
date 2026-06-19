<template>
	<view class="page">
		<view class="main" :style="{ paddingTop: statusBarHeight + 'px' }">
			<!--<view class="top-bar">
				<view class="brand">
					<view class="brand-icon">
						<image class="brand-icon-img" :src="icons.shield" mode="aspectFit" />
					</view>
					<text class="brand-name">传媒</text>
				</view>
				<view class="service-btn" @click="handleService">
					<image class="service-icon" :src="icons.headset" mode="aspectFit" />
					<text class="service-text">客服</text>
				</view>
			</view>-->
			<view class="nav-bar">
				<view class="back-btn" @click="handleBack">
					<text class="back-icon">‹</text>
				</view>
			</view>

			<view class="page-head">
				<text class="page-title">Order Details</text>
				<text class="page-sub">Please confirm your order information</text>
			</view>

			<scroll-view class="scroll-body" scroll-y :style="{ height: scrollHeight + 'px' }">
				<view class="amount-card">
					<text class="amount-value">
					{{ order.total }} USDT
					</text>
					<text class="amount-network">Network · {{ order.network }}</text>

					<!-- <view class="info-banner">
						<image class="info-banner-icon" :src="icons.info" mode="aspectFit" />
						<text class="info-banner-text">您将支付网络手续费</text>
					</view> -->

					<view class="timer-box">
						<image class="timer-icon" :src="icons.clock" mode="aspectFit" />
						<view class="timer-content">
							<text class="timer-label">Order Expires</text>
							<text class="timer-value">{{ countdown }}</text>
						</view>
					</view>

					<view class="detail-card">
						<text class="detail-title">Order Information</text>
						<view class="detail-grid">
							<view class="detail-cell">
								<text class="detail-label">Payment Amount</text>
								<text class="detail-value">${{ payAmount }}</text>
							</view>
							<view class="detail-cell">
								<!-- <text class="detail-label">联系方式</text>
								<text class="detail-value">{{ order.contact }}</text> -->
							</view>
							<view class="detail-cell">
								<text class="detail-label">Unit Price</text>
								<text class="detail-value">{{ order.unitPrice }} USDT</text>
							</view>
							<view class="detail-cell">
								<text class="detail-label">Quantity</text>
								<text class="detail-value">{{ order.quantity }}</text>
							</view>
						</view>
						<view class="detail-row-full">
							<text class="detail-label">Order No.</text>
							<text class="detail-value detail-value--sm">{{ order.orderNo }}</text>
						</view>
					</view>
				</view>

			<!-- 	<view class="select-card">
					<view class="select-icon select-icon--gold">
						<image class="select-icon-img" :src="icons.coin" mode="aspectFit" />
					</view>
					<text class="select-text">{{ order.currency }}</text>
				</view>

				<view class="select-card">
					<view class="select-icon select-icon--bronze">
						<image class="select-icon-img" :src="icons.network" mode="aspectFit" />
					</view>
					<text class="select-text">TRON (TRC-20)</text>
				</view> -->

				<!-- <view class="action-row">
					<view class="action-secondary" @click="handleService">
						<image class="action-secondary-icon" :src="icons.chat" mode="aspectFit" />
						<text class="action-secondary-text">联系客服</text>
					</view>
					<view class="action-secondary action-secondary--gold" @click="handleEnergy">
						<image class="action-secondary-icon" :src="icons.bolt" mode="aspectFit" />
						<text class="action-secondary-text action-secondary-text--gold">TRX能量内购</text>
					</view>
				</view -->>

				<view class="bottom-space" />
			</scroll-view>

			<view class="footer" :style="{ paddingBottom: safeBottom + 'px' }">
				<view class="footer-btn" @click="handleNext">
					<text class="footer-btn-text">Next: Confirm Order</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const statusBarHeight = ref(0)
const scrollHeight = ref(0)
const safeBottom = ref(0)
const countdown = ref('30:00')
const order = ref({
	orderNo: '',
	title: '',
	unitPrice: '1',
	total: '1.00',
	contact: '',
	quantity: 1,
	network: 'TRC20',
	currency: 'USDT',
	expireAt: Date.now() + 30 * 60 * 1000
})

let timer = null

const payAmount = computed(() => {
	const val = parseFloat(order.value.total || '0')
	return val.toFixed(2)
})

const icons = {
	shield: svgIcon('<path d="M12 3l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7l8-4z"/><path d="M9 12l2 2 4-4"/>', '#1A1A1A', '#BF9566'),
	headset: svgIcon('<path d="M4 14v-4a8 8 0 0116 0v4"/><rect x="2" y="14" width="5" height="6" rx="2"/><rect x="17" y="14" width="5" height="6" rx="2"/>', '#8B867C'),
	info: svgIcon('<circle cx="12" cy="12" r="9"/><line x1="12" y1="10" x2="12" y2="16"/><line x1="12" y1="7" x2="12" y2="7"/>', '#BF9566'),
	clock: svgIcon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', '#C9A86C'),
	coin: svgIcon('<circle cx="12" cy="12" r="8"/><path d="M8 12h8M12 8v8"/>', '#1A1A1A', '#C9A86C'),
	network: svgIcon('<circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M8 7l4 9M16 7l-4 9"/>', '#1A1A1A', '#BF9566'),
	chat: svgIcon('<path d="M4 5h16v10H8l-4 4V5z"/>', '#BF9566'),
	bolt: svgIcon('<path d="M13 2L4 14h7l-1 8 10-14H12l1-6z"/>', '#C9A86C')
}

function svgIcon(paths, color, fill = 'none') {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const calcLayout = () => {
	const sys = uni.getSystemInfoSync()
	statusBarHeight.value = sys.statusBarHeight || 0
	safeBottom.value = sys.safeAreaInsets?.bottom || 0
	const footerH = uni.upx2px(120) + safeBottom.value
	const topH = uni.upx2px(200) + statusBarHeight.value
	scrollHeight.value = sys.windowHeight - topH - footerH
}

const loadOrder = () => {
	const data = uni.getStorageSync('pendingOrder')
	if (data) order.value = { ...order.value, ...data }
}

const updateCountdown = () => {
	const left = Math.max(0, order.value.expireAt - Date.now())
	const min = Math.floor(left / 60000)
	const sec = Math.floor((left % 60000) / 1000)
	countdown.value = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
	if (left <= 0 && timer) {
		clearInterval(timer)
		uni.showToast({ title: 'Order expired', icon: 'none' })
		uni.relaunch({url: '/pages/index/index'})
	}
}

const handleBack = () => {
	uni.navigateBack()
}

const handleService = () => {
	uni.showToast({ title: 'Contact support', icon: 'none' })
}

const handleEnergy = () => {
	uni.showToast({ title: 'TRX energy purchase', icon: 'none' })
}

const handleNext = () => {
	uni.navigateTo({ url: '/pages/payment-wallet/index' })
}

onMounted(() => {
	calcLayout()
	loadOrder()
	updateCountdown()
	timer = setInterval(updateCountdown, 1000)
})

onUnmounted(() => {
	if (timer) clearInterval(timer)
})
</script>

<style>
.page {
	min-height: 100vh;
	background: #000;
}

.main {
	min-height: 100vh;
	display: flex;
	flex-direction: column;
	padding: 0 0.75rem 1rem;
}

.top-bar {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	padding: 16rpx 28rpx;
}

.brand {
	display: flex;
	flex-direction: row;
	align-items: center;
}

.brand-icon {
	width: 56rpx;
	height: 56rpx;
	border-radius: 14rpx;
	background: linear-gradient(180deg, #D4B896, #BF9566);
	display: flex;
	align-items: center;
	justify-content: center;
}

.brand-icon-img {
	width: 32rpx;
	height: 32rpx;
}

.brand-name {
	font-size: 32rpx;
	color: #F0E6D8;
	font-weight: 600;
	margin-left: 12rpx;
}

.service-btn {
	display: flex;
	flex-direction: row;
	align-items: center;
	padding: 12rpx 20rpx;
	border-radius: 32rpx;
	border: 1rpx solid rgba(191, 149, 102, 0.3);
	background: rgba(255, 255, 255, 0.04);
}

.service-icon {
	width: 28rpx;
	height: 28rpx;
}

.service-text {
	font-size: 24rpx;
	color: #8B867C;
	margin-left: 8rpx;
}

.nav-bar {
	padding: 8rpx 0;
}

.back-btn {
	width: 64rpx;
	height: 64rpx;
	display: flex;
	align-items: center;
	justify-content: flex-start;
}

.back-icon {
	font-size: 56rpx;
	color: #C9A86C;
	line-height: 1;
	font-weight: 200;
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

.scroll-body {
	flex: 1;
	padding: 0 24rpx;
	box-sizing: border-box;
}

.amount-card {
	padding: 32rpx 28rpx;
	border-radius: 24rpx;
	border: 1rpx solid rgba(191, 149, 102, 0.25);
	background: linear-gradient(180deg, #141414 0%, #0A0A0A 100%);
}

.amount-value {
	display: block;
	text-align: center;
	font-size: 52rpx;
	font-weight: 700;
	color: #F0E6D8;
}

.amount-network {
	display: block;
	text-align: center;
	margin-top: 8rpx;
	font-size: 26rpx;
	color: #8B867C;
}

.info-banner {
	margin-top: 28rpx;
	padding: 20rpx 24rpx;
	border-radius: 16rpx;
	border: 1rpx solid rgba(191, 149, 102, 0.35);
	background: rgba(191, 149, 102, 0.08);
	display: flex;
	flex-direction: row;
	align-items: center;
}

.info-banner-icon {
	width: 32rpx;
	height: 32rpx;
	flex-shrink: 0;
}

.info-banner-text {
	font-size: 26rpx;
	color: #D4B896;
	margin-left: 12rpx;
}

.timer-box {
	margin-top: 20rpx;
	padding: 24rpx;
	border-radius: 16rpx;
	border: 1rpx solid rgba(201, 168, 108, 0.45);
	background: rgba(191, 149, 102, 0.06);
	display: flex;
	flex-direction: row;
	align-items: center;
}

.timer-icon {
	width: 40rpx;
	height: 40rpx;
	flex-shrink: 0;
}

.timer-content {
	margin-left: 16rpx;
}

.timer-label {
	display: block;
	font-size: 24rpx;
	color: #8B867C;
}

.timer-value {
	display: block;
	margin-top: 4rpx;
	font-size: 44rpx;
	font-weight: 700;
	color: #C9A86C;
	letter-spacing: 2rpx;
}

.detail-card {
	margin-top: 24rpx;
	padding: 24rpx;
	border-radius: 20rpx;
	background: rgba(0, 0, 0, 0.45);
	border: 1rpx solid rgba(191, 149, 102, 0.15);
}

.detail-title {
	display: block;
	font-size: 28rpx;
	color: #D4B896;
	font-weight: 600;
	margin-bottom: 20rpx;
}

.detail-grid {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
}

.detail-cell {
	width: 50%;
	margin-bottom: 20rpx;
}

.detail-label {
	display: block;
	font-size: 24rpx;
	color: #8B867C;
}

.detail-value {
	display: block;
	margin-top: 6rpx;
	font-size: 28rpx;
	color: #F0E6D8;
	font-weight: 500;
}

.detail-value--sm {
	font-size: 24rpx;
	word-break: break-all;
}

.detail-row-full {
	padding-top: 8rpx;
	border-top: 1rpx solid rgba(191, 149, 102, 0.12);
}

.select-card {
	margin-top: 20rpx;
	padding: 28rpx 24rpx;
	border-radius: 20rpx;
	border: 1rpx solid rgba(191, 149, 102, 0.25);
	background: rgba(12, 12, 12, 0.9);
	display: flex;
	flex-direction: row;
	align-items: center;
}

.select-icon {
	width: 72rpx;
	height: 72rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.select-icon--gold {
	background: rgba(201, 168, 108, 0.2);
}

.select-icon--bronze {
	background: rgba(191, 149, 102, 0.15);
}

.select-icon-img {
	width: 40rpx;
	height: 40rpx;
}

.select-text {
	font-size: 32rpx;
	color: #F0E6D8;
	font-weight: 600;
	margin-left: 20rpx;
}

.action-row {
	margin-top: 24rpx;
	display: flex;
	flex-direction: row;
}

.action-secondary {
	flex: 1;
	height: 80rpx;
	border-radius: 16rpx;
	border: 1rpx solid rgba(191, 149, 102, 0.3);
	background: rgba(0, 0, 0, 0.4);
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
}

.action-secondary + .action-secondary {
	margin-left: 16rpx;
}

.action-secondary--gold {
	border-color: rgba(201, 168, 108, 0.45);
}

.action-secondary-icon {
	width: 28rpx;
	height: 28rpx;
}

.action-secondary-text {
	font-size: 24rpx;
	color: #BF9566;
	margin-left: 8rpx;
}

.action-secondary-text--gold {
	color: #C9A86C;
}

.bottom-space {
	height: 32rpx;
}

.footer {
	padding: 16rpx 24rpx 0;
	background: linear-gradient(180deg, transparent 0%, #000 30%);
}

.footer-btn {
	height: 96rpx;
	border-radius: 48rpx;
	background: linear-gradient(90deg, #A8845A 0%, #BF9566 50%, #D4B896 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 8rpx 24rpx rgba(191, 149, 102, 0.35);
	margin-bottom: 40rpx
}

.footer-btn-text {
	font-size: 32rpx;
	color: #1A1A1A;
	font-weight: 700;
}
</style>
