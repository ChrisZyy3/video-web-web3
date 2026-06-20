<template>
  <view class="page">
    <view class="browser" :style="{ paddingTop: statusBarHeight + 'px' }">
      <scroll-view class="scroll-body" scroll-y :style="{ height: scrollHeight + 'px' }">
        <view class="content">
          <view class="page-header">
            <text class="page-title">{{ t('payment.confirmTitle') }}</text>
            <view class="countdown-row">
              <image class="countdown-icon" :src="icons.clock" mode="aspectFit" />
              <text class="countdown-value">{{ countdown }}</text>
            </view>
          </view>

          <!-- 钱包连接卡片：增加钱包图标展示 -->
          <view class="card wallet-card">
            <view class="wallet-head">
              <view class="wallet-head-left">
                <view class="wallet-icon-wrap">
                	<image class="wallet-icon" :src="icons.wallet" mode="aspectFit" />
                </view>
                <text class="wallet-head-title">{{ t('payment.walletConnection') }}</text>
                <view class="wallet-tag">
                  <text class="wallet-tag-text">{{ walletType.name }}</text>
                </view>
              </view>
              <text class="wallet-status" :class="{ 'wallet-status--error': !walletReady && !loadingBalance }">
                {{ walletStatusText }}
              </text>
            </view>
            <view class="wallet-balances">
              <view class="balance-item">
                <text class="balance-label">{{ t('payment.usdtBalance') }}</text>
                <text class="balance-value balance-value--green">{{ wallet.usdt }} USDT</text>
              </view>
              <view class="balance-item">
                <text class="balance-label">{{ t('payment.trxBalance') }}</text>
                <text class="balance-value balance-value--blue">{{ wallet.trx }} TRX</text>
              </view>
              <view class="balance-item balance-item--addr">
                <text class="balance-label">{{ t('payment.address') }}</text>
                <text class="balance-addr">{{ wallet.addressShort }}</text>
              </view>
            </view>
          </view>

          <view class="card contract-card">
            <view class="contract-head">
              <text class="contract-desc">{{ t('payment.contractDesc') }}</text>
              <view class="verified-tag">
                <text class="verified-text">{{ t('payment.verified') }}</text>
              </view>
            </view>
            <text class="contract-addr">{{ contractAddress }}</text>
          </view>

          <view class="card fee-card">
            <view class="fee-head">
              <view class="fee-head-left">
                <view class="fee-icon-wrap">
                  <image class="fee-icon" :src="icons.gas" mode="aspectFit" />
                </view>
                <text class="fee-title">{{ t('payment.estimatedNetworkFee') }}</text>
              </view>
              <view class="fee-head-right">
                <text class="fee-amount">~{{ minerFeeTrx }} TRX</text>
                <text class="fee-update">{{ t('payment.updatingLive') }}</text>
              </view>
            </view>
            <view class="fee-options">
              <view
                class="fee-option"
                :class="{ 'fee-option--active': feeMode === 'resource' }"
                @click="selectFeeMode('resource')"
              >
                <text class="fee-option-label">{{ t('payment.useResources') }}</text>
                <text class="fee-option-value">{{ t('payment.energyBandwidth') }}</text>
              </view>
              <view
                class="fee-option"
                :class="{ 'fee-option--active': feeMode === 'burn' }"
                @click="selectFeeMode('burn')"
              >
                <text class="fee-option-label">{{ t('payment.burnTrx') }}</text>
                <text class="fee-option-value">{{ t('payment.burnTrxTokens') }}</text>
              </view>
            </view>
          </view>

          <view class="warning-row" :class="{ 'warning-row--error': !warningValid }">
            <view class="warning-icon-wrap">
              <text class="warning-icon">!</text>
            </view>
            <text class="warning-text">{{ warningText }}</text>
          </view>

          <view class="bottom-space" />
        </view>
      </scroll-view>

      <view class="footer" :style="{ paddingBottom: safeBottom + 'px' }">
        <view class="pay-btn" :class="{ 'pay-btn--disabled': paying || paymentCompleted || !walletReady || !warningValid }" @click="handlePay">
          <text class="pay-btn-text">{{ payBtnText }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { onLoad, onUnload, onShow } from '@dcloudio/uni-app'
import {
  DEPOSIT_CONTRACT,
  FEE_MODE,
  fetchWalletBalances,
  payOrder,
  parseWalletInfo,
  isOrderExpired,
  validatePaymentReadiness,
  parseMinerFeeTrx,
  formatWalletFetchError,
  waitForTronWeb,
  normalizeFeeMode,
  parsePaymentReturnUrl,
  redirectAfterPaymentSuccess,
  markOrderPaymentCompleted
} from '@/utils/tron-pay'

const { t } = useI18n()

// 布局相关
const statusBarHeight = ref(0)
const scrollHeight = ref(0)
const safeBottom = ref(0)

// 订单相关
const ORDER_DURATION_MS = 30 * 60 * 1000
const countdown = ref('30:00')
const order = ref({
  total: '1.00',
  expireAt: Date.now() + ORDER_DURATION_MS
})

// 钱包相关
const feeMode = ref(FEE_MODE.RESOURCE)
const minerFeeTrx = ref('0.00')
const walletResources = ref({ energy: 0, bandwidth: 0 })
const walletReady = ref(false)
const paying = ref(false)
const paymentCompleted = ref(false)
const loadingBalance = ref(false)
const contractAddress = DEPOSIT_CONTRACT
const paymentReturnUrl = ref('')
const walletType = ref({
  id: 'tokenpocket',
  name: 'TokenPocket',
  icon: 'T'
})
const wallet = ref({
  usdt: '--',
  trx: '--',
  address: '',
  addressShort: '--'
})

// 定时器
let timer = null
let balanceTimer = null

const BALANCE_REFRESH_INTERVAL =  walletType.value.id === 'imtoken' ? 45000 : 30000
let lastBalanceRefreshAt = 0

// 【新增】警告信息有效性（用于禁用支付按钮）
const warningValid = computed(() => {
  const check = validatePaymentReadiness({
    feeMode: feeMode.value,
    usdt: wallet.value.usdt,
    trx: wallet.value.trx,
    orderTotal: order.value.total,
    resources: walletResources.value,
    minerFeeTrx: parseMinerFeeTrx(minerFeeTrx.value)
  })
  return check.ok
})

// 优化钱包状态文案
const walletStatusText = computed(() => {
  if (loadingBalance.value) return t('payment.connecting')
  if (walletReady.value) return t('payment.connected')
  return t('payment.notConnected')
})

const payBtnText = computed(() => {
  if (paying.value) return t('payment.paying')
  if (!walletReady.value) return t('payment.connectWallet', { wallet: walletType.value.name })
  return t('payment.payNow')
})

const warningText = computed(() => {
  const fee = parseMinerFeeTrx(minerFeeTrx.value)
  const check = validatePaymentReadiness({
    feeMode: feeMode.value,
    usdt: wallet.value.usdt,
    trx: wallet.value.trx,
    orderTotal: order.value.total,
    resources: walletResources.value,
    minerFeeTrx: fee
  })

  if (!check.ok) {
    return check.message
  }

  if (feeMode.value === FEE_MODE.BURN) {
    const totalNeeded = (parseFloat(order.value.total || '0') + fee).toFixed(2)
    return t('payment.warningBurnMode', {
      total: totalNeeded,
      fee: fee.toFixed(2)
    })
  }

  const { energy, bandwidth } = walletResources.value
  const energyText = energy >= 120000
    ? t('payment.resourceSufficient')
    : t('payment.resourceInsufficient', { current: energy, needed: 120000 })
  const bandwidthText = bandwidth >= 600
    ? t('payment.resourceSufficient')
    : t('payment.resourceInsufficient', { current: bandwidth, needed: 600 })

  return t('payment.warningResourceMode', {
    energyStatus: energyText,
    bandwidthStatus: bandwidthText
  })
})

// SVG图标生成（原有逻辑保留）
const icons = {
  clock: svgIcon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', '#28AD7B'),
  wallet: svgIcon('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="17" cy="14" r="1.2" fill="#28AD7B" stroke="none"/>', '#28AD7B', '#fff'),
  gas: svgIcon(
    '<path d="M4 20h9"/>' +
    '<rect x="5" y="7" width="7" height="13" rx="1.2" fill="none"/>' +
    '<rect x="6.5" y="9.5" width="4" height="2.5" rx="0.5" fill="none"/>' +
    '<path d="M12 14.5h2.5"/>' +
    '<path d="M14.5 14.5v1.5"/>' +
    '<path d="M14.5 16h4.5"/>' +
    '<path d="M19 16v3.5"/>' +
    '<path d="M17.5 19.5h3"/>',
    '#3B78F1'
  )
}

function svgIcon(paths, color, fill = 'none') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

// 布局计算（原有逻辑保留）
const calcLayout = () => {
  const sys = uni.getSystemInfoSync()
  statusBarHeight.value = sys.statusBarHeight || 0
  safeBottom.value = sys.safeAreaInsets?.bottom || 0
  const browserBarH = uni.upx2px(88)
  const footerH = uni.upx2px(120) + safeBottom.value
  scrollHeight.value = sys.windowHeight - statusBarHeight.value - browserBarH - footerH
}

// 加载订单（原有逻辑保留）
const loadOrder = () => {
  const data = uni.getStorageSync('pendingOrder')
  if (data) {
    order.value = { ...order.value, ...data }
  }
}

// 每次进入页面重置 30 分钟倒计时
const resetOrderCountdown = () => {
  loadOrder()
  order.value.expireAt = Date.now() + ORDER_DURATION_MS
  uni.setStorageSync('pendingOrder', { ...order.value })
  countdown.value = '30:00'
}

const startCountdownTimer = () => {
  if (timer) clearInterval(timer)
  updateCountdown()
  timer = setInterval(updateCountdown, 1000)
}

// 加载支付方式（原有逻辑保留）
const loadFeeMode = () => {
  const saved = uni.getStorageSync('paymentFeeMode')
  if (saved === FEE_MODE.BURN || saved === FEE_MODE.RESOURCE) {
    feeMode.value = saved
  }
}

// 选择支付方式：已连接时刷新（燃烧模式已降为轻量 RPC）
const selectFeeMode = (mode) => {
  if (feeMode.value === mode) return
  feeMode.value = mode
  uni.setStorageSync('paymentFeeMode', mode)
  if (walletReady.value) {
    refreshBalances({ force: true })
  }
}

// 刷新余额与矿工费（合并为单次链上请求）
const refreshBalances = async ({ force = false, silent = false } = {}) => {
  // #ifndef H5
  return
  // #endif
  if (loadingBalance.value) return

  const now = Date.now()
  if (!force && walletReady.value && now - lastBalanceRefreshAt < BALANCE_REFRESH_INTERVAL) {
    return
  }

  loadingBalance.value = true
  try {
    const balances = await fetchWalletBalances(walletType.value.id, feeMode.value, order.value.total)
    const { resources, minerFee: feeInfo, ...balanceFields } = balances
    wallet.value = balanceFields
    walletResources.value = resources || { energy: 0, bandwidth: 0 }
    if (feeInfo?.amount) {
      minerFeeTrx.value = feeInfo.amount
    }
    walletReady.value = true
    lastBalanceRefreshAt = Date.now()
  } catch (error) {
    walletReady.value = false
    if (!silent) {
      uni.showToast({
        title: formatWalletFetchError(error),
        icon: 'none',
        duration: 3000
      })
    }
    console.error('获取钱包信息失败:', error)
  } finally {
    loadingBalance.value = false
  }
}

// 倒计时更新（原有逻辑保留）
const updateCountdown = () => {
  const left = Math.max(0, order.value.expireAt - Date.now())
  const min = Math.floor(left / 60000)
  const sec = Math.floor((left % 60000) / 1000)
  countdown.value = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  if (left <= 0 && timer) {
    clearInterval(timer)
    uni.showToast({ title: t('common.orderExpired'), icon: 'none' })
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/index/index' })
    }, 1500)
  }
}

