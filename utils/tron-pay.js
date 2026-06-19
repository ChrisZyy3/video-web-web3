import acceptorAbi from '@/utils/UsdtAccepter.json'

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
        protocol: 'tronlink',
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
  }
}

// 格式化短地址
export function formatAddressShort(address = '') {
  if (!address || address.length < 10) return address || '--'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// USDT 金额转链上单位 1e6
export function toUsdtAmount(value) {
  const num = parseFloat(value || '0')
  if (!num || Number.isNaN(num)) return '0'
  return Math.round(num * 1e6).toString()
}

export function fromUsdtAmount(raw) {
  let value = raw
  if (raw != null && typeof raw === 'object') {
    value = raw._hex ?? raw.toString?.() ?? 0
  }
  const num = Number(value || 0) / 1e6
  if (Number.isNaN(num)) return '0.00'
  return num.toFixed(2)
}

// SUN 转 TRX
export function fromTrxAmount(sun) {
  let value = sun
  if (sun != null && typeof sun === 'object') {
    value = sun._hex ?? sun.toString?.() ?? 0
  }
  const num = Number(value || 0) / 1e6
  if (Number.isNaN(num)) return '0.00'
  return num.toFixed(2)
}

export function parseBalance(value) {
  if (value == null || value === '--') return 0
  const num = parseFloat(String(value))
  return Number.isNaN(num) ? 0 : num
}

export function toTrxSun(value) {
  const num = parseFloat(value || '0')
  if (!num || Number.isNaN(num)) return 0
  return Math.round(num * 1e6)
}

// 获取对应钱包注入的 tronWeb（修复：移除无效 imTokenTronWeb 全局判断）
export function getTronWeb(walletId = '') {
  if (typeof window === 'undefined') return null

  if (walletId === 'bitkeep' && window[WALLET_META.bitkeep.tronWebAlias]) {
    return window[WALLET_META.bitkeep.tronWebAlias]
  }

  const commonTronWeb = window.tronWeb || window.tronLink?.tronWeb
  if (commonTronWeb) return commonTronWeb

  return window.bitkeepTronWeb || window.tpTronWeb || null
}

// 等待 tronWeb 注入，缩短超时，适配 imToken 沙箱限制
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
  throw new Error(`${walletMeta.name} wallet network error`)
}

// 解析钱包信息，兼容短参数 walletId（imToken专用）
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

export async function isWalletBrowserReady(walletId = '', timeout = 2500) {
  try {
    await waitForTronWeb(walletId, timeout)
    return true
  } catch {
    return false
  }
}

// 生成支付确认页链接，imToken 使用短参数 walletId 防止URL过长截断
export function getPaymentConfirmUrl(wallet) {
  if (typeof window === 'undefined') return ''
  const walletInfo = wallet || uni.getStorageSync('wallet') || {}
  if (walletInfo.id === 'imtoken') {
    return `${window.location.origin}/#/pages/payment-confirm/index?walletId=${walletInfo.id}`
  }
  const walletParam = encodeURIComponent(JSON.stringify(walletInfo))
  return `${window.location.origin}/#/pages/payment-confirm/index?wallet=${walletParam}`
}

export function getCurrentPageUrl(wallet) {
  return getPaymentConfirmUrl(wallet)
}

export function launchWalletApp(walletId, walletInfo) {
  if (typeof window === 'undefined') {
    throw new Error('Wallet can only be opened in H5 environment')
  }
  const meta = WALLET_META[walletId]
  if (!meta) throw new Error(`Unsupported wallet type: ${walletId}`)

  const info = walletInfo || uni.getStorageSync('wallet') || {}
  if (info?.name) {
    uni.setStorageSync('wallet', info)
  }

  const url = getPaymentConfirmUrl(info)
  window.location.href = meta.buildDeepLink(url)
  return meta
}

export async function openWallet(walletId, walletInfo) {
  const ready = await isWalletBrowserReady(walletId, 2500)
  if (ready) return 'connected'
  launchWalletApp(walletId, walletInfo)
  return 'launched'
}

export function isOrderExpired(order) {
  return !order?.expireAt || order.expireAt <= Date.now()
}

export const FEE_MODE = {
  RESOURCE: 'resource',
  BURN: 'burn'
}

const ENERGY_NEEDED = 120000
const BANDWIDTH_NEEDED = 600
const MIN_TRX_RESOURCE = 1
const MIN_TRX_FEE_FALLBACK = 1
const TRX_TRANSFER_BANDWIDTH = 268
const CONTRACT_TX_BANDWIDTH = 345
const FALLBACK_APPROVE_ENERGY = 50000
const FALLBACK_DEPOSIT_ENERGY = 70000

