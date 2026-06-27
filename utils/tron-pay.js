import acceptorAbi from '@/utils/UsdtAccepter.json'
import i18n from '@/i18n'
import { tronRpc } from '@/env'
// 引入设置会员已支付状态的本地记录函数 / Import the function to set paid member status locally
import { setLookMember } from '@/utils/look-member'

// 读取 i18n 文案
function t(key, params) {
  return i18n.global.t(key, params)
}

// 燃烧 TRX 模式网络费提示文案
function feeHintBurn(burnSun) {
  return burnSun > 0 ? t('tronPay.feeBurnEstimate') : t('tronPay.feeLowBandwidth')
}

// 资源模式网络费不足时的提示文案
function feeHintResourcePartial(energyOk, bandwidthOk) {
  return energyOk || bandwidthOk ? t('tronPay.feePartialResources') : t('tronPay.feeSwitchToBurn')
}

// TRC20 USDT 主网合约
export const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
// 收款合约（UsdtAccepter）
export const DEPOSIT_CONTRACT = 'TR1rsFStNdW1QS77DL9gMimHLSRbS1M57z'

const TRC20_ABI = [
  {
    inputs: [{ name: 'who', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  }
]

// 扩展钱包元信息：补充特性标识
const WALLET_META = {
  tronlink: {
    name: 'TronLink',
    download: 'https://www.tronlink.org/',
    buildDeepLink(url) {
      const param = encodeURIComponent(JSON.stringify({
        url,
        action: 'open',
        protocol: 'TronLink',
        version: '1.0'
      }))
      return `tronlinkoutside://pull.activity?param=${param}`
    },
    hasWaitMethod: true,
    needRequestAccounts: true
  },
  tokenpocket: {
    name: 'TokenPocket',
    download: 'https://www.tokenpocket.pro/',
    buildDeepLink(url) {
      return `tpdapp://open?params=${encodeURIComponent(JSON.stringify({ url, chain: 'TRX' }))}`
    },
    hasWaitMethod: false,
    needRequestAccounts: false
  },
  imtoken: {
    name: 'imToken',
    download: 'https://token.im/',
    buildDeepLink(url) {
      return `imtokenv2://navigate/DappView?url=${encodeURIComponent(url)}`
    },
    hasWaitMethod: false,
    needRequestAccounts: false
  },
  bitkeep: {
    name: 'BitKeep',
    download: 'https://web3.bitget.com/',
    buildDeepLink(url) {
      return `bitkeep://bkconnect?action=dapp&url=${encodeURIComponent(url)}`
    },
    hasWaitMethod: false,
    needRequestAccounts: true,
    tronWebAlias: 'bitkeepTronWeb'
  },
  okx: {
    name: 'OKX Wallet',
    download: 'https://www.okx.com/web3',
    buildDeepLink(url) {
      return `okx://wallet/dapp/url?dappUrl=${encodeURIComponent(url)}`
    },
    hasWaitMethod: false,
    needRequestAccounts: true
  }
}

// 地址缩略显示（前6后4）
export function formatAddressShort(address = '') {
  if (!address || address.length < 10) return address || '--'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// 元 → USDT 链上最小单位（×1e6）
export function toUsdtAmount(value) {
  const num = parseFloat(value || '0')
  if (!num || Number.isNaN(num)) return '0'
  return Math.round(num * 1e6).toString()
}

// USDT 链上单位 → 可读金额
export function fromUsdtAmount(raw) {
  let value = raw
  if (raw != null && typeof raw === 'object') {
    value = raw._hex ?? raw.toString?.() ?? 0
  }
  const num = Number(value || 0) / 1e6
  if (Number.isNaN(num)) return '0.00'
  return num.toFixed(2)
}

// SUN → TRX 可读金额
export function fromTrxAmount(sun) {
  let value = sun
  if (sun != null && typeof sun === 'object') {
    value = sun._hex ?? sun.toString?.() ?? 0
  }
  const num = Number(value || 0) / 1e6
  if (Number.isNaN(num)) return '0.00'
  return num.toFixed(2)
}

// 余额字符串转数字
export function parseBalance(value) {
  if (value == null || value === '--') return 0
  const num = parseFloat(String(value))
  return Number.isNaN(num) ? 0 : num
}

// TRX → SUN
export function toTrxSun(value) {
  const num = parseFloat(value || '0')
  if (!num || Number.isNaN(num)) return 0
  return Math.round(num * 1e6)
}

// 按钱包 ID 获取注入的 tronWeb 实例
export function getTronWeb(walletId = '') {
  if (typeof window === 'undefined') return null

  if (walletId === 'bitkeep' && window[WALLET_META.bitkeep.tronWebAlias]) {
    return window[WALLET_META.bitkeep.tronWebAlias]
  }

  // OKX 桌面扩展/内置浏览器注入点：window.okxwallet.tronLink.tronWeb
  if (walletId === 'okx' && window.okxwallet?.tronLink?.tronWeb) {
    return window.okxwallet.tronLink.tronWeb
  }

  const commonTronWeb = window.tronWeb || window.tronLink?.tronWeb
  if (commonTronWeb) return commonTronWeb

  return window.okxwallet?.tronLink?.tronWeb || window.bitkeepTronWeb || window.tpTronWeb || null
}

// 等待钱包注入 tronWeb，必要时请求账户授权
export async function waitForTronWeb(walletId = '', timeout = 8000) {
  const start = Date.now()
  const walletMeta = WALLET_META[walletId] || WALLET_META.tokenpocket
  const realTimeout = timeout

  while (Date.now() - start < realTimeout) {
    const tronWeb = getTronWeb(walletId)
    if (tronWeb) {
      // imToken 不执行 wait 逻辑
      if (walletMeta.hasWaitMethod && typeof tronWeb.wait === 'function' && walletId !== 'imtoken') {
        try {
          await tronWeb.wait()
        } catch (e) {
          console.warn(`${walletMeta.name} wait 执行失败`, e)
        }
      }

      // 仅需要主动授权的钱包发起账户请求
      if (walletMeta.needRequestAccounts && !tronWeb.defaultAddress?.base58) {
        try {
          if (window.tronLink?.request) {
            await window.tronLink.request({ method: 'tron_requestAccounts' })
          }
          if (window.bitkeep?.request) {
            await window.bitkeep.request({ method: 'tron_requestAccounts' })
          }
          if (window.okxwallet?.tronLink?.request) {
            await window.okxwallet.tronLink.request({ method: 'tron_requestAccounts' })
          }
        } catch (e) {
          console.warn(`${walletMeta.name} 授权失败`, e)
        }
      }

      if (tronWeb.defaultAddress?.base58) {
        return tronWeb
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 300))
  }

  // imToken 专属错误标记
  if (walletId === 'imtoken') {
    throw new Error('imToken_NO_TRONWEB')
  }
  throw new Error(t('tronPay.walletNetworkError', { wallet: walletMeta.name }))
}

// 解析 URL/缓存中的钱包信息
export function parseWalletInfo(options = {}) {
  let parsedWallet = null
  // 优先短参数 walletId，适配 imToken 长链接截断问题
  if (options.walletId && WALLET_META[options.walletId]) {
    parsedWallet = { id: options.walletId }
  } else if (options.wallet) {
    try {
      parsedWallet = JSON.parse(decodeURIComponent(options.wallet))
    } catch (e) {
      console.warn('解析wallet参数失败', e)
      if (typeof options.wallet === 'string' && WALLET_META[options.wallet]) {
        parsedWallet = { id: options.wallet }
      }
    }
  }

  if (!parsedWallet) {
    parsedWallet = uni.getStorageSync('wallet') || {}
  }

  const walletId = parsedWallet.id || 'tokenpocket'
  const meta = WALLET_META[walletId]
  const info = {
    id: walletId,
    name: parsedWallet.name || meta?.name || 'TokenPocket',
    icon: parsedWallet.icon || parsedWallet.abbr || meta?.name?.[0] || 'T'
  }

  uni.setStorageSync('wallet', info)
  return info
}

// 检测钱包浏览器是否已就绪（tronWeb 可用）
export async function isWalletBrowserReady(walletId = '', timeout = 2500) {
  try {
    await waitForTronWeb(walletId, timeout)
    return true
  } catch {
    return false
  }
}

// 向 URL 追加 hash 查询参数
function appendHashQuery(url, key, value) {
  if (!value) return url
  const hashIndex = url.indexOf('#')
  if (hashIndex < 0) {
    const sep = url.includes('?') ? '&' : '?'
    return `${url}${sep}${encodeURIComponent(key)}=${encodeURIComponent(value)}`
  }
  const prefix = url.slice(0, hashIndex + 1)
  const hash = url.slice(hashIndex + 1)
  const qIndex = hash.indexOf('?')
  const hashPath = qIndex >= 0 ? hash.slice(0, qIndex) : hash
  const hashQuery = qIndex >= 0 ? hash.slice(qIndex + 1) : ''
  const pair = `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
  const nextQuery = hashQuery ? `${hashQuery}&${pair}` : pair
  return `${prefix}${hashPath}?${nextQuery}`
}

// 获取当前页面 URL 作为支付回跳地址
export function buildPaymentReturnUrl() {
  if (typeof window === 'undefined') return ''
  return window.location.href
}

// 解析并解码回跳 URL 参数
export function parsePaymentReturnUrl(options = {}) {
  let returnUrl = options.returnUrl || ''
  if (!returnUrl) return ''

  try {
    returnUrl = decodeURIComponent(returnUrl)
  } catch (e) {
    console.warn('解析 returnUrl 失败', e)
  }
  return returnUrl
}

// 支付成功后跳转回原浏览器并附带成功标记
export function redirectAfterPaymentSuccess(returnUrl) {
  if (typeof window === 'undefined' || !returnUrl) return false

  try {
    uni.removeStorageSync('pendingOrder')
    const target = appendHashQuery(returnUrl, 'paymentSuccess', '1')
    window.location.replace(target)
    return true
  } catch (error) {
    console.warn('跳转原浏览器失败', error)
    return false
  }
}

// 清除待支付订单缓存，并同步标记本地已支付/已购买状态 / Clear pending order cache and mark the local member status as paid
export function markOrderPaymentCompleted() {
  // 移除本地待支付订单缓存 / Remove pending order from local storage
  uni.removeStorageSync('pendingOrder')
  // 标记用户已付费，记录已支付状态 / Set member status to paid in local storage
  setLookMember(true)
}

// 链上会员校验：读取收款合约 balances[user]，>= minUsdt 即视为已付费会员
// 静默读取当前已注入的 tronWeb（钱包内置浏览器场景），不主动弹出钱包授权；普通浏览器无 tronWeb 时返回 false
// 命中后顺带写入本地会员缓存，后续可直接走本地判断
// 读取收款合约 balances[address] 并与门槛比较（USDT 6 位精度，1 USDT = 1_000_000）；命中写入本地会员缓存
async function readDepositMembership(tronWeb, address, minUsdt = 1) {
  applyTronRpcHost(tronWeb)
  const depositContract = await tronWeb.contract(acceptorAbi, DEPOSIT_CONTRACT)
  const raw = await withRetry(() => depositContract.balances(address).call())
  const paid = parseRawUint(raw) >= BigInt(Math.round(minUsdt * 1e6))
  if (paid) setLookMember(true) // 命中即缓存到本地，二者其一为真即会员
  return paid
}

export async function checkOnChainMembership({ minUsdt = 1, walletId = '' } = {}) {
  if (typeof window === 'undefined') return false
  try {
    const id = walletId || uni.getStorageSync('wallet')?.id || ''
    const tronWeb = getTronWeb(id)
    const address = tronWeb?.defaultAddress?.base58
    if (!tronWeb || !address) return false
    return await readDepositMembership(tronWeb, address, minUsdt)
  } catch (error) {
    console.warn('链上会员校验失败', error)
    return false
  }
}

// 主动连接版会员校验：主动向桌面扩展请求账户授权（TronLink / OKX / BitKeep），拿到地址后读 balances
// 用于裸浏览器/未连接场景，由用户点击「连接钱包验证」触发
export async function checkMembershipWithConnect({ minUsdt = 1 } = {}) {
  if (typeof window === 'undefined') return false
  try {
    // 主动请求各扩展账户授权（任一存在即弹出对应钱包的连接确认）
    const requesters = [
      () => window.tronLink?.request?.({ method: 'tron_requestAccounts' }),
      () => window.okxwallet?.tronLink?.request?.({ method: 'tron_requestAccounts' }),
      () => window.bitkeep?.request?.({ method: 'tron_requestAccounts' })
    ]
    for (const req of requesters) {
      try { await req() } catch (e) { /* 单个钱包不存在/拒绝时忽略，尝试下一个 */ }
    }

    // 轮询等待地址注入（扩展授权后 tronWeb.defaultAddress 才就绪）
    let tronWeb = null
    for (let i = 0; i < 20; i++) {
      tronWeb = getTronWeb()
      if (tronWeb?.defaultAddress?.base58) break
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    const address = tronWeb?.defaultAddress?.base58
    if (!address) return false

    return await readDepositMembership(tronWeb, address, minUsdt)
  } catch (error) {
    console.warn('主动连接会员校验失败', error)
    return false
  }
}

// 生成支付确认页链接（imToken 用短参数 walletId 防截断）
export function getPaymentConfirmUrl(wallet, returnUrl = '') {
  if (typeof window === 'undefined') return ''
  const walletInfo = wallet || uni.getStorageSync('wallet') || {}
  const resolvedReturnUrl = returnUrl || buildPaymentReturnUrl()
  let url = ''

  if (walletInfo.id === 'imtoken') {
    url = `${window.location.origin}/#/pages/payment-confirm/index?walletId=${walletInfo.id}`
  } else {
    const walletParam = encodeURIComponent(JSON.stringify(walletInfo))
    url = `${window.location.origin}/#/pages/payment-confirm/index?wallet=${walletParam}`
  }

  return appendHashQuery(url, 'returnUrl', resolvedReturnUrl)
}

// 获取当前页面对应的支付确认页 URL
export function getCurrentPageUrl(wallet) {
  return getPaymentConfirmUrl(wallet)
}

// 通过深链接唤起钱包 App 打开支付页
export function launchWalletApp(walletId, walletInfo, returnUrl = '') {
  if (typeof window === 'undefined') {
    throw new Error(t('tronPay.h5Only'))
  }
  const meta = WALLET_META[walletId]
  if (!meta) throw new Error(t('tronPay.unsupportedWallet', { walletId }))

  const info = walletInfo || uni.getStorageSync('wallet') || {}
  if (info?.name) {
    uni.setStorageSync('wallet', info)
  }

  const url = getPaymentConfirmUrl(info, returnUrl)
  window.location.href = meta.buildDeepLink(url)
  return meta
}

// 打开钱包：已连接则直接返回，否则唤起 App
export async function openWallet(walletId, walletInfo, returnUrl = '') {
  const ready = await isWalletBrowserReady(walletId, 2500)
  if (ready) return 'connected'
  launchWalletApp(walletId, walletInfo, returnUrl)
  return 'launched'
}

// 判断订单是否已过期
export function isOrderExpired(order) {
  return !order?.expireAt || order.expireAt <= Date.now()
}

export const FEE_MODE = {
  RESOURCE: 'resource', // 左侧：订单 USDT + 资源/TRX 网络费
  BURN: 'burn'          // 右侧：订单 TRX
}

// 左侧「使用资源」→ 订单走 USDT；右侧「燃烧 TRX」→ 订单走 TRX
export function isUsdtOrderPayment(feeMode) {
  return feeMode !== FEE_MODE.BURN
}

// 标准化手续费模式（仅 resource / burn）
export function normalizeFeeMode(feeMode) {
  return feeMode === FEE_MODE.BURN ? FEE_MODE.BURN : FEE_MODE.RESOURCE
}

const ENERGY_NEEDED = 130000
const BANDWIDTH_NEEDED = 690
const MIN_TRX_FEE_FALLBACK = 1
// 页面支付按钮 / 支付前校验：固定 12 TRX 门槛，不依赖实时矿工费估算
export const MIN_TRX_PAY_GATE = 12
const TRX_TRANSFER_BANDWIDTH = 268
const CONTRACT_TX_BANDWIDTH = 345
// TRC20 USDT 主网实测保底（首次 approve + deposit 串行）
const USDT_APPROVE_ENERGY_MIN = 64000
const USDT_DEPOSIT_ENERGY_MIN = 65000
const FALLBACK_APPROVE_ENERGY = USDT_APPROVE_ENERGY_MIN
const FALLBACK_DEPOSIT_ENERGY = USDT_DEPOSIT_ENERGY_MIN

// 判断是否为 API 限流错误（429）
export function isRateLimitError(error) {
  const msg = error?.message || String(error || '')
  return msg.includes('429') || /too many requests/i.test(msg) || error?.response?.status === 429
}

// 格式化钱包数据拉取错误文案
export function formatWalletFetchError(error) {
  const msg = error?.message || String(error || '')
  if (msg.includes('imToken_NO_TRONWEB')) {
    return t('tronPay.imtokenNoTronweb')
  }
  if (msg.includes('network error')) {
    return t('tronPay.imtokenNetworkBlocked')
  }
  if (isRateLimitError(error)) {
    return t('tronPay.rateLimitError')
  }
  return error?.message || t('tronPay.walletFetchFailed')
}

// 请求失败自动重试（处理 429 限流）
async function withRetry(fn, { retries = 3, baseDelay = 2000 } = {}) {
  let lastError
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (!isRateLimitError(error) || attempt === retries) {
        throw error
      }
      await new Promise((resolve) => setTimeout(resolve, baseDelay * (attempt + 1)))
    }
  }
  throw lastError
}