// 关闭页面（原有逻辑保留）
const handleClose = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.reLaunch({ url: '/pages/index/index' })
  }
}

// 支付处理（优化：传递walletId，增强异常提示）
const handlePay = async () => {
  if (paying.value || paymentCompleted.value || !warningValid.value) return

  // 新增：imToken支付前提前校验链连接
  if (walletType.value.id === 'imtoken') {
    try {
      await waitForTronWeb('imtoken', 5000)
    } catch (err) {
      uni.showToast({ title: formatWalletFetchError(err), icon: 'none', duration: 3000 })
      return
    }
  }
  
  // 订单过期校验
  if (isOrderExpired(order.value)) {
    uni.showToast({ title: t('common.orderExpired'), icon: 'none' })
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/index/index' })
    }, 1500)
    return
  }

  // 钱包未连接则尝试连接
  if (!walletReady.value) {
    await refreshBalances({ force: true })
    if (!walletReady.value) {
      uni.showToast({ title: t('payment.openInWalletBrowser', { wallet: walletType.value.name }), icon: 'none' })
      return
    }
  }

  // 再次校验
  const check = validatePaymentReadiness({
    feeMode: feeMode.value,
    usdt: wallet.value.usdt,
    trx: wallet.value.trx,
    orderTotal: order.value.total,
    resources: walletResources.value,
    minerFeeTrx: parseMinerFeeTrx(minerFeeTrx.value)
  })
  if (!check.ok) {
    uni.showToast({ title: check.message, icon: 'none', duration: 2500 })
    return
  }

  // 发起支付
  paying.value = true
  uni.showLoading({ title: t('payment.payingWith', { token: feeMode.value === FEE_MODE.BURN ? 'TRX' : 'USDT' }), mask: true })
  try {
    await payOrder(walletType.value.id, order.value.total, {
      feeMode: normalizeFeeMode(feeMode.value)
    })
    paymentCompleted.value = true
    markOrderPaymentCompleted()
    uni.showToast({ title: t('common.paymentSuccess'), icon: 'success' })
    setTimeout(() => {
      if (!redirectAfterPaymentSuccess(paymentReturnUrl.value)) {
        uni.reLaunch({ url: '/pages/index/index' })
      }
    }, 1200)
  } catch (error) {
    console.error('支付失败:', error)
    uni.showToast({ title: error?.message || t('common.paymentFailed'), icon: 'none', duration: 3000 })
  } finally {
    uni.hideLoading()
    paying.value = false
  }
}

