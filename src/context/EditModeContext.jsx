import { createContext, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'atom.editMode'

const EditModeContext = createContext()

/**
 * Edit mode is a standing preference, not per-panel state: flip it once and
 * every prospect you open afterwards is already editable, across panel opens
 * and page reloads.
 */
export function EditModeProvider({ children }) {
  const [editMode, setEditMode] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(editMode))
    } catch {
      // Storage blocked (private mode, etc.) — the toggle still works for the session.
    }
  }, [editMode])

  return (
    <EditModeContext.Provider value={{ editMode, setEditMode }}>
      {children}
    </EditModeContext.Provider>
  )
}

export function useEditMode() {
  return useContext(EditModeContext)
}
