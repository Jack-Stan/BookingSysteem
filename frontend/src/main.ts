import { createApp } from 'vue'
import '../styles/style.css'
import App from './App.vue'
// initialize firebase (analytics optional)
import './firebase'

createApp(App).mount('#app')