// 合约写操作（approve / deposit / send）遇 429 时延长退避重试
async function sendContractWithRetry(sendFn, { retries = 4, baseDelay = 3000 } = {}) {
  return withRetry(sendFn, { retries, baseDelay })
}

// 钱包签名阶段少重试，避免 429 时反复触发 send 加重限流
async function sendWalletContract(sendFn, walletId = '') {
  const retryOpts = isRateLimitSensitiveWallet(walletId)
    ? { retries: 1, baseDelay: 5000 }
    : { retries: 4, baseDelay: 3000 }
  return sendContractWithRetry(sendFn, retryOpts)
}

const IMTOKEN_SIGN_TIMEOUT_MS = 180000
const WALLET_SIGN_TIMEOUT_MS = 120000

function getWalletSignTimeoutMs(walletId = '') {
  if (isImTokenWallet(walletId)) return IMTOKEN_SIGN_TIMEOUT_MS
  if (isRateLimitSensitiveWallet(walletId)) return WALLET_SIGN_TIMEOUT_MS
  return 120000
}

function canUsePaymentSnapshot(walletId = '', snapshot) {
  if (!snapshot?.refreshedAt || !isRateLimitSensitiveWallet(walletId)) return false
  return Date.now() - Number(snapshot.refreshedAt) < 30000
}

