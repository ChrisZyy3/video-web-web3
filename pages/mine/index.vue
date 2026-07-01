<template>
	<view class="page">
		<scroll-view class="scroll-body" scroll-y :style="{ height: scrollHeight + 'px' }">
			<view :style="{ height: statusBarHeight + 'px' }" />

			<view class="profile-card">
				<view class="card-body">
					<!-- 头像容器，如果是 VIP 则动态加上金色发光环样式类 -->
					<!-- Avatar container, dynamically applying gold glow class if VIP -->
					<view class="avatar-wrap" :class="{ 'avatar-wrap--vip': isVip }">
						<image class="avatar" :src="defaultAvatar" mode="aspectFill" />
					</view>
					<view class="user-info">
						<!--<view class="info-row">
							<text class="info-label">{{ t('mine.account') }}</text>
							<text class="info-value info-value--empty">{{ t('mine.notLoggedIn') }}</text>
						</view>-->
						<view class="info-grid">
							<view class="info-cell">
								<!-- 地址标签 -->
								<!-- Address label -->
								<text class="info-label">{{ t('mine.address') }}</text>
								<!-- ID 显示为连接钱包的短地址，若未连接则显示 "--" -->
								<!-- Display ID as the shortened wallet address, or "--" if not connected -->
								<text class="info-value" :class="{ 'info-value--empty': !connectedAddress }">
									{{ connectedAddress ? connectedAddressShort : '--' }}
								</text>
							</view>
						</view>

						<!--<view class="info-grid">
							<view class="info-cell info-cell--lang" @click="handleLanguage">
								<text class="info-label">{{ t('mine.language') }}</text>
								<view class="info-cell-value">
									<text class="info-value">{{ currentLangLabel }}</text>
									<text class="arrow-icon">›</text>
								</view>
							</view>
						</view>-->
					</view>
					<!--<view class="logout-btn" @click="handleLogout">
						<image class="logout-icon" :src="icons.logout" mode="aspectFit" />
					</view>-->
				</view>
				<!-- VIP身份标识标签，非VIP展示 Guest，VIP展示 VIP -->
				<!-- VIP status tag: displays Guest for non-VIP, VIP for VIP -->
				<view class="vip-tag" :class="{ 'vip-tag--active': isVip }">
					<view class="vip-dot" :class="{ 'vip-dot--active': isVip }" />
					<text class="vip-tag-text" :class="{ 'vip-tag-text--active': isVip }">
						{{ isVip ? t('mine.memberActive') : t('mine.nonMember') }}
					</text>
				</view>
			</view>

			<view class="action-btns">
				<!-- 非 VIP 用户展示成为 VIP 按钮 -->
				<!-- Show Become VIP button for non-VIP users -->
				<view v-if="!isVip" class="btn-become-vip" @click="handleMember">
					<text class="btn-become-vip-text">{{ t('mine.becomeMember') }}</text>
				</view>
				<view class="btn-outline" @click="handleOrder">
					<text class="btn-outline-text">{{ t('mine.orderDetails') }}</text>
				</view>
			</view>

			<view class="action-btns">
				<!-- 若钱包未连接，展示连接钱包按钮 -->
				<!-- If wallet is not connected, show connect wallet button -->
				<view v-if="!connectedAddress" class="btn-outline" @click="handleConnectWallet">
					<text class="btn-outline-text">{{ t('mine.connectWallet') }}</text>
				</view>
				<!-- 若已连接，仅展示断开连接按钮 -->
				<!-- If connected, show disconnect button only -->
				<view v-else class="btn-disconnect" @click="handleDisconnect">
					<text class="btn-disconnect-text">{{ t('mine.disconnect') }}</text>
				</view>
			</view>

			<!-- 钱包内置浏览器中：引导到外部浏览器（体验更好，并把地址带过去自动识别 VIP） -->
			<view v-if="showOpenInBrowser" class="action-btns">
				<view class="btn-outline" @click="handleOpenInBrowser">
					<text class="btn-outline-text">{{ t('mine.openInBrowser') }}</text>
				</view>
			</view>

			<!-- <view class="qrcode-section">
				<view class="qrcode-card" @click="handleQrPreview">
					<image class="qrcode-img" :src="icons.qrcode" mode="aspectFit" />
				</view>
				<text class="qrcode-tip">Tap the image to zoom in/out or save a screenshot</text>
				<text class="domain-url">{{ domainUrl }}</text>
				<view class="btn-copy" @click="handleCopyDomain">
					<text class="btn-copy-text">Copy Domain</text>
				</view>
			</view>

			<view class="tips-section">
				<text class="tips-title">Tips</text>
				<view class="tips-list">
					<text class="tips-item">1. After completing an order, save your order number for future reference.</text>
					<text class="tips-item">2. After registering, remember your account and password for next login.</text>
					<text class="tips-item">3. If you encounter any issues, please contact customer support.</text>
				</view>
			</view> -->

			<view class="bottom-space" :style="{ height: bottomSpaceHeight + 'px' }" />
		</scroll-view>
		
		<tabbar />

		<member-sheet v-model:visible="showMemberSheet" />
		<wallet-select v-model:visible="showWalletSelect" @select="handleWalletSelected" />
	</view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import tabbar from '@/components/tabbar/index'
