<template>
	<view class="page">
		<view class="page-bg-wrap">
			<image class="page-bg page-bg--swirl" src="/static/images/login-bg.png" mode="aspectFill" />
		</view>

		<view class="main" :style="{ paddingTop: statusBarHeight + 'px' }">
			<view class="nav-bar">
				<view class="back-btn" @click="handleBack">
					<text class="back-icon">‹</text>
				</view>
				<text class="nav-title">Order Details</text>
				<view class="nav-placeholder" />
			</view>

			<!--<view class="tabs">
				<view
					v-for="tab in tabs"
					:key="tab.key"
					class="tab-item"
					@click="activeTab = tab.key"
				>
					<text class="tab-text" :class="{ 'tab-text--active': activeTab === tab.key }">
						{{ tab.label }}
					</text>
					<view v-if="activeTab === tab.key" class="tab-line" />
				</view>
			</view>-->

			<scroll-view class="scroll-body" scroll-y :style="{ height: scrollHeight + 'px' }">
				<view v-if="filteredOrders.length === 0" class="empty-tip">
					<text class="empty-tip-text">No orders yet</text>
				</view>

				<view
					v-for="order in filteredOrders"
					:key="order.id"
					class="order-card"
				>
					<view class="order-head">
						<text class="order-no">Order No.: {{ order.orderNo }}</text>
						<text
							class="order-status"
							:class="order.status === 'paid' ? 'order-status--paid' : 'order-status--unpaid'"
						>
							<!--{{ order.status === 'paid' ? '已付款' : '未付款' }}-->
						</text>
					</view>

					<view class="order-body">
						<!--<image class="order-cover" :src="order.cover" mode="aspectFill" />-->
						<view class="order-info">
							<text class="order-title">{{ order.title }}</text>
							<!--<text class="order-date">{{ order.contact }}</text>-->
							<view class="order-price-row">
								<text class="order-price-label">Paid</text>
								<text class="order-price">{{ order.total }} {{order.currency}}</text>
							</view>
						</view>
					</view>
				</view>

				<view class="list-end">
					<text class="list-end-text">You've reached the end</text>
				</view>
			</scroll-view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const statusBarHeight = ref(0)
const scrollHeight = ref(0)
const activeTab = ref('all')

const tabs = [
	{ key: 'all', label: 'All' },
	{ key: 'paid', label: 'Paid' },
	{ key: 'unpaid', label: 'Unpaid' }
]

const orders = ref([
	// {
	// 	id: '20260610001',
	// 	title: '热门电影 · 精品专区',
	// 	cover: '/static/images/video-cover.png',
	// 	price: '28.00',
	// 	date: '2026-06-10 14:32',
	// 	status: 'paid'
	// },
	// {
	// 	id: '20260609002',
	// 	title: '经典怀旧系列合集',
	// 	cover: '/static/images/video-cover.png',
	// 	price: '18.00',
	// 	date: '2026-06-09 09:15',
	// 	status: 'paid'
	// },
	// {
	// 	id: '20260608003',
	// 	title: '限时特惠专享内容',
	// 	cover: '/static/images/video-cover.png',
	// 	price: '38.00',
	// 	date: '2026-06-08 21:48',
	// 	status: 'unpaid'
	// },
	// {
	// 	id: '20260607004',
	// 	title: '会员专享高清资源',
	// 	cover: '/static/images/video-cover.png',
	// 	price: '58.00',
	// 	date: '2026-06-07 16:20',
	// 	status: 'paid'
	// },
	// {
	// 	id: '20260606005',
	// 	title: '新品上架抢先体验',
	// 	cover: '/static/images/video-cover.png',
	// 	price: '22.00',
	// 	date: '2026-06-06 11:05',
	// 	status: 'unpaid'
	// }
])
orders.value = uni.getStorageSync('listOrder')

const filteredOrders = computed(() => {
	if (activeTab.value === 'all') return orders.value
	return orders.value.filter((item) => item.status === activeTab.value)
})

