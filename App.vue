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