import memberSheet from '@/components/member-sheet/index'
import walletSelect from '@/components/wallet-select/index'
import { verifyMembershipByWallet, getConnectedWalletAddress, formatAddressShort, disconnectWallet, openWalletForVerify, isInjectedWalletBrowser, buildExternalBrowserUrl, openInExternalBrowser } from '@/utils/tron-pay'
import { getLookMember } from '@/utils/look-member'
import { getMobilePageLayout, getTabbarInsetPx, bindViewportResize } from '@/utils/h5-compat'
import { onShow } from '@dcloudio/uni-app'

const { t, locale } = useI18n()

const TABBAR_CONTENT_RPX = 110
const BULGE_EXTRA_RPX = 36

const domainUrl = 'http://www.xxx.com/xxx/xxx'
const defaultAvatar = '/static/images/default-avatar.svg'

const statusBarHeight = ref(0)
const scrollHeight = ref(0)
const bottomSpaceHeight = ref(60)
const showMemberSheet = ref(false)
const showWalletSelect = ref(false)

// VIP激活状态与已连接钱包地址（本地）
// VIP status and connected wallet address (local)
const isVip = ref(false)
const connectedAddress = ref('')
const connectedAddressShort = computed(() => formatAddressShort(connectedAddress.value))

// 在钱包内置浏览器中且已连接钱包时，展示「在浏览器中打开」引导按钮
const showOpenInBrowser = computed(() => isInjectedWalletBrowser() && !!connectedAddress.value)
const handleOpenInBrowser = () => openInExternalBrowser(buildExternalBrowserUrl())

// 刷新 VIP 激活态和钱包连接状态
// Refresh VIP active status and wallet connection status
const refreshStatus = () => {
	// 获取当前存储的已连接钱包地址
	// Get the currently stored connected wallet address
	connectedAddress.value = getConnectedWalletAddress()
	
	// 只有在钱包已连接且本地已验证购买记录时，才将用户判定为 VIP；未登录或未购买均视为 Guest
	// The user is considered VIP only when a wallet is connected and a local purchase record is verified; otherwise, they are a Guest
	isVip.value = !!connectedAddress.value && !!getLookMember()
}

const currentLangLabel = computed(() =>
	locale.value === 'zh-CN' ? t('mine.langZh') : t('mine.langEn')
)

const icons = {
	logout: svgData('<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>', '#BF9566'),
	qrcode: qrcodeSvg()
}