const calcLayout = () => {
	const sys = uni.getSystemInfoSync()
	statusBarHeight.value = sys.statusBarHeight || 0
	const navH = uni.upx2px(88)
	const tabsH = uni.upx2px(72)
	scrollHeight.value = sys.windowHeight - statusBarHeight.value - navH - tabsH
}

const handleBack = () => {
	uni.navigateBack({
		fail: () => {
			uni.reLaunch({ url: '/pages/mine/index' })
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
	position: relative;
	background: #000;
}

.page-bg-wrap {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	z-index: 0;
	overflow: hidden;
	background: #000;
}

.page-bg {
	position: absolute;
	left: 0;
	width: 100%;
}

.page-bg--swirl {
	top: 0;
	height: 100%;
}

.page-bg--bottom {
	bottom: 0;
	height: auto;
}

.main {
	position: relative;
	z-index: 1;
	min-height: 100vh;
}

.nav-bar {
	display: flex;
	flex-direction: row;
	align-items: center;
	height: 88rpx;
	padding: 0 24rpx;
}

.back-btn {
	width: 64rpx;
	height: 64rpx;
	display: flex;
	align-items: center;
	justify-content: flex-start;
	flex-shrink: 0;
}

.back-icon {
	font-size: 56rpx;
	color: #C9A86C;
	line-height: 1;
	font-weight: 200;
}

.nav-title {
	flex: 1;
	text-align: center;
	font-size: 36rpx;
	font-weight: 600;
	color: #C9A86C;
	letter-spacing: 4rpx;
}

.nav-placeholder {
	width: 64rpx;
	flex-shrink: 0;
}

.tabs {
	display: flex;
	flex-direction: row;
	align-items: flex-end;
	padding: 0 32rpx;
	height: 72rpx;
}

.tab-item {
	position: relative;
	margin-right: 48rpx;
	padding-bottom: 12rpx;
}

.tab-text {
	font-size: 30rpx;
	color: #8B867C;
}

.tab-text--active {
	color: #C9A86C;
	font-weight: 600;
}

.tab-line {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	height: 4rpx;
	background: #C9A86C;
	border-radius: 2rpx;
}

.scroll-body {
	width: 100%;
	padding-top: 16rpx;
}

.empty-tip {
	padding: 120rpx 0 40rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.empty-tip-text {
	font-size: 28rpx;
	color: #8B867C;
}

.order-card {
	margin: 0 24rpx 24rpx;
	padding: 24rpx;
	border-radius: 20rpx;
	border: 1rpx solid rgba(191, 149, 102, 0.25);
	background: rgba(12, 12, 12, 0.82);
}

.order-head {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 20rpx;
}

.order-no {
	font-size: 24rpx;
	color: #8B867C;
}

.order-status {
	font-size: 24rpx;
}

.order-status--paid {
	color: #C9A86C;
}

.order-status--unpaid {
	color: #A8845A;
}

.order-body {
	display: flex;
	flex-direction: row;
	align-items: stretch;
}

.order-cover {
	width: 160rpx;
	height: 120rpx;
	border-radius: 12rpx;
	flex-shrink: 0;
	background: #1a1a1a;
}

.order-info {
	flex: 1;
	margin-left: 20rpx;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	min-width: 0;
}

.order-title {
	font-size: 30rpx;
	color: #F0E6D8;
	font-weight: 500;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.order-date {
	font-size: 24rpx;
	color: #8B867C;
	margin-top: 8rpx;
}

.order-price-row {
	display: flex;
	flex-direction: row;
	align-items: baseline;
	margin-top: 12rpx;
}

.order-price-label {
	font-size: 24rpx;
	color: #8B867C;
	margin-right: 8rpx;
}

.order-price {
	font-size: 34rpx;
	color: #C9A86C;
	font-weight: 600;
}

.list-end {
	padding: 48rpx 0 80rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.list-end-text {
	font-size: 28rpx;
	color: #8B867C;
}
</style>
