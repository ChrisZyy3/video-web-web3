<template>
	<view class="page">
		<scroll-view class="scroll-body" scroll-y :style="{ height: scrollHeight + 'px' }">
			<view :style="{ height: statusBarHeight + 'px' }" />

			<view class="profile-card">
				<view class="card-body">
					<view class="avatar-wrap">
						<image class="avatar" :src="defaultAvatar" mode="aspectFill" />
					</view>
					<view class="user-info">
						<view class="info-row">
							<text class="info-label">Account</text>
							<text class="info-value info-value--empty">Not logged in</text>
						</view>
						<view class="info-grid">
							<view class="info-cell">
								<text class="info-label">ID</text>
								<text class="info-value info-value--empty">--</text>
							</view>
							<view class="info-cell info-cell--right" @click="handleBrowser">
								<text class="info-label">Browser</text>
								<view class="info-cell-value">
									<text class="info-value">Chrome</text>
									<text class="arrow-icon">›</text>
								</view>
							</view>
						</view>
						<view class="info-grid">
							<view class="info-cell">
								<text class="info-label">Purchased</text>
								<text class="info-count">0</text>
							</view>
							<view class="info-cell info-cell--right">
								<text class="info-label">Version</text>
								<text class="info-value">v1.0.68.102</text>
							</view>
						</view>
					</view>
					<!--<view class="logout-btn" @click="handleLogout">
						<image class="logout-icon" :src="icons.logout" mode="aspectFit" />
					</view>-->
				</view>
				<view class="member-tag">
					<view class="member-dot" />
					<text class="member-tag-text">Non-member</text>
				</view>
			</view>

			<view class="action-btns">
				<view class="btn-member" @click="handleMember">
					<text class="btn-member-text">Become a Member</text>
				</view>
				<!-- <view class="btn-outline" @click="handleLogin">
					<text class="btn-outline-text">Log In</text>
				</view>
				<view class="btn-outline" @click="handleChangePwd">
					<text class="btn-outline-text">Change Password</text>
				</view> -->
				<view class="btn-outline" @click="handleOrder">
					<text class="btn-outline-text">Order Details</text>
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

			<view class="bottom-space" />
		</scroll-view>
		
		<tabbar />

		<member-sheet v-model:visible="showMemberSheet" />
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import tabbar from '@/components/tabbar/index'
import memberSheet from '@/components/member-sheet/index'

const domainUrl = 'http://www.xxx.com/xxx/xxx'
const defaultAvatar = '/static/images/default-avatar.svg'

const statusBarHeight = ref(0)
const scrollHeight = ref(0)
const showMemberSheet = ref(false)

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
	const sys = uni.getSystemInfoSync()
	statusBarHeight.value = sys.statusBarHeight || 0
	scrollHeight.value = sys.windowHeight || sys.screenHeight
}

const handleLogout = () => {
	uni.showToast({ title: 'Logged out', icon: 'none' })
}

const handleMember = () => {
	showMemberSheet.value = true
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
	uni.showToast({ title: 'Switch browser', icon: 'none' })
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
			uni.showToast({ title: 'Copied', icon: 'success' })
		}
	})
}

onMounted(() => {
	calcLayout()
})
</script>

<style>
.page {
	min-height: 100vh;
	background: #000;
}

.scroll-body {
	width: 100%;
}

.profile-card {
	margin: 40rpx 24rpx 0 24rpx;
	border: 1rpx solid rgba(191, 149, 102, 0.65);
	border-radius: 20rpx;
	background: linear-gradient(180deg, #121212 0%, #0A0A0A 100%);
	overflow: hidden;
	box-shadow: 0 8rpx 32rpx rgba(191, 149, 102, 0.08);
}

.card-body {
	display: flex;
	flex-direction: row;
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
}

.avatar {
	width: 100%;
	height: 100%;
	border-radius: 50%;
	background: #1A1A1A;
}

.user-info {
	flex: 1;
	margin-left: 24rpx;
	padding-top: 6rpx;
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

.member-tag {
	display: flex;
	flex-direction: row;
	align-items: center;
	background: #222;
	padding: 16rpx 28rpx;
	border-top: 1rpx solid rgba(191, 149, 102, 0.15);
}

.member-dot {
	width: 12rpx;
	height: 12rpx;
	border-radius: 50%;
	background: #8B867C;
	margin-right: 12rpx;
}

.member-tag-text {
	font-size: 26rpx;
	color: #8B867C;
	letter-spacing: 1rpx;
}

.action-btns {
	display: flex;
	flex-direction: row;
	align-items: center;
	margin: 28rpx 24rpx 0;
}

.action-btns .btn-member,
.action-btns .btn-outline {
	margin-right: 12rpx;
}

.action-btns .btn-outline:last-child {
	margin-right: 0;
}

.btn-member {
	flex: 1;
	height: 68rpx;
	border-radius: 34rpx;
	background: linear-gradient(180deg, #E8D5B5 0%, #D4B896 35%, #BF9566 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 6rpx 20rpx rgba(191, 149, 102, 0.25);
}

.btn-member-text {
	font-size: 22rpx;
	color: #1A1A1A;
	font-weight: 600;
	white-space: nowrap;
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
}

.btn-outline-text {
	font-size: 22rpx;
	color: #BF9566;
	white-space: nowrap;
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
	height: 40rpx;
}
</style>
