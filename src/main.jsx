import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import MobileValuation from './pages/MobileValuation.jsx'

// distinct ID for Webflow embedding
const WIDGET_DIV_ID = 'tesla-valuation-widget-container';

// Try to find the specific widget div first
const container = document.getElementById(WIDGET_DIV_ID) || document.getElementById('root');

if (container) {
  createRoot(container).render(
    <StrictMode>
      {/* 
        Using MemoryRouter to prevent the widget from interacting with the host site's URL
      */}
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<MobileValuation />} />
        </Routes>
      </MemoryRouter>
    </StrictMode>,
  )
} else {
  console.warn(`Tesla Valuation Widget: Container #${WIDGET_DIV_ID} not found.`);
}