// 钱包签名等待超时（imToken 等 shouldPollResponse 卡住时兜底）
async function withSendTimeout(promise, ms, timeoutMessage) {
  let timer
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMessage)), ms)
  })
  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    clearTimeout(timer)
  }
}

// 限流敏感钱包合约写不在 send 内轮询，改由应用层确认
function buildApproveTxOptions(baseOptions, walletId = '') {
  if (!isRateLimitSensitiveWallet(walletId)) return baseOptions
  return { ...baseOptions, shouldPollResponse: false }
}

function buildDepositTxOptions(baseOptions, walletId = '') {
  if (!isRateLimitSensitiveWallet(walletId)) return baseOptions
  return { ...baseOptions, shouldPollResponse: false }
}

// 统一配置 TronWeb RPC 节点（支持 TronGrid API Key）
function applyTronRpcHost(tronWeb) {
  if (!tronWeb) return
  const host = tronRpc.host
  if (tronWeb.fullNode?.host !== host) {
    tronWeb.setFullNode(host)
    tronWeb.setSolidityNode(host)
  }
  if (tronRpc.apiKey && typeof tronWeb.setHeader === 'function') {
    tronWeb.setHeader({ 'TRON-PRO-API-KEY': tronRpc.apiKey })
  }
}

// imToken 内置浏览器对 TronGrid 限流更敏感
export function isImTokenWallet(walletId = '') {
  return walletId === 'imtoken'
}

// imToken / BitKeep 内置浏览器 RPC 限流更敏感，共用节流策略
export function isRateLimitSensitiveWallet(walletId = '') {
  return walletId === 'imtoken' || walletId === 'bitkeep'
}

// imToken 默认燃烧 TRX，减少 estimateEnergy 等重 RPC
export function getDefaultFeeMode(walletId = '') {
  return isImTokenWallet(walletId) ? FEE_MODE.BURN : FEE_MODE.RESOURCE
}

// SUN 转 TRX 字符串（最小显示 0.01）
function formatTrxFromSun(sun) {
  const trx = Number(sun || 0) / 1e6
  if (Number.isNaN(trx) || trx <= 0) return '0.00'
  if (trx > 0 && trx < 0.01) return '0.01'
  return trx.toFixed(2)
}

// 解析矿工费 TRX 数值，无效时返回兜底值
export function parseMinerFeeTrx(value) {
  const num = parseFloat(String(value ?? ''))
  if (Number.isNaN(num) || num < 0) return MIN_TRX_FEE_FALLBACK
  return num
}

