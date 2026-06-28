import { TronWeb } from 'tronweb'
import { TronLinkAdapter } from '@tronweb3/tronwallet-adapter-tronlink'
import { OkxWalletAdapter } from '@tronweb3/tronwallet-adapter-okxwallet'
import { TokenPocketAdapter } from '@tronweb3/tronwallet-adapter-tokenpocket'
import { WalletConnectAdapter } from '@tronweb3/tronwallet-adapter-walletconnect'
import { tronRpc, wcProjectId } from '@/env'
import acceptorAbi from '@/utils/UsdtAccepter.json'

// 收款合约地址（与 tron-pay.js 一致；此处独立声明避免循环依赖）
const DEPOSIT_CONTRACT = 'TR1rsFStNdW1QS77DL9gMimHLSRbS1M57z'

// 官方钱包 adapter 列表（单例，懒构建）
let adapters = null
function buildAdapters() {
  if (adapters) return adapters
  adapters = [
    new TronLinkAdapter(),
    new OkxWalletAdapter(),
    new TokenPocketAdapter(),
    new WalletConnectAdapter({
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
  ]
  return adapters
}

// 供选择弹窗渲染：真实名称、logo、是否检测到（已安装）
// WalletConnect 不依赖注入，恒为可用
export function listWallets() {
  return buildAdapters().map((a) => ({
    id: a.name,
    name: a.name,
    icon: a.icon || '',
    installed: a.name === 'WalletConnect' ? true : a.readyState === 'Found',
    downloadUrl: a.url || ''
  }))
}

// 独立只读 TronWeb 实例：连公共节点读链，不依赖钱包注入
let reader = null
function getReader() {
  if (!reader) {
    reader = new TronWeb({
      fullHost: tronRpc.host,
      headers: tronRpc.apiKey ? { 'TRON-PRO-API-KEY': tronRpc.apiKey } : {}
    })
  }
  return reader
}

// 连接指定钱包并读取链上 balances，判断是否达到会员门槛
export async function connectAndReadMembership(walletId, minUsdt = 1) {
  const adapter = buildAdapters().find((a) => a.name === walletId)
  if (!adapter) return false

  if (!adapter.address) {
    await adapter.connect() // 注入式弹扩展授权；WalletConnect 弹二维码/跳转
  }
  const address = adapter.address
  if (!address) return false

  const contract = await getReader().contract(acceptorAbi, DEPOSIT_CONTRACT)
  const raw = await contract.balances(address).call()
  const value = BigInt(raw?._hex ?? raw?.toString?.() ?? '0')
  return value >= BigInt(Math.round(minUsdt * 1e6))
}
