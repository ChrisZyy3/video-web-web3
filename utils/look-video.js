const STORAGE_KEY = 'lookVideo'

export function getLookVideo() {
	return uni.getStorageSync(STORAGE_KEY) || []
}

export function setLookVideo(video) {
	const list = getLookVideo()
	const index = list.findIndex((item) => item.id === video.id)
	if (index > -1) {
		// list.splice(index, 1)
		// uni.setStorageSync(STORAGE_KEY, list)
		return false
	}
	list.unshift({
		id: video.id,
		views: video.views,
		video: video.video,
		cover: video.cover,
		title: video.title || video.description || '',
		description: video.description || '',
		play_url: video.play_url || ''
	})
	uni.setStorageSync(STORAGE_KEY, list)
	return true
}

export function removeLookVideo() {
	uni.removeStorageSync(STORAGE_KEY)
}
