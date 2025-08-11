import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'
import App from './twonest/App'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swPath = (import.meta as any).env.BASE_URL + 'twonest-sw.js'
    navigator.serviceWorker.register(swPath).catch(()=>{})
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)