<template>
	<view class="page">
		<view class="main" :style="mainStyle">
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
				<view class="player-wrap" :class="{ 'player-wrap--ios': useIosNativeControls }">
					<video
						id="detailVideo"
						class="player-video"
						:class="{ 'player-video--ios': useIosNativeControls }"
						:src="detail.play_url"
						:poster="videoPoster"
						:autoplay="false"
						:loop="false"
						:muted="false"
						:playsinline="true"
						:controls="useIosNativeControls"
						:show-center-play-btn="false"
						:show-play-btn="false"
						:show-fullscreen-btn="!useIosNativeControls"
						:show-progress="!useIosNativeControls"
						:enable-progress-gesture="true"
						preload="metadata"
						object-fit="contain"
						@play="onVideoPlay"
						@pause="playing = false"
						@ended="playing = false"
						@timeupdate="onTimeUpdate"
						@error="onVideoError"
					/>
					<view v-if="!useIosNativeControls && !playing" class="player-mask" @click="handleTogglePlay">
						<view class="player-play-btn">
							<image class="player-play-icon" :src="icons.play" mode="aspectFit" />
						</view>
					</view>
				</view>

				<!--<view class="progress-bar">
					<view class="progress-track">
						<view class="progress-fill" :style="{ width: progressPercent + '%' }" />
					</view>
					<view class="progress-time">
						<text class="time-text">{{ formatTime(currentTime) }}</text>
						<text class="time-text">{{ formatTime(duration) }}</text>
					</view>
				</view>-->

				<view class="info-card">
					<text class="info-title">{{ detail.title }}</text>
					<!-- <view class="info-meta">
						<image class="meta-icon" :src="icons.playSmall" mode="aspectFit" />
						<text class="meta-text">{{ detail.views }} views</text>
					</view> -->
					<text v-if="detail.description" class="info-desc">{{ detail.description }}</text>
				</view>

				<view class="action-row">
					<view v-if="!useIosNativeControls" class="action-btn action-btn--primary" @click="handleTogglePlay">
						<image class="action-icon" :src="playing ? icons.pause : icons.play" mode="aspectFit" />
						<text class="action-text">{{ playing ? t('videoDetail.pause') : t('videoDetail.play') }}</text>
					</view>
					<view class="action-btn action-btn--outline" :class="{ 'action-btn--full': useIosNativeControls }" @click="handleDownload">
						<image class="action-icon" :src="icons.download" mode="aspectFit" />
						<text class="action-text action-text--gold">{{ t('videoDetail.download') }}</text>
					</view>
				</view>

				<view class="tip-card">
					<image class="tip-icon" :src="icons.info" mode="aspectFit" />
					<text class="tip-text">{{ t('videoDetail.downloadTip') }}</text>
				</view>

				<view class="bottom-space" :style="{ height: bottomSpaceHeight + 'px' }" />
			</scroll-view>
		</view>
		
		<member-intro v-model:visible="showMemberIntro" @confirm="handleMemberRecharge" />
		<member-sheet v-model:visible="showMemberSheet" />
		
	</view>
</template>

