# Webflow Integration Plan - Tesla Valuation Widget

This guide outlines the steps to convert your standalone React application into an embeddable widget that can be hosted on Webflow.

## 1. Project Setup (Fresh Copy)

To keep your original playground intact, we will create a dedicated "Widget" version of the project.

**Action:** Duplicate your project folder.
- **Original:** `tesla-valuation-app`
- **New (suggested):** `tesla-valuation-widget`

## 2. Code Modifications

We need to change how the application builds and mounts (starts up).

### A. Update `vite.config.js`
We need to configure Vite to build a single file (or consistent filenames) so you don't have to update your Webflow script tag every time you deploy.

**Goal:** Ensure the build output has a predictable name like `widget.js` instead of `index-D8s7f.js`.

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Forces the output file usage to be simple names
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
})
```

### B. Update `src/main.jsx` (Mount Point)
Instead of taking over the entire `#root` of a page (which doesn't exist in Webflow), we want the app to find a specific container you place in Webflow.

```javascript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './pages/DesktopDashboard.jsx'
import MobileValuation from './pages/MobileValuation.jsx'

// distinct ID for Webflow embedding
const WIDGET_DIV_ID = 'tesla-valuation-widget-container';

// Try to find the specific widget div first
const container = document.getElementById(WIDGET_DIV_ID) || document.getElementById('root');

if (container) {
  createRoot(container).render(
    <StrictMode>
      {/* 
        BrowserRouter might interfere with Webflow routing if not careful. 
        For a simple widget, HashRouter is often safer, or just use MemoryRouter 
        if the URL doesn't need to change. 
        However, if you want to keep the mobile/desktop routes:
      */}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/mobile" element={<MobileValuation />} />
        </Routes>
      </BrowserRouter>
    </StrictMode>,
  )
} else {
    console.warn(`Tesla Valuation Widget: Container #${WIDGET_DIV_ID} not found.`);
}
```

### C. Style Isolation (CSS)
Webflow has its own CSS. To prevent your app's CSS (like Tailwind or global styles) from breaking the Webflow site, wrap your app in a unique class or namespace your CSS. 
*Since you are using raw CSS/CSS Modules, ensure your class names are specific (e.g., `.tv-container` instead of just `.container`).*

## 3. Hosting & Deployment

The widget code needs to live somewhere.
1.  **Push the new code** to a GitHub repository.
2.  **Connect to Vercel/Netlify**.
3.  **Deploy**.
4.  **Get the URL**: Vercel will give you a domain, e.g., `https://tesla-valuation-widget.vercel.app`.

Your script link will be: `https://tesla-valuation-widget.vercel.app/assets/index.js`
Your CSS link will be: `https://tesla-valuation-widget.vercel.app/assets/index.css`

## 4. Webflow Integration

### Step 1: Add the Scripts
In your Webflow Project Settings -> **Custom Code** -> **Footer Code** (Before </body> tag):

```html
<!-- Load the specific CSS for the widget -->
<link rel="stylesheet" href="https://your-vercel-app-url.vercel.app/assets/index.css">

<!-- Load the React Widget Logic -->
<script type="module" src="https://your-vercel-app-url.vercel.app/assets/index.js"></script>
```

### Step 2: Add the Container
Open the **Webflow Designer**.
1.  Navigate to the page where you want the calculator.
2.  Add a **Div Block** (or an Embed element).
3.  Give it the **ID**: `tesla-valuation-widget-container`.
4.  (Optional) Set a purely visual height or min-height so it's not invisible while loading.

### Step 3: Publish
Publish your Webflow site to the staging domain (`.webflow.io`) to test.

## Troubleshooting
- **Routing:** If clicking links in your widget changes the actual Webflow page URL incorrectly, we may need to switch from `BrowserRouter` to `HashRouter` or `MemoryRouter`.
- **Z-Index:** If modals appear behind Webflow navbars, adjust the `z-index` in your CSS.
