import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import DesktopDashboard from './pages/DesktopDashboard.jsx'
import MobileValuation from './pages/MobileValuation.jsx'

// distinct ID for Webflow embedding
const WIDGET_DIV_ID = 'tesla-valuation-widget-container';

// Try to find the specific widget div first
const container = document.getElementById(WIDGET_DIV_ID) || document.getElementById('root');

console.log('Tesla Widget Attempting to Mount...');
console.log('Container found:', !!container);

if (container) {
  // Add a min-height and background directly to ensure it's visible while loading
  if (container.id === WIDGET_DIV_ID) {
    container.style.minHeight = '600px';
    container.style.display = 'block';
  }

  createRoot(container).render(
    <StrictMode>
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<DesktopDashboard />} />
          <Route path="/mobile" element={<MobileValuation />} />
        </Routes>
      </MemoryRouter>
    </StrictMode>,
  )
  console.log('Tesla Widget Mounted Successfully');
} else {
  console.error(`Tesla Valuation Widget Error: Container #${WIDGET_DIV_ID} not found in the DOM. Please ensure you have a div with this ID in your Webflow project.`);
}