<script setup>
import { ref, computed, getCurrentInstance, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { isFavorite, toggleFavorite } from '@/utils/favorites'
import { getLookVideo, setLookVideo, getPlayCount, incrementPlayCount } from '@/utils/look-video'
import { getLookMember, setLookMember } from '@/utils/look-member'
import memberSheet from '@/components/member-sheet/index'
import memberIntro from '@/components/member-intro/index'
import { calcFullScrollPageLayout, bindViewportResize, shouldUseIosNativeVideoControls, patchNativeVideoControlsForIOS } from '@/utils/h5-compat'
import { useVideoFirstFramePoster } from '@/utils/use-video-poster'
import { applyNativeVideoPoster } from '@/utils/video-poster'

const { t } = useI18n()
const { proxy } = getCurrentInstance()
const baseUrl = proxy.$baseUrl

const VIDEO_ID = 'detailVideo'
const HEART_PATH = '<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>'

const NAV_BAR_RPX = 88
const SCROLL_BOTTOM_RPX = 40

const statusBarHeight = ref(0)
const mainHeight = ref(0)
const scrollHeight = ref(0)
const bottomSpaceHeight = ref(40)
const playing = ref(false)
const favorited = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const downloading = ref(false)

const detail = ref({
	id: '',
	title: '',
	description: '',
	views: 0,
	video: '',
	cover: ''
})

const showMemberSheet = ref(false)
const showMemberIntro = ref(false)
const hasBeenCountedThisSession = ref(false)

// Function to trigger opening of the purchase/recharge sheet when user confirms in member-intro popup
// 会员引导确认回调：关闭引导弹窗并拉起充值支付弹窗
const handleMemberRecharge = () => {
	showMemberSheet.value = true
}

// Helper to determine if the play limit is exceeded based on total play counts
// 辅助方法：检查用户是否超过免费观看视频次数限制，并打印日志
const isLimitExceeded = () => {
	// Retrieve VIP status
	// 从本地存储读取当前用户是否为 VIP 会员
	const isVip = getLookMember()
	
	// Retrieve the total play counts from local storage
	// 从本地存储获取累计的视频播放总次数
	const playCount = getPlayCount()

	// Print detailed play limit evaluation logs to console
	// 打印播放限制评估信息到控制台日志
	console.log('[Limit Evaluation / 播放次数评估]', {
		currentVideoId: detail.value.id,
		currentVideoTitle: detail.value.title || detail.value.description || '--',
		isVip: isVip,
		totalPlayCount: playCount,
		isLimitReached: playCount >= 1,
		hasBeenCountedThisSession: hasBeenCountedThisSession.value
	})

	// VIP users have unlimited views, so they never exceed the limit
	// 会员用户无限制，因此不属于超限
	if (isVip) return false

	// If total play count is greater than or equal to 1, and it hasn't been counted in this session
	// 如果累计总播放次数已达到或超过 1，且当前会话在此页面中还未计算过，则判定为超限拦截
	if (playCount >= 1 && !hasBeenCountedThisSession.value) {
		return true
	}
	return false
}
const useIosNativeControls = ref(false)

const videoPoster = useVideoFirstFramePoster(
	() => detail.value.play_url,
	() => detail.value.cover,
	() => VIDEO_ID
)

const progressPercent = computed(() => {
	if (!duration.value) return 0
	return Math.min(100, (currentTime.value / duration.value) * 100)
})

const mainStyle = computed(() => ({
	paddingTop: `${statusBarHeight.value}px`,
	height: mainHeight.value ? `${mainHeight.value}px` : '100vh'
}))

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
	const layout = calcFullScrollPageLayout({
		headerBlockRpx: NAV_BAR_RPX,
		scrollBottomRpx: SCROLL_BOTTOM_RPX
	})
	statusBarHeight.value = layout.statusBarHeight
	mainHeight.value = layout.mainHeight
	scrollHeight.value = layout.scrollHeight
	bottomSpaceHeight.value = layout.bottomSpaceHeight
}

let unbindViewport = null

const buildVideoUrl = (item) => {
	if (item.play_url) {
		const path = item.play_url.startsWith('http') ? item.play_url : `${baseUrl}${item.play_url}`
		return path
	}
	return ''
}

const detectVideoPlatform = () => {
	// #ifdef H5
	useIosNativeControls.value = shouldUseIosNativeVideoControls()
	// #endif
}

const patchVideoControls = () => {
	// #ifdef H5
	nextTick(() => {
		patchNativeVideoControlsForIOS(VIDEO_ID)
		if (videoPoster.value) applyNativeVideoPoster(VIDEO_ID, videoPoster.value)
	})
	// #endif
}

// Fetch video details by video ID / 根据视频 ID 从后端获取单个视频详情
const loadDetail = async (id) => {
	try {
		// Call detail API using the video ID / 请求获取单个视频详情接口
		const res = await proxy.$http.get('/api/videos/' + id)
		
		// Map the properties and build the absolute playback URL / 映射返回的数据并构建绝对播放路径
		detail.value = {
			...res, // Spread video object properties / 展开后端返回的视频对象属性 (id, title, description, size, created_at, etc.)
			// Prepend base URL to the play_url relative path / 拼接基础 URL 和 play_url 的相对路径
			play_url: res.play_url ? (res.play_url.startsWith('http') ? res.play_url : baseUrl + res.play_url) : ''
		}
		
		// Check if the current video is stored in favorites / 查询当前视频是否已被用户收藏
		favorited.value = isFavorite(res.id)
		
		// Initialize video controls layout adjustment / 触发布局和控制条调整
		patchVideoControls()

		// If the user has exceeded their free play limit, show the member promotion popup immediately on load
		// 如果用户已经达到了免费播放次数上限，则在页面加载完毕后立即强制显示会员引导弹窗
		if (isLimitExceeded()) {
			showMemberIntro.value = true
		}
	} catch (error) {
		// Log integration and load errors / 捕获并记录接口加载详情的错误
		console.error('Failed to load video details:', error)
	}
}

