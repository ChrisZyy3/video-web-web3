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
				<view class="ws-icon" :class="w.id">
					<img v-if="w.img" :src="w.img" />
					<text v-else class="ws-badge" :style="{ background: w.color, color: w.textColor || '#fff' }">{{ w.badge }}</text>
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
import wallet1 from '@/static/images/wallet1.png'
import wallet2 from '@/static/images/wallet2.png'
import wallet3 from '@/static/images/wallet3.png'
import wallet4 from '@/static/images/wallet4.png'

const { t } = useI18n()

defineProps({
	visible: { type: Boolean, default: false }
})

const emit = defineEmits(['update:visible', 'select'])

// 与 payment-wallet 页一致的 4 个钱包（同图标）+ OKX
// 注：WalletConnect 暂时隐藏——其依赖的 Reown/relay 在当前网络不可达（Failed to fetch / Proposal expired）。
// 连接与依赖逻辑均保留，换网络可达后取消下方注释即可恢复。
const wallets = [
	{ id: 'tronlink', name: 'TronLink', img: wallet1 },
	{ id: 'tokenpocket', name: 'TokenPocket', img: wallet2 },
	{ id: 'imtoken', name: 'imToken', img: wallet3 },
	{ id: 'bitkeep', name: 'BitKeep', img: wallet4 },
	{ id: 'okx', name: 'OKX Wallet', badge: 'OKX', color: '#1A1A1A' }
	// 暂时注释币安钱包，视需求随时可重新启用
	// Temporarily commented out Binance Wallet, can be re-enabled as needed
	// { id: 'binance', name: 'Binance Wallet', badge: 'BNB', color: '#F0B90B', textColor: '#1A1A1A' }
	// { id: 'walletconnect', name: 'WalletConnect', badge: 'WC', color: '#3B99FC' }
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
	padding: 20rpx;
	border-radius: 16rpx;
	background: rgba(191, 149, 102, 0.08);
	border: 1rpx solid rgba(191, 149, 102, 0.18);
}

.ws-item + .ws-item {
	margin-top: 16rpx;
}

.ws-icon {
	width: 72rpx;
	height: 72rpx;
	border-radius: 16rpx;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
	background: #fff;
}

/* 与 payment-wallet 一致的各钱包图标缩放（wallet1~4 图片裁切比例不同） */
.ws-icon.tronlink img { width: 165%; position: relative; left: -2rpx; }
.ws-icon.tokenpocket img { width: 250%; }
.ws-icon.imtoken img { width: 190%; }
.ws-icon.bitkeep img { width: 129%; position: relative; top: -1.5rpx; left: 1rpx; }

.ws-badge {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 22rpx;
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