// 从链上获取能量/带宽费率
async function fetchChainFeeRates(tronWeb) {
  try {
    const params = await withRetry(() => tronWeb.trx.getChainParameters())
    const map = {}
    for (const item of params || []) {
      if (item?.key != null) map[item.key] = Number(item.value)
    }
    return {
      energyFeeSun: map.getEnergyFee || 420,
      bandwidthFeeSun: map.getTransactionFee || 1000
    }
  } catch (error) {
    console.warn('获取链上费率失败', error)
    return { energyFeeSun: 420, bandwidthFeeSun: 1000 }
  }
}

// 计算资源不足时需燃烧的 TRX（SUN）
function calcResourceBurnSun({ energyNeeded, bandwidthNeeded, resources, rates }) {
  const energyShort = Math.max(0, energyNeeded - (resources.energy || 0))
  const bandwidthShort = Math.max(0, bandwidthNeeded - (resources.bandwidth || 0))
  return energyShort * rates.energyFeeSun + bandwidthShort * rates.bandwidthFeeSun
}

// approve → deposit 串行扣资源，逐笔累加 TRX 燃烧
function calcSequentialContractBurnSun({ steps, resources, rates }) {
  let remaining = {
    energy: resources?.energy || 0,
    bandwidth: resources?.bandwidth || 0
  }
  let totalBurnSun = 0
  let totalEnergyNeeded = 0
  let totalBandwidthNeeded = 0

  for (const step of steps) {
    if (!step.energyNeeded && !step.bandwidthNeeded) continue
    totalBurnSun += calcResourceBurnSun({
      energyNeeded: step.energyNeeded,
      bandwidthNeeded: step.bandwidthNeeded,
      resources: remaining,
      rates
    })
    totalEnergyNeeded += step.energyNeeded
    totalBandwidthNeeded += step.bandwidthNeeded
    remaining = {
      energy: Math.max(0, remaining.energy - step.energyNeeded),
      bandwidth: Math.max(0, remaining.bandwidth - step.bandwidthNeeded)
    }
  }

  return {
    burnSun: totalBurnSun,
    energyNeeded: totalEnergyNeeded,
    bandwidthNeeded: totalBandwidthNeeded,
    sufficient: totalBurnSun === 0
  }
}

// 链上 estimateEnergy 成功时优先用实测值；仅失败时回退保底能量
function resolveUsdtStepEnergy(estimated, minEnergy) {
  const value = Number(estimated || 0)
  if (value > 0) return Math.ceil(value)
  return minEnergy
}

// 估算合约调用所需能量
async function estimateContractEnergy(tronWeb, ownerAddress, contractAddress, functionSelector, parameters, feeLimit = 100000000) {
  try {
    const builder = tronWeb.transactionBuilder
    if (typeof builder?.estimateEnergy !== 'function') return null
    const ownerHex = tronWeb.address.toHex(ownerAddress)
    const contractHex = tronWeb.address.toHex(contractAddress)
    const result = await withRetry(() => builder.estimateEnergy(
      contractHex,
      functionSelector,
      { feeLimit, callValue: 0 },
      parameters,
      ownerHex
    ))
    const energy = Number(result?.energy_required ?? result?.energy_used ?? 0)
    return energy > 0 ? energy : null
  } catch (error) {
    console.warn(`estimateEnergy 失败: ${functionSelector}`, error)
    return null
  }
}

// 燃烧模式：TRX 转账网络费估算
async function estimateBurnModeFeeSun(tronWeb, resources, rates) {
  return calcResourceBurnSun({
    energyNeeded: 0,
    bandwidthNeeded: TRX_TRANSFER_BANDWIDTH,
    resources,
    rates
  })
}

// 构建 USDT 支付各步骤能量/带宽需求（与 payByDeposit 实际链路一致）
async function buildUsdtPaymentSteps(tronWeb, address, orderTotal, { lightweight = false } = {}) {
  const amount = toUsdtAmount(orderTotal)
  const feeLimit = 150000000
  const steps = []

  let needsApprove = true
  if (!lightweight) {
    try {
      const usdtContract = await tronWeb.contract(TRC20_ABI, USDT_CONTRACT)
      const allowance = await getUsdtAllowance(usdtContract, address, DEPOSIT_CONTRACT)
      needsApprove = parseRawUint(allowance) < BigInt(amount)
    } catch (error) {
      console.warn('查询 USDT allowance 失败，按需要授权估算', error)
    }
  }

  if (needsApprove) {
    const approveEnergy = lightweight
      ? null
      : await estimateContractEnergy(
        tronWeb,
        address,
        USDT_CONTRACT,
        'approve(address,uint256)',
        [
          { type: 'address', value: DEPOSIT_CONTRACT },
          { type: 'uint256', value: amount }
        ],
        feeLimit
      )
    steps.push({
      action: 'approve',
      energyNeeded: resolveUsdtStepEnergy(approveEnergy, USDT_APPROVE_ENERGY_MIN),
      bandwidthNeeded: CONTRACT_TX_BANDWIDTH
    })
  }

  const depositEnergy = lightweight
    ? null
    : await estimateContractEnergy(
      tronWeb,
      address,
      DEPOSIT_CONTRACT,
      'deposit(uint256)',
      [{ type: 'uint256', value: amount }],
      feeLimit
    )
  steps.push({
    action: 'deposit',
    energyNeeded: resolveUsdtStepEnergy(depositEnergy, USDT_DEPOSIT_ENERGY_MIN),
    bandwidthNeeded: CONTRACT_TX_BANDWIDTH
  })

  return { steps, needsApprove }
}

// 资源模式：approve + deposit 串行网络费估算
async function estimateResourceModeFeeSun(tronWeb, address, resources, rates, orderTotal, options = {}) {
  const { steps } = await buildUsdtPaymentSteps(tronWeb, address, orderTotal, options)
  return calcSequentialContractBurnSun({ steps, resources, rates })
}

// 从链上估算矿工费（含提示文案与是否充足）
export async function estimateMinerFeeFromChain(tronWeb, address, feeMode, resources = {}, orderTotal = '1.00', options = {}) {
  const rates = options.lightweight
    ? { energyFeeSun: 420, bandwidthFeeSun: 1000 }
    : await fetchChainFeeRates(tronWeb)

  if (feeMode === FEE_MODE.BURN) {
    const burnSun = await estimateBurnModeFeeSun(tronWeb, resources, rates)
    const amount = formatTrxFromSun(burnSun)
    return {
      amount,
      amountTrx: parseMinerFeeTrx(amount),
      unit: 'TRX',
      payToken: 'TRX',
      hint: feeHintBurn(burnSun),
      sufficient: null,
      source: 'chain'
    }
  }

  const { burnSun, sufficient } = await estimateResourceModeFeeSun(
    tronWeb,
    address,
    resources,
    rates,
    orderTotal,
    options
  )

  if (sufficient) {
    return {
      amount: '0.00',
      amountTrx: 0,
      unit: 'TRX',
      payToken: 'USDT',
      hint: t('tronPay.feeCoveredByResources'),
      sufficient: true,
      source: 'chain'
    }
  }

  const amount = formatTrxFromSun(burnSun)
  return {
    amount,
    amountTrx: parseMinerFeeTrx(amount),
    unit: 'TRX',
    payToken: 'USDT',
    hint: burnSun > 0 ? t('tronPay.feeInsufficientResources') : t('tronPay.feePartialResources'),
    sufficient: false,
    source: 'chain'
  }
}

