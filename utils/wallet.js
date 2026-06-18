
/** 解析 URL / storage 中的钱包信息 */
export function parseWalletInfo(options = {}) {
    if (options.wallet) {
        try {
            const parsed = JSON.parse(decodeURIComponent(options.wallet))
            if (parsed?.id || parsed?.name) {
                const meta = WALLET_META[parsed.id]
                const info = {
                    id: parsed.id || 'tokenpocket',
                    name: parsed.name || meta?.name || 'TokenPocket',
                    icon: parsed.icon || parsed.abbr || meta?.name?.[0] || 'T'
                }
                uni.setStorageSync('wallet', info)
                return info
            }
        } catch (e) {
            console.warn('解析 wallet 参数失败', e)
        }
    }
    const stored = uni.getStorageSync('wallet')
    if (stored?.id || stored?.name) {
        const meta = WALLET_META[stored.id]
        return {
            id: stored.id || 'tokenpocket',
            name: stored.name || meta?.name || 'TokenPocket',
            icon: stored.icon || stored.abbr || 'T'
        }
    }
    return { id: 'tokenpocket', name: 'TokenPocket', icon: 'T' }
}

// 获取当前环境中可用的 TronWeb 实例，优先级：TronLink > TokenPocket > BitKeep > imToken
export function getInnerTronWeb() {
    // 1. TronLink 官方插件/内置浏览器（优先级最高）
  if (window.tronWeb && window.tronWeb.ready) {
    uni.showToast({ title: '检测到 TronLink 内置浏览器，正在使用内置 tronWeb', icon: 'none' })
    return window.tronWeb;
  }

  // 2. TokenPocket TP钱包
  if (window.tokenpocket?.tron) {
    uni.showToast({ title: '检测到 tokenpocket 内置浏览器，正在使用内置 TronWeb', icon: 'none' })
    return window.tokenpocket.tron.tronWeb;
  }

  // 3. BitGet（BitKeep）钱包内置浏览器
  if (window.bitkeep?.tron?.tronWeb) {
    uni.showToast({ title: '检测到 bitkeep 内置浏览器，正在使用内置 TronWeb', icon: 'none' })
    return window.bitkeep.tron.tronWeb;
  }

  // 4. imToken 内置浏览器波场实例
  if (window.imToken?.tronWeb) {
    uni.showToast({ title: '检测到 imToken 内置浏览器，正在使用内置 TronWeb', icon: 'none' })
    return window.imToken.tronWeb;
  }
  // 无内置注入，返回null，走跳转/扫码流程
  return null;
}
// 获取 TronWeb 实例，优先使用内置注入的，如果没有则返回 null
export async function waitForInnerTronWeb(timeout = 10000) {
    const start = Date.now()
    while (Date.now() - start < timeout) {
        const tronWeb = getInnerTronWeb()
        if (tronWeb) {
            if (typeof tronWeb.ready === 'boolean' && !tronWeb.ready && typeof tronWeb.wait === 'function') {
                try {
                    await tronWeb.wait()
                } catch (e) {
                    // 部分钱包无 wait 方法，继续尝试
                }
            }
            // TronLink 授权
            if (!tronWeb.defaultAddress?.base58 && window.tronLink?.request) {
                try {
                    await window.tronLink.request({ method: 'tron_requestAccounts' })
                } catch (e) {
                    // 用户拒绝或钱包不支持
                }
            }
            if (tronWeb.defaultAddress?.base58) {
                return tronWeb
            }
        }
        await new Promise((resolve) => setTimeout(resolve, 200))
    }
    uni.showToast({ title: '未检测到 TRON 钱包，请在 TokenPocket / TronLink 中打开', icon: 'none' })
    throw new Error('未检测到 TRON 钱包，请在 TokenPocket / TronLink 中打开')
}

/** 是否已在钱包内置浏览器中 */
export async function isWalletBrowserReady(timeout = 2500) {
    try {
        await waitForInnerTronWeb(timeout)
        return true
    } catch {
        return false
    }
}


// 获取钱包信息与余额
export async function fetchWalletBalances() {
    const tronWeb = await waitForTronWeb()
    const address = tronWeb.defaultAddress.base58

    const trxSun = await tronWeb.trx.getBalance(address)
    const usdtContract = await tronWeb.contract(TRC20_ABI, USDT_CONTRACT)
    const usdtRaw = await usdtContract.balanceOf(address).call()
    const resources = await fetchAccountResources(tronWeb, address)
    const minerFee = resources.bandwidth

    return {
        address,
        addressShort: formatAddressShort(address),
        trx: fromTrxAmount(trxSun),
        usdt: fromUsdtAmount(usdtRaw),
        resources,
        minerFee
    }
}
// 获取账户资源
export async function fetchAccountResources(tronWeb, address) {
	try {
		const res = await tronWeb.trx.getAccountResources(address)
		const energy = Math.max(0, (res.EnergyLimit || 0) - (res.EnergyUsed || 0))
		const net = Math.max(0, (res.NetLimit || 0) - (res.NetUsed || 0))
		const freeNet = Math.max(0, (res.freeNetLimit || 600) - (res.freeNetUsed || 0))
		return {
			energy,
			bandwidth: net + freeNet
		}
	} catch (e) {
        uni.showToast({ title: '获取账户资源失败，默认使用0', icon: 'none' })
		console.warn('获取账户资源失败', e)
		return { energy: 0, bandwidth: 0 }
	}
}