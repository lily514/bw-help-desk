import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { Chat } from './Chat'
import { CreateParent } from './CreateParent'
import { getParentId } from './session'
import { SignIn } from './SignIn'
import './parent.css'

/** Parent app at /parent: sign in, create a demo parent, chat (PLAN.md 4.3). */
export function ParentApp() {
  // Read once; sign-in and sign-out update it so routes react without a reload.
  const [parentId, setParentIdState] = useState(getParentId)

  return (
    <div className="parent-app">
      <Routes>
        <Route
          index
          element={
            parentId ? <Navigate to="chat" replace /> : <SignIn onSignIn={setParentIdState} />
          }
        />
        <Route path="new" element={<CreateParent onCreated={setParentIdState} />} />
        <Route
          path="chat"
          element={
            parentId ? (
              <Chat parentId={parentId} onSignOut={() => setParentIdState(null)} />
            ) : (
              <Navigate to="/parent" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/parent" replace />} />
      </Routes>
    </div>
  )
}