const formatTime = (sec) => {
	const total = Math.floor(sec || 0)
	const min = Math.floor(total / 60)
	const s = total % 60
	return `${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const onTimeUpdate = (e) => {
	currentTime.value = e.detail.currentTime || 0
	duration.value = e.detail.duration || duration.value
}

const onVideoError = () => {
	// uni.showToast({ title: '视频加载失败', icon: 'none' })
}

const onVideoPlay = () => {
	// Security check to pause playback if limit is exceeded (e.g. native autoplay/native controls play)
	// 播放时的安全防护逻辑：如果超出了免费观看限制，则暂停播放并显示会员引导弹窗
	if (isLimitExceeded()) {
		getCtx().pause()
		showMemberIntro.value = true
		return
	}
	playing.value = true
	
	// Increment total play counter only if this video session play has not been counted yet on this page visit
	// 如果该视频的当前详情页会话在此前尚未被记录播放次数，且用户非会员，在此递增播放计数并标记已记录
	if (!hasBeenCountedThisSession.value && !getLookMember()) {
		incrementPlayCount()
		hasBeenCountedThisSession.value = true
	}
	
	setLookVideo(detail.value)
}

const handleBack = () => {
	getCtx().pause()
	uni.navigateBack()
}

const handleTogglePlay = () => {
	// Block play and re-trigger member intro popup if the limit is exceeded
	// 如果超出了免费观看限制，阻止播放并重新弹出会员引导弹窗
	if (isLimitExceeded()) {
		showMemberIntro.value = true
		return
	}
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

const triggerFileDownload = (href, fileName) => {
	const link = document.createElement('a')
	link.href = href
	link.download = fileName
	link.style.display = 'none'
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
}

const updateDownloadProgress = (percent) => {
	if (percent <= 0) return
	uni.showLoading({
		title: t('videoDetail.downloadingProgress', { percent }),
		mask: true
	})
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
		const percent = Math.min(99, Math.round((res.totalBytesWritten / res.totalBytesExpectedToWrite) * 100))
		updateDownloadProgress(percent)
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

	// 优先 uni.downloadFile：走浏览器原生下载通道，移动端比 fetch 全量进内存更快
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

const handleDownload = async () => {
	const url = getDownloadUrl()
	if (!url || downloading.value) return

	downloading.value = true
	uni.showLoading({ title: t('videoDetail.downloading'), mask: true })

	// #ifdef H5
	try {
		await downloadOnH5(url)
	} catch (error) {
		console.error('H5 download failed:', error)
		uni.showToast({ title: t('videoDetail.downloadFailed'), icon: 'none' })
	} finally {
		uni.hideLoading()
		downloading.value = false
	}
	return
	// #endif

	const task = uni.downloadFile({
		url,
		success: (res) => {
			if (res.statusCode !== 200) {
				uni.showToast({ title: t('videoDetail.downloadFailed'), icon: 'none' })
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
		},
		fail: () => {
			uni.showToast({ title: t('videoDetail.downloadFailed'), icon: 'none' })
		},
		complete: () => {
			uni.hideLoading()
			downloading.value = false
		}
	})
	task?.onProgressUpdate?.((res) => {
		if (!res.totalBytesExpectedToWrite) return
		const percent = Math.min(99, Math.round((res.totalBytesWritten / res.totalBytesExpectedToWrite) * 100))
		updateDownloadProgress(percent)
	})
}

onLoad((options) => {
	if (options?.id) {
		loadDetail(options.id)
	}
})

onMounted(() => {
	detectVideoPlatform()
	calcLayout()
	patchVideoControls()
	// #ifdef H5
	unbindViewport = bindViewportResize(calcLayout)
	// #endif
})

watch(() => detail.value.play_url, () => {
	patchVideoControls()
})

onUnload(() => {
	getCtx().pause()
})

onUnmounted(() => {
	// #ifdef H5
	unbindViewport?.()
	// #endif
})
</script>

<style>
.page {
	min-height: 100vh;
	min-height: calc(var(--vh, 1vh) * 100);
	min-height: -webkit-fill-available;
	background: #121212;
}

.main {
	height: 100vh;
	height: calc(var(--vh, 1vh) * 100);
	height: -webkit-fill-available;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	box-sizing: border-box;
}

.nav-bar {
	flex-shrink: 0;
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
	font-size: 86rpx;
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
	flex-shrink: 0;
	width: 100%;
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

.player-wrap--ios {
	overflow: visible;
}

.player-video {
	width: 100%;
	height: 420rpx;
	display: block;
	background: #000;
}

.player-video--ios {
	border-radius: 20rpx;
	object-fit: contain;
}

.player-mask {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(0, 0, 0, 0.25);
}

.player-play-btn {
	width: 112rpx;
	height: 112rpx;
	border-radius: 50%;
	background: linear-gradient(180deg, #D4B896 0%, #BF9566 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 8rpx 24rpx rgba(191, 149, 102, 0.45);
}

.player-play-icon {
	width: 44rpx;
	height: 44rpx;
	margin-left: 6rpx;
}

.progress-bar {
	padding: 20rpx 24rpx 0;
}

.progress-track {
	height: 6rpx;
	border-radius: 3rpx;
	background: rgba(191, 149, 102, 0.2);
	overflow: hidden;
}

.progress-fill {
	height: 100%;
	border-radius: 3rpx;
	background: linear-gradient(90deg, #A8845A 0%, #BF9566 100%);
}

.progress-time {
	margin-top: 12rpx;
	display: flex;
	flex-direction: row;
	justify-content: space-between;
}

.time-text {
	font-size: 22rpx;
	color: #8B867C;
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

.action-btn--full {
	flex: 1;
	width: 100%;
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
	flex-shrink: 0;
}
</style>
