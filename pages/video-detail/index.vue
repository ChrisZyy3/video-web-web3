<template>
	<view class="page">
		<view class="page-shell" :style="{ paddingTop: statusBarHeight + 'px' }">
			<view class="nav-bar">
				<view class="back-btn" @click="handleBack">
					<text class="back-icon">‹</text>
				</view>
				<text class="nav-title">{{ t('videoDetail.title') }}</text>
				<!-- <view class="fav-btn" @click="handleFavorite">
					<image class="fav-icon" :src="heartIcon" mode="aspectFit" />
				</view> -->
			</view>

			<scroll-view class="scroll-body" scroll-y :style="{ height: scrollHeight + 'px' }">
				<view class="player-wrap">
					<video
						id="detailVideo"
						class="player-video"
						:src="detail.play_url"
						:poster="detail.cover"
						:autoplay="false"
						:loop="false"
						:muted="false"
						:playsinline="true"
						:controls="true"
						:show-center-play-btn="true"
						:show-play-btn="true"
						:show-fullscreen-btn="true"
						:show-progress="true"
						:enable-progress-gesture="true"
						object-fit="contain"
						@play="playing = true"
						@pause="playing = false"
						@ended="playing = false"
						@error="onVideoError"
					/>
				</view>

				<view class="info-card">
					<text class="info-title">{{ detail.title }}</text>
					<!-- <view class="info-meta">
						<image class="meta-icon" :src="icons.playSmall" mode="aspectFit" />
						<text class="meta-text">{{ detail.views }} views</text>
					</view> -->
					<text v-if="detail.description" class="info-desc">{{ detail.description }}</text>
				</view>

				<view class="action-row">
					<view class="action-btn action-btn--primary" @click="handleTogglePlay">
						<image class="action-icon" :src="playing ? icons.pause : icons.play" mode="aspectFit" />
						<text class="action-text">{{ playing ? t('videoDetail.pause') : t('videoDetail.play') }}</text>
					</view>
					<view class="action-btn action-btn--outline" @click="handleDownload">
						<image class="action-icon" :src="icons.download" mode="aspectFit" />
						<text class="action-text action-text--gold">{{ downloadBtnText }}</text>
					</view>
				</view>

				<view v-if="downloading" class="download-progress">
					<view class="download-progress-track">
						<view class="download-progress-fill" :style="{ width: downloadProgress + '%' }" />
					</view>
				</view>

				<view class="tip-card">
					<image class="tip-icon" :src="icons.info" mode="aspectFit" />
					<text class="tip-text">{{ downloading ? '-':t('videoDetail.downloadTip') }}</text>
				</view>

				<view class="bottom-space" />
			</scroll-view>
		</view>
		
		<member-sheet v-model:visible="showMemberSheet" />
		
	</view>
</template>

<script setup>
import { ref, computed, getCurrentInstance, onMounted, onUnmounted } from 'vue'
import { calcPageScrollLayout, setupMobileLayout } from '@/utils/h5-compat'
import { useI18n } from 'vue-i18n'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { isFavorite, toggleFavorite } from '@/utils/favorites'
import { getLookVideo, setLookVideo } from '@/utils/look-video'
import { getLookMember, setLookMember } from '@/utils/look-member'
import memberSheet from '@/components/member-sheet/index'

const { t } = useI18n()
const { proxy } = getCurrentInstance()
const baseUrl = proxy.$baseUrl

const VIDEO_ID = 'detailVideo'
const HEART_PATH = '<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>'

const statusBarHeight = ref(0)
const scrollHeight = ref(0)
const playing = ref(false)
const favorited = ref(false)
const downloading = ref(false)
const downloadProgress = ref(0)

const detail = ref({
	id: '',
	title: '',
	description: '',
	views: 0,
	video: '',
	cover: ''
})

const showMemberSheet = ref(false)

const downloadBtnText = computed(() => {
	if (!downloading.value) return t('videoDetail.download')
	if (downloadProgress.value > 0) {
		return t('videoDetail.downloadingProgress', { percent: downloadProgress.value })
	}
	return t('videoDetail.downloading')
})

const heartIcon = computed(() => {
	if (favorited.value) {
		return svgIcon(HEART_PATH, '#FFFFFF', '#E53935')
	}
	return svgIcon(HEART_PATH, '#BF9566')
})

