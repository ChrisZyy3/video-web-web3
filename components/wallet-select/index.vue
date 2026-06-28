<template>
	<view v-if="visible" class="ws-mask" @click="handleClose">
		<view class="ws-panel" @click.stop>
			<text class="ws-title">{{ t('memberIntro.selectWalletTitle') }}</text>

			<view
				v-for="w in wallets"
				:key="w.id"
				class="ws-item"
				@click="handleSelect(w.id)"
			>
				<view class="ws-badge" :style="{ background: w.color }">
					<text class="ws-badge-text">{{ w.short }}</text>
				</view>
				<text class="ws-name">{{ w.name }}</text>
				<text class="ws-arrow">›</text>
			</view>

			<view class="ws-cancel" @click="handleClose">
				<text class="ws-cancel-text">{{ t('memberIntro.maybeLater') }}</text>
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

const emit = defineEmits(['update:visible', 'select'])

// 可选钱包：注入式(桌面扩展/钱包内置浏览器) + WalletConnect(手机扫码)
const wallets = [
	{ id: 'tronlink', name: 'TronLink', short: 'T', color: '#1A6DF0' },
	{ id: 'okx', name: 'OKX Wallet', short: 'O', color: '#1A1A1A' },
	{ id: 'tokenpocket', name: 'TokenPocket', short: 'TP', color: '#2980FE' },
	{ id: 'walletconnect', name: 'WalletConnect', short: 'WC', color: '#3B99FC' }
]

const handleSelect = (walletId) => {
	emit('select', walletId)
}

const handleClose = () => {
	emit('update:visible', false)
}
</script>

<style>
.ws-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 1000003;
	background: rgba(0, 0, 0, 0.72);
	display: flex;
	align-items: flex-end;
	justify-content: center;
}

.ws-panel {
	width: 100%;
	max-width: 720rpx;
	padding: 40rpx 32rpx calc(40rpx + constant(safe-area-inset-bottom));
	padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
	border-radius: 28rpx 28rpx 0 0;
	background: linear-gradient(180deg, #141414 0%, #0A0A0A 100%);
	border: 1rpx solid rgba(191, 149, 102, 0.35);
}

.ws-title {
	display: block;
	text-align: center;
	font-size: 32rpx;
	font-weight: 700;
	color: #F0E6D8;
	margin-bottom: 28rpx;
}

.ws-item {
	display: flex;
	flex-direction: row;
	align-items: center;
	padding: 24rpx 20rpx;
	border-radius: 16rpx;
	background: rgba(191, 149, 102, 0.08);
	border: 1rpx solid rgba(191, 149, 102, 0.18);
}

.ws-item + .ws-item {
	margin-top: 16rpx;
}

.ws-badge {
	width: 64rpx;
	height: 64rpx;
	border-radius: 16rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.ws-badge-text {
	font-size: 26rpx;
	font-weight: 700;
	color: #fff;
}

.ws-name {
	flex: 1;
	margin-left: 20rpx;
	font-size: 30rpx;
	color: #F0E6D8;
	font-weight: 600;
}

.ws-arrow {
	font-size: 40rpx;
	color: #8B867C;
	line-height: 1;
}

.ws-cancel {
	margin-top: 28rpx;
	height: 88rpx;
	border-radius: 44rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1rpx solid rgba(139, 134, 124, 0.4);
}

.ws-cancel-text {
	font-size: 28rpx;
	color: #8B867C;
}
</style>