export function isRateLimitError(error) {
  const msg = error?.message || String(error || '')
  return msg.includes('429') || /too many requests/i.test(msg) || error?.response?.status === 429
}

// 格式化错误文案，区分 imToken 网络异常
export function formatWalletFetchError(error) {
  const msg = error?.message || String(error || '')
  if (msg.includes('imToken_NO_TRONWEB')) {
    return '请在imToken内置浏览器刷新页面，等待钱包链节点注入'
  }
  if (msg.includes('network error')) {
    return 'imToken网络请求被拦截，切换流量或清除浏览器缓存重试'
  }
  if (isRateLimitError(error)) {
    return '链节点请求频繁，请稍后重试'
  }
  return error?.message || '获取钱包信息失败'
}

// 请求失败自动重试，处理429限流
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

function formatTrxFromSun(sun) {
  const trx = Number(sun || 0) / 1e6
  if (Number.isNaN(trx) || trx <= 0) return '0.00'
  if (trx > 0 && trx < 0.01) return '0.01'
  return trx.toFixed(2)
}

export function parseMinerFeeTrx(value) {
  const num = parseFloat(String(value ?? ''))
  if (Number.isNaN(num) || num < 0) return MIN_TRX_FEE_FALLBACK
  return num
}

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

function calcResourceBurnSun({ energyNeeded, bandwidthNeeded, resources, rates }) {
  const energyShort = Math.max(0, energyNeeded - (resources.energy || 0))
  const bandwidthShort = Math.max(0, bandwidthNeeded - (resources.bandwidth || 0))
  return energyShort * rates.energyFeeSun + bandwidthShort * rates.bandwidthFeeSun
}

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

async function estimateBurnModeFeeSun(tronWeb, resources, rates) {
  return calcResourceBurnSun({
    energyNeeded: 0,
    bandwidthNeeded: TRX_TRANSFER_BANDWIDTH,
    resources,
    rates
  })
}