// 页面生命周期（优化：传递walletId）
onLoad((options) => {
  let walletOpts = options || {}

  // #ifdef H5
  if (typeof window !== 'undefined') {
    const hash = window.location.hash || ''
    if (!walletOpts.wallet && !walletOpts.walletId) {
      const walletIdMatch = hash.match(/[?&]walletId=([^&]+)/)
      const walletMatch = hash.match(/[?&]wallet=([^&]+)/)
      if (walletIdMatch) walletOpts = { ...walletOpts, walletId: walletIdMatch[1] }
      else if (walletMatch) walletOpts = { ...walletOpts, wallet: walletMatch[1] }
    }
    if (!walletOpts.returnUrl) {
      const returnUrlMatch = hash.match(/[?&]returnUrl=([^&]+)/)
      if (returnUrlMatch) walletOpts = { ...walletOpts, returnUrl: returnUrlMatch[1] }
    }
  }
  // #endif
  walletType.value = parseWalletInfo(walletOpts)
  paymentReturnUrl.value = parsePaymentReturnUrl(walletOpts)
  loadFeeMode()
  resetOrderCountdown()
  startCountdownTimer()
})

onShow(async () => {
  resetOrderCountdown()
  startCountdownTimer()

  // imToken切后台会销毁tronWeb，延迟等待重新注入
  if (walletType.value.id === 'imtoken') {
    await new Promise(r => setTimeout(r, 800))
  }
  if (walletReady.value) {
    refreshBalances({ silent: true })
  }
})

