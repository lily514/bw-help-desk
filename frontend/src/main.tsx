import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, Route, RouterProvider, Routes } from 'react-router'
// Global styles first, so page styles that load with their components can override them.
import './shared/tokens.css'
import './shared/base.css'
import { Landing } from './Landing'
import { OperatorApp } from './operator/OperatorApp'
import { ParentApp } from './parent/ParentApp'

function App() {
  return (
    <Routes>
      <Route index element={<Landing />} />
      <Route path="/parent/*" element={<ParentApp />} />
      <Route path="/operator/*" element={<OperatorApp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

// A data router (one catch-all route) so screens can use useBlocker; routing stays in <Routes>.
const router = createBrowserRouter([{ path: '*', element: <App /> }])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
