<template>
	<view class="page">
		<view class="browser" :style="{ paddingTop: statusBarHeight + 'px' }">
			<view class="browser-bar">
				<view class="browser-actions">
					<text class="browser-action" @click="handleClose">×</text>
					<text class="browser-action browser-action--min">−</text>
				</view>
				<text class="browser-title">GlobalSMS 支付系统</text>
				<view class="browser-avatar">
					<text class="browser-avatar-text">{{ walletType.icon || 'T' }}</text>
				</view>
			</view>

			<scroll-view class="scroll-body" scroll-y :style="{ height: scrollHeight + 'px' }">
				<view class="content">
					<text class="page-title">确认支付</text>
					<view class="countdown-row">
						<image class="countdown-icon" :src="icons.clock" mode="aspectFit" />
						<text class="countdown-value">{{ countdown }}</text>
					</view>

					<view class="card wallet-card">
						<view class="wallet-head">
							<view class="wallet-head-left">
								<view class="wallet-icon-wrap">
									<image class="wallet-icon" :src="icons.wallet" mode="aspectFit" />
								</view>
								<text class="wallet-head-title">钱包连接</text>
								<view class="wallet-tag">
									<text class="wallet-tag-text">{{ walletType.name || 'TokenPocket' }}</text>
								</view>
							</view>
							<text class="wallet-status">{{ walletReady ? '已连接' : '连接中' }}</text>
						</view>
						<view class="wallet-balances">
							<view class="balance-item">
								<text class="balance-label">USDT余额</text>
								<text class="balance-value balance-value--green">{{ wallet.usdt }} USDT</text>
							</view>
							<view class="balance-item">
								<text class="balance-label">TRX余额</text>
								<text class="balance-value balance-value--blue">{{ wallet.trx }} TRX</text>
							</view>
							<view class="balance-item balance-item--addr">
								<text class="balance-label">地址</text>
								<text class="balance-addr">{{ wallet.addressShort }}</text>
							</view>
						</view>
					</view>

					<view class="card contract-card">
						<view class="contract-head">
							<text class="contract-desc">后台合约地址，请勿直接向后台地址转账，请点击下方支付开始付款。(TRC20)</text>
							<view class="verified-tag">
								<text class="verified-text">已验证</text>
							</view>
						</view>
						<text class="contract-addr">{{ contractAddress }}</text>
					</view>

					<view class="card fee-card">
						<view class="fee-head">
							<view class="fee-head-left">
								<view class="fee-icon-wrap">
									<image class="fee-icon" :src="icons.gas" mode="aspectFit" />
								</view>
								<text class="fee-title">预估矿工费</text>
							</view>
							<view class="fee-head-right">
								<text class="fee-amount">~{{ minerFee }} TRX</text>
								<text class="fee-update">实时更新中</text>
							</view>
						</view>
						<view class="fee-options">
							<view
								class="fee-option"
								:class="{ 'fee-option--active': feeMode === 'resource' }"
								@click="feeMode = 'resource'"
							>
								<text class="fee-option-label">消耗资源</text>
								<text class="fee-option-value">能量 + 带宽</text>
							</view>
							<view
								class="fee-option"
								:class="{ 'fee-option--active': feeMode === 'burn' }"
								@click="feeMode = 'burn'"
							>
								<text class="fee-option-label">直接燃烧</text>
								<text class="fee-option-value">TRX 代币</text>
							</view>
						</view>
					</view>

					<view class="warning-row">
						<view class="warning-icon-wrap">
							<text class="warning-icon">!</text>
						</view>
						<text class="warning-text">请确保您的钱包中有足够12个的 TRX 用于支付矿工费，否则交易将失败且无法退回。</text>
					</view>

					<view class="bottom-space" />
				</view>
			</scroll-view>

			<view class="footer" :style="{ paddingBottom: safeBottom + 'px' }">
				<view class="pay-btn" :class="{ 'pay-btn--disabled': paying }" @click="handlePay">
					<text class="pay-btn-text">{{ paying ? '支付中...' : '立即支付 →' }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { ref, onMounted, onUnmounted } from 'vue'
import {
	DEPOSIT_CONTRACT,
	fetchWalletBalances,
	payByDeposit
} from '@/utils/tron-pay'

const statusBarHeight = ref(0)
const scrollHeight = ref(0)
const safeBottom = ref(0)
const countdown = ref('30:00')
const feeMode = ref('resource')
const minerFee = ref('0.37')
const walletReady = ref(false)
const paying = ref(false)
const contractAddress = DEPOSIT_CONTRACT

const walletType = ref({
	id: 'tokenpocket',
	name: 'TokenPocket',
	icon: 'T'
})

const wallet = ref({
	usdt: '--',
	trx: '--',
	address: '',
	addressShort: '--'
})

const order = ref({
	total: '1.00',
	expireAt: Date.now() + 30 * 60 * 1000
})

let timer = null

const icons = {
	clock: svgIcon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', '#28AD7B'),
	wallet: svgIcon('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="17" cy="14" r="1.2" fill="#28AD7B" stroke="none"/>', '#28AD7B', '#fff'),
	gas: svgIcon('<path d="M4 20h16"/><path d="M6 20V10l4-4 4 4v10"/><path d="M14 10l2-2 2 2v10"/><circle cx="8" cy="14" r="1.5"/>', '#3B78F1')
}

function svgIcon(paths, color, fill = 'none') {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const calcLayout = () => {
	const sys = uni.getSystemInfoSync()
	statusBarHeight.value = sys.statusBarHeight || 0
	safeBottom.value = sys.safeAreaInsets?.bottom || 0
	const browserBarH = uni.upx2px(88)
	const footerH = uni.upx2px(120) + safeBottom.value
	scrollHeight.value = sys.windowHeight - statusBarHeight.value - browserBarH - footerH
}

const loadOrder = () => {
	const data = uni.getStorageSync('pendingOrder')
	if (data) {
		order.value = { ...order.value, ...data }
		if (data.expireAt) updateCountdown()
	}
	const storedWallet = uni.getStorageSync('wallet')
	if (storedWallet?.name) {
		walletType.value = storedWallet
	}
}

const loadWalletBalances = async () => {
	try {
		const balances = await fetchWalletBalances()
		wallet.value = balances
		walletReady.value = true
	} catch (error) {
		walletReady.value = false
		console.error('获取钱包余额失败:', error)
		uni.showToast({ title: error?.message || '钱包连接失败', icon: 'none' })
	}
}

const updateCountdown = () => {
	const left = Math.max(0, order.value.expireAt - Date.now())
	const min = Math.floor(left / 60000)
	const sec = Math.floor((left % 60000) / 1000)
	countdown.value = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
	if (left <= 0 && timer) {
		clearInterval(timer)
		uni.showToast({ title: '订单已过期，请重新下单', icon: 'none' })
	}
}

const isOrderExpired = () => !order.value.expireAt || order.value.expireAt <= Date.now()

const handleClose = () => {
	uni.navigateBack()
}

const handlePay = async () => {
	if (paying.value) return
	if (isOrderExpired()) {
		uni.showToast({ title: '订单已过期，请重新下单', icon: 'none' })
		uni.reLaunch({url:'/pages/index/index'})
		return
	}
	if (!walletReady.value) {
		await loadWalletBalances()
		if (!walletReady.value) return
	}

	paying.value = true
	uni.showLoading({ title: '支付中...', mask: true })
	try {
		const tx = await payByDeposit(order.value.total)
		console.log('支付成功:', tx)
		uni.showToast({ title: '支付成功', icon: 'success' })
		setTimeout(() => {
			uni.navigateBack({ delta: 2 })
		}, 1200)
	} catch (error) {
		console.error('支付失败:', error)
		uni.showToast({ title: error?.message || '支付失败', icon: 'none' })
	} finally {
		uni.hideLoading()
		paying.value = false
	}
}

onLoad(() => {
	loadOrder()
})

onMounted(() => {
	calcLayout()
	updateCountdown()
	timer = setInterval(updateCountdown, 1000)
	loadWalletBalances()
})

onUnmounted(() => {
	if (timer) clearInterval(timer)
})
</script>

<style>
.page {
	min-height: 100vh;
	background: #fff;
}

.browser {
	min-height: 100vh;
	display: flex;
	flex-direction: column;
	background: #fff;
}

.browser-bar {
	height: 88rpx;
	padding: 0 24rpx;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	border-bottom: 1rpx solid #E8ECF0;
	box-sizing: border-box;
}

.browser-actions {
	display: flex;
	flex-direction: row;
	align-items: center;
	width: 120rpx;
}

.browser-action {
	font-size: 40rpx;
	color: #94A3B8;
	line-height: 1;
	font-weight: 300;
}

.browser-action--min {
	margin-left: 24rpx;
	font-size: 44rpx;
}

.browser-title {
	flex: 1;
	text-align: center;
	font-size: 28rpx;
	color: #334155;
	font-weight: 500;
}

.browser-avatar {
	width: 48rpx;
	height: 48rpx;
	border-radius: 50%;
	background: #E2E8F0;
	display: flex;
	align-items: center;
	justify-content: center;
}

.browser-avatar-text {
	font-size: 24rpx;
	color: #64748B;
	font-weight: 600;
}

.scroll-body {
	flex: 1;
	box-sizing: border-box;
}

.content {
	padding: 32rpx 28rpx 0;
}

.page-title {
	display: block;
	font-size: 44rpx;
	font-weight: 700;
	color: #0F172A;
	line-height: 1.2;
}

.countdown-row {
	margin-top: 12rpx;
	display: flex;
	flex-direction: row;
	align-items: center;
}

.countdown-icon {
	width: 32rpx;
	height: 32rpx;
}

.countdown-value {
	margin-left: 8rpx;
	font-size: 28rpx;
	color: #28AD7B;
	font-weight: 600;
}

.card {
	margin-top: 24rpx;
	border-radius: 24rpx;
	padding: 28rpx;
	box-sizing: border-box;
}

.wallet-card {
	background: #ECFDF5;
	border: 1rpx solid #D1FAE5;
}

.wallet-head {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
}

.wallet-head-left {
	display: flex;
	flex-direction: row;
	align-items: center;
	flex: 1;
	min-width: 0;
}

.wallet-icon-wrap {
	width: 48rpx;
	height: 48rpx;
	border-radius: 12rpx;
	background: #28AD7B;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.wallet-icon {
	width: 28rpx;
	height: 28rpx;
}

.wallet-head-title {
	margin-left: 12rpx;
	font-size: 28rpx;
	color: #0F172A;
	font-weight: 600;
	flex-shrink: 0;
}

.wallet-tag {
	margin-left: 12rpx;
	padding: 4rpx 16rpx;
	border-radius: 8rpx;
	background: #DBEAFE;
	flex-shrink: 0;
}

.wallet-tag-text {
	font-size: 22rpx;
	color: #3B78F1;
	font-weight: 500;
}

.wallet-status {
	font-size: 24rpx;
	color: #94A3B8;
	flex-shrink: 0;
	margin-left: 12rpx;
}

.wallet-balances {
	margin-top: 28rpx;
	display: flex;
	flex-direction: row;
}

.balance-item {
	flex: 1;
	min-width: 0;
}

.balance-item--addr {
	flex: 0.85;
}

.balance-label {
	display: block;
	font-size: 22rpx;
	color: #64748B;
}

.balance-value {
	display: block;
	margin-top: 8rpx;
	font-size: 30rpx;
	font-weight: 700;
	line-height: 1.2;
}

.balance-value--green {
	color: #28AD7B;
}

.balance-value--blue {
	color: #3B78F1;
}

.balance-addr {
	display: block;
	margin-top: 8rpx;
	font-size: 26rpx;
	color: #64748B;
	font-weight: 500;
	word-break: break-all;
}

.contract-card {
	background: #F8FAFC;
	border: 1rpx solid #E2E8F0;
}

.contract-head {
	display: flex;
	flex-direction: row;
	align-items: flex-start;
}

.contract-desc {
	flex: 1;
	font-size: 24rpx;
	color: #64748B;
	line-height: 1.55;
}

.verified-tag {
	margin-left: 12rpx;
	flex-shrink: 0;
	padding: 4rpx 12rpx;
	border-radius: 8rpx;
	background: #ECFDF5;
}

.verified-text {
	font-size: 22rpx;
	color: #28AD7B;
	font-weight: 500;
}

.contract-addr {
	display: block;
	margin-top: 20rpx;
	font-size: 30rpx;
	color: #0F172A;
	font-weight: 600;
	line-height: 1.45;
	word-break: break-all;
	font-family: 'Courier New', Courier, monospace;
}

.fee-card {
	background: #EFF6FF;
	border: 1rpx solid #DBEAFE;
}

.fee-head {
	display: flex;
	flex-direction: row;
	align-items: flex-start;
	justify-content: space-between;
}

.fee-head-left {
	display: flex;
	flex-direction: row;
	align-items: center;
}

.fee-icon-wrap {
	width: 48rpx;
	height: 48rpx;
	border-radius: 12rpx;
	background: #3B78F1;
	display: flex;
	align-items: center;
	justify-content: center;
}

.fee-icon {
	width: 28rpx;
	height: 28rpx;
}

.fee-title {
	margin-left: 12rpx;
	font-size: 28rpx;
	color: #0F172A;
	font-weight: 600;
}

.fee-head-right {
	text-align: right;
}

.fee-amount {
	display: block;
	font-size: 32rpx;
	color: #3B78F1;
	font-weight: 700;
}

.fee-update {
	display: block;
	margin-top: 4rpx;
	font-size: 20rpx;
	color: #60A5FA;
}

.fee-options {
	margin-top: 24rpx;
	display: flex;
	flex-direction: row;
}

.fee-option {
	flex: 1;
	padding: 20rpx 16rpx;
	border-radius: 16rpx;
	border: 2rpx solid #E2E8F0;
	background: #fff;
	box-sizing: border-box;
}

.fee-option + .fee-option {
	margin-left: 16rpx;
}

.fee-option--active {
	border-color: #28AD7B;
	background: #F0FDF4;
}

.fee-option-label {
	display: block;
	font-size: 24rpx;
	color: #64748B;
	text-align: center;
}

.fee-option-value {
	display: block;
	margin-top: 8rpx;
	font-size: 26rpx;
	color: #0F172A;
	font-weight: 600;
	text-align: center;
}

.warning-row {
	margin-top: 24rpx;
	display: flex;
	flex-direction: row;
	align-items: flex-start;
}

.warning-icon-wrap {
	width: 36rpx;
	height: 36rpx;
	border-radius: 50%;
	background: #FEF3C7;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.warning-icon {
	font-size: 24rpx;
	color: #F59E0B;
	font-weight: 700;
	line-height: 1;
}

.warning-text {
	flex: 1;
	margin-left: 12rpx;
	font-size: 24rpx;
	color: #64748B;
	line-height: 1.55;
}

.bottom-space {
	height: 32rpx;
}

.footer {
	padding: 16rpx 28rpx 24rpx;
	background: #fff;
	border-top: 1rpx solid #F1F5F9;
	margin-bottom: 40rpx;
}

.pay-btn {
	height: 96rpx;
	border-radius: 48rpx;
	background: #0F172A;
	display: flex;
	align-items: center;
	justify-content: center;
}

.pay-btn--disabled {
	opacity: 0.65;
}

.pay-btn-text {
	font-size: 32rpx;
	color: #fff;
	font-weight: 700;
}
</style>
