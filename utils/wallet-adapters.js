import { TronLinkAdapter } from '@tronweb3/tronwallet-adapter-tronlink'
import { OkxWalletAdapter } from '@tronweb3/tronwallet-adapter-okxwallet'
import { TokenPocketAdapter } from '@tronweb3/tronwallet-adapter-tokenpocket'
import { tronRpc, wcProjectId } from '@/env'
import acceptorAbi from '@/utils/UsdtAccepter.json'

// 收款合约地址（与 tron-pay.js 一致；此处独立声明避免循环依赖）
const DEPOSIT_CONTRACT = 'TR1rsFStNdW1QS77DL9gMimHLSRbS1M57z'

const WALLETCONNECT_ID = 'WalletConnect'

// 注入式 adapter（TronLink/OKX/TokenPocket）：逐个 try/catch 构建，单个失败不影响其它
// 注意：不在列表阶段构造 WalletConnectAdapter（其初始化可能拖慢/阻塞），仅在选中 WC 时懒构造
let injectedAdapters = null
function getInjectedAdapters() {
  if (injectedAdapters) return injectedAdapters
  injectedAdapters = []
  for (const Ctor of [TronLinkAdapter, OkxWalletAdapter, TokenPocketAdapter]) {
    try {
      injectedAdapters.push(new Ctor())
    } catch (e) {
      console.warn('钱包 adapter 构建失败', e)
    }
  }
  return injectedAdapters
}

// WalletConnect adapter 懒构造（仅在用户选中 WalletConnect 时才创建）
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
          url: 'https://www.3xrs6.com',
          icons: ['https://www.3xrs6.com/static/logo.png']
        }
      }
    })
  }
  return wcAdapter
}

// 供选择弹窗渲染：注入钱包真实名称/logo/是否检测到 + 末尾固定一项 WalletConnect（恒可用，扫码）
export function listWallets() {
  const list = getInjectedAdapters().map((a) => ({
    id: a.name,
    name: a.name,
    icon: a.icon || '',
    installed: a.readyState === 'Found',
    downloadUrl: a.url || ''
  }))
  list.push({
    id: WALLETCONNECT_ID,
    name: 'WalletConnect',
    icon: '',
    installed: true,
    downloadUrl: ''
  })
  return list
}

// 独立只读 TronWeb 实例：连公共节点读链，不依赖钱包注入
// tronweb 体积较大且只在「读 balances」时才需要，动态加载以免拖慢列表 chunk
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

// 连接指定钱包并读取链上 balances，判断是否达到会员门槛
export async function connectAndReadMembership(walletId, minUsdt = 1) {
  const adapter = walletId === WALLETCONNECT_ID
    ? await getWcAdapter()
    : getInjectedAdapters().find((a) => a.name === walletId)
  if (!adapter) return false

  if (!adapter.address) {
    await adapter.connect() // 注入式弹扩展授权；WalletConnect 弹二维码/跳转
  }
  const address = adapter.address
  if (!address) return false

  const tronWeb = await getReader()
  const contract = await tronWeb.contract(acceptorAbi, DEPOSIT_CONTRACT)
  const raw = await contract.balances(address).call()
  const value = BigInt(raw?._hex ?? raw?.toString?.() ?? '0')
  return value >= BigInt(Math.round(minUsdt * 1e6))
}
