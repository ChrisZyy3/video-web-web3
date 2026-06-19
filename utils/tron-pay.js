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
    hasWaitMethod: true, // 有tronWeb.wait()方法
    needRequestAccounts: true // 需要主动请求授权
  },
  tokenpocket: {
    name: 'TokenPocket',
    download: 'https://www.tokenpocket.pro/',
    buildDeepLink(url) {
      return `tpdapp://open?params=${encodeURIComponent(JSON.stringify({ url, chain: 'TRX' }))}`
    },
    hasWaitMethod: false,
    needRequestAccounts: false // 自动注入地址，无需主动授权
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
  bitkeep: { // 修正原bitget为bitkeep（BitKeep钱包）
    name: 'BitKeep',
    download: 'https://web3.bitget.com/',
    buildDeepLink(url) {
      return `bitkeep://bkconnect?action=dapp&url=${encodeURIComponent(url)}`
    },
    hasWaitMethod: false,
    needRequestAccounts: true,
    tronWebAlias: 'bitkeepTronWeb' // BitKeep注入的tronWeb别名
  }
}

// 格式化地址
export function formatAddressShort(address = '') {
  if (!address || address.length < 10) return address || '--'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// 金额转换（原有逻辑保留）
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

// 【优化】多钱包适配的tronWeb获取逻辑
export function getTronWeb(walletId = '') {
  if (typeof window === 'undefined') return null
  
  // 1. 优先按钱包类型获取专属tronWeb
  if (walletId === 'bitkeep' && window[WALLET_META.bitkeep.tronWebAlias]) {
    return window[WALLET_META.bitkeep.tronWebAlias]
  }
  
  // 2. 通用获取逻辑
  const commonTronWeb = window.tronWeb || window.tronLink?.tronWeb
  if (commonTronWeb) return commonTronWeb
  
  // 3. 兜底检测所有可能的注入对象
  return window.bitkeepTronWeb || window.tpTronWeb || null
}

// 【优化】适配不同钱包的等待/授权逻辑
export async function waitForTronWeb(walletId = '', timeout = 10000) {
  const start = Date.now()
  const walletMeta = WALLET_META[walletId] || WALLET_META.tokenpocket
  
  while (Date.now() - start < timeout) {
    const tronWeb = getTronWeb(walletId)
    if (tronWeb) {
      // 适配wait方法：仅TronLink等有该方法的钱包执行
      if (walletMeta.hasWaitMethod && typeof tronWeb.ready === 'boolean' && !tronWeb.ready && typeof tronWeb.wait === 'function') {
        try {
          await tronWeb.wait()
        } catch (e) {
          console.warn(`${walletMeta.name} wait方法执行失败`, e)
        }
      }
      
      // 适配授权逻辑：仅需要主动授权的钱包执行
      if (walletMeta.needRequestAccounts && !tronWeb.defaultAddress?.base58) {
        try {
          // 兼容不同钱包的授权API
          if (window.tronLink?.request) {
            await window.tronLink.request({ method: 'tron_requestAccounts' })
          } else if (window.bitkeep?.request) {
            await window.bitkeep.request({ method: 'tron_requestAccounts' })
          }
        } catch (e) {
          console.warn(`${walletMeta.name} 授权失败`, e)
        }
      }
      
      // 地址存在则返回
      if (tronWeb.defaultAddress?.base58) {
        return tronWeb
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  
  throw new Error(`${walletMeta.name} wallet not detected. Please open in ${walletMeta.name}.`)
}

// 【优化】增强钱包信息解析：兼容更多参数格式
export function parseWalletInfo(options = {}) {
  let parsedWallet = null
  
  // 1. 解析URL参数
  if (options.wallet) {
    try {
      parsedWallet = JSON.parse(decodeURIComponent(options.wallet))
    } catch (e) {
      console.warn('解析wallet参数失败', e)
      // 兼容非JSON格式的钱包ID
      if (typeof options.wallet === 'string' && WALLET_META[options.wallet]) {
        parsedWallet = { id: options.wallet }
      }
    }
  }
  
  // 2. 读取本地存储
  if (!parsedWallet) {
    parsedWallet = uni.getStorageSync('wallet') || {}
  }
  
  // 3. 补全钱包元信息
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

// 【优化】精准检测钱包内置浏览器
export async function isWalletBrowserReady(walletId = '', timeout = 2500) {
  try {
    await waitForTronWeb(walletId, timeout)
    return true
  } catch {
    return false
  }
}

// 原有方法保留，仅优化调用逻辑
export function getPaymentConfirmUrl(wallet) {
  if (typeof window === 'undefined') return ''
  const walletInfo = wallet || uni.getStorageSync('wallet') || {}
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

export function formatWalletFetchError(error) {
  if (isRateLimitError(error)) {
    return 'Too many requests to the chain node. Please try again later.'
  }
  return error?.message || 'Failed to fetch wallet information'
}

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

  const [approveEnergy, depositEnergy] = await Promise.all([
    estimateContractEnergy(
      tronWeb,
      address,
      USDT_CONTRACT,
      'approve(address,uint256)',
      [
        { type: 'address', value: DEPOSIT_CONTRACT },
        { type: 'uint256', value: amount }
      ],
      feeLimit
    ),
    estimateContractEnergy(
      tronWeb,
      address,
      DEPOSIT_CONTRACT,
      'deposit(uint256)',
      [{ type: 'uint256', value: amount }],
      feeLimit
    )
  ])

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

async function fetchWalletBalancesInternal(walletId = '', feeMode = FEE_MODE.RESOURCE, orderTotal = '1.00') {
  const tronWeb = await waitForTronWeb(walletId)
  const address = tronWeb.defaultAddress.base58

  const trxSun = await withRetry(() => tronWeb.trx.getBalance(address))
  const usdtContract = await tronWeb.contract(TRC20_ABI, USDT_CONTRACT)
  const usdtRaw = await withRetry(() => usdtContract.balanceOf(address).call())

  let resources = { energy: 0, bandwidth: 0 }
  if (shouldFetchAccountResources(feeMode)) {
    resources = await fetchAccountResources(tronWeb, address)
  }

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
      console.warn('燃烧模式矿工费估算失败，使用兜底值', error)
      minerFee = estimateMinerFeeFallback(feeMode, resources)
    }
  } else {
    try {
      minerFee = await estimateMinerFeeFromChain(tronWeb, address, feeMode, resources, orderTotal)
    } catch (error) {
      console.warn('链上矿工费估算失败，使用兜底值', error)
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

// 【优化】传递walletId，适配不同钱包的tronWeb获取；合并并发请求避免 429
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

// 【优化】传递walletId；复用 fetchWalletBalances，避免重复 RPC
export async function fetchMinerFeeTrx(walletId = '', feeMode = FEE_MODE.RESOURCE, orderTotal = '1.00') {
  const balances = await fetchWalletBalances(walletId, feeMode, orderTotal)
  return balances.minerFee?.amount || estimateMinerFeeFallback(feeMode, balances.resources).amount
}

// 【优化】支付异常捕获增强，适配不同钱包的报错
export async function payByTrx(walletId = '', orderTotal, options = {}) {
  const feeMode = options.feeMode || FEE_MODE.BURN
  const tronWeb = await waitForTronWeb(walletId)
  const address = tronWeb.defaultAddress.base58
  const amountSun = toTrxSun(orderTotal)

  if (!amountSun) {
    throw new Error('Invalid payment amount')
  }

  const [trxSun, resources] = await Promise.all([
    tronWeb.trx.getBalance(address),
    fetchAccountResources(tronWeb, address)
  ])

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
    // 验证交易是否成功（不同钱包返回格式兼容）
    if (!tx || tx.result !== true && !tx.txid) {
      throw new Error('Transaction failed to send. Please check wallet status')
    }
    return tx
  } catch (e) {
    // 针对不同钱包的报错优化提示
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

// 【优化】approve+deposit流程增强，增加重试机制
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

  const [usdtRaw, trxSun, resources] = await Promise.all([
    usdtContract.balanceOf(address).call(),
    tronWeb.trx.getBalance(address),
    fetchAccountResources(tronWeb, address)
  ])

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

  // Approve操作增加重试
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

  // Deposit操作
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

// 【优化】传递walletId
export async function payOrder(walletId = '', orderTotal, options = {}) {
  const feeMode = options.feeMode || FEE_MODE.RESOURCE
  if (feeMode === FEE_MODE.BURN) {
    return payByTrx(walletId, orderTotal, options)
  }
  return payByDeposit(walletId, orderTotal, options)
}