import { createApp } from 'vue'
import App from './App.vue'
import './main.scss'
import { createAppRouter } from './router'

async function initApp() {
  const router = await createAppRouter()
  const app = createApp(App)
  
  app.use(router)
  app.mount('#app')
}

initApp().catch(console.error)
