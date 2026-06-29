import { tronRpc, wcProjectId } from '@/env'
import acceptorAbi from '@/utils/UsdtAccepter.json'

// 收款合约地址（与 tron-pay.js 一致；此处独立声明避免循环依赖）
const DEPOSIT_CONTRACT = 'TR1rsFStNdW1QS77DL9gMimHLSRbS1M57z'

// WalletConnect adapter 懒构造（仅在用户选中 WalletConnect 时才创建，按需动态加载重依赖）
let wcAdapter = null
async function getWcAdapter() {
  if (!wcAdapter) {
    const { WalletConnectAdapter } = await import('@tronweb3/tronwallet-adapter-walletconnect')
    wcAdapter = new WalletConnectAdapter({
      network: 'Mainnet',
      options: {
        projectId: wcProjectId,
        metadata: {
          name: 'Media',
          description: 'Video membership verification',
          // 跟随当前域名：WalletConnect 的 verify 会拿 url 与实际连接域名比对，
          // 写死会导致 vercel preview / 多域名下部分钱包拒连。SSR 兜底回原域名。
          url: typeof window !== 'undefined' ? window.location.origin : 'https://www.3xrs6.com',
          icons: [(typeof window !== 'undefined' ? window.location.origin : 'https://www.3xrs6.com') + '/static/logo.png']
        }
      }
    })
  }
  return wcAdapter
}

// 独立只读 TronWeb 实例：连公共节点读链，不依赖钱包注入；tronweb 体积大，动态加载
let reader = null
async function getReader() {
  if (!reader) {
    const { TronWeb } = await import('tronweb')
    reader = new TronWeb({
      fullHost: tronRpc.host,
      headers: tronRpc.apiKey ? { 'TRON-PRO-API-KEY': tronRpc.apiKey } : {}
    })
  }
  return reader
}

// 按已知地址只读读 balances（不唤起任何钱包）：用于已连接后跨页静默重判 VIP 身份
export async function readDepositBalanceByAddress(address, minUsdt = 1) {
  if (!address) return false
  const tronWeb = await getReader()
  const contract = await tronWeb.contract(acceptorAbi, DEPOSIT_CONTRACT)
  const raw = await contract.balances(address).call()
  const value = BigInt(raw?._hex ?? raw?.toString?.() ?? '0')
  
  // 计算可读的 USDT 余额（除以精度 1e6）
  // Calculate readable USDT balance (divided by decimals 1e6)
  const usdtBalance = Number(value) / 1e6
  
  // 判断已存金额是否满足 VIP 门槛
  // Determine if deposited amount meets the VIP threshold
  const isVip = value >= BigInt(Math.round(minUsdt * 1e6))
  
  // 打印跨页静默刷新时的 VIP 判定日志
  // Print detailed logs of the silent VIP background verification
  console.log(`[Stored Address VIP Refresh Log / 已连接地址静默刷新 VIP 日志]`)
  console.log(`- Stored Address / 已存钱包地址: ${address}`)
  console.log(`- On-chain Deposit / 链上已存金额: ${usdtBalance} USDT (Raw: ${value.toString()})`)
  console.log(`- Threshold Required / 准入门槛: ${minUsdt} USDT`)
  console.log(`- Is VIP (Threshold Met) / 是否为 VIP (已达标): ${isVip}`)

  return isVip
}

// WalletConnect：连接拿地址（扫码/跳转）后读链上 balances，判断是否达到 VIP 门槛
export async function connectAndReadMembershipWC(minUsdt = 1, { onReady } = {}) {
  const WC = '[WalletConnect]'
  // 注意：getWcAdapter 内含重依赖动态加载，是「点击→弹窗」的主要耗时点
  console.log(`${WC} 开始连接，加载 adapter...`)
  let adapter
  try {
    adapter = await getWcAdapter()
  } catch (e) {
    console.error(`${WC} adapter 加载/构造失败:`, e)
    throw e
  }
  console.log(`${WC} adapter 就绪`, { readyState: adapter?.readyState, state: adapter?.state, existingAddress: adapter?.address || null })

  if (!adapter.address) {
    // adapter 已就绪、AppKit 弹窗即将打开：通知调用方关闭前置 loading。
    // 不能传 onUri——传了 adapter 会改走 connectWithUri 自定义渲染、不弹自带二维码弹窗。
    onReady?.()
    try {
      console.log(`${WC} 调用 adapter.connect()，等待弹窗/钱包授权...`)
      // 诊断：connect 是 await 阻塞的，用 setTimeout 旁路探测 AppKit 弹窗 DOM 是否真渲染出来
      setTimeout(() => {
        const el = document.querySelector('w3m-modal, wcm-modal, appkit-modal, w3m-router')
        const customEls = [...document.body.children].map(n => n.tagName.toLowerCase()).filter(t => t.includes('-'))
        console.log(`${WC} 弹窗DOM探测:`, el ? `${el.tagName} display=${getComputedStyle(el).display} visible=${el.offsetParent !== null}` : '❌未找到弹窗元素')
        console.log(`${WC} body下自定义元素:`, customEls.join(', ') || '(无)')
      }, 1800)
      const connectRet = await adapter.connect() // adapter 自带 AppKit 弹窗：二维码 / 跳转钱包授权
      console.log(`${WC} connect() 返回:`, connectRet, '| 连接后地址:', adapter.address || null)
    } catch (e) {
      console.error(`${WC} connect() 抛错:`, e?.name, e?.message, e)
      throw e
    }
  }
  const address = adapter.address
  if (!address) {
    console.warn(`${WC} 连接结束但未拿到地址，返回 false`)
    return false
  }

  console.log(`${WC} 已连接地址: ${address}，开始读链 balances...`)
  const tronWeb = await getReader()
  const contract = await tronWeb.contract(acceptorAbi, DEPOSIT_CONTRACT)
  const raw = await contract.balances(address).call()
  const value = BigInt(raw?._hex ?? raw?.toString?.() ?? '0')
  
  // 计算可读的 USDT 余额（除以精度 1e6）
  // Calculate readable USDT balance (divided by decimals 1e6)
  const usdtBalance = Number(value) / 1e6
  
  // 判断已存金额是否满足 VIP 门槛
  // Determine if deposited amount meets the VIP threshold
  const isVip = value >= BigInt(Math.round(minUsdt * 1e6))
  
  // 打印 WalletConnect 的 VIP 判定日志
  // Print detailed logs of the WalletConnect VIP verification
  console.log(`[WalletConnect VIP Judgment Log / WalletConnect VIP 判定日志]`)
  console.log(`- WalletConnect Address / WC钱包地址: ${address}`)
  console.log(`- On-chain Deposit / 链上已存金额: ${usdtBalance} USDT (Raw: ${value.toString()})`)
  console.log(`- Threshold Required / 准入门槛: ${minUsdt} USDT`)
  console.log(`- Is VIP (Threshold Met) / 是否为 VIP (已达标): ${isVip}`)

  return isVip
}