function svgData(paths, color, fill = 'none') {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function qrcodeSvg() {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
		<rect width="200" height="200" fill="#fff"/>
		<rect x="10" y="10" width="50" height="50" fill="#000"/>
		<rect x="18" y="18" width="34" height="34" fill="#fff"/>
		<rect x="26" y="26" width="18" height="18" fill="#000"/>
		<rect x="140" y="10" width="50" height="50" fill="#000"/>
		<rect x="148" y="18" width="34" height="34" fill="#fff"/>
		<rect x="156" y="26" width="18" height="18" fill="#000"/>
		<rect x="10" y="140" width="50" height="50" fill="#000"/>
		<rect x="18" y="148" width="34" height="34" fill="#fff"/>
		<rect x="26" y="156" width="18" height="18" fill="#000"/>
		<rect x="70" y="70" width="30" height="30" fill="#000"/>
	</svg>`
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const calcLayout = () => {
	const layout = getMobilePageLayout()
	statusBarHeight.value = layout.statusBarHeight
	scrollHeight.value = layout.windowHeight
	bottomSpaceHeight.value = getTabbarInsetPx(TABBAR_CONTENT_RPX, BULGE_EXTRA_RPX)
}

let unbindViewport = null

const handleLogout = () => {
	uni.showToast({ title: t('mine.loggedOut'), icon: 'none' })
}

const handleMember = () => {
	showMemberSheet.value = true
}

// 点击「连接钱包」：弹出钱包选择
const handleConnectWallet = () => {
	showWalletSelect.value = true
}

// 断开钱包连接（VIP状态保留，重连会重新读链恢复）
// Disconnect wallet connection (VIP status remains, reconnecting will read the chain again)
const handleDisconnect = () => {
	disconnectWallet()
	refreshStatus()
	uni.showToast({ title: t('mine.disconnected'), icon: 'none' })
}

// 选定钱包后连接并校验 VIP 身份：使用 openWalletForVerify 统一处理注入检测、loading、deep link 唤起、下载弹窗
// Connect wallet and verify VIP status via openWalletForVerify (handles loading, deep link, download prompt)
const handleWalletSelected = async (walletId) => {
	showWalletSelect.value = false

	// openWalletForVerify 会自行进行：
	//   • showLoading(正在连接钱包...) → 检测钱包注入（2500ms）
	//   • 已注入 → 读链验证会员 → 回调 onSuccess / onFailed
	//   • 未注入 → toast + deep link 唤起 App → 1500ms 后弹下载提示弹窗
	await openWalletForVerify(walletId, {
		t,
		onSuccess: (isPaid) => {
			// 验证结束，刷新页面的本地连接与 VIP 激活状态
			// Verification completed, refresh local connection and VIP active state
			refreshStatus()
			uni.showToast({
				title: isPaid ? t('memberIntro.verifySuccess') : t('memberIntro.verifyFailed'),
				icon: isPaid ? 'success' : 'none',
				duration: isPaid ? 2000 : 3000
			})
		},
		onFailed: (error) => {
			console.warn('连接钱包并验证 VIP 失败', error)
			uni.showToast({ title: error?.message || t('memberIntro.verifyFailed'), icon: 'none', duration: 3000 })
		}
	})
}


const handleLogin = () => {
	uni.navigateTo({ url: '/pages/login/index' })
}

const handleChangePwd = () => {
	uni.navigateTo({ url: '/pages/change-password/index' })
}

const handleOrder = () => {
	uni.navigateTo({ url: '/pages/order/index' })
}

const handleBrowser = () => {
	uni.showToast({ title: t('mine.switchBrowser'), icon: 'none' })
}

const handleLanguage = () => {
	const next = locale.value === 'zh-CN' ? 'en' : 'zh-CN'
	locale.value = next
	uni.setStorageSync('lang', next)
	uni.showToast({
		title: next === 'zh-CN' ? t('mine.switchedToZh') : t('mine.switchedToEn'),
		icon: 'none'
	})
}

const handleQrPreview = () => {
	uni.previewImage({
		urls: [icons.qrcode],
		current: icons.qrcode
	})
}

const handleCopyDomain = () => {
	uni.setClipboardData({
		data: domainUrl,
		success: () => {
			uni.showToast({ title: t('common.copied'), icon: 'success' })
		}
	})
}

onMounted(() => {
	calcLayout()
	refreshStatus()
	// #ifdef H5
	unbindViewport = bindViewportResize(calcLayout)
	// #endif
})

onShow(() => {
	refreshStatus()
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

.scroll-body {
	width: 100%;
}

/* 个人中心玻璃拟态卡片 */
/* Profile section glassmorphism card */
.profile-card {
	margin: 40rpx 24rpx 0 24rpx;
	border: 1rpx solid rgba(191, 149, 102, 0.45);
	border-radius: 20rpx;
	background: rgba(18, 18, 18, 0.75);
	backdrop-filter: blur(20px);
	-webkit-backdrop-filter: blur(20px);
	overflow: hidden;
	box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(191, 149, 102, 0.15);
	transition: all 0.3s ease;
}

/* 卡片主体布局：使用 align-items: center 使得左边头像与右边文本水平对齐在同一轴线上（垂直方向居中） */
/* Card body layout: using align-items: center to align left avatar and right text vertically */
.card-body {
	display: flex;
	flex-direction: row;
	align-items: center;
	padding: 28rpx 28rpx 20rpx;
	position: relative;
}

.avatar-wrap {
	width: 132rpx;
	height: 132rpx;
	border-radius: 50%;
	border: 2rpx solid #BF9566;
	padding: 4rpx;
	box-sizing: border-box;
	flex-shrink: 0;
	background: #1A1A1A;
	transition: all 0.3s ease;
}

/* VIP头像外部发光渐变环 */
/* VIP avatar outer glowing gradient ring */
.avatar-wrap--vip {
	border-color: transparent;
	background: linear-gradient(135deg, #E8D5B5 0%, #D4B896 35%, #BF9566 100%);
	box-shadow: 0 0 20rpx rgba(191, 149, 102, 0.55);
}

.avatar {
	width: 100%;
	height: 100%;
	border-radius: 50%;
	background: #1A1A1A;
}

/* 用户名与地址容器：将 padding-top 设为 0 来支持完美的垂直居中对齐 */
/* User name and address container: set padding-top to 0 to support perfect vertical center alignment */
.user-info {
	flex: 1;
	margin-left: 24rpx;
	padding-top: 0;
	min-width: 0;
}

.info-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	margin-bottom: 14rpx;
}

.info-grid {
	display: flex;
	flex-direction: row;
	margin-bottom: 14rpx;
}

.info-grid:last-child {
	margin-bottom: 0;
}

.info-cell {
	flex: 1;
	display: flex;
	flex-direction: row;
	align-items: center;
	min-width: 0;
}

.info-cell--right {
	justify-content: flex-end;
}

.info-cell--lang {
	width: 100%;
	justify-content: space-between;
}

.info-cell--lang .info-cell-value {
	margin-left: auto;
}

.info-cell-value {
	display: flex;
	flex-direction: row;
	align-items: center;
	margin-left: 12rpx;
}

.info-label {
	font-size: 26rpx;
	color: #BF9566;
	line-height: 1.4;
	flex-shrink: 0;
}

.info-value {
	font-size: 26rpx;
	color: #D4B896;
	margin-left: 12rpx;
	line-height: 1.4;
}

.info-value--empty {
	color: #8B867C;
}

/* VIP状态的高亮颜色与粗细样式 */
/* VIP status highlight color and font-weight styles */
.info-value--vip {
	color: #D4B896;
	font-weight: 600;
}

.info-count {
	font-size: 26rpx;
	color: #E53935;
	font-weight: 600;
	margin-left: 12rpx;
}

.arrow-icon {
	font-size: 32rpx;
	color: #8B867C;
	margin-left: 4rpx;
	line-height: 1;
}

.logout-btn {
	position: absolute;
	top: 24rpx;
	right: 24rpx;
	width: 56rpx;
	height: 56rpx;
	border-radius: 50%;
	background: rgba(191, 149, 102, 0.1);
	display: flex;
	align-items: center;
	justify-content: center;
}

.logout-icon {
	width: 36rpx;
	height: 36rpx;
}

/* VIP/Guest身份状态条样式 */
/* VIP/Guest status bar styles */
.vip-tag {
	display: flex;
	flex-direction: row;
	align-items: center;
	background: #222;
	padding: 16rpx 28rpx;
	border-top: 1rpx solid rgba(191, 149, 102, 0.15);
}

.vip-dot {
	width: 12rpx;
	height: 12rpx;
	border-radius: 50%;
	background: #8B867C;
	margin-right: 12rpx;
}

.vip-tag-text {
	font-size: 26rpx;
	color: #8B867C;
	letter-spacing: 1rpx;
}

/* VIP激活状态：金色高亮样式 */
/* VIP active status: gold highlight styles */
.vip-tag--active {
	background: rgba(191, 149, 102, 0.12);
}

/* 呼吸灯发光扩散动画 */
/* Breathing glow pulse animation */
@keyframes pulseGlow {
	0% {
		box-shadow: 0 0 0 0 rgba(191, 149, 102, 0.6);
	}
	70% {
		box-shadow: 0 0 0 12rpx rgba(191, 149, 102, 0);
	}
	100% {
		box-shadow: 0 0 0 0 rgba(191, 149, 102, 0);
	}
}

.vip-dot--active {
	background: #BF9566;
	animation: pulseGlow 2s infinite;
}

.vip-tag-text--active {
	color: #D4B896;
	font-weight: 600;
}

/* 已连接钱包展示（替代连接按钮） */
.wallet-connected {
	flex: 1;
	height: 68rpx;
	border-radius: 34rpx;
	border: 1rpx solid rgba(40, 173, 123, 0.5);
	background: rgba(40, 173, 123, 0.08);
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	padding: 0 20rpx;
	box-sizing: border-box;
}

.wallet-connected-dot {
	width: 12rpx;
	height: 12rpx;
	border-radius: 50%;
	background: #28AD7B;
	margin-right: 12rpx;
	flex-shrink: 0;
}

.wallet-connected-text {
	font-size: 22rpx;
	color: #28AD7B;
	font-weight: 600;
	white-space: nowrap;
}

.wallet-connected-addr {
	font-size: 22rpx;
	color: #8B867C;
	margin-left: 12rpx;
	white-space: nowrap;
}

/* 断开连接按钮样式 */
/* Disconnect wallet button styles */
.btn-disconnect {
	flex: 1;
	height: 68rpx;
	border-radius: 34rpx;
	border: 1rpx solid rgba(207, 102, 121, 0.6);
	background: rgba(207, 102, 121, 0.08);
	display: flex;
	align-items: center;
	justify-content: center;
}

.btn-disconnect-text {
	font-size: 22rpx;
	color: #CF6679;
	white-space: nowrap;
}

.action-btns {
	display: flex;
	flex-direction: row;
	align-items: center;
	margin: 28rpx 24rpx 0;
}

.action-btns .btn-become-vip,
.action-btns .btn-outline {
	margin-right: 12rpx;
}

.action-btns .btn-outline:last-child {
	margin-right: 0;
}

/* 成为 VIP 按钮样式 */
/* Become VIP button style */
.btn-become-vip {
	flex: 1;
	height: 68rpx;
	border-radius: 34rpx;
	background: linear-gradient(180deg, #E8D5B5 0%, #D4B896 35%, #BF9566 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 6rpx 20rpx rgba(191, 149, 102, 0.25);
	position: relative;
	overflow: hidden;
	transition: all 0.2s ease;
}

/* 按钮流光扫光关键帧动画 */
/* Button shimmer sweep animation keyframes */
@keyframes shimmerSweep {
	0% {
		left: -150%;
	}
	50% {
		left: 150%;
	}
	100% {
		left: 150%;
	}
}

.btn-become-vip::after {
	content: '';
	position: absolute;
	top: 0;
	left: -150%;
	width: 150%;
	height: 100%;
	background: linear-gradient(
		90deg,
		rgba(255, 255, 255, 0) 0%,
		rgba(255, 255, 255, 0.25) 50%,
		rgba(255, 255, 255, 0) 100%
	);
	transform: skewX(-25deg);
	animation: shimmerSweep 3.5s infinite;
}

.btn-become-vip-text {
	font-size: 22rpx;
	color: #1A1A1A;
	font-weight: 600;
	white-space: nowrap;
	position: relative;
	z-index: 2;
}

.btn-outline {
	flex: 1;
	height: 68rpx;
	border-radius: 34rpx;
	border: 1rpx solid rgba(191, 149, 102, 0.7);
	background: #0D0D0D;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.2s ease;
}

.btn-outline-text {
	font-size: 22rpx;
	color: #BF9566;
	white-space: nowrap;
}

/* 按钮微交互按压触觉反馈 */
/* Button micro-interaction press tactile feedback */
.btn-become-vip:active,
.btn-outline:active,
.btn-disconnect:active {
	transform: scale(0.96);
}

.qrcode-section {
	margin: 36rpx 24rpx 0;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.qrcode-card {
	width: 100%;
	padding: 48rpx 40rpx;
	background: linear-gradient(180deg, #111 0%, #0A0A0A 100%);
	border: 1rpx solid rgba(191, 149, 102, 0.5);
	border-radius: 20rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
}

.qrcode-img {
	width: 360rpx;
	height: 360rpx;
	border-radius: 12rpx;
}

.qrcode-tip {
	font-size: 24rpx;
	color: #E53935;
	margin-top: 24rpx;
	text-align: center;
	line-height: 1.5;
}

.domain-url {
	font-size: 26rpx;
	color: #D4B896;
	margin-top: 16rpx;
	text-align: center;
	word-break: break-all;
	padding: 0 20rpx;
	line-height: 1.5;
}

.btn-copy {
	margin-top: 28rpx;
	width: 300rpx;
	height: 76rpx;
	border-radius: 38rpx;
	background: linear-gradient(180deg, #EF5350 0%, #E53935 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 6rpx 20rpx rgba(229, 57, 53, 0.3);
}

.btn-copy-text {
	font-size: 30rpx;
	color: #fff;
	font-weight: 500;
}

.tips-section {
	margin: 36rpx 24rpx 0;
	padding: 28rpx;
	background: rgba(255, 255, 255, 0.03);
	border-radius: 16rpx;
	border: 1rpx solid rgba(191, 149, 102, 0.12);
}

.tips-title {
	font-size: 30rpx;
	color: #D4B896;
	font-weight: 600;
	display: block;
	margin-bottom: 16rpx;
}

.tips-list {
	display: flex;
	flex-direction: column;
}

.tips-item + .tips-item {
	margin-top: 12rpx;
}

.tips-item {
	font-size: 24rpx;
	color: #CF6679;
	line-height: 1.7;
}

.bottom-space {
	flex-shrink: 0;
}
</style>