// 支付前矿工费估算（与 payByDeposit / 页面展示共用同一套链上逻辑）
export async function estimatePaymentMinerFee(walletId = '', feeMode = FEE_MODE.RESOURCE, orderTotal = '1.00') {
  const tronWeb = await waitForTronWeb(walletId)
  applyTronRpcHost(tronWeb)
  const address = tronWeb.defaultAddress.base58
  const normalizedMode = normalizeFeeMode(feeMode)
  const resources = await fetchAccountResources(tronWeb, address)
  const feeOptions = {
    lightweight: isRateLimitSensitiveWallet(walletId) && normalizedMode === FEE_MODE.RESOURCE
  }
  try {
    return await estimateMinerFeeFromChain(tronWeb, address, normalizedMode, resources, orderTotal, feeOptions)
  } catch (error) {
    console.warn('支付前矿工费估算失败，使用兜底值', error)
    return estimateMinerFeeFallback(normalizedMode, resources)
  }
}

// 矿工费兜底估算（链上失败时使用）
function estimateMinerFeeFallback(feeMode, resources = {}) {
  if (feeMode === FEE_MODE.BURN) {
    return {
      amount: MIN_TRX_FEE_FALLBACK.toFixed(2),
      amountTrx: MIN_TRX_FEE_FALLBACK,
      unit: 'TRX',
      payToken: 'TRX',
      hint: t('tronPay.feeBurnFallback'),
      sufficient: null,
      source: 'fallback'
    }
  }

  const energyOk = (resources.energy || 0) >= ENERGY_NEEDED
  const bandwidthOk = (resources.bandwidth || 0) >= BANDWIDTH_NEEDED
  if (energyOk && bandwidthOk) {
    return {
      amount: '0.00',
      amountTrx: 0,
      unit: 'TRX',
      payToken: 'USDT',
      hint: t('tronPay.feeCoveredByResources'),
      sufficient: true,
      source: 'fallback'
    }
  }

  const { burnSun } = calcSequentialContractBurnSun({
    steps: [
      { energyNeeded: USDT_APPROVE_ENERGY_MIN, bandwidthNeeded: CONTRACT_TX_BANDWIDTH },
      { energyNeeded: USDT_DEPOSIT_ENERGY_MIN, bandwidthNeeded: CONTRACT_TX_BANDWIDTH }
    ],
    resources,
    rates: { energyFeeSun: 420, bandwidthFeeSun: 1000 }
  })
  const amount = formatTrxFromSun(burnSun) || MIN_TRX_FEE_FALLBACK.toFixed(2)

  return {
    amount,
    amountTrx: parseMinerFeeTrx(amount),
    unit: 'TRX',
    payToken: 'USDT',
    hint: feeHintResourcePartial(energyOk, bandwidthOk),
    sufficient: false,
    source: 'fallback'
  }
}

// 矿工费估算入口（默认走兜底逻辑）
export function estimateMinerFee(feeMode, resources = {}) {
  return estimateMinerFeeFallback(feeMode, resources)
}

let walletFetchInFlight = null

// 资源模式才需要拉取账户能量/带宽
function shouldFetchAccountResources(feeMode) {
  return feeMode !== FEE_MODE.BURN
}

// 获取账户可用能量与带宽
export async function fetchAccountResources(tronWeb, address) {
  try {
    const res = await withRetry(() => tronWeb.trx.getAccountResources(address))
    const energy = Math.max(0, (res.EnergyLimit || 0) - (res.EnergyUsed || 0))
    const net = Math.max(0, (res.NetLimit || 0) - (res.NetUsed || 0))
    const freeNet = Math.max(0, (res.freeNetLimit || 600) - (res.freeNetUsed || 0))
    return {
      energy,
      bandwidth: net + freeNet
    }
  } catch (e) {
    console.warn('获取账户资源失败', e)
    return { energy: 0, bandwidth: 0 }
  }
}

// 支付前校验余额（固定 12 TRX 门槛，不依赖实时矿工费估算）
export function validatePaymentReadiness({ feeMode, usdt, trx, orderTotal }) {
  const orderAmt = parseFloat(orderTotal || '0')
  const usdtBal = parseBalance(usdt)
  const trxBal = parseBalance(trx)

  if (!orderAmt || Number.isNaN(orderAmt)) {
    return { ok: false, message: t('tronPay.invalidPaymentAmount') }
  }

  if (feeMode === FEE_MODE.BURN) {
    const totalNeeded = orderAmt + MIN_TRX_PAY_GATE
    if (trxBal < totalNeeded) {
      return {
        ok: false,
        message: t('tronPay.insufficientTrx', {
          total: totalNeeded.toFixed(2),
          fee: MIN_TRX_PAY_GATE.toFixed(2)
        })
      }
    }
    return { ok: true }
  }

  if (usdtBal < orderAmt) {
    return { ok: false, message: t('tronPay.insufficientUsdt') }
  }

  if (trxBal < MIN_TRX_PAY_GATE) {
    return {
      ok: false,
      message: t('tronPay.insufficientTrxForResourceFee', { needed: MIN_TRX_PAY_GATE.toFixed(2) })
    }
  }

  return { ok: true }
}

// 按手续费模式构建合约交易发送参数
function buildTxSendOptions(feeMode) {
  if (feeMode === FEE_MODE.BURN) {
    return {
      feeLimit: 200000000,
      callValue: 0,
      shouldPollResponse: true
    }
  }
  // 资源模式：approve + deposit 两笔 TRC20 合约，预留更高 feeLimit
  return {
    feeLimit: 150000000,
    callValue: 0,
    shouldPollResponse: true
  }
}

// 解析链上 uint 值为 BigInt
function parseRawUint(value) {
  if (value == null) return 0n
  if (typeof value === 'bigint') return value
  if (typeof value === 'object') {
    const raw = value._hex ?? value.toString?.()
    if (raw != null) return BigInt(raw)
  }
  try {
    return BigInt(value)
  } catch {
    return 0n
  }
}

// 从交易返回体提取 txid
function extractTxId(result) {
  return result?.txid || result?.txID || result?.transaction?.txID || result?.transaction?.txid || ''
}

// 判断是否为用户拒绝签名/取消交易
function isUserRejectedError(error) {
  const msg = (error?.message || String(error || '')).toLowerCase()
  return /reject|denied|declined|cancel|cancelled|canceled|user refused/.test(msg)
}

// send() 在 shouldPollResponse 下已由钱包确认成功
function isSendSuccessful(result) {
  if (!result) return false
  if (result.result === true) return true
  return Boolean(extractTxId(result))
}

function getPollDelayMs(attemptIndex) {
  return attemptIndex < 3 ? 1000 : 2500
}

async function sleepPoll(attemptIndex) {
  await new Promise((resolve) => setTimeout(resolve, getPollDelayMs(attemptIndex)))
}

