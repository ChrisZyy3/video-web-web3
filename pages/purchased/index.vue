<template>
	<view class="page">
		<view class="page-content">
			<text class="page-title">已购</text>
		</view>
		<tabbar />
	</view>
</template>

<script setup>
import tabbar from '@/components/tabbar/index'
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
