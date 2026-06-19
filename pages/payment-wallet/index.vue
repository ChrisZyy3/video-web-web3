<template>
	<view class="page">
		<view class="main" :style="{ paddingTop: statusBarHeight + 'px', paddingBottom: safeBottom + 'px' }">
			<view class="nav-bar">
				<view class="back-btn" @click="handleBack">
					<text class="back-icon">‹</text>
				</view>
			</view>

			<view class="page-head">
				<text class="page-title">Select Payment Wallet</text>
				<text class="page-sub">Choose the wallet you use to pay</text>
			</view>

			<view class="amount-card">
				<text class="amount-label">Amount Due</text>
				<text class="amount-value">{{ order.total }} USDT</text>
				<text v-if="orderExpired" class="amount-expired">Order expired. Please go back and place a new order.</text>
			</view>

			<view class="wallet-grid">
				<view
					v-for="wallet in wallets"
					:key="wallet.id"
					class="wallet-item"
					:class="{ 'wallet-item--active': selectedWallet === wallet.id }"
					@click="selectedWallet = wallet.id"
				>
					<view class="wallet-icon" :style="{ background: wallet.bg }">
						<text class="wallet-icon-text">{{ wallet.abbr }}</text>
					</view>
					<text class="wallet-name">{{ wallet.name }}</text>
				</view>
			</view>

			<view class="spacer" />

			<view
				class="footer-btn"
				:class="{ 'footer-btn--disabled': opening || orderExpired }"
				@click="handlePay"
			>
				<text class="footer-btn-text">{{ opening ? 'Connecting...' : 'Open Wallet to Pay' }}</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { openWallet, isOrderExpired } from '@/utils/tron-pay'

const toWalletInfo = (wallet) => ({
	id: wallet.id,
	name: wallet.name,
	icon: wallet.abbr || wallet.icon || 'T'
})

const statusBarHeight = ref(0)
const safeBottom = ref(0)
const selectedWallet = ref('tokenpocket')
const opening = ref(false)
const order = ref({ total: '1.00', expireAt: 0 })

const wallets = [
	{ id: 'tronlink', name: 'TronLink', abbr: 'TL', bg: '#3B82F6', icon: 'T' },
	{ id: 'tokenpocket', name: 'TokenPocket', abbr: 'TP', bg: '#2980FF', icon: 'T' },
	{ id: 'imtoken', name: 'imToken', abbr: 'im', bg: '#4F8EF7', icon: 'I' },
	{ id: 'bitkeep', name: 'BitKeep', abbr: 'BG', bg: '#00B4D8', icon: 'B' }
]

const WALLET_DOWNLOAD = {
	tronlink: 'https://www.tronlink.org/',
	tokenpocket: 'https://www.tokenpocket.pro/',
	imtoken: 'https://token.im/',
	bitget: 'https://web3.bitget.com/'
}

const orderExpired = computed(() => isOrderExpired(order.value))

const calcLayout = () => {
	const sys = uni.getSystemInfoSync()
	statusBarHeight.value = sys.statusBarHeight || 0
	safeBottom.value = sys.safeAreaInsets?.bottom || 0
}

const loadOrder = () => {
	const data = uni.getStorageSync('pendingOrder')
	if (data) order.value = { ...order.value, ...data }
}

const goPaymentConfirm = (wallet) => {
	const info = toWalletInfo(wallet)
	uni.setStorageSync('wallet', info)
	const walletParam = encodeURIComponent(JSON.stringify(info))
	uni.navigateTo({ url: `/pages/payment-confirm/index?wallet=${walletParam}` })
}

const promptDownload = (wallet) => {
	setTimeout(() => {
		uni.showModal({
			title: `${wallet.name} not opened?`,
			content: 'Please confirm the wallet is installed, or open this page in the wallet\'s built-in browser to complete payment.',
			confirmText: 'Download',
			cancelText: 'Got it',
			success: (res) => {
				// #ifdef H5
				if (res.confirm && typeof window !== 'undefined') {
					window.open(WALLET_DOWNLOAD[wallet.id], '_blank')
				}
				// #endif
			}
		})
	}, 1500)
}