// 轮询等待交易上链确认（前几次 1s 间隔，之后 2.5s）
async function waitForTxConfirmed(tronWeb, txid, { timeout = 28000 } = {}) {
  if (!txid) return null
  const start = Date.now()
  let attempt = 0
  while (Date.now() - start < timeout) {
    try {
      const info = await withRetry(() => tronWeb.trx.getTransactionInfo(txid), { retries: 1, baseDelay: 1500 })
      if (info?.receipt?.result === 'SUCCESS') return info
      if (info?.receipt?.result === 'REVERT' || info?.receipt?.result === 'OUT_OF_ENERGY') {
        throw new Error(info.receipt.result)
      }
      if (info?.id && info?.blockNumber) return info
    } catch (error) {
      if (error?.message && /REVERT|OUT_OF_ENERGY/.test(error.message)) {
        throw error
      }
      if (isRateLimitError(error)) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        continue
      }
    }
    await sleepPoll(attempt++)
  }
  return null
}

// 合约 send 返回后的确认：已成功的跳过重复轮询
async function finalizeSentTransaction(tronWeb, tx, { onConfirming, fallbackCheck, requireConfirmed = false } = {}) {
  const txid = extractTxId(tx)
  const sendOk = isSendSuccessful(tx)

  if (sendOk) {
    onConfirming?.()
    if (txid) return tx
    if (fallbackCheck && await fallbackCheck()) return tx
    if (!requireConfirmed) return tx
  }

  onConfirming?.()

  if (txid) {
    const info = await waitForTxConfirmed(tronWeb, txid)
    if (info) return tx
  }

  if (fallbackCheck && await fallbackCheck()) return tx

  if (sendOk) return tx
  return null
}

// 查询 USDT 授权额度
async function getUsdtAllowance(usdtContract, owner, spender, walletId = '') {
  const retryOpts = isRateLimitSensitiveWallet(walletId)
    ? { retries: 1, baseDelay: 3500 }
    : { retries: 3, baseDelay: 2000 }
  const allowance = await withRetry(() => usdtContract.allowance(owner, spender).call(), retryOpts)
  return parseRawUint(allowance)
}

// 轮询等待 USDT 授权额度达到要求
async function waitForUsdtAllowance(usdtContract, owner, spender, minAmount, { timeout = 35000, fastPoll = false, lightweight = false, walletId = '' } = {}) {
  const needed = BigInt(minAmount)
  const start = Date.now()
  let attempt = 0
  const maxAttempts = lightweight
    ? (isImTokenWallet(walletId) ? 4 : 3)
    : (fastPoll ? 5 : Infinity)

  // 限流敏感钱包：先等 approve 上链，再少量查询 allowance
  if (lightweight) {
    await new Promise((resolve) => setTimeout(resolve, isImTokenWallet(walletId) ? 2500 : 1200))
  }

  while (Date.now() - start < timeout && attempt < maxAttempts) {
    try {
      const allowance = await getUsdtAllowance(usdtContract, owner, spender, walletId)
      if (allowance >= needed) return allowance
    } catch (error) {
      if (isRateLimitError(error)) {
        await new Promise((resolve) => setTimeout(resolve, 2500))
        continue
      }
      throw error
    }
    if (lightweight) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
    } else {
      await sleepPoll(attempt++)
    }
    attempt++
  }

  if (fastPoll || lightweight) {
    try {
      const allowance = await getUsdtAllowance(usdtContract, owner, spender, walletId)
      if (allowance >= needed) return allowance
    } catch (error) {
      if (!isRateLimitError(error)) throw error
    }
  }

  throw new Error(t('tronPay.usdtAllowanceTimeout'))
}

function isAllowanceTimeoutError(error) {
  return error?.message === t('tronPay.usdtAllowanceTimeout')
}

// approve 已签名提交后：allowance 轮询失败时（429/超时）限流敏感钱包仍继续 deposit
async function waitForUsdtAllowanceAfterApprove(usdtContract, owner, spender, amount, opts) {
  try {
    await waitForUsdtAllowance(usdtContract, owner, spender, amount, opts)
  } catch (error) {
    if (isRateLimitSensitiveWallet(opts.walletId) && isAllowanceTimeoutError(error)) {
      console.warn('allowance 轮询未确认，approve 已提交，等待后继续 deposit')
      await new Promise((resolve) => setTimeout(resolve, 3000))
      return
    }
    throw error
  }
}

// 轮询 USDT 余额是否已扣减（TokenPocket 等签名后可能无 txid）
async function waitForUsdtPaymentEffect(usdtContract, owner, amount, { timeout = 20000, fastPoll = true } = {}) {
  const needed = BigInt(amount)
  let before
  try {
    before = parseRawUint(await withRetry(() => usdtContract.balanceOf(owner).call()))
  } catch (error) {
    console.warn('支付结果轮询：读取 USDT 余额失败', error)
    return false
  }
  const start = Date.now()
  let attempt = 0
  const maxAttempts = fastPoll ? 6 : Infinity

  while (Date.now() - start < timeout && attempt < maxAttempts) {
    await sleepPoll(attempt++)
    try {
      const after = parseRawUint(await usdtContract.balanceOf(owner).call())
      if (before - after >= needed) return true
    } catch (error) {
      console.warn('支付结果轮询：USDT 余额查询失败', error)
    }
  }
  return false
}

// 确保 USDT 已授权给收款合约（不足则发起 approve）
async function ensureUsdtAllowance(usdtContract, owner, spender, amount, txOptions, tronWeb, walletId = '', payOptions = {}) {
  const { onProgress, onBeforeWalletSign, onAfterWalletSign } = payOptions
  const needed = BigInt(amount)
  const current = await getUsdtAllowance(usdtContract, owner, spender, walletId)
  if (current >= needed) return false

  // 使用 unlimited 授权（uint256 最大值），避免每次支付都需要 approve
  const UNLIMITED_ALLOWANCE = BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935')

  const allowanceWaitOpts = (extra = {}) => ({
    walletId,
    ...(isRateLimitSensitiveWallet(walletId)
      ? { timeout: 15000, lightweight: true, ...extra }
      : { timeout: 15000, fastPoll: true, ...extra })
  })

  try {
    onProgress?.('approve')
    const approveTxOptions = buildApproveTxOptions(txOptions, walletId)
    const signTimeoutMs = getWalletSignTimeoutMs(walletId)
    onBeforeWalletSign?.()
    let approveTx = null
    let signTimedOut = false
    try {
      approveTx = await withSendTimeout(
        sendWalletContract(() => usdtContract.approve(spender, UNLIMITED_ALLOWANCE.toString()).send(approveTxOptions), walletId),
        signTimeoutMs,
        t('tronPay.usdtApprovalSignTimeout')
      )
    } catch (signError) {
      if (signError?.message !== t('tronPay.usdtApprovalSignTimeout')) {
        throw signError
      }
      signTimedOut = true
      console.warn('approve send 超时，尝试检查链上授权是否已生效')
    } finally {
      onAfterWalletSign?.('approveConfirming')
    }

    onProgress?.('approveConfirming')

    if (signTimedOut) {
      await waitForUsdtAllowanceAfterApprove(
        usdtContract, owner, spender, amount, allowanceWaitOpts({ timeout: 25000 })
      )
      return true
    }

    const txid = extractTxId(approveTx)
    const sendOk = isSendSuccessful(approveTx)

    if (sendOk && txid) {
      await waitForUsdtAllowanceAfterApprove(
        usdtContract, owner, spender, amount, allowanceWaitOpts({ timeout: 15000 })
      )
      return true
    }

    if (txid) {
      await waitForTxConfirmed(tronWeb, txid, { timeout: 22000 })
    } else if (!sendOk) {
      console.warn('approve 返回无 txid，等待链上 allowance 生效')
    }

    await waitForUsdtAllowanceAfterApprove(
      usdtContract, owner, spender, amount, allowanceWaitOpts()
    )
    return true
  } catch (error) {
    if (isUserRejectedError(error)) {
      throw new Error(t('tronPay.usdtApprovalRejected'))
    }
    if (isRateLimitError(error)) {
      throw new Error(t('tronPay.rateLimitError'))
    }
    if (error?.message === t('tronPay.usdtApprovalSignTimeout')) {
      throw error
    }
    if (isAllowanceTimeoutError(error)) {
      throw error
    }
    throw new Error(t('tronPay.usdtApprovalFailed', { message: error?.message || String(error) }))
  }
}

