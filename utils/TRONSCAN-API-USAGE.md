# TronScan API 工具使用说明

## 📋 功能概述

这个工具提供了通过 TronScan API 查询 TRON 链上数据的功能，主要用于：
- 查询授权过收款合约的用户列表
- 查询用户的 USDT 授权额度
- 获取最近的授权交易记录

##  快速开始

### 1. 访问授权用户页面

在浏览器中打开：
```
http://你的域名/pages/admin/approved-users
```

或者在钱包内置浏览器中访问。

### 2. 基本使用

页面会自动加载已授权的用户列表，你可以：
- **刷新列表**：重新从 TronScan 获取最新数据
- **加载更多**：分页加载更多的授权用户
- **复制地址**：点击"复制"按钮复制用户钱包地址

### 3. 高级功能（代码中使用）

#### 获取授权用户列表

```javascript
import { getApprovedUsers } from '@/utils/tronscan-api'

// 获取第一页（100条）
const result = await getApprovedUsers({
  limit: 100,
  start: 0
})

console.log('授权用户:', result.users)
console.log('总数:', result.total)
console.log('是否有更多:', result.hasMore)
```

#### 获取所有授权用户（自动分页）

```javascript
import { getAllApprovedUsers } from '@/utils/tronscan-api'

// 获取所有用户（最多查询10页）
const allUsers = await getAllApprovedUsers({
  maxPages: 10
})

console.log('所有授权用户:', allUsers)
```

#### 查询特定用户的授权额度

```javascript
import { getUserAllowance } from '@/utils/tronscan-api'
import { waitForTronWeb } from '@/utils/tron-pay'

// 等待 TronWeb 就绪
const tronWeb = await waitForTronWeb('tokenpocket')

// 查询授权额度
const allowance = await getUserAllowance('用户地址', tronWeb)
console.log('授权额度:', allowance, 'USDT')
```

#### 批量查询授权额度

```javascript
import { getApprovedUsersWithAllowance } from '@/utils/tronscan-api'

// 获取用户列表
const userAddresses = ['地址1', '地址2', '地址3']

// 批量查询授权额度
const usersWithAllowance = await getApprovedUsersWithAllowance(userAddresses, tronWeb)

console.log('用户详情:', usersWithAllowance)
// 输出示例:
// [
//   { address: 'Txxx...', allowance: '100.50' },
//   { address: 'Tyyy...', allowance: '50.00' }
// ]
```

#### 获取最近的授权交易

```javascript
import { getRecentApproveTransactions } from '@/utils/tronscan-api'

// 获取最近20条授权交易
const transactions = await getRecentApproveTransactions({
  limit: 20
})

console.log('最近交易:', transactions)
// 输出示例:
// [
//   {
//     from: 'Txxx...',
//     to: 'TR1rsFStNdW1QS77DL9gMimHLSRbS1M57z',
//     amount: '1000000',
//     timestamp: 1234567890,
//     txid: 'abc123...',
//     date: '2024-01-01 12:00:00'
//   }
// ]
```

## 🔑 API Key（可选）

TronScan API 有免费和付费版本：

### 免费版
- 无需 API Key
- 有请求频率限制（约每秒几次）
- 适合小规模查询

### 付费版
- 需要申请 API Key
- 更高的请求频率限制
- 更稳定的服务

**获取 API Key：**
1. 访问 https://www.tronscan.org/
2. 注册账号并登录
3. 进入 API 管理页面申请 Key
4. 在代码中使用：

```javascript
const result = await getApprovedUsers({
  limit: 100,
  start: 0,
  apiKey: '你的 API Key'
})
```

## ⚠️ 注意事项

### 1. 请求频率限制
- TronScan API 有频率限制，避免短时间内大量请求
- 批量查询时建议使用延迟：

```javascript
for (let i = 0; i < addresses.length; i += 10) {
  const batch = addresses.slice(i, i + 10)
  // ... 处理批次
  
  // 批次间延迟 1 秒
  await new Promise(resolve => setTimeout(resolve, 1000))
}
```

### 2. 数据准确性
- TronScan API 可能有几秒到几分钟的延迟
- 对于实时性要求高的场景，建议结合链上直接查询

### 3. 错误处理
始终包裹 try-catch：

```javascript
try {
  const result = await getApprovedUsers()
  // 处理结果
} catch (error) {
  console.error('查询失败:', error)
  // 显示错误提示
}
```

## 📊 返回数据结构

### getApprovedUsers 返回值
```javascript
{
  users: ['Txxx...', 'Tyyy...'],  // 用户地址数组
  total: 150,                       // 总数量
  hasMore: true                     // 是否还有更多数据
}
```

### getRecentApproveTransactions 返回值
```javascript
[
  {
    from: 'Txxx...',                // 授权者地址
    to: 'TR1rsFStNdW1QS77DL9gMimHLSRbS1M57z',  // 被授权者（收款合约）
    amount: '1000000',              // 授权金额（最小单位）
    timestamp: 1234567890,          // 时间戳（毫秒）
    txid: 'abc123...',              // 交易ID
    date: '2024-01-01 12:00:00'     // 格式化日期
  }
]
```

## 🛠️ 故障排查

### 问题1：无法获取数据
**可能原因：**
- 网络连接问题
- TronScan API 服务异常
- 合约地址配置错误

**解决方法：**
1. 检查网络连接
2. 访问 https://tronscan.org 确认服务正常
3. 检查 `utils/tronscan-api.js` 中的合约地址是否正确

### 问题2：请求被限流
**可能原因：**
- 短时间内请求过多
- 未使用 API Key

**解决方法：**
1. 增加请求间隔时间
2. 申请并使用 API Key
3. 减少单次查询数量

### 问题3：授权额度查询失败
**可能原因：**
- TronWeb 未正确初始化
- 用户地址格式错误

**解决方法：**
1. 确保调用 `waitForTronWeb()` 等待钱包就绪
2. 检查地址格式是否为有效的 TRON 地址

## 📞 技术支持

如有问题，可以：
1. 查看 TronScan 官方文档：https://developers.tron.network/docs/tronscan-api
2. 检查项目 issues
3. 联系开发团队

---

**最后更新：** 2024年
