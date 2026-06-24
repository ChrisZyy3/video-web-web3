<template>
	<view class="page">
		<view class="main" :style="mainStyle">
			<view class="nav-bar">
				<view class="back-btn" @click="handleBack">
					<text class="back-icon">‹</text>
				</view>
			</view>

			<view class="page-head">
				<text class="page-title">{{ t('paymentWallet.title') }}</text>
				<text class="page-sub">{{ t('paymentWallet.subtitle') }}</text>
			</view>
			<!-- :style="{ height: scrollHeight + 'px' }"-->
			<scroll-view class="scroll-body" scroll-y>
				<view class="amount-card">
					<text class="amount-label">{{ t('paymentWallet.amountDue') }}</text>
					<!-- Format the order total to strip useless trailing zeroes from decimals / 格式化订单总额以去除无意义的末尾零 -->
					<text class="amount-value">{{ formatTotal(order.total) }} USDT</text>
					<text v-if="orderExpired" class="amount-expired">{{ t('paymentWallet.orderExpiredHint') }}</text>
				</view>

				<view class="wallet-grid">
					<view
						v-for="wallet in wallets"
						:key="wallet.id"
						class="wallet-item"
						:class="{ 'wallet-item--active': selectedWallet === wallet.id }"
						@click="selectedWallet = wallet.id"
					>
						<view class="wallet-icon" :class="[wallet.id]">
							<img :src="wallet.bg" />
						</view>
						<text class="wallet-name">{{ wallet.name }}</text>
					</view>
				</view>

				<view class="bottom-space" :style="{ height: bottomSpaceHeight + 'px' }" />
			</scroll-view>

			<view class="footer">
				<view
					class="footer-btn"
					:class="{ 'footer-btn--disabled': opening || orderExpired }"
					@click="handlePay"
				>
					<text class="footer-btn-text">{{ opening ? t('paymentWallet.connecting') : t('paymentWallet.openWalletToPay') }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useI18n } from 'vue-i18n'
import { 
	openWallet, 
	isOrderExpired, 
	buildPaymentReturnUrl, 
	markOrderPaymentCompleted 
} from '@/utils/tron-pay'
import { calcFixedFooterPageLayout, bindViewportResize, parseH5RouteQuery } from '@/utils/h5-compat'

const { t } = useI18n()

/** nav(80) + page-head(≈140) + 缓冲 */
const HEADER_BLOCK_RPX = 220
const FOOTER_BLOCK_RPX = 152
const SCROLL_END_RPX = 32

const toWalletInfo = (wallet) => ({
	id: wallet.id,
	name: wallet.name,
	icon: wallet.abbr || wallet.icon || 'T'
})

const statusBarHeight = ref(0)
const mainHeight = ref(0)
const scrollHeight = ref(0)
const bottomSpaceHeight = ref(32)
const selectedWallet = ref('')
const opening = ref(false)
const order = ref({ total: '1.00', expireAt: 0 })

// 格式化金额，如果小数位为0则去除小数位，保留有意义的小数位，每段代码均已添加详细注释 / Helper function to format order total by removing trailing zeroes
const formatTotal = (val) => {
	// 校验传入的值是否为空，为空则默认返回 '0' / Return '0' if value is falsy
	if (!val) return '0'
	// 使用 parseFloat 将其转为浮点数 / Convert the string amount to float
	const num = parseFloat(val)
	// 判断如果是非法数字则回退为原字符，否则转为字符串（这会自动剔除末尾多余的零）/ Return original if conversion fails, else convert back to string
	return isNaN(num) ? val : num.toString()
}
import wallet1 from '../../static/images/wallet1.png'
import wallet2 from '../../static/images/wallet2.png'
import wallet3 from '../../static/images/wallet3.png'
import wallet4 from '../../static/images/wallet4.png'

const wallets = [
	{ id: 'tronlink', name: 'TronLink', abbr: 'TL', bg: wallet1, icon: 'T' },
	{ id: 'tokenpocket', name: 'TokenPocket', abbr: 'TP', bg: wallet2, icon: 'T' },
	{ id: 'imtoken', name: 'imToken', abbr: 'im', bg: wallet3, icon: 'I' },
	{ id: 'bitkeep', name: 'BitKeep', abbr: 'BG', bg: wallet4, icon: 'B' }
]

const WALLET_DOWNLOAD = {
	tronlink: 'https://www.tronlink.org/',
	tokenpocket: 'https://www.tokenpocket.pro/',
	imtoken: 'https://token.im/',
	bitget: 'https://web3.bitget.com/'
}

const orderExpired = computed(() => isOrderExpired(order.value))

const mainStyle = computed(() => ({
	paddingTop: `${statusBarHeight.value}px`,
	height: mainHeight.value ? `${mainHeight.value}px` : '100vh'
}))

