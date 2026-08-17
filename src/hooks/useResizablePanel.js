import { useCallback, useEffect, useState } from 'react'

const MIN_WIDTH = 360
// A panel wider than this leaves no usable table behind it.
const MAX_WIDTH_RATIO = 0.9
const KEYBOARD_STEP = 24

function readStored(key, fallback) {
  try {
    const stored = Number(window.localStorage.getItem(key))
    return Number.isFinite(stored) && stored > 0 ? stored : fallback
  } catch {
    // localStorage throws rather than returning null in some privacy modes.
    return fallback
  }
}

// Drag-to-resize for a viewport-anchored panel on the right edge.
//
// The width is persisted because ProspectModal is keyed by prospect id and
// remounts whenever the selection changes — component state alone would snap
// the panel back to its default every time another row is clicked.
export function useResizablePanel(storageKey, defaultWidth) {
  const clamp = useCallback(
    w => Math.min(Math.max(w, MIN_WIDTH), window.innerWidth * MAX_WIDTH_RATIO),
    []
  )

  // Clamped on read too: a width stored on a wider monitor would otherwise
  // cover the whole viewport on a narrow one.
  const [width, setWidth] = useState(() => clamp(readStored(storageKey, defaultWidth)))
  const [dragging, setDragging] = useState(false)

  const startDrag = useCallback(e => {
    // Stops the drag from turning into a text selection of the panel body.
    e.preventDefault()
    setDragging(true)
  }, [])

  const resetWidth = useCallback(() => setWidth(clamp(defaultWidth)), [clamp, defaultWidth])

  const nudge = useCallback(delta => setWidth(w => clamp(w + delta)), [clamp])

  const onHandleKeyDown = useCallback(e => {
    // The panel is anchored right, so dragging its left edge leftwards widens it.
    if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(KEYBOARD_STEP) }
    else if (e.key === 'ArrowRight') { e.preventDefault(); nudge(-KEYBOARD_STEP) }
    else if (e.key === 'Home') { e.preventDefault(); resetWidth() }
  }, [nudge, resetWidth])

  useEffect(() => {
    if (!dragging) return

    // Listeners go on the window, not the handle: the pointer routinely outruns
    // a 6px strip mid-drag, and the resize should follow it anyway.
    function handleMove(e) {
      setWidth(clamp(window.innerWidth - e.clientX))
    }
    function stop() {
      setDragging(false)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)

    const { userSelect, cursor } = document.body.style
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'

    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
      document.body.style.userSelect = userSelect
      document.body.style.cursor = cursor
    }
  }, [dragging, clamp])

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, String(width))
    } catch {
      // Not being able to remember the width is not worth breaking the panel over.
    }
  }, [storageKey, width])

  useEffect(() => {
    function handleResize() {
      setWidth(w => clamp(w))
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [clamp])

  return { width, dragging, startDrag, resetWidth, onHandleKeyDown }
}