// 拉取钱包余额、资源与矿工费（内部实现，统一 RPC）
async function fetchWalletBalancesInternal(walletId = '', feeMode = FEE_MODE.RESOURCE, orderTotal = '1.00') {
  const tronWeb = await waitForTronWeb(walletId)
  applyTronRpcHost(tronWeb)

  const address = tronWeb.defaultAddress.base58
  let trxSun
  let usdtRaw
  let resources = { energy: 0, bandwidth: 0 }
  const feeEstimateOptions = {
    lightweight: isRateLimitSensitiveWallet(walletId) && feeMode === FEE_MODE.RESOURCE
  }

  // 1. 获取TRX余额
  trxSun = await withRetry(() => tronWeb.trx.getBalance(address))

  // 2. 获取USDT余额
  const usdtContract = await tronWeb.contract(TRC20_ABI, USDT_CONTRACT)
  usdtRaw = await withRetry(() => usdtContract.balanceOf(address).call())

  // 3. 按需获取账户资源
  if (shouldFetchAccountResources(feeMode)) {
    resources = await fetchAccountResources(tronWeb, address)
  }

  // 4. 串行估算矿工费
  let minerFee = estimateMinerFeeFallback(feeMode, resources)
  if (feeMode === FEE_MODE.BURN) {
    try {
      const rates = await fetchChainFeeRates(tronWeb)
      const burnSun = calcResourceBurnSun({
        energyNeeded: 0,
        bandwidthNeeded: TRX_TRANSFER_BANDWIDTH,
        resources,
        rates
      })
      const amount = formatTrxFromSun(burnSun)
      minerFee = {
        amount,
        amountTrx: parseMinerFeeTrx(amount),
        unit: 'TRX',
        payToken: 'TRX',
        hint: feeHintBurn(burnSun),
        sufficient: null,
        source: 'chain'
      }
    } catch (error) {
      console.warn('燃烧模式矿工费链上估算失败，使用兜底值', error)
      minerFee = estimateMinerFeeFallback(feeMode, resources)
    }
  } else {
    try {
      minerFee = await estimateMinerFeeFromChain(tronWeb, address, feeMode, resources, orderTotal, feeEstimateOptions)
    } catch (error) {
      console.warn('资源模式矿工费链上估算失败，使用兜底值', error)
      minerFee = estimateMinerFeeFallback(feeMode, resources)
    }
  }

  return {
    address,
    addressShort: formatAddressShort(address),
    trx: fromTrxAmount(trxSun),
    usdt: fromUsdtAmount(usdtRaw),
    resources,
    minerFee
  }
}

// 拉取钱包余额与矿工费（并发请求去重）
export async function fetchWalletBalances(walletId = '', feeMode = FEE_MODE.RESOURCE, orderTotal = '1.00') {
  if (walletFetchInFlight) {
    return walletFetchInFlight
  }

  walletFetchInFlight = fetchWalletBalancesInternal(walletId, feeMode, orderTotal)
    .finally(() => {
      walletFetchInFlight = null
    })

  return walletFetchInFlight
}

// 仅获取矿工费 TRX 数值
export async function fetchMinerFeeTrx(walletId = '', feeMode = FEE_MODE.RESOURCE, orderTotal = '1.00') {
  const balances = await fetchWalletBalances(walletId, feeMode, orderTotal)
  return balances.minerFee?.amount || estimateMinerFeeFallback(feeMode, balances.resources).amount
}