onMounted(async () => {
  calcLayout()

  // imToken 页面加载延迟2.5秒再请求余额，避免刚打开就发RPC被拦截
  if (walletType.value.id === 'imtoken') {
    setTimeout(() => refreshBalances({ force: true }), 2500)
  } else {
    refreshBalances({ force: true })
  }

  // imToken 45秒刷新一次，普通钱包30秒
  const interval = walletType.value.id === 'imtoken' ? 45000 : BALANCE_REFRESH_INTERVAL
  balanceTimer = setInterval(() => refreshBalances({ silent: true }), interval)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (balanceTimer) clearInterval(balanceTimer)
})
</script>

<style>
.page {
	min-height: 100vh;
	background: #fff;
}

.page-header{
	display:flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
}

.browser {
	min-height: 100vh;
	display: flex;
	flex-direction: column;
	background: #fff;
}

.browser-bar {
	height: 88rpx;
	padding: 0 24rpx;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	border-bottom: 1rpx solid #E8ECF0;
	box-sizing: border-box;
}

.browser-actions {
	display: flex;
	flex-direction: row;
	align-items: center;
	width: 120rpx;
}

.browser-action {
	font-size: 40rpx;
	color: #94A3B8;
	line-height: 1;
	font-weight: 300;
}

.browser-action--min {
	margin-left: 24rpx;
	font-size: 44rpx;
}