const calcLayout = () => {
	const layout = calcFixedFooterPageLayout({
		headerBlockRpx: HEADER_BLOCK_RPX,
		footerBlockRpx: FOOTER_BLOCK_RPX,
		scrollEndRpx: SCROLL_END_RPX
	})
	statusBarHeight.value = layout.statusBarHeight
	mainHeight.value = layout.mainHeight
	scrollHeight.value = layout.scrollHeight
	bottomSpaceHeight.value = layout.bottomSpaceHeight
}

let unbindViewport = null

const loadOrder = () => {
	const data = uni.getStorageSync('pendingOrder')
	if (data) order.value = { ...order.value, ...data }
	if (opening.value || orderExpired.value) {
		if (orderExpired.value) {
			uni.showToast({ title: t('common.orderExpired'), icon: 'none' })
			uni.reLaunch({ url: '/pages/index/index' })
		}
		return
	}
}

const goPaymentConfirm = (wallet, returnUrl = '') => {
	const info = toWalletInfo(wallet)
	uni.setStorageSync('wallet', info)
	const walletParam = encodeURIComponent(JSON.stringify(info))
	const returnParam = returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : ''
	uni.navigateTo({ url: `/pages/payment-confirm/index?wallet=${walletParam}${returnParam}` })
}

const promptDownload = (wallet) => {
	setTimeout(() => {
		uni.showModal({
			title: t('paymentWallet.walletNotOpened', { wallet: wallet.name }),
			content: t('paymentWallet.downloadPrompt'),
			confirmText: t('paymentWallet.download'),
			cancelText: t('paymentWallet.gotIt'),
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

const checkPaymentSuccessReturn = () => {
	// #ifdef H5
	if (typeof window === 'undefined') return
	const query = parseH5RouteQuery()
	if (query.paymentSuccess !== '1' && !/[?&]paymentSuccess=1(?:&|$)/.test(window.location.hash || '')) return

	markOrderPaymentCompleted()
	order.value = { ...order.value, expireAt: 0 }
	uni.showToast({ title: t('common.paymentSuccess'), icon: 'success' })
	const hash = window.location.hash || ''
	const cleanedHash = hash
		.replace(/([?&])paymentSuccess=1&/, '$1')
		.replace(/([?&])paymentSuccess=1$/, '')
		.replace(/\?$/, '')
	window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${cleanedHash}`)
	// #endif
}

onShow(() => {
	checkPaymentSuccessReturn()
})

const handlePay = async () => {
	if (opening.value || orderExpired.value) {
		if (orderExpired.value) {
			uni.showToast({ title: t('common.orderExpired'), icon: 'none' })
			uni.reLaunch({ url: '/pages/index/index' })
		}
		return
	}

	const wallet = wallets.find((w) => w.id === selectedWallet.value)
	if (!wallet) return uni.showToast({ title: t('paymentWallet.subtitle'), icon: 'none' })

	const walletInfo = toWalletInfo(wallet)
	uni.setStorageSync('wallet', walletInfo)

	opening.value = true
	uni.showLoading({ title: t('paymentWallet.connectingWallet'), mask: true })

	try {
		// #ifdef H5
		const returnUrl = buildPaymentReturnUrl()
		const result = await openWallet(wallet.id, walletInfo, returnUrl)
		if (result === 'connected') {
			uni.showToast({ title: t('paymentWallet.walletConnected'), icon: 'success' })
			goPaymentConfirm(wallet, returnUrl)
			return
		}
		uni.showToast({ title: t('paymentWallet.openingWallet', { wallet: wallet.name }), icon: 'none' })
		promptDownload(wallet)
		// #endif

		// #ifndef H5
		goPaymentConfirm(wallet)
		// #endif
	} catch (error) {
		console.error('打开钱包失败:', error)
		uni.showToast({ title: error?.message || t('paymentWallet.failedToOpenWallet'), icon: 'none' })
	} finally {
		uni.hideLoading()
		opening.value = false
	}
}

onMounted(() => {
	calcLayout()
	// #ifdef H5
	unbindViewport = bindViewportResize(calcLayout)
	// #endif
	loadOrder()
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
	background: #000;
}

.main {
	height: 100vh;
	height: calc(var(--vh, 1vh) * 100);
	height: -webkit-fill-available;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	padding: 0 24rpx;
	box-sizing: border-box;
}

.scroll-body {
	flex: 1;
	width: 100%;
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
	font-size: 86rpx;
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
	overflow: hidden;
}

.tronlink img{
	width: 165%;
	position: relative;
	left:-2rpx;
}

.tokenpocket img{
	width: 250%;
}

.imtoken img{
	width: 190%;
}

.bitkeep img{
	width: 129%;
	position: relative;
	top: -1.5rpx;
	left: 1rpx
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

.bottom-space {
	flex-shrink: 0;
}

.footer {
	flex-shrink: 0;
	padding: 16rpx 0;
	padding-bottom: calc(40rpx + constant(safe-area-inset-bottom));
	padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
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
