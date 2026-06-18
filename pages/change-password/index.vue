<template>
	<view class="page">
		<image class="page-bg" src="/static/images/login-bg.png" mode="aspectFill" />

		<view class="main" :style="{ paddingTop: statusBarHeight + 'px' }">
			<view class="nav-bar">
				<view class="back-btn" @click="handleBack">
					<text class="back-icon">‹</text>
				</view>
			</view>

			<view class="title-wrap">
				<image class="title-wing" src="/static/images/title-wing.svg" mode="aspectFit" />
				<text class="title-text">修改密码</text>
				<image class="title-wing title-wing--right" src="/static/images/title-wing.svg" mode="aspectFit" />
			</view>

			<view class="form form--compact">
				<view class="input-item input-item--readonly">
					<view class="input-icon-wrap">
						<image class="input-icon" :src="icons.id" mode="aspectFit" />
					</view>
					<text class="input-label">ID</text>
					<text class="input-readonly">{{ userId }}</text>
				</view>

				<view class="input-item">
					<view class="input-icon-wrap">
						<image class="input-icon" :src="icons.user" mode="aspectFit" />
					</view>
					<text class="input-label">账号</text>
					<input
						v-model="account"
						class="input-field"
						type="text"
						placeholder="请输入新的账号"
						placeholder-class="input-placeholder"
						confirm-type="next"
					/>
				</view>

				<view class="input-item">
					<view class="input-icon-wrap">
						<image class="input-icon" :src="icons.lock" mode="aspectFit" />
					</view>
					<text class="input-label">密码</text>
					<input
						v-model="password"
						class="input-field"
						type="password"
						placeholder="六位数可中英文区分大小写"
						placeholder-class="input-placeholder"
						confirm-type="done"
					/>
				</view>
			</view>

			<view class="spacer" />

			<view class="btn-group btn-group--single">
				<view class="btn-gold" @click="handleSave">
					<text class="btn-gold-text">保存</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { formIcons } from '@/utils/form-icons'

const statusBarHeight = ref(0)
const userId = ref('2607')
const account = ref('')
const password = ref('')
const icons = formIcons

const calcLayout = () => {
	const sys = uni.getSystemInfoSync()
	statusBarHeight.value = sys.statusBarHeight || 0
}

const handleBack = () => {
	uni.navigateBack({
		fail: () => {
			uni.reLaunch({ url: '/pages/mine/index' })
		}
	})
}

const handleSave = () => {
	if (!account.value.trim()) {
		uni.showToast({ title: '请输入新的账号', icon: 'none' })
		return
	}
	if (!password.value.trim()) {
		uni.showToast({ title: '请输入密码', icon: 'none' })
		return
	}
	uni.setStorageSync('token', account.value)
	uni.showToast({ title: '保存成功', icon: 'success' })
	setTimeout(() => {
		uni.navigateBack({
			fail: () => {
				uni.reLaunch({ url: '/pages/mine/index' })
			}
		})
	}, 800)
}

onMounted(() => {
	calcLayout()
})
</script>

<style>
@import '@/static/css/auth-form.css';
</style>
