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
