const STORAGE_KEY = 'lookVideo'
const PLAY_COUNT_KEY = 'playCount'

export function getLookVideo() {
	return uni.getStorageSync(STORAGE_KEY) || []
}

export function setLookVideo(video) {
	// Retrieve the current watched list from local storage
	// 从本地存储获取当前已看视频列表
	const list = getLookVideo()
	
	// Check if this video has already been recorded in history
	// 校验当前视频是否已经记录在已看历史中
	const index = list.findIndex((item) => item.id === video.id)
	if (index > -1) {
		return false
	}
	
	// Unshift the new video object to the top of the watched list
	// 将新的视频对象插入到已看列表的最前面
	list.unshift({
		id: video.id,
		views: video.views,
		video: video.video,
		cover: video.cover,
		title: video.title || video.description || '',
		description: video.description || '',
		play_url: video.play_url || ''
	})
	
	// Print logging information to the console when successfully adding a new watched video
	// 成功记录新播放视频时，向控制台打印日志方便测试
	console.log('[Storage / 本地缓存] Added new watched video to lookVideo:', {
		id: video.id,
		title: video.title || video.description || '',
		totalWatchedUniqueVideos: list.length
	})
	
	// Write the updated watched list back to local storage
	// 将更新后的已看视频列表写回到本地存储中
	uni.setStorageSync(STORAGE_KEY, list)
	return true
}

// Get the total count of play sessions from local storage
// 从本地存储中获取当前累计的视频播放总次数
export function getPlayCount() {
	return uni.getStorageSync(PLAY_COUNT_KEY) || 0
}

// Increment the total play count in local storage and print to log
// 在本地存储中增加播放次数，并打印控制台日志记录新数值
export function incrementPlayCount() {
	const count = getPlayCount() + 1
	uni.setStorageSync(PLAY_COUNT_KEY, count)
	console.log('[Storage / 本地缓存] Increment playCount to:', count)
	return count
}

// Reset the play count in local storage to 0
// 在本地存储中清空重置播放次数计数器
export function resetPlayCount() {
	uni.removeStorageSync(PLAY_COUNT_KEY)
	console.log('[Storage / 本地缓存] Reset playCount')
}

// Clear the watched videos list and reset play count from local storage
// 从本地存储中移除已看历史记录，并重置播放总次数
export function removeLookVideo() {
	uni.removeStorageSync(STORAGE_KEY)
	resetPlayCount()
}