.browser-title {
	flex: 1;
	text-align: center;
	font-size: 28rpx;
	color: #334155;
	font-weight: 500;
}

.browser-avatar {
	width: 48rpx;
	height: 48rpx;
	border-radius: 50%;
	background: #E2E8F0;
	display: flex;
	align-items: center;
	justify-content: center;
}

.browser-avatar-text {
	font-size: 24rpx;
	color: #64748B;
	font-weight: 600;
}

.scroll-body {
	flex: 1;
	box-sizing: border-box;
}

.content {
	padding: 32rpx 28rpx 0;
}

.page-title {
	display: block;
	font-size: 44rpx;
	font-weight: 700;
	color: #0F172A;
	line-height: 1.2;
}

.countdown-row {
	margin-top: 12rpx;
	display: flex;
	flex-direction: row;
	align-items: center;
}

.countdown-icon {
	width: 32rpx;
	height: 32rpx;
}

.countdown-value {
	margin-left: 8rpx;
	font-size: 28rpx;
	color: #28AD7B;
	font-weight: 600;
}

.card {
	margin-top: 24rpx;
	border-radius: 24rpx;
	padding: 28rpx;
	box-sizing: border-box;
}

.wallet-card {
	background: #ECFDF5;
	border: 1rpx solid #D1FAE5;
}

.wallet-head {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
}

.wallet-head-left {
	display: flex;
	flex-direction: row;
	align-items: center;
	flex: 1;
	min-width: 0;
}

.wallet-icon-wrap {
	width: 48rpx;
	height: 48rpx;
	border-radius: 12rpx;
	background: #28AD7B;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.wallet-icon {
	width: 28rpx;
	height: 28rpx;
}

.wallet-head-title {
	margin-left: 12rpx;
	font-size: 28rpx;
	color: #0F172A;
	font-weight: 600;
	flex-shrink: 0;
}

.wallet-tag {
	margin-left: 12rpx;
	padding: 4rpx 16rpx;
	border-radius: 8rpx;
	background: #DBEAFE;
	flex-shrink: 0;
}

.wallet-tag-text {
	font-size: 22rpx;
	color: #3B78F1;
	font-weight: 500;
}

.wallet-status {
	font-size: 24rpx;
	color: #94A3B8;
	flex-shrink: 0;
	margin-left: 12rpx;
}

.wallet-balances {
	margin-top: 28rpx;
	display: flex;
	flex-direction: row;
}

.balance-item {
	flex: 1;
	min-width: 0;
}

.balance-item--addr {
	flex: 0.85;
}

.balance-label {
	display: block;
	font-size: 22rpx;
	color: #64748B;
}

.balance-value {
	display: block;
	margin-top: 8rpx;
	font-size: 30rpx;
	font-weight: 700;
	line-height: 1.2;
}

.balance-value--green {
	color: #28AD7B;
}

.balance-value--blue {
	color: #3B78F1;
}

