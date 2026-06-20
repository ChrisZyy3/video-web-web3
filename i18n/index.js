import { createI18n } from "vue-i18n"
import zh from "./lang/zh-CN"
import en from "./lang/en"

// 语言包汇总
const messages = {
  "zh-CN": zh,
  "en": en
}

// 读取本地缓存的语言，无则默认中文
const localLang = uni.getStorageSync("lang") || "en"
const i18n = createI18n({
  legacy: false, // Vue3 组合式API必须关闭 legacy
  locale: localLang, // 当前语言
  fallbackLocale: "en", // 缺失文案兜底
  messages
})

export default i18n