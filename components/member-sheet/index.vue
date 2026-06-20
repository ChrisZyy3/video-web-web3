<template>
	<view v-if="visible" class="sheet-mask" @click="handleClose">
		<view class="sheet-panel" :style="{ paddingBottom: safeBottom + 'px' }" @click.stop>
			<view class="sheet-close" @click="handleClose">
				<text class="sheet-close-text">×</text>
			</view>

			<text class="sheet-title">{{ productTitle }}</text>
			<view class="field">
				<text class="field-label">{{ t('memberSheet.becomeVipDesc') }}</text>
			</view>
			<text class="sheet-price">{{ product.price }} USDT</text>
			
			<!-- <view class="field">
				<text class="field-label">Contact<text class="field-required">*</text></text>
				<view class="field-input">
					<image class="field-icon" :src="icons.mail" mode="aspectFit" />
					<input
						v-model="contact"
						class="field-control"
						type="text"
						placeholder="Enter email or Telegram account"
						placeholder-class="field-placeholder"
					/>
				</view>
			</view>

			<view class="field">
				<text class="field-label">Quantity</text>
				<view class="stepper">
					<view class="stepper-btn" @click="changeQty(-1)">
						<text class="stepper-btn-text">−</text>
					</view>
					<text class="stepper-value">{{ quantity }}</text>
					<view class="stepper-btn" @click="changeQty(1)">
						<text class="stepper-btn-text">+</text>
					</view>
				</view>
			</view>

			<view class="field">
				<view class="field-label-row">
					<image class="field-label-icon" :src="icons.globe" mode="aspectFit" />
					<text class="field-label">Select Country</text>
				</view>
				<picker :range="countries" :value="countryIndex" @change="onCountryChange">
					<view class="field-picker">
						<text class="field-picker-text">{{ countries[countryIndex] }}</text>
						<text class="field-picker-arrow">⌄</text>
					</view>
				</picker>
			</view>

			<view class="field">
				<view class="field-label-row">
					<image class="field-label-icon" :src="icons.user" mode="aspectFit" />
					<text class="field-label">Gender</text>
				</view>
				<view class="gender-row">
					<view
						class="gender-btn"
						:class="{ 'gender-btn--active': gender === 'male' }"
						@click="gender = 'male'"
					>
						<image class="gender-icon" :src="icons.male" mode="aspectFit" />
						<text class="gender-text">Male</text>
					</view>
					<view
						class="gender-btn"
						:class="{ 'gender-btn--active': gender === 'female' }"
						@click="gender = 'female'"
					>
						<image class="gender-icon" :src="icons.female" mode="aspectFit" />
						<text class="gender-text">Female</text>
					</view>
				</view>
			</view> -->

			<view class="sheet-submit" @click="handleSubmit">
				<text class="sheet-submit-text">{{ t('memberSheet.placeOrder') }}</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
	visible: { type: Boolean, default: false }
})

const emit = defineEmits(['update:visible', 'close'])

const safeBottom = ref(0)
const contact = ref('')
const quantity = ref(1)
const countryIndex = ref(0)
const gender = ref('male')

const product = {
	price: '1.00'
}

const productTitle = computed(() => t('memberSheet.becomeVip'))

const countries = computed(() => [
	t('memberSheet.countryRandom'),
	t('memberSheet.countryChina'),
	t('memberSheet.countryUS'),
	t('memberSheet.countryJapan'),
	t('memberSheet.countryKorea'),
	t('memberSheet.countrySingapore')
])

const icons = {
	mail: svgIcon('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', '#8B867C'),
	globe: svgIcon('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/>', '#8B867C'),
	user: svgIcon('<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-7 8-7s8 3 8 7"/>', '#8B867C'),
	male: svgIcon('<circle cx="10" cy="14" r="5"/><path d="M19 5l-5.5 5.5M15 5h4v4"/>', '#BF9566'),
	female: svgIcon('<circle cx="12" cy="9" r="4"/><path d="M12 13v8M9 18h6"/>', '#8B867C')
}

function svgIcon(paths, color, fill = 'none') {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const calcSafeArea = () => {
	const sys = uni.getSystemInfoSync()
	safeBottom.value = sys.safeAreaInsets?.bottom || 0
}

const handleClose = () => {
	emit('update:visible', false)
	emit('close')
}

const changeQty = (delta) => {
	const next = quantity.value + delta
	if (next >= 1 && next <= 99) quantity.value = next
}

const onCountryChange = (e) => {
	countryIndex.value = Number(e.detail.value)
}

const handleSubmit = () => {
	const orderNo = `${Date.now()}${Math.floor(Math.random() * 1000)}`
	const unitPrice = parseFloat(product.price)
	const total = (unitPrice * quantity.value).toFixed(4)
	const order = {
		orderNo,
		title: productTitle.value,
		unitPrice: product.price,
		total,
		contact: contact.value.trim() || '--',
		quantity: quantity.value,
		country: countries.value[countryIndex.value],
		gender: gender.value === 'male' ? t('memberSheet.male') : t('memberSheet.female'),
		network: 'TRC20',
		currency: 'USDT',
		expireAt: Date.now() + 30 * 60 * 1000
	}
	uni.setStorageSync('pendingOrder', order)
	let listOrder = uni.getStorageSync('listOrder')?uni.getStorageSync('listOrder'):[]
	listOrder.push(order)
	uni.setStorageSync('listOrder', listOrder)
	handleClose()
	uni.navigateTo({ url: '/pages/order-confirm/index' })
}

watch(() => props.visible, (val) => {
	if (val) calcSafeArea()
})

onMounted(() => {
	calcSafeArea()
})
</script>

<style>
.sheet-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 1000001;
	background: rgba(0, 0, 0, 0.65);
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
}

