const STORAGE_KEY = 'favoriteVideos'

export function getFavorites() {
	return uni.getStorageSync(STORAGE_KEY) || []
}

export function isFavorite(id) {
	return getFavorites().some((item) => item.id === id)
}

export function toggleFavorite(video) {
	const list = getFavorites()
	const index = list.findIndex((item) => item.id === video.id)
	if (index > -1) {
		list.splice(index, 1)
		uni.setStorageSync(STORAGE_KEY, list)
		return false
	}
	list.unshift({
		id: video.id,
		views: video.views,
		video: video.video,
		cover: video.cover,
		title: video.title || video.description || '内容',
		description: video.description || '',
		play_url: video.play_url || ''
	})
	uni.setStorageSync(STORAGE_KEY, list)
	return true
}