.balance-addr {
	display: block;
	margin-top: 8rpx;
	font-size: 26rpx;
	color: #64748B;
	font-weight: 500;
	word-break: break-all;
}

.contract-card {
	background: #F8FAFC;
	border: 1rpx solid #E2E8F0;
}

.contract-head {
	display: flex;
	flex-direction: row;
	align-items: flex-start;
}

.contract-desc {
	flex: 1;
	font-size: 24rpx;
	color: #64748B;
	line-height: 1.55;
}

.verified-tag {
	margin-left: 12rpx;
	flex-shrink: 0;
	padding: 4rpx 12rpx;
	border-radius: 8rpx;
	background: #ECFDF5;
}

.verified-text {
	font-size: 22rpx;
	color: #28AD7B;
	font-weight: 500;
}

.contract-addr {
	display: block;
	margin-top: 20rpx;
	font-size: 30rpx;
	color: #0F172A;
	font-weight: 600;
	line-height: 1.45;
	word-break: break-all;
	font-family: 'Courier New', Courier, monospace;
}

.fee-card {
	background: #EFF6FF;
	border: 1rpx solid #DBEAFE;
}

.fee-head {
	display: flex;
	flex-direction: row;
	align-items: flex-start;
	justify-content: space-between;
}

.fee-head-left {
	display: flex;
	flex-direction: row;
	align-items: center;
}

.fee-icon-wrap {
	width: 48rpx;
	height: 48rpx;
	border-radius: 12rpx;
	background: #DBEAFE;
	display: flex;
	align-items: center;
	justify-content: center;
}

.fee-icon {
	width: 30rpx;
	height: 30rpx;
}

.fee-title {
	margin-left: 12rpx;
	font-size: 28rpx;
	color: #0F172A;
	font-weight: 600;
}

.fee-head-right {
	text-align: right;
}

.fee-amount {
	display: block;
	font-size: 32rpx;
	color: #3B78F1;
	font-weight: 700;
}

.fee-update {
	display: block;
	margin-top: 4rpx;
	font-size: 20rpx;
	color: #60A5FA;
}

.fee-options {
	margin-top: 24rpx;
	display: flex;
	flex-direction: row;
}

.fee-option {
	flex: 1;
	padding: 20rpx 16rpx;
	border-radius: 16rpx;
	border: 2rpx solid #E2E8F0;
	background: #fff;
	box-sizing: border-box;
}

.fee-option + .fee-option {
	margin-left: 16rpx;
}

.fee-option--active {
	border-color: #28AD7B;
	background: #F0FDF4;
}

.fee-option-label {
	display: block;
	font-size: 24rpx;
	color: #64748B;
	text-align: center;
}

.fee-option-value {
	display: block;
	margin-top: 8rpx;
	font-size: 26rpx;
	color: #0F172A;
	font-weight: 600;
	text-align: center;
}

.fee-option-sub {
	display: block;
	margin-top: 4rpx;
	font-size: 20rpx;
	color: #94A3B8;
	text-align: center;
}

.warning-row {
	margin-top: 24rpx;
	display: flex;
	flex-direction: row;
	align-items: flex-start;
}

.warning-icon-wrap {
	width: 36rpx;
	height: 36rpx;
	border-radius: 50%;
	background: #FEF3C7;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.warning-icon {
	font-size: 24rpx;
	color: #F59E0B;
	font-weight: 700;
	line-height: 1;
}

.warning-text {
	flex: 1;
	margin-left: 12rpx;
	font-size: 24rpx;
	color: #64748B;
	line-height: 1.55;
}
.warning-text text{
	font-weight: 800;
	color: #000
}

.bottom-space {
	height: 32rpx;
}

.footer {
	padding: 16rpx 28rpx 24rpx;
	background: #fff;
	border-top: 1rpx solid #F1F5F9;
	margin-bottom: 40rpx;
}

.pay-btn {
	height: 96rpx;
	border-radius: 48rpx;
	background: #0F172A;
	display: flex;
	align-items: center;
	justify-content: center;
}

.pay-btn--disabled {
	opacity: 0.65;
}

.pay-btn-text {
	font-size: 32rpx;
	color: #fff;
	font-weight: 700;
}
</style>
