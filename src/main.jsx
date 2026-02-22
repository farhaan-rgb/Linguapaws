import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { aiService } from './services/ai'

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
aiService.init(apiKey);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