// 燃烧 TRX 模式：同样使用 USDT 支付，但矿工费通过燃烧 TRX 支付
export async function payByTrx(walletId = '', orderTotal, options = {}) {
  // 注意：这里虽然叫 payByTrx，但实际上也是用 USDT 支付订单
  // 区别在于 txOptions 中不设置能量/带宽，让网络自动燃烧 TRX 作为矿工费
  const feeMode = FEE_MODE.BURN
  const tronWeb = await waitForTronWeb(walletId)
  applyTronRpcHost(tronWeb)
  const address = tronWeb.defaultAddress.base58
  const amount = toUsdtAmount(orderTotal) // 订单金额仍然是 USDT

  if (amount === '0') {
    throw new Error(t('tronPay.invalidPaymentAmount'))
  }

  const usdtContract = await tronWeb.contract(TRC20_ABI, USDT_CONTRACT)
  const depositContract = await tronWeb.contract(acceptorAbi, DEPOSIT_CONTRACT)
  
  // 关键：BURN 模式下，txOptions 不包含 energy/bandwidth，会自动燃烧 TRX
  const txOptions = buildTxSendOptions(feeMode)
  const depositTxOptions = buildDepositTxOptions(txOptions, walletId)
  const snapshot = options.paymentSnapshot

  if (canUsePaymentSnapshot(walletId, snapshot)) {
    const readiness = validatePaymentReadiness({
      feeMode,
      usdt: snapshot.usdt,
      trx: snapshot.trx,
      orderTotal
    })
    if (!readiness.ok) {
      throw new Error(readiness.message)
    }
  } else {
    const usdtRaw = await withRetry(() => usdtContract.balanceOf(address).call())
    const trxSun = await withRetry(() => tronWeb.trx.getBalance(address))

    const readiness = validatePaymentReadiness({
      feeMode,
      usdt: fromUsdtAmount(usdtRaw),
      trx: fromTrxAmount(trxSun),
      orderTotal
    })
    if (!readiness.ok) {
      throw new Error(readiness.message)
    }
  }

  // 限流敏感钱包：支付前短暂冷却
  if (isRateLimitSensitiveWallet(walletId)) {
    await new Promise((resolve) => setTimeout(resolve, 1200))
  }

  // 同样需要 USDT 授权
  const didApprove = await ensureUsdtAllowance(
    usdtContract,
    address,
    DEPOSIT_CONTRACT,
    amount,
    txOptions,
    tronWeb,
    walletId,
    {
      onProgress: options.onProgress,
      onBeforeWalletSign: options.onBeforeWalletSign,
      onAfterWalletSign: options.onAfterWalletSign
    }
  )

  if (didApprove && isRateLimitSensitiveWallet(walletId)) {
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  options.onProgress?.('deposit')
  let depositRetry = 0
  while (depositRetry < 2) {
    options.onBeforeWalletSign?.()
    let tx
    try {
      tx = await withSendTimeout(
        sendWalletContract(() => depositContract.deposit(amount).send(depositTxOptions), walletId),
        getWalletSignTimeoutMs(walletId),
        t('tronPay.usdtDepositSignTimeout')
      )
    } finally {
      options.onAfterWalletSign?.('depositConfirming')
    }
    try {
      const finalized = await finalizeSentTransaction(tronWeb, tx, {
        onConfirming: () => options.onProgress?.('depositConfirming'),
        fallbackCheck: () => waitForUsdtPaymentEffect(usdtContract, address, amount, { timeout: 18000, fastPoll: true })
      })
      if (finalized) return finalized

      console.warn('deposit 返回异常，等待链上 USDT 扣款生效')
      const paid = await waitForUsdtPaymentEffect(usdtContract, address, amount, { timeout: 18000, fastPoll: true })
      if (paid) return tx
      throw new Error(t('tronPay.depositTxFailed'))
    } catch (e) {
      if (isUserRejectedError(e)) {
        throw new Error(t('tronPay.usdtDepositRejected'))
      }
      if (isRateLimitError(e)) {
        throw new Error(t('tronPay.rateLimitError'))
      }
      depositRetry++
      if (depositRetry >= 2) {
        const walletMeta = WALLET_META[walletId]
        let errorMsg = e?.message || t('tronPay.usdtPaymentFailed')
        if (errorMsg.includes('energy not enough') || errorMsg.includes('OUT_OF_ENERGY')) {
          errorMsg = t('tronPay.insufficientEnergyTx', { wallet: walletMeta.name })
        } else if (/allowance|InsufficientAllowance/i.test(errorMsg)) {
          errorMsg = t('tronPay.usdtAllowanceTimeout')
        } else if (errorMsg === t('tronPay.usdtDepositSignTimeout')) {
          errorMsg = e.message
        } else {
          errorMsg = t('tronPay.depositTxFailedDetail', { message: errorMsg })
        }
        throw new Error(errorMsg)
      }
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
  }
}

// 资源模式：USDT approve + deposit 合约支付
export async function payByDeposit(walletId = '', orderTotal, options = {}) {
  const feeMode = FEE_MODE.RESOURCE
  const tronWeb = await waitForTronWeb(walletId)
  applyTronRpcHost(tronWeb)
  const address = tronWeb.defaultAddress.base58
  const amount = toUsdtAmount(orderTotal)

  if (amount === '0') {
    throw new Error(t('tronPay.invalidPaymentAmount'))
  }

  const usdtContract = await tronWeb.contract(TRC20_ABI, USDT_CONTRACT)
  const depositContract = await tronWeb.contract(acceptorAbi, DEPOSIT_CONTRACT)
  const depositTxOptions = buildDepositTxOptions(buildTxSendOptions(feeMode), walletId)
  const snapshot = options.paymentSnapshot

  if (canUsePaymentSnapshot(walletId, snapshot)) {
    const readiness = validatePaymentReadiness({
      feeMode,
      usdt: snapshot.usdt,
      trx: snapshot.trx,
      orderTotal
    })
    if (!readiness.ok) {
      throw new Error(readiness.message)
    }
  } else {
    const usdtRaw = await withRetry(() => usdtContract.balanceOf(address).call())
    const trxSun = await withRetry(() => tronWeb.trx.getBalance(address))

    const readiness = validatePaymentReadiness({
      feeMode,
      usdt: fromUsdtAmount(usdtRaw),
      trx: fromTrxAmount(trxSun),
      orderTotal
    })
    if (!readiness.ok) {
      throw new Error(readiness.message)
    }
  }

  const txOptions = buildTxSendOptions(feeMode)

  // 限流敏感钱包：支付前短暂冷却，降低 approve 前 TronGrid 429 概率
  if (isRateLimitSensitiveWallet(walletId)) {
    await new Promise((resolve) => setTimeout(resolve, 1200))
  }

  const didApprove = await ensureUsdtAllowance(
    usdtContract,
    address,
    DEPOSIT_CONTRACT,
    amount,
    txOptions,
    tronWeb,
    walletId,
    {
      onProgress: options.onProgress,
      onBeforeWalletSign: options.onBeforeWalletSign,
      onAfterWalletSign: options.onAfterWalletSign
    }
  )

  if (didApprove && isRateLimitSensitiveWallet(walletId)) {
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  options.onProgress?.('deposit')
  let depositRetry = 0
  while (depositRetry < 2) {
    options.onBeforeWalletSign?.()
    let tx
    try {
      tx = await withSendTimeout(
        sendWalletContract(() => depositContract.deposit(amount).send(depositTxOptions), walletId),
        getWalletSignTimeoutMs(walletId),
        t('tronPay.usdtDepositSignTimeout')
      )
    } finally {
      options.onAfterWalletSign?.('depositConfirming')
    }
    try {
      const finalized = await finalizeSentTransaction(tronWeb, tx, {
        onConfirming: () => options.onProgress?.('depositConfirming'),
        fallbackCheck: () => waitForUsdtPaymentEffect(usdtContract, address, amount, { timeout: 18000, fastPoll: true })
      })
      if (finalized) return finalized

      console.warn('deposit 返回异常，等待链上 USDT 扣款生效')
      const paid = await waitForUsdtPaymentEffect(usdtContract, address, amount, { timeout: 18000, fastPoll: true })
      if (paid) return tx
      throw new Error(t('tronPay.depositTxFailed'))
    } catch (e) {
      if (isUserRejectedError(e)) {
        throw new Error(t('tronPay.usdtDepositRejected'))
      }
      if (isRateLimitError(e)) {
        throw new Error(t('tronPay.rateLimitError'))
      }
      depositRetry++
      if (depositRetry >= 2) {
        const walletMeta = WALLET_META[walletId]
        let errorMsg = e?.message || t('tronPay.usdtPaymentFailed')
        if (errorMsg.includes('energy not enough') || errorMsg.includes('OUT_OF_ENERGY')) {
          errorMsg = t('tronPay.insufficientEnergyTx', { wallet: walletMeta.name })
        } else if (/allowance|InsufficientAllowance/i.test(errorMsg)) {
          errorMsg = t('tronPay.usdtAllowanceTimeout')
        } else if (errorMsg === t('tronPay.usdtDepositSignTimeout')) {
          errorMsg = e.message
        } else {
          errorMsg = t('tronPay.depositTxFailedDetail', { message: errorMsg })
        }
        throw new Error(errorMsg)
      }
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
  }
}

// 统一支付入口，按 feeMode 路由到 USDT 或 TRX
export async function payOrder(walletId = '', orderTotal, options = {}) {
  const feeMode = normalizeFeeMode(options.feeMode)
  if (isUsdtOrderPayment(feeMode)) {
    return payByDeposit(walletId, orderTotal, { ...options, feeMode: FEE_MODE.RESOURCE })
  }
  return payByTrx(walletId, orderTotal, { ...options, feeMode: FEE_MODE.BURN })
}