const icons = {
	play: svgIcon('<polygon points="8 5 20 12 8 19 8 5"/>', '#1A1A1A', '#1A1A1A'),
	pause: svgIcon('<rect x="7" y="5" width="4" height="14"/><rect x="15" y="5" width="4" height="14"/>', '#1A1A1A', '#1A1A1A'),
	playSmall: svgIcon('<polygon points="5 3 19 12 5 21 5 3"/>', '#BF9566', '#BF9566'),
	download: svgIcon('<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>', '#BF9566'),
	info: svgIcon('<circle cx="12" cy="12" r="9"/><line x1="12" y1="10" x2="12" y2="16"/><line x1="12" y1="7" x2="12" y2="7"/>', '#BF9566')
}

function svgIcon(paths, color, fill = 'none') {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const getCtx = () => uni.createVideoContext(VIDEO_ID)

const calcLayout = () => {
	const layout = calcPageScrollLayout({ headerRpx: 88 })
	statusBarHeight.value = layout.statusBarHeight
	scrollHeight.value = layout.scrollHeight
}

let unbindViewport = null

const buildVideoUrl = (item) => {
	if (item.play_url) {
		const path = item.play_url.startsWith('http') ? item.play_url : `${baseUrl}${item.play_url}`
		return path
	}
	return ''
}

const loadDetail = async (id) => {
	const res = await proxy.$http.get('/api/videos/'+id)
	detail.value = {
		// id: res.id,
		// title: res.title || '',
		// description: res.description || '',
		// views: res.views || 0,
		// cover: res.cover || '/static/images/video-cover.png',
		...res,
		play_url: baseUrl+res.play_url,
	}
	favorited.value = isFavorite(res.id)
	// const cache = uni.getStorageSync('videoDetailCache')
	// if (cache && String(cache.id) === String(id)) {
	// 	detail.value = {
	// 		id: cache.id,
	// 		title: cache.title || cache.description || '内容',
	// 		description: cache.description || '',
	// 		views: cache.views || 0,
	// 		video: buildVideoUrl(cache),
	// 		cover: cache.cover || '/static/images/video-cover.png',
	// 		play_url: cache.play_url || ''
	// 	}
	// 	favorited.value = isFavorite(cache.id)
	// }
}

const onVideoError = () => {
	// uni.showToast({ title: '视频加载失败', icon: 'none' })
}

const handleBack = () => {
	getCtx().pause()
	uni.navigateBack()
}

const handleTogglePlay = () => {
	const lookList = getLookVideo()
	//if(lookList.length==2&&!getLookMember()){
	//	showMemberSheet.value = true
	//	return
	//}
	if (playing.value) {
		getCtx().pause()
	} else {
		getCtx().play()
	}
	setLookVideo(detail.value)
}

const handleFavorite = () => {
	const added = toggleFavorite({
		id: detail.value.id,
		views: detail.value.views,
		video: detail.value.video,
		cover: detail.value.cover,
		title: detail.value.title,
		description: detail.value.description,
		play_url: detail.value.play_url
	})
	favorited.value = added
	uni.showToast({ title: added ? t('common.addedToFavorites') : t('common.removedFromFavorites'), icon: 'none' })
}

const getDownloadUrl = () => {
	const item = detail.value
	if (item.play_url) return item.play_url
	return buildVideoUrl(item)
}

const sanitizeFileName = (name = 'video') => {
	return String(name).replace(/[\\/:*?"<>|]/g, '_').trim().slice(0, 80) || 'video'
}

const resetDownloadState = () => {
	downloading.value = false
	downloadProgress.value = 0
}

const setDownloadProgress = (percent) => {
	downloadProgress.value = Math.min(99, Math.max(0, percent))
}

const finishDownload = () => {
	downloadProgress.value = 100
	setTimeout(resetDownloadState, 600)
}

const triggerFileDownload = (href, fileName) => {
	const link = document.createElement('a')
	link.href = href
	link.download = fileName
	link.style.display = 'none'
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
}

const downloadViaUni = (url, fileName) => new Promise((resolve, reject) => {
	const task = uni.downloadFile({
		url,
		success: (res) => {
			if (res.statusCode !== 200) {
				reject(new Error(`HTTP ${res.statusCode}`))
				return
			}
			triggerFileDownload(res.tempFilePath, fileName)
			uni.showToast({ title: t('videoDetail.downloadStarted'), icon: 'success' })
			resolve()
		},
		fail: reject
	})
	task?.onProgressUpdate?.((res) => {
		if (!res.totalBytesExpectedToWrite) return
		const percent = Math.round((res.totalBytesWritten / res.totalBytesExpectedToWrite) * 100)
		setDownloadProgress(percent)
	})
})

const downloadViaFetchBlob = async (url, fileName) => {
	const response = await fetch(url)
	if (!response.ok) throw new Error(`HTTP ${response.status}`)
	const blob = await response.blob()
	const blobUrl = URL.createObjectURL(blob)
	triggerFileDownload(blobUrl, fileName)
	URL.revokeObjectURL(blobUrl)
	uni.showToast({ title: t('videoDetail.downloadStarted'), icon: 'success' })
}

const downloadOnH5 = async (url) => {
	const fileName = `${sanitizeFileName(detail.value.title || detail.value.description)}.mp4`

	try {
		await downloadViaUni(url, fileName)
		return
	} catch (uniError) {
		console.warn('H5 uni.downloadFile failed, fallback to fetch blob', uniError)
	}

	await downloadViaFetchBlob(url, fileName)
}

const saveOnApp = (filePath) => {
	uni.saveVideoToPhotosAlbum({
		filePath,
		success: () => uni.showToast({ title: t('videoDetail.savedToAlbum'), icon: 'success' }),
		fail: () => uni.showToast({ title: t('videoDetail.saveFailed'), icon: 'none' })
	})
}

const startDownload = (url) => {
	if (!url || downloading.value) return

	downloading.value = true
	downloadProgress.value = 0

	// #ifdef H5
	downloadOnH5(url)
		.then(() => {
			if (downloading.value) finishDownload()
		})
		.catch((error) => {
			console.error('H5 download failed:', error)
			uni.showToast({ title: t('videoDetail.downloadFailed'), icon: 'none' })
			resetDownloadState()
		})
	return
	// #endif

	const task = uni.downloadFile({
		url,
		success: (res) => {
			if (res.statusCode !== 200) {
				uni.showToast({ title: t('videoDetail.downloadFailed'), icon: 'none' })
				resetDownloadState()
				return
			}
			// #ifdef APP-PLUS
			saveOnApp(res.tempFilePath)
			// #endif
			// #ifdef MP
			uni.openDocument({
				filePath: res.tempFilePath,
				showMenu: true,
				fail: () => uni.showToast({ title: t('videoDetail.failedToOpenFile'), icon: 'none' })
			})
			// #endif
			finishDownload()
		},
		fail: () => {
			uni.showToast({ title: t('videoDetail.downloadFailed'), icon: 'none' })
			resetDownloadState()
		}
	})
	task?.onProgressUpdate?.((res) => {
		if (!res.totalBytesExpectedToWrite) return
		const percent = Math.round((res.totalBytesWritten / res.totalBytesExpectedToWrite) * 100)
		setDownloadProgress(percent)
	})
}

const handleDownload = () => {
	startDownload(getDownloadUrl())
}

onLoad((options) => {
	if (options?.id) {
		loadDetail(options.id)
	}
})

onMounted(() => {
	unbindViewport = setupMobileLayout(calcLayout)
})

onUnmounted(() => {
	unbindViewport?.()
})

onUnload(() => {
	getCtx().pause()
})
</script>

<style>
.page {
	min-height: 100vh;
	min-height: calc(var(--vh, 1vh) * 100);
	min-height: -webkit-fill-available;
	background: #121212;
}

.page-shell {
	display: flex;
	flex-direction: column;
	height: calc(var(--vh, 1vh) * 100);
	min-height: -webkit-fill-available;
	box-sizing: border-box;
}

.nav-bar {
	height: 88rpx;
	padding: 0 24rpx;
	display: flex;
	flex-direction: row;
	align-items: center;
}

.back-btn,
.fav-btn {
	width: 64rpx;
	height: 64rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.back-icon {
	font-size: 56rpx;
	color: #C9A86C;
	line-height: 1;
	font-weight: 200;
}

.nav-title {
	flex: 1;
	text-align: center;
	font-size: 34rpx;
	font-weight: 600;
	color: #F0E6D8;
}

.fav-icon {
	width: 40rpx;
	height: 40rpx;
}

.scroll-body {
	flex: 1;
	box-sizing: border-box;
}

.player-wrap {
	position: relative;
	margin: 0 24rpx;
	border-radius: 20rpx;
	overflow: hidden;
	background: #000;
	border: 1rpx solid rgba(191, 149, 102, 0.25);
}

.player-video {
	width: 100%;
	height: 420rpx;
	display: block;
	background: #000;
}

/* uni-app H5 控制栏：iOS 需 show-progress + show-play-btn，并保证底部栏可见 */
.player-wrap :deep(.uni-video-bar) {
	display: flex !important;
	align-items: center;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 2;
	opacity: 1 !important;
	visibility: visible !important;
}

.player-wrap :deep(.uni-video-progress),
.player-wrap :deep(.uni-video-progress-container) {
	flex: 1;
	min-width: 0;
	display: block !important;
}

.player-wrap :deep(.uni-video-ball) {
	display: none !important;
	opacity: 0 !important;
	width: 0 !important;
	height: 0 !important;
	transform: scale(0) !important;
	pointer-events: none !important;
}

.player-wrap :deep(.uni-video-fullscreen) {
	flex-shrink: 0;
	z-index: 2;
}

.info-card {
	margin: 24rpx 24rpx 0;
	padding: 28rpx;
	border-radius: 20rpx;
	background: linear-gradient(180deg, #141414 0%, #0A0A0A 100%);
	border: 1rpx solid rgba(191, 149, 102, 0.25);
}

.info-title {
	display: block;
	font-size: 34rpx;
	font-weight: 700;
	color: #F0E6D8;
	line-height: 1.4;
}

.info-meta {
	margin-top: 16rpx;
	display: flex;
	flex-direction: row;
	align-items: center;
}

.meta-icon {
	width: 24rpx;
	height: 24rpx;
	margin-right: 8rpx;
}

.meta-text {
	font-size: 24rpx;
	color: #BF9566;
}

.info-desc {
	display: block;
	margin-top: 20rpx;
	font-size: 26rpx;
	color: #8B867C;
	line-height: 1.7;
}

.action-row {
	margin: 28rpx 24rpx 0;
	display: flex;
	flex-direction: row;
}

.action-btn {
	flex: 1;
	height: 88rpx;
	border-radius: 44rpx;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
}

.action-btn + .action-btn {
	margin-left: 20rpx;
}

.action-btn--primary {
	background: linear-gradient(90deg, #A8845A 0%, #BF9566 50%, #D4B896 100%);
	box-shadow: 0 8rpx 24rpx rgba(191, 149, 102, 0.35);
}

.action-btn--outline {
	border: 1rpx solid rgba(191, 149, 102, 0.45);
	background: rgba(191, 149, 102, 0.08);
}

.action-icon {
	width: 32rpx;
	height: 32rpx;
	margin-right: 10rpx;
}

.action-text {
	font-size: 30rpx;
	font-weight: 700;
	color: #1A1A1A;
}

.action-text--gold {
	color: #BF9566;
}

.download-progress {
	margin: 16rpx 24rpx 0;
}

.download-progress-track {
	height: 8rpx;
	border-radius: 4rpx;
	background: rgba(191, 149, 102, 0.15);
	overflow: hidden;
}

.download-progress-fill {
	height: 100%;
	border-radius: 4rpx;
	background: linear-gradient(90deg, #A8845A 0%, #BF9566 100%);
	transition: width 0.2s ease;
}

.tip-card {
	margin: 24rpx 24rpx 0;
	padding: 20rpx 24rpx;
	border-radius: 16rpx;
	border: 1rpx solid rgba(191, 149, 102, 0.2);
	background: rgba(191, 149, 102, 0.06);
	display: flex;
	flex-direction: row;
	align-items: flex-start;
}

.tip-icon {
	width: 32rpx;
	height: 32rpx;
	flex-shrink: 0;
	margin-right: 12rpx;
}

.tip-text {
	flex: 1;
	font-size: 24rpx;
	color: #8B867C;
	line-height: 1.6;
}

.bottom-space {
	height: 40rpx;
}
</style>
