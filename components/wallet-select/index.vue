<template>
	<view v-if="visible" class="ws-mask" @click="handleClose">
		<view class="ws-panel" @click.stop>
			<text class="ws-title">{{ t('memberIntro.selectWalletTitle') }}</text>

			<view v-if="loading" class="ws-loading">
				<text class="ws-loading-text">{{ t('memberIntro.verifying') }}</text>
			</view>

			<template v-else>
				<view
					v-for="w in wallets"
					:key="w.id"
					class="ws-item"
					@click="handleSelect(w)"
				>
					<image v-if="w.icon" class="ws-icon" :src="w.icon" mode="aspectFit" />
					<view v-else class="ws-icon ws-icon--ph" />
					<text class="ws-name">{{ w.name }}</text>
					<text v-if="!w.installed && w.id !== 'WalletConnect'" class="ws-tag">{{ t('memberIntro.walletNotDetected') }}</text>
					<text class="ws-arrow">›</text>
				</view>
			</template>

			<view class="ws-cancel" @click="handleClose">
				<text class="ws-cancel-text">{{ t('memberIntro.maybeLater') }}</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
	visible: { type: Boolean, default: false }
})

const emit = defineEmits(['update:visible', 'select'])

const wallets = ref([])
const loading = ref(false)

// 弹窗首次打开时，动态加载官方 adapter 列表（真实 logo + 是否检测到已安装）
// 动态 import 让 adapter/WalletConnect 重依赖只在需要时加载，不进首屏包
watch(
	() => props.visible,
	async (v) => {
		if (!v || wallets.value.length) return
		loading.value = true
		try {
			const { listWallets } = await import('@/utils/wallet-adapters')
			wallets.value = listWallets()
		} catch (e) {
			console.warn('加载钱包列表失败', e)
		} finally {
			loading.value = false
		}
	}
)

const handleSelect = (w) => {
	// 未安装的注入钱包：引导去下载；其余（含 WalletConnect）直接发起连接
	if (!w.installed && w.id !== 'WalletConnect' && w.downloadUrl) {
		window.open(w.downloadUrl, '_blank')
		return
	}
	emit('select', w.id)
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

.ws-loading {
	padding: 48rpx 0;
	display: flex;
	align-items: center;
	justify-content: center;
}

.ws-loading-text {
	font-size: 26rpx;
	color: #8B867C;
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

.ws-icon {
	width: 64rpx;
	height: 64rpx;
	border-radius: 16rpx;
	flex-shrink: 0;
	background: #fff;
}

.ws-icon--ph {
	background: rgba(191, 149, 102, 0.2);
}

.ws-name {
	flex: 1;
	margin-left: 20rpx;
	font-size: 30rpx;
	color: #F0E6D8;
	font-weight: 600;
}

.ws-tag {
	margin-right: 12rpx;
	font-size: 20rpx;
	color: #8B867C;
	padding: 2rpx 12rpx;
	border-radius: 8rpx;
	background: rgba(139, 134, 124, 0.15);
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
