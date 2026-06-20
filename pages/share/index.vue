<template>
	<view class="page">
		<view class="page-content">
			<text class="page-title">{{ t('share.title') }}</text>
		</view>
		<tabbar />
	</view>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import tabbar from '@/components/tabbar/index'

const { t } = useI18n()
</script>

<style>
.page {
	min-height: 100vh;
	background: #F8F8F8;
}

.page-content {
	padding: 40rpx;
}

.page-title {
	font-size: 36rpx;
	color: #333;
}
</style>
