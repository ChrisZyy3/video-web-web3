import App from './App'
import { http } from '@/utils/request'
import { baseUrl } from '@/env'
// #ifdef H5
import Web3 from 'web3'
// #endif

// function createWeb3() {
// 	// #ifdef H5
// 	if (typeof window !== 'undefined') {
// 		const provider = window.ethereum || window.web3?.currentProvider
// 		if (provider) {
// 			return new Web3(provider)
// 		}
// 	}
// 	// #endif
// 	return null
// }

const web3 = new Web3()

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
Vue.config.productionTip = false
App.mpType = 'app'
const app = new Vue({
  ...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
export function createApp() {
  const app = createSSRApp(App)
  app.config.globalProperties.$http = http
  app.config.globalProperties.$baseUrl = baseUrl
  app.config.globalProperties.$web3 = web3
  return {
    app
  }
}
// #endif