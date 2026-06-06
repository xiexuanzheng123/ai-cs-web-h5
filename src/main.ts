import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import 'element-plus/dist/index.css'
import './styles/element-theme.css'
import './styles/base.css'
import './styles/admin-common.css'
import './styles/chat.css'

createApp(App).use(router).mount('#app')
