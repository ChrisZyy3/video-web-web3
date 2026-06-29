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
						:preload="detail.play_url ? 'metadata' : 'none'"
						object-fit="contain"
						@play="onVideoPlay"
						@waiting="onVideoWaiting"
						@pause="onVideoPause"
						@ended="onVideoEnded"
						@timeupdate="onTimeUpdate"
						@error="onVideoError"
					/>
					<!-- Custom loading spinner overlay shown when the video is loading or buffering -->
					<!-- 当视频加载中或缓冲时显示的自定义加载动画遮罩层 -->
					<view v-if="videoLoading" class="player-loading-overlay">
						<!-- Spinner circle element with rotating animation -->
						<!-- 旋转的圆形加载动画元素 -->
						<view class="loading-spinner" />
						<!-- Loading text translation display -->
						<!-- 正在加载的国际化提示文字 -->
						<text class="loading-text">{{ t('videoDetail.loading') || 'Loading...' }}</text>
					</view>
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

				<view v-if="!useIosNativeControls" class="action-row">
					<view class="action-btn action-btn--primary action-btn--full" @click="handleTogglePlay">
						<image class="action-icon" :src="playing ? icons.pause : icons.play" mode="aspectFit" />
						<text class="action-text">{{ playing ? t('videoDetail.pause') : t('videoDetail.play') }}</text>
					</view>
				</view>

				<view class="bottom-space" :style="{ height: bottomSpaceHeight + 'px' }" />
			</scroll-view>
		</view>
		
		<member-intro v-model:visible="showMemberIntro" :show-verify="!connectedAddress" @confirm="handleMemberRecharge" @verify="handleVerifyMember" />
		<member-sheet v-model:visible="showMemberSheet" />
		<wallet-select v-model:visible="showWalletSelect" @select="handleWalletSelected" />
		
	</view>
</template>

