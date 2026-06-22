<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'

onLaunch(() => {
	console.log('App Launch')
})

onShow(() => {
	console.log('App Show')
})

onHide(() => {
	console.log('App Hide')
})
</script>

<style>
	/*每个页面公共css */
	/* #ifdef H5 */
	html,
	body,
	#app {
		width: 100%;
		min-height: 100%;
		margin: 0;
		padding: 0;
		-webkit-text-size-adjust: 100%;
		text-size-adjust: 100%;
		-webkit-tap-highlight-color: transparent;
	}

	body {
		overscroll-behavior-y: none;
	}

	.page {
		min-height: 100vh;
		min-height: calc(var(--vh, 1vh) * 100);
		min-height: -webkit-fill-available;
	}

	.page-shell {
		min-height: 100vh;
		min-height: calc(var(--vh, 1vh) * 100);
		min-height: -webkit-fill-available;
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
	}

	.scroll-body {
		width: 100%;
		flex-shrink: 0;
	}

	/* TabBar 页：scroll-view 使用 JS 计算的 px 高度（iOS H5 flex 无效） */
	.page-shell--tabbar {
		min-height: unset;
		overflow: hidden;
		box-sizing: border-box;
	}

	.page-shell--tabbar .scroll-slot {
		flex: none;
		flex-shrink: 0;
		width: 100%;
		overflow: hidden;
	}

	.page-shell--tabbar .scroll-body {
		flex: none;
		width: 100%;
		height: 100% !important;
		box-sizing: border-box;
		-webkit-overflow-scrolling: touch;
	}

	.page-shell--tabbar .scroll-body .uni-scroll-view {
		height: 100% !important;
	}

	/* uni-app H5 视频：隐藏进度条拖拽圆点，保留条形进度 */
	.uni-video-ball {
		display: none !important;
		opacity: 0 !important;
		width: 0 !important;
		height: 0 !important;
		transform: scale(0) !important;
		pointer-events: none !important;
	}

	.uni-video-progress input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 0;
		height: 0;
		opacity: 0;
	}

	.uni-video-progress input[type='range']::-moz-range-thumb {
		width: 0;
		height: 0;
		opacity: 0;
		border: none;
	}
	/* #endif */

	.row{
		display:flex
	}
	.col{
		flex:1
	}
	.p-x5{
		padding-left: 5rpx;
		padding-right: 5px;
	}
	.p-x10{
		padding-left: 10rpx;
		padding-right: 10px;
	}
</style>
