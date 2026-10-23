import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import { OperatorApp } from './operator/OperatorApp'
import { ParentApp } from './parent/ParentApp'
import './shared/tokens.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/operator/*" element={<OperatorApp />} />
        <Route path="/*" element={<ParentApp />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
