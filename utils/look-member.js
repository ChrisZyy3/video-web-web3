const STORAGE_KEY = 'lookMember'

export function getLookMember() {
	return uni.getStorageSync(STORAGE_KEY) || false
}

export function setLookMember(data) {
	return uni.setStorageSync(STORAGE_KEY, true)
}