.sheet-panel {
	position: relative;
	background: linear-gradient(180deg, #141414 0%, #0A0A0A 100%);
	border-radius: 32rpx 32rpx 0 0;
	border-top: 1rpx solid rgba(191, 149, 102, 0.35);
	padding: 40rpx 32rpx 32rpx;
	max-height: 88vh;
	overflow-y: auto;
}

.sheet-close {
	position: absolute;
	top: 28rpx;
	right: 28rpx;
	width: 56rpx;
	height: 56rpx;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.06);
	display: flex;
	align-items: center;
	justify-content: center;
}

.sheet-close-text {
	font-size: 40rpx;
	color: #8B867C;
	line-height: 1;
	margin-top: -4rpx;
}

.sheet-title {
	display: block;
	font-size: 34rpx;
	font-weight: 600;
	color: #F0E6D8;
	line-height: 1.4;
	padding-right: 72rpx;
}

.sheet-price {
	display: block;
	margin-top: 12rpx;
	font-size: 40rpx;
	font-weight: 700;
	color: #C9A86C;
}

.field {
	margin-top: 32rpx;
}

.field-label {
	font-size: 26rpx;
	color: #8B867C;
}

.field-required {
	color: #CF6679;
	margin-left: 4rpx;
}

.field-label-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	margin-bottom: 16rpx;
}

.field-label-icon {
	width: 28rpx;
	height: 28rpx;
	margin-right: 10rpx;
}

.field-input,
.field-picker {
	margin-top: 16rpx;
	height: 88rpx;
	border-radius: 16rpx;
	border: 1rpx solid rgba(191, 149, 102, 0.25);
	background: rgba(0, 0, 0, 0.45);
	display: flex;
	flex-direction: row;
	align-items: center;
	padding: 0 24rpx;
}

.field-icon {
	width: 32rpx;
	height: 32rpx;
	flex-shrink: 0;
}

.field-control {
	flex: 1;
	height: 88rpx;
	margin-left: 16rpx;
	font-size: 28rpx;
	color: #E8D5B5;
}

.field-placeholder {
	color: #8B867C;
	font-size: 26rpx;
}

.field-picker {
	justify-content: space-between;
}

.field-picker-text {
	font-size: 28rpx;
	color: #E8D5B5;
}

.field-picker-arrow {
	font-size: 32rpx;
	color: #8B867C;
}

.stepper {
	margin-top: 16rpx;
	display: flex;
	flex-direction: row;
	align-items: center;
}

.stepper-btn {
	width: 72rpx;
	height: 72rpx;
	border-radius: 16rpx;
	border: 1rpx solid rgba(191, 149, 102, 0.3);
	background: rgba(0, 0, 0, 0.4);
	display: flex;
	align-items: center;
	justify-content: center;
}

.stepper-btn-text {
	font-size: 36rpx;
	color: #BF9566;
	line-height: 1;
}

.stepper-value {
	min-width: 80rpx;
	text-align: center;
	font-size: 32rpx;
	color: #F0E6D8;
	font-weight: 600;
	margin: 0 24rpx;
}

.gender-row {
	margin-top: 16rpx;
	display: flex;
	flex-direction: row;
}

.gender-btn {
	flex: 1;
	height: 88rpx;
	border-radius: 16rpx;
	border: 1rpx solid rgba(191, 149, 102, 0.25);
	background: rgba(0, 0, 0, 0.4);
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
}

.gender-btn + .gender-btn {
	margin-left: 20rpx;
}

.gender-btn--active {
	border-color: #BF9566;
	background: rgba(191, 149, 102, 0.12);
	box-shadow: 0 0 16rpx rgba(191, 149, 102, 0.2);
}

.gender-icon {
	width: 32rpx;
	height: 32rpx;
}

.gender-text {
	font-size: 28rpx;
	color: #D4B896;
	margin-left: 10rpx;
}

.gender-btn--active .gender-text {
	color: #C9A86C;
	font-weight: 600;
}

.sheet-submit {
	margin-top: 40rpx;
	height: 96rpx;
	border-radius: 48rpx;
	background: linear-gradient(90deg, #A8845A 0%, #BF9566 50%, #D4B896 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 8rpx 24rpx rgba(191, 149, 102, 0.35);
	margin-bottom: 40rpx;
}

.sheet-submit-text {
	font-size: 32rpx;
	color: #1A1A1A;
	font-weight: 700;
	letter-spacing: 2rpx;
}
</style>
