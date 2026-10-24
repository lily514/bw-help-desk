import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
// Global styles first, so page styles that load with their components can override them.
import './shared/tokens.css'
import './shared/base.css'
import { Landing } from './Landing'
import { OperatorApp } from './operator/OperatorApp'
import { ParentApp } from './parent/ParentApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route index element={<Landing />} />
        <Route path="/parent/*" element={<ParentApp />} />
        <Route path="/operator/*" element={<OperatorApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
