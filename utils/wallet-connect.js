import { TronWeb } from 'tronweb'
import { WalletConnectAdapter } from '@tronweb3/tronwallet-adapter-walletconnect'
import { tronRpc, wcProjectId } from '@/env'
import acceptorAbi from '@/utils/UsdtAccepter.json'

// 收款合约地址（与 tron-pay.js 保持一致；此处独立声明避免与 tron-pay 形成循环依赖）
const DEPOSIT_CONTRACT = 'TR1rsFStNdW1QS77DL9gMimHLSRbS1M57z'

// 独立只读 TronWeb 实例：连公共节点读链，不依赖钱包注入，任何浏览器可用
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

// WalletConnect adapter 单例（懒加载，仅在需要时构建）
let wcAdapter = null
function getWcAdapter() {
  if (!wcAdapter) {
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

// 通过 WalletConnect 连接钱包并返回地址（手机裸浏览器场景：扫码/跳转钱包授权）
export async function connectViaWalletConnect() {
  if (!wcProjectId) throw new Error('missing WalletConnect projectId')
  const adapter = getWcAdapter()
  if (!adapter.connected || !adapter.address) {
    await adapter.connect()
  }
  return adapter.address || ''
}

// 读取收款合约 balances[address] 原始值（BigInt），供会员判定比较
export async function readDepositBalanceRaw(address) {
  if (!address) return 0n
  const contract = await getReader().contract(acceptorAbi, DEPOSIT_CONTRACT)
  const raw = await contract.balances(address).call()
  const hex = raw?._hex ?? raw?.toString?.() ?? '0'
  try {
    return BigInt(hex)
  } catch {
    return 0n
  }
}

// 断开 WalletConnect 会话（可选，用于登出/切换）
export async function disconnectWalletConnect() {
  try {
    if (wcAdapter?.connected) await wcAdapter.disconnect()
  } catch (e) {
    console.warn('WalletConnect 断开失败', e)
  }
}
