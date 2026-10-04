import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import PopupPlayer from './PopupPlayer.jsx'
import './index.css'

const popup = new URLSearchParams(window.location.search).has('player')
createRoot(document.getElementById('root')).render(popup ? <PopupPlayer /> : <App />)