const handleBack = () => {
	uni.navigateBack()
}

const handlePay = async () => {
	if (opening.value || orderExpired.value) {
		if (orderExpired.value) {
			uni.showToast({ title: 'Order expired. Please place a new order.', icon: 'none' })
			uni.reLaunch({ url: '/pages/index/index' })
		}
		return
	}

	const wallet = wallets.find((w) => w.id === selectedWallet.value)
	if (!wallet) return

	const walletInfo = toWalletInfo(wallet)
	uni.setStorageSync('wallet', walletInfo)

	opening.value = true
	uni.showLoading({ title: 'Connecting wallet...', mask: true })

	try {
		// #ifdef H5
		const result = await openWallet(wallet.id, walletInfo)
		if (result === 'connected') {
			uni.showToast({ title: 'Wallet connected', icon: 'success' })
			goPaymentConfirm(wallet)
			return
		}
		uni.showToast({ title: `Opening ${wallet.name}`, icon: 'none' })
		promptDownload(wallet)
		// #endif

		// #ifndef H5
		goPaymentConfirm(wallet)
		// #endif
	} catch (error) {
		console.error('打开钱包失败:', error)
		uni.showToast({ title: error?.message || 'Failed to open wallet', icon: 'none' })
	} finally {
		uni.hideLoading()
		opening.value = false
	}
}

onMounted(() => {
	calcLayout()
	loadOrder()
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
	padding: 0 24rpx 32rpx;
	box-sizing: border-box;
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
	text-align: center;
	padding: 16rpx 0 32rpx;
}

.page-title {
	display: block;
	font-size: 40rpx;
	font-weight: 700;
	color: #F0E6D8;
}

.page-sub {
	display: block;
	margin-top: 10rpx;
	font-size: 26rpx;
	color: #8B867C;
}

.amount-card {
	padding: 36rpx 28rpx;
	border-radius: 24rpx;
	border: 1rpx solid rgba(191, 149, 102, 0.25);
	background: linear-gradient(180deg, #141414 0%, #0A0A0A 100%);
	text-align: center;
}

.amount-label {
	display: block;
	font-size: 26rpx;
	color: #8B867C;
}

.amount-value {
	display: block;
	margin-top: 12rpx;
	font-size: 52rpx;
	font-weight: 700;
	color: #C9A86C;
}

.amount-expired {
	display: block;
	margin-top: 16rpx;
	font-size: 24rpx;
	color: #CF6679;
}

.wallet-grid {
	margin-top: 32rpx;
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	justify-content: space-between;
}

.wallet-item {
	width: 48%;
	margin-bottom: 24rpx;
	padding: 32rpx 20rpx 28rpx;
	border-radius: 20rpx;
	border: 1rpx solid rgba(191, 149, 102, 0.2);
	background: rgba(12, 12, 12, 0.9);
	display: flex;
	flex-direction: column;
	align-items: center;
	box-sizing: border-box;
}

.wallet-item--active {
	border-color: #BF9566;
	background: rgba(191, 149, 102, 0.1);
	box-shadow: 0 0 20rpx rgba(191, 149, 102, 0.25);
}

.wallet-icon {
	width: 96rpx;
	height: 96rpx;
	border-radius: 20rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.wallet-icon-text {
	font-size: 28rpx;
	color: #fff;
	font-weight: 700;
}

.wallet-name {
	margin-top: 16rpx;
	font-size: 28rpx;
	color: #F0E6D8;
	font-weight: 500;
}

.spacer {
	flex: 1;
	min-height: 40rpx;
}

.footer-btn {
	height: 96rpx;
	border-radius: 48rpx;
	background: linear-gradient(90deg, #A8845A 0%, #BF9566 50%, #D4B896 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 8rpx 24rpx rgba(191, 149, 102, 0.35);
	margin-bottom: 40rpx;
}

.footer-btn--disabled {
	opacity: 0.55;
}

.footer-btn-text {
	font-size: 32rpx;
	color: #1A1A1A;
	font-weight: 700;
}
</style>
