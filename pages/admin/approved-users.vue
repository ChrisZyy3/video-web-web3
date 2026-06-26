<template>
  <view class="page">
    <view class="header">
      <text class="title">授权用户查询</text>
      <text class="subtitle">查看已授权收款合约的用户列表</text>
    </view>

    <!-- 统计信息 -->
    <view class="stats-card">
      <view class="stat-item">
        <text class="stat-label">授权用户总数</text>
        <text class="stat-value">{{ totalUsers }}</text>
      </view>
      <view class="stat-item">
        <text class="stat-label">当前显示</text>
        <text class="stat-value">{{ displayedUsers.length }}</text>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="actions">
      <button 
        class="btn btn-primary" 
        :disabled="loading"
        @click="loadApprovedUsers"
      >
        {{ loading ? '加载中...' : '刷新列表' }}
      </button>
      
      <button 
        class="btn btn-secondary"
        :disabled="loading || !hasMore"
        @click="loadMore"
      >
        加载更多
      </button>
    </view>

    <!-- 用户列表 -->
    <view class="user-list" v-if="displayedUsers.length > 0">
      <view 
        class="user-item" 
        v-for="(user, index) in displayedUsers" 
        :key="index"
      >
        <view class="user-info">
          <text class="user-address">{{ user.address }}</text>
          <text class="user-allowance" v-if="user.allowance">
            授权额度: {{ user.allowance }} USDT
          </text>
        </view>
        <button 
          class="btn-small"
          @click="copyAddress(user.address)"
        >
          复制
        </button>
      </view>
    </view>

    <!-- 空状态 -->
    <view class="empty-state" v-else-if="!loading">
      <text class="empty-text">暂无授权用户数据</text>
      <text class="empty-hint">点击"刷新列表"开始查询</text>
    </view>

    <!-- 加载状态 -->
    <view class="loading-state" v-if="loading">
      <text class="loading-text">正在从 TronScan 获取数据...</text>
    </view>

    <!-- 错误提示 -->
    <view class="error-state" v-if="errorMsg">
      <text class="error-text">{{ errorMsg }}</text>
      <button class="btn btn-primary" @click="loadApprovedUsers">重试</button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { 
  getApprovedUsers, 
  getAllApprovedUsers,
  getApprovedUsersWithAllowance 
} from '@/utils/tronscan-api'
import { waitForTronWeb } from '@/utils/tron-pay'

// 响应式数据
const loading = ref(false)
const errorMsg = ref('')
const totalUsers = ref(0)
const displayedUsers = ref([])
const allUsers = ref([])
const hasMore = ref(false)
const currentPage = ref(0)
const PAGE_SIZE = 20

// 钱包类型（从路由参数获取）
const walletType = ref({
  id: 'tokenpocket',
  name: 'TokenPocket'
})

/**
 * 加载授权用户列表
 */
const loadApprovedUsers = async () => {
  loading.value = true
  errorMsg.value = ''
  currentPage.value = 0
  
  try {
    // 获取第一页数据
    const result = await getApprovedUsers({
      limit: PAGE_SIZE,
      start: 0
      // apiKey: '你的 TronScan API Key' // 可选
    })
    
    totalUsers.value = result.total
    hasMore.value = result.hasMore
    
    // 初始化显示列表
    displayedUsers.value = result.users.map(addr => ({
      address: addr,
      allowance: null
    }))
    
    allUsers.value = result.users
    
    if (result.users.length === 0) {
      errorMsg.value = '未找到授权用户，可能还没有用户授权过此合约'
    }
    
  } catch (error) {
    console.error('加载授权用户失败:', error)
    errorMsg.value = `加载失败: ${error.message}`
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

/**
 * 加载更多用户
 */
const loadMore = async () => {
  if (!hasMore.value || loading.value) return
  
  loading.value = true
  
  try {
    currentPage.value++
    const start = currentPage.value * PAGE_SIZE
    
    const result = await getApprovedUsers({
      limit: PAGE_SIZE,
      start
    })
    
    hasMore.value = result.hasMore
    
    // 追加新用户
    const newUsers = result.users.map(addr => ({
      address: addr,
      allowance: null
    }))
    
    displayedUsers.value = [...displayedUsers.value, ...newUsers]
    allUsers.value = [...allUsers.value, ...result.users]
    
  } catch (error) {
    console.error('加载更多失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

/**
 * 加载所有用户并查询授权额度（较慢，谨慎使用）
 */
const loadAllWithAllowance = async () => {
  loading.value = true
  errorMsg.value = ''
  
  try {
    // 获取所有用户地址
    const allUserAddresses = await getAllApprovedUsers({
      maxPages: 5 // 限制最多查询页数，避免过多请求
    })
    
    totalUsers.value = allUserAddresses.length
    
    // 等待 TronWeb 就绪
    const tronWeb = await waitForTronWeb(walletType.value.id)
    
    // 批量查询授权额度（分批进行，避免限流）
    const BATCH_SIZE = 10
    const usersWithAllowance = []
    
    for (let i = 0; i < allUserAddresses.length; i += BATCH_SIZE) {
      const batch = allUserAddresses.slice(i, i + BATCH_SIZE)
      const batchResults = await getApprovedUsersWithAllowance(batch, tronWeb)
      usersWithAllowance.push(...batchResults)
      
      // 批次间延迟
      if (i + BATCH_SIZE < allUserAddresses.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    displayedUsers.value = usersWithAllowance
    allUsers.value = allUserAddresses
    
    uni.showToast({
      title: `已加载 ${usersWithAllowance.length} 个用户`,
      icon: 'success'
    })
    
  } catch (error) {
    console.error('加载完整数据失败:', error)
    errorMsg.value = `加载失败: ${error.message}`
  } finally {
    loading.value = false
  }
}

/**
 * 复制地址到剪贴板
 */
const copyAddress = (address) => {
  uni.setClipboardData({
    data: address,
    success: () => {
      uni.showToast({
        title: '地址已复制',
        icon: 'success'
      })
    }
  })
}

// 页面生命周期
onLoad((options) => {
  if (options && options.wallet) {
    walletType.value = {
      id: options.wallet,
      name: options.walletName || options.wallet
    }
  }
})

onMounted(() => {
  // 自动加载数据
  loadApprovedUsers()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 20rpx;
}

.header {
  text-align: center;
  margin-bottom: 30rpx;
}

.title {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
}

.subtitle {
  display: block;
  font-size: 26rpx;
  color: #999;
}

.stats-card {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  display: flex;
  justify-content: space-around;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 10rpx;
}

.stat-value {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #1890ff;
}

.actions {
  display: flex;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: none;
}

.btn-primary {
  background: #1890ff;
  color: white;
}

.btn-primary[disabled] {
  background: #ccc;
}

.btn-secondary {
  background: white;
  color: #1890ff;
  border: 2rpx solid #1890ff;
}

.btn-secondary[disabled] {
  color: #ccc;
  border-color: #ccc;
}

.user-list {
  background: white;
  border-radius: 16rpx;
  overflow: hidden;
}

.user-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.user-item:last-child {
  border-bottom: none;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-address {
  display: block;
  font-size: 26rpx;
  color: #333;
  font-family: monospace;
  word-break: break-all;
  margin-bottom: 8rpx;
}

.user-allowance {
  display: block;
  font-size: 24rpx;
  color: #52c41a;
}

.btn-small {
  padding: 8rpx 20rpx;
  font-size: 24rpx;
  background: #f0f0f0;
  color: #666;
  border-radius: 8rpx;
  border: none;
  margin-left: 20rpx;
}

.empty-state,
.loading-state,
.error-state {
  text-align: center;
  padding: 100rpx 40rpx;
  background: white;
  border-radius: 16rpx;
}

.empty-text {
  display: block;
  font-size: 32rpx;
  color: #999;
  margin-bottom: 20rpx;
}

.empty-hint {
  display: block;
  font-size: 26rpx;
  color: #ccc;
}

.loading-text {
  display: block;
  font-size: 28rpx;
  color: #999;
}

.error-text {
  display: block;
  font-size: 28rpx;
  color: #ff4d4f;
  margin-bottom: 30rpx;
}
</style>
