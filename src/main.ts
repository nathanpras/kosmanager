import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import {
  Chart as ChartJS,
  Title, Tooltip, Legend,
  BarElement, CategoryScale, LinearScale,
  ArcElement,
  PointElement, LineElement, Filler,
} from 'chart.js'

ChartJS.register(
  Title, Tooltip, Legend,
  BarElement, CategoryScale, LinearScale,
  ArcElement,
  PointElement, LineElement, Filler,
)

createApp(App).use(createPinia()).use(router).mount('#app')
