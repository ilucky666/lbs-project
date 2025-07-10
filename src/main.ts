import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
// 仅在开发环境中引入和激活 Mock 服务
if (import.meta.env.DEV) {
   import('@/mock').then(() => {
     console.log('Mock service has been successfully initialized.')
   })
 }
