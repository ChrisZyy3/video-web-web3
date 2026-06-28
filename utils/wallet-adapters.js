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
          url: 'https://www.3xrs6.com',
          icons: ['https://www.3xrs6.com/static/logo.png']
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

// WalletConnect：连接拿地址（扫码/跳转）后读链上 balances，判断是否达到会员门槛
export async function connectAndReadMembershipWC(minUsdt = 1) {
  const adapter = await getWcAdapter()
  if (!adapter.address) {
    await adapter.connect() // 弹二维码 / 跳转钱包授权
  }
  const address = adapter.address
  if (!address) return false

  const tronWeb = await getReader()
  const contract = await tronWeb.contract(acceptorAbi, DEPOSIT_CONTRACT)
  const raw = await contract.balances(address).call()
  const value = BigInt(raw?._hex ?? raw?.toString?.() ?? '0')
  return value >= BigInt(Math.round(minUsdt * 1e6))
}