<script setup>
import { ref, computed, getCurrentInstance, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { isFavorite, toggleFavorite } from '@/utils/favorites'
import { getLookVideo, setLookVideo, getPlayCount, incrementPlayCount } from '@/utils/look-video'
import { getLookMember, setLookMember } from '@/utils/look-member'
import { refreshMembershipByStoredAddress, verifyMembershipByWallet, getConnectedWalletAddress, openWalletForVerify } from '@/utils/tron-pay'
import memberSheet from '@/components/member-sheet/index'
import memberIntro from '@/components/member-intro/index'
import walletSelect from '@/components/wallet-select/index'
import { calcFullScrollPageLayout, bindViewportResize, shouldUseIosNativeVideoControls, patchNativeVideoControlsForIOS } from '@/utils/h5-compat'
import { useVideoFirstFramePoster } from '@/utils/use-video-poster'
import { applyNativeVideoPoster } from '@/utils/video-poster'
// 媒体资源（视频 src、封面图）的基础 URL
// <video src> 由浏览器直接加载，不经过 Vite proxy，相对路径会指向 localhost 导致 NotSupportedError
import { mediaBaseUrl } from '@/env'

const { t } = useI18n()
const { proxy } = getCurrentInstance()
const baseUrl = proxy.$baseUrl
// MEDIA_BASE 用于拼接视频/封面绝对 URL，始终指向后端服务器（开发环境为 https://3xrs6.com）
const MEDIA_BASE = mediaBaseUrl

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
// Track loading or buffering state of the video player
// 标记视频播放器是否处于缓冲或加载状态的响应式变量
const videoLoading = ref(false)

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
const showWalletSelect = ref(false)
const connectedAddress = ref(getConnectedWalletAddress())
const hasBeenCountedThisSession = ref(false)

// Function to trigger opening of the purchase/recharge sheet when user confirms in member-intro popup
// 会员引导确认回调：关闭引导弹窗并拉起充值支付弹窗
const handleMemberRecharge = () => {
	showMemberSheet.value = true
}

// 用户点击「已是会员？连接钱包验证」：弹出钱包选择，由用户选定要连接的钱包
const handleVerifyMember = () => {
	showWalletSelect.value = true
}

// 用户在选择弹窗里选定钱包：使用 openWalletForVerify 统一处理注入检测、loading、deep link 唤起、下载弹窗
const handleWalletSelected = async (walletId) => {
	// 关闭选择弹窗
	showWalletSelect.value = false
	// 立即关闭 VIP 引导弹窗，避免验证过程中弹窗还挂在背后
	showMemberIntro.value = false
	// openWalletForVerify 会自行进行：
	//   • showLoading(正在连接钱包...) → 检测钱包注入（2500ms）
	//   • 已注入 → 读链验证会员 → 回调 onSuccess / onFailed
	//   • 未注入 → toast + deep link 唤起 App → 1500ms 后弹下载提示弹窗
	await openWalletForVerify(walletId, {
		t,
		// 验证成功回调：根据链上余额判定是否为 VIP
		onSuccess: (isPaid) => {
			connectedAddress.value = getConnectedWalletAddress() // 刷新已连接地址，隐藏验证按钮
			if (isPaid) {
				showMemberIntro.value = false
				uni.showToast({ title: t('memberIntro.verifySuccess'), icon: 'success' })
				// 仅在视频播放源加载完成后才调用播放，避免抛出 NotSupportedError
				if (detail.value.play_url) getCtx().play()
			} else {
				uni.showToast({ title: t('memberIntro.verifyFailed'), icon: 'none' })
			}
		},
		// 验证出错回调：展示错误消息
		onFailed: (error) => {
			uni.showToast({ title: error?.message || t('memberIntro.verifyFailed'), icon: 'none', duration: 3000 })
		}
	})
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
	// 显示详情加载提示
	// Show details loading indicator
	uni.showLoading({
		title: t('videoDetail.loading'),
		mask: true
	})
	
	try {
		// Call detail API using the video ID / 请求获取单个视频详情接口
		const res = await proxy.$http.get('/api/videos/' + id)
		
		// Map the properties and build the absolute playback URL / 映射返回的数据并构建绝对播放路径
		detail.value = {
			...res, // Spread video object properties / 展开后端返回的视频对象属性 (id, title, description, size, created_at, etc.)
			// 拼接媒体资源绝对 URL（使用 MEDIA_BASE 而非 baseUrl）
			// 原因：<video src> 由浏览器直接请求，不经过 Vite proxy；若用相对路径会指向 localhost 报 NotSupportedError
			play_url: res.play_url ? (res.play_url.startsWith('http') ? res.play_url : MEDIA_BASE + res.play_url) : '',
			// 封面图同理，用 MEDIA_BASE 拼接绝对路径 / Cover uses MEDIA_BASE for absolute URL
			cover: res.cover_url ? (res.cover_url.startsWith('http') ? res.cover_url : MEDIA_BASE + res.cover_url) : ''
		}
		
		// Check if the current video is stored in favorites / 查询当前视频是否已被用户收藏
		favorited.value = isFavorite(res.id)
		
		// Initialize video controls layout adjustment / 触发布局和控制条调整
		patchVideoControls()

		// 不在加载时弹窗：允许用户进入详情页浏览封面/信息，只有当其点击播放键时才触发会员引导弹窗（见 onVideoPlay / handleTogglePlay）
		// Do not pop on load: let users browse the detail page; the member popup is only triggered when they click play
	} catch (error) {
		// Log integration and load errors / 捕获并记录接口加载详情的错误
		console.error('Failed to load video details:', error)
		
		// 显示详情加载失败提示
		// Show details load failure toast
		uni.showToast({
			title: t('videoDetail.loadFailed'),
			icon: 'none',
			duration: 3000
		})
	} finally {
		// 关闭加载提示
		// Dismiss loading indicator
		uni.hideLoading()
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
	// If progress is moving forward, safely dismiss the loading spinner
	// 只要播放进度正在前进且仍在显示加载圈，就隐去加载动画
	if (videoLoading.value) {
		videoLoading.value = false
	}
}

// 视频文件加载失败时的事件回调，弹出警告提示
// Callback when video file loading fails, displays alert toast
const onVideoError = (e) => {
	console.error('Video player source error:', e)
	// Clear loading state / 出错时隐去加载动画
	videoLoading.value = false

	// 若 play_url 尚未赋值（初始 src="" 时浏览器也会触发 error 事件），则跳过 toast
	// 避免页面一进来就因空 src 弹出错误提示，误导用户
	// If play_url is not yet set (browser fires error even on empty src), skip the toast
	if (!detail.value.play_url) {
		console.warn('[VideoError] play_url is empty, skipping toast (initial state)')
		return
	}

	// 尝试获取原生 video 元素的报错详情，用于手机端精确排查
	// Try to get native video element's error details for precise debugging
	let errorCode = ''
	let errorMessage = ''
	// #ifdef H5
	try {
		const videoEl = document.getElementById('detailVideo')?.querySelector('video') || document.getElementById('detailVideo')
		if (videoEl?.error) {
			errorCode = videoEl.error.code
			errorMessage = videoEl.error.message || ''
		}
	} catch (err) {
		console.warn('获取原生 video error 失败', err)
	}
	// #endif

	console.error('[VideoError] 详细报错信息:', { errorCode, errorMessage, currentSrc: detail.value.play_url })

	// 过滤 Code 1 (MEDIA_ERR_ABORTED) —— 浏览器因切换视频源正常中断加载的行为，不属于真实播放错误，直接忽略
	// Filter Code 1 (MEDIA_ERR_ABORTED) - Browser aborting load due to source change is normal, ignore
	if (Number(errorCode) === 1) {
		console.log('[VideoError] 正常中止加载（视频源切换），忽略此事件')
		return
	}

	// 暂时屏蔽自动降级代理，以便直接暴露绝对路径直连的真实报错
	// Temporary bypass fallback to let mobile Chrome show the original absolute URL error
	/*
	if (import.meta.env.MODE === 'development' && detail.value.play_url.startsWith('https://3xrs6.com')) {
		const relativeUrl = detail.value.play_url.replace('https://3xrs6.com', '')
		console.warn('[VideoError] 直连域名失败，自动切换至本地代理通道:', relativeUrl)
		detail.value.play_url = relativeUrl
		nextTick(() => {
			getCtx().load()
			// 若当前正在播放，则在新数据源载入后继续播放
			if (playing.value) {
				getCtx().play()
			}
		})
		return
	}
	*/

	const errorMsgSuffix = errorCode ? ` (Code: ${errorCode}${errorMessage ? ', ' + errorMessage : ''})` : ''
	uni.showToast({
		title: t('videoDetail.videoLoadError') + errorMsgSuffix,
		icon: 'none',
		duration: 6000
	})
}

// Triggered when video starts playing
// 视频正式开始播放的回调
const onVideoPlay = async () => {
	// Security check to pause playback if limit is exceeded (e.g. native autoplay/native controls play)
	// 播放时的安全防护逻辑：如果超出了免费观看限制，则暂停播放并显示会员引导弹窗
	if (isLimitExceeded()) {
		// 兜底：超免费额度时凭已连接地址再读一次链上 balances>=1 USDT，命中则视为会员放行
		getCtx().pause()
		const member = await refreshMembershipByStoredAddress()
		if (!member) {
			showMemberIntro.value = true
			return
		}
		getCtx().play()
	}
	// Mark playing status as true
	// 标记视频正在播放
	playing.value = true
	// Show buffering animation until first frame renders
	// 开启缓冲加载动画
	videoLoading.value = true
	
	// Increment total play counter only if this video session play has not been counted yet on this page visit
	// 如果该视频的当前详情页会话在此前尚未被记录播放次数，且用户非会员，在此递增播放计数并标记已记录
	if (!hasBeenCountedThisSession.value && !getLookMember()) {
		incrementPlayCount()
		hasBeenCountedThisSession.value = true
	}
	
	setLookVideo(detail.value)
}

// Triggered when playback is paused
// 当播放暂停时的回调
const onVideoPause = () => {
	// Mark playing state as false
	// 标记播放状态为假
	playing.value = false
	// Hide loading spinner
	// 隐藏加载动画
	videoLoading.value = false
}

// Triggered when video playback reaches the end
// 当视频播放结束时的回调
const onVideoEnded = () => {
	// Mark playing state as false
	// 标记播放状态为假
	playing.value = false
	// Hide loading spinner
	// 隐藏加载动画
	videoLoading.value = false
}

// Triggered when media stops playing due to lack of buffering data
// 当播放遇到卡顿、正在缓冲时触发
const onVideoWaiting = () => {
	// Show the loading spinner overlay
	// 开启缓冲加载层
	videoLoading.value = true
}

const handleBack = () => {
	getCtx().pause()
	// Reset loading state on exit
	// 退出页面时重置加载状态
	videoLoading.value = false
	uni.navigateBack()
}

const handleTogglePlay = async () => {
	// Block play if the video source is not yet loaded
	// 如果视频资源地址尚未加载完成，则直接拦截，防止 play() 抛出无视频源的错误
	if (!detail.value.play_url) {
		// Display a toast message notifying the user that the video is loading
		// 弹出提示信息告诉用户视频正在加载中
		uni.showToast({ title: t('videoDetail.loading') || 'Loading...', icon: 'none' })
		// Terminate the function execution early
		// 提前结束函数执行
		return
	}

	// Block play and re-trigger member intro popup if the limit is exceeded
	// 如果超出了免费观看限制，阻止播放并重新弹出会员引导弹窗
	if (isLimitExceeded()) {
		// 兜底：超免费额度时凭已连接地址再读一次链上 balances>=1 USDT，命中则视为会员放行
		const member = await refreshMembershipByStoredAddress()
		if (!member) {
			showMemberIntro.value = true
			return
		}
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
	// 进入详情页即凭已连接地址静默重判会员（与全局 App 启动同一套）：链上 balances>=1 USDT 写入本地缓存，
	// 后续 isLimitExceeded 走本地判断即可放行，已付费用户无需再弹窗
	refreshMembershipByStoredAddress()
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
	// Clear loading state on unload
	// 卸载页面时关闭加载状态
	videoLoading.value = false
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

/* Localized buffering loading overlay styles */
/* 局部缓冲加载遮罩层样式 */
.player-loading-overlay {
	position: absolute; /* Set absolute position overlay */
	top: 0; /* Align top */
	left: 0; /* Align left */
	right: 0; /* Align right */
	bottom: 0; /* Align bottom */
	background: rgba(0, 0, 0, 0.65); /* Dark translucent background */
	display: flex; /* Flex layout alignment */
	flex-direction: column; /* Stack components vertically */
	align-items: center; /* Center horizontally */
	justify-content: center; /* Center vertically */
	z-index: 5; /* Position above video but below other major overlays */
}

/* Spin animation loader ring */
/* 圆形旋转加载动画效果 */
.loading-spinner {
	width: 64rpx; /* Width size */
	height: 64rpx; /* Height size */
	border: 4rpx solid rgba(191, 149, 102, 0.25); /* Muted gold border base */
	border-top-color: #BF9566; /* Accent solid gold border */
	border-radius: 50%; /* Circle border radius */
	animation: video-spin 0.8s linear infinite; /* Run rotation loop infinitely */
}

/* Loading label text */
/* 加载文字提示 */
.loading-text {
	margin-top: 18rpx; /* Spacing */
	font-size: 24rpx; /* Small text size */
	color: #BF9566; /* Accent gold color matching theme */
}

/* Spinner frame rotations */
/* 旋转动画帧 */
@keyframes video-spin {
	from {
		transform: rotate(0deg); /* Start at 0 degrees */
	}
	to {
		transform: rotate(360deg); /* End at 360 degrees */
	}
}
</style>