async function estimateResourceModeFeeSun(tronWeb, address, resources, rates, orderTotal) {
  const amount = toUsdtAmount(orderTotal)
  const feeLimit = 100000000

  const approveEnergy = await estimateContractEnergy(
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
  const depositEnergy = await estimateContractEnergy(
    tronWeb,
    address,
    DEPOSIT_CONTRACT,
    'deposit(uint256)',
    [{ type: 'uint256', value: amount }],
    feeLimit
  )

  const energyNeeded = (approveEnergy ?? FALLBACK_APPROVE_ENERGY) + (depositEnergy ?? FALLBACK_DEPOSIT_ENERGY)
  const bandwidthNeeded = CONTRACT_TX_BANDWIDTH * 2
  const burnSun = calcResourceBurnSun({
    energyNeeded,
    bandwidthNeeded,
    resources,
    rates
  })

  return {
    burnSun,
    energyNeeded,
    bandwidthNeeded,
    sufficient: burnSun === 0
  }
}

export async function estimateMinerFeeFromChain(tronWeb, address, feeMode, resources = {}, orderTotal = '1.00') {
  const rates = await fetchChainFeeRates(tronWeb)

  if (feeMode === FEE_MODE.BURN) {
    const burnSun = await estimateBurnModeFeeSun(tronWeb, resources, rates)
    const amount = formatTrxFromSun(burnSun)
    return {
      amount,
      amountTrx: parseMinerFeeTrx(amount),
      unit: 'TRX',
      payToken: 'TRX',
      hint: burnSun > 0 ? 'Network fee paid by burning TRX (on-chain estimate)' : 'Sufficient bandwidth, very low network fee',
      sufficient: null,
      source: 'chain'
    }
  }

  const { burnSun, sufficient } = await estimateResourceModeFeeSun(
    tronWeb,
    address,
    resources,
    rates,
    orderTotal
  )

  if (sufficient) {
    return {
      amount: '0.00',
      amountTrx: 0,
      unit: 'TRX',
      payToken: 'USDT',
      hint: 'Network fee covered by energy + bandwidth',
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
    hint: burnSun > 0 ? 'Insufficient resources, TRX burn expected (on-chain estimate)' : 'Partially insufficient resources, may consume a small amount of TRX',
    sufficient: false,
    source: 'chain'
  }
}

function estimateMinerFeeFallback(feeMode, resources = {}) {
  if (feeMode === FEE_MODE.BURN) {
    return {
      amount: MIN_TRX_FEE_FALLBACK.toFixed(2),
      amountTrx: MIN_TRX_FEE_FALLBACK,
      unit: 'TRX',
      payToken: 'TRX',
      hint: 'Network fee paid by burning TRX',
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
      hint: 'Network fee covered by energy + bandwidth',
      sufficient: true,
      source: 'fallback'
    }
  }

  return {
    amount: MIN_TRX_FEE_FALLBACK.toFixed(2),
    amountTrx: MIN_TRX_FEE_FALLBACK,
    unit: 'TRX',
    payToken: 'USDT',
    hint: energyOk || bandwidthOk ? 'Partially insufficient resources, may consume a small amount of TRX' : 'Insufficient energy or bandwidth. Consider switching to Burn TRX',
    sufficient: false,
    source: 'fallback'
  }
}

export function estimateMinerFee(feeMode, resources = {}) {
  return estimateMinerFeeFallback(feeMode, resources)
}

let walletFetchInFlight = null

function shouldFetchAccountResources(feeMode) {
  return feeMode !== FEE_MODE.BURN
}

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

// 支付前置余额/资源校验
export function validatePaymentReadiness({ feeMode, usdt, trx, orderTotal, resources, minerFeeTrx }) {
  const orderAmt = parseFloat(orderTotal || '0')
  const usdtBal = parseBalance(usdt)
  const trxBal = parseBalance(trx)
  const feeTrx = parseMinerFeeTrx(minerFeeTrx)

  if (!orderAmt || Number.isNaN(orderAmt)) {
    return { ok: false, message: 'Invalid payment amount' }
  }

  if (feeMode === FEE_MODE.BURN) {
    const totalNeeded = orderAmt + feeTrx
    if (trxBal < totalNeeded) {
      return {
        ok: false,
        message: `Insufficient TRX balance. At least ${totalNeeded.toFixed(2)} TRX required (incl. ~${feeTrx.toFixed(2)} TRX network fee)`
      }
    }
    return { ok: true }
  }

  if (usdtBal < orderAmt) {
    return { ok: false, message: 'Insufficient USDT balance' }
  }

  const energy = resources?.energy || 0
  const bandwidth = resources?.bandwidth || 0
  if (energy < ENERGY_NEEDED) {
    return { ok: false, message: 'Insufficient energy. Switch to 「Burn TRX」 or add energy and retry' }
  }
  if (bandwidth < BANDWIDTH_NEEDED) {
    return { ok: false, message: 'Insufficient bandwidth. Switch to 「Burn TRX」 or wait for bandwidth to recover' }
  }
  if (trxBal < MIN_TRX_RESOURCE) {
    return { ok: false, message: 'Keep a small amount of TRX to broadcast transactions' }
  }
  return { ok: true }
}

function buildTxSendOptions(feeMode) {
  if (feeMode === FEE_MODE.BURN) {
    return {
      feeLimit: 200000000,
      callValue: 0,
      shouldPollResponse: true
    }
  }
  return {
    feeLimit: 100000000,
    callValue: 0,
    shouldPollResponse: true
  }
}

// 核心：串行请求 + 强制重置RPC节点，解决imToken跨域拦截
async function fetchWalletBalancesInternal(walletId = '', feeMode = FEE_MODE.RESOURCE, orderTotal = '1.00') {
  const tronWeb = await waitForTronWeb(walletId)
  // 强制统一RPC节点，修复imToken沙箱跨域拦截
  const rpcHost = 'https://api.trongrid.io'
  if (tronWeb.fullNode?.host !== rpcHost) {
    tronWeb.setFullNode(rpcHost)
    tronWeb.setSolidityNode(rpcHost)
  }

  const address = tronWeb.defaultAddress.base58
  let trxSun
  let usdtRaw
  let resources = { energy: 0, bandwidth: 0 }

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
        hint: burnSun > 0 ? 'Network fee paid by burning TRX (on-chain estimate)' : 'Sufficient bandwidth, very low network fee',
        sufficient: null,
        source: 'chain'
      }
    } catch (error) {
      console.warn('燃烧模式矿工费链上估算失败，使用兜底值', error)
      minerFee = estimateMinerFeeFallback(feeMode, resources)
    }
  } else {
    try {
      minerFee = await estimateMinerFeeFromChain(tronWeb, address, feeMode, resources, orderTotal)
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

export async function fetchMinerFeeTrx(walletId = '', feeMode = FEE_MODE.RESOURCE, orderTotal = '1.00') {
  const balances = await fetchWalletBalances(walletId, feeMode, orderTotal)
  return balances.minerFee?.amount || estimateMinerFeeFallback(feeMode, balances.resources).amount
}

// TRX直接燃烧支付
export async function payByTrx(walletId = '', orderTotal, options = {}) {
  const feeMode = options.feeMode || FEE_MODE.BURN
  const tronWeb = await waitForTronWeb(walletId)
  const address = tronWeb.defaultAddress.base58
  const amountSun = toTrxSun(orderTotal)

  if (!amountSun) {
    throw new Error('Invalid payment amount')
  }

  const trxSun = await withRetry(() => tronWeb.trx.getBalance(address))
  const resources = await fetchAccountResources(tronWeb, address)

  let minerFeeTrx = MIN_TRX_FEE_FALLBACK
  try {
    const fee = await estimateMinerFeeFromChain(tronWeb, address, feeMode, resources, orderTotal)
    minerFeeTrx = fee.amountTrx
  } catch (error) {
    console.warn('支付前矿工费估算失败，使用兜底值', error)
  }

  const readiness = validatePaymentReadiness({
    feeMode,
    usdt: '0',
    trx: fromTrxAmount(trxSun),
    orderTotal,
    resources,
    minerFeeTrx
  })
  if (!readiness.ok) {
    throw new Error(readiness.message)
  }

  try {
    const tx = await tronWeb.trx.sendTransaction(DEPOSIT_CONTRACT, amountSun)
    if (!tx || tx.result !== true && !tx.txid) {
      throw new Error('Transaction failed to send. Please check wallet status')
    }
    return tx
  } catch (e) {
    const walletMeta = WALLET_META[walletId]
    let errorMsg = e.message || 'TRX payment failed'
    if (errorMsg.includes('balance not enough')) {
      errorMsg = `${walletMeta.name}: insufficient TRX balance`
    } else if (errorMsg.includes('timeout')) {
      errorMsg = `${walletMeta.name}: transaction timed out, please retry`
    }
    throw new Error(errorMsg)
  }
}

// USDT approve + deposit 资源模式支付
export async function payByDeposit(walletId = '', orderTotal, options = {}) {
  const feeMode = options.feeMode || FEE_MODE.RESOURCE
  const tronWeb = await waitForTronWeb(walletId)
  const address = tronWeb.defaultAddress.base58
  const amount = toUsdtAmount(orderTotal)

  if (amount === '0') {
    throw new Error('Invalid payment amount')
  }

  const usdtContract = await tronWeb.contract(TRC20_ABI, USDT_CONTRACT)
  const depositContract = await tronWeb.contract(acceptorAbi, DEPOSIT_CONTRACT)

  // 串行获取余额、资源
  const usdtRaw = await withRetry(() => usdtContract.balanceOf(address).call())
  const trxSun = await withRetry(() => tronWeb.trx.getBalance(address))
  const resources = await fetchAccountResources(tronWeb, address)

  let minerFeeTrx = MIN_TRX_FEE_FALLBACK
  try {
    const fee = await estimateMinerFeeFromChain(tronWeb, address, feeMode, resources, orderTotal)
    minerFeeTrx = fee.amountTrx
  } catch (error) {
    console.warn('支付前矿工费估算失败，使用兜底值', error)
  }

  const readiness = validatePaymentReadiness({
    feeMode,
    usdt: fromUsdtAmount(usdtRaw),
    trx: fromTrxAmount(trxSun),
    orderTotal,
    resources,
    minerFeeTrx
  })
  if (!readiness.ok) {
    throw new Error(readiness.message)
  }

  const txOptions = buildTxSendOptions(feeMode)

  // approve 最多重试2次
  let approveTx
  let approveRetry = 0
  while (approveRetry < 2) {
    try {
      approveTx = await usdtContract.approve(DEPOSIT_CONTRACT, amount).send(txOptions)
      if (approveTx && (approveTx.result === true || approveTx.txid)) {
        break
      }
    } catch (e) {
      approveRetry++
      if (approveRetry >= 2) {
        throw new Error(`USDT approval failed: ${e.message}`)
      }
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  try {
    const tx = await depositContract.deposit(amount).send(txOptions)
    if (!tx || tx.result !== true && !tx.txid) {
      throw new Error('Deposit transaction failed to send')
    }
    return tx
  } catch (e) {
    const walletMeta = WALLET_META[walletId]
    let errorMsg = e.message || 'USDT payment failed'
    if (errorMsg.includes('energy not enough')) {
      errorMsg = `${walletMeta.name}: insufficient energy to complete transaction`
    }
    throw new Error(errorMsg)
  }
}

export async function payOrder(walletId = '', orderTotal, options = {}) {
  const feeMode = options.feeMode || FEE_MODE.RESOURCE
  if (feeMode === FEE_MODE.BURN) {
    return payByTrx(walletId, orderTotal, options)
  }
  return payByDeposit(walletId, orderTotal, options)
}