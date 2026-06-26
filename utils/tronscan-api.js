/**
 * TronScan API 工具函数
 * 用于查询链上数据，包括授权用户、交易记录等
 */

// TronScan API 基础配置
const TRONSCAN_API_BASE = 'https://apilist.tronscanapi.com/api'
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
const DEPOSIT_CONTRACT = 'TR1rsFStNdW1QS77DL9gMimHLSRbS1M57z'

/**
 * 获取授权过收款合约的用户列表
 * @param {Object} options - 查询选项
 * @param {number} options.limit - 每页数量，默认 100
 * @param {number} options.start - 起始位置，默认 0
 * @param {string} options.apiKey - TronScan API Key（可选）
 * @returns {Promise<{users: string[], total: number}>} 授权用户地址列表和总数
 */
export async function getApprovedUsers(options = {}) {
  const { limit = 100, start = 0, apiKey = '' } = options
  
  try {
    // 构建请求 URL
    let url = `${TRONSCAN_API_BASE}/token_trc20/transfers?` +
              `contract_address=${USDT_CONTRACT}&` +
              `related_address=${DEPOSIT_CONTRACT}&` +
              `limit=${limit}&` +
              `start=${start}`
    
    // 如果有 API Key，添加到请求头
    const headers = {
      'Content-Type': 'application/json'
    }
    
    if (apiKey) {
      headers['TRON-PRO-API-KEY'] = apiKey
    }
    
    const response = await fetch(url, { headers })
    
    if (!response.ok) {
      throw new Error(`TronScan API 请求失败: ${response.status}`)
    }
    
    const data = await response.json()
    
    // 提取所有授权过的用户地址（去重）
    const approveUsers = new Set()
    let totalCount = 0
    
    if (data.data && Array.isArray(data.data)) {
      data.data.forEach(tx => {
        // Approval 交易的 to_address 是被授权的 spender（我们的收款合约）
        if (tx.to_address === DEPOSIT_CONTRACT && tx.from_address) {
          approveUsers.add(tx.from_address)
        }
      })
      
      totalCount = data.total || data.data.length
    }
    
    return {
      users: Array.from(approveUsers),
      total: totalCount,
      hasMore: start + limit < totalCount
    }
  } catch (error) {
    console.error('获取授权用户列表失败:', error)
    throw error
  }
}

/**
 * 获取完整的授权用户列表（自动分页）
 * @param {Object} options - 查询选项
 * @param {string} options.apiKey - TronScan API Key（可选）
 * @param {number} options.maxPages - 最大页数限制，默认 10
 * @returns {Promise<string[]>} 所有授权用户地址列表
 */
export async function getAllApprovedUsers(options = {}) {
  const { apiKey = '', maxPages = 10 } = options
  
  const allUsers = new Set()
  let start = 0
  const limit = 100
  let page = 0
  
  try {
    while (page < maxPages) {
      const result = await getApprovedUsers({ limit, start, apiKey })
      
      result.users.forEach(user => allUsers.add(user))
      
      // 如果没有更多数据，停止分页
      if (!result.hasMore) {
        break
      }
      
      start += limit
      page++
      
      // 避免请求过快被限流
      if (page < maxPages) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    return Array.from(allUsers)
  } catch (error) {
    console.error('获取完整授权用户列表失败:', error)
    throw error
  }
}

/**
 * 查询特定用户的授权额度
 * @param {string} userAddress - 用户地址
 * @param {string} tronWeb - TronWeb 实例
 * @returns {Promise<string>} 授权额度（USDT）
 */
export async function getUserAllowance(userAddress, tronWeb) {
  try {
    const usdtContract = await tronWeb.contract().at(USDT_CONTRACT)
    const allowance = await usdtContract.allowance(userAddress, DEPOSIT_CONTRACT).call()
    
    return tronWeb.fromSun(allowance)
  } catch (error) {
    console.error(`查询用户 ${userAddress} 授权额度失败:`, error)
    throw error
  }
}

/**
 * 获取授权用户的详细信息（包含授权额度）
 * @param {string[]} userAddresses - 用户地址列表
 * @param {Object} tronWeb - TronWeb 实例
 * @returns {Promise<Array<{address: string, allowance: string}>>} 用户详情列表
 */
export async function getApprovedUsersWithAllowance(userAddresses, tronWeb) {
  const results = []
  
  for (const address of userAddresses) {
    try {
      const allowance = await getUserAllowance(address, tronWeb)
      results.push({
        address,
        allowance: parseFloat(allowance).toFixed(2)
      })
    } catch (error) {
      console.warn(`跳过用户 ${address}:`, error.message)
    }
    
    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  return results
}

/**
 * 获取最近的授权交易记录
 * @param {Object} options - 查询选项
 * @param {number} options.limit - 返回数量，默认 20
 * @param {string} options.apiKey - TronScan API Key（可选）
 * @returns {Promise<Array>} 交易记录列表
 */
export async function getRecentApproveTransactions(options = {}) {
  const { limit = 20, apiKey = '' } = options
  
  try {
    let url = `${TRONSCAN_API_BASE}/token_trc20/transfers?` +
              `contract_address=${USDT_CONTRACT}&` +
              `related_address=${DEPOSIT_CONTRACT}&` +
              `limit=${limit}&` +
              `start=0&` +
              `sort=-timestamp`
    
    const headers = {
      'Content-Type': 'application/json'
    }
    
    if (apiKey) {
      headers['TRON-PRO-API-KEY'] = apiKey
    }
    
    const response = await fetch(url, { headers })
    
    if (!response.ok) {
      throw new Error(`TronScan API 请求失败: ${response.status}`)
    }
    
    const data = await response.json()
    
    // 过滤出 Approval 交易
    const approveTxs = (data.data || []).filter(tx => 
      tx.to_address === DEPOSIT_CONTRACT
    ).map(tx => ({
      from: tx.from_address,
      to: tx.to_address,
      amount: tx.amount,
      timestamp: tx.block_timestamp,
      txid: tx.transaction_id,
      date: new Date(tx.block_timestamp).toLocaleString('zh-CN')
    }))
    
    return approveTxs
  } catch (error) {
    console.error('获取最近授权交易失败:', error)
    throw error
  }
}
