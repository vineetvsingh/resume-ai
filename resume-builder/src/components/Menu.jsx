import { useState, useRef, useEffect } from "react"
import { MoreHorizontal } from "lucide-react"

// A small "more actions" menu: items are [{ label, onSelect, danger }]
export default function Menu({ label, items }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => {
      if (e.key === "Escape") { setOpen(false); buttonRef.current?.focus() }
    }
    document.addEventListener("pointerdown", onDown)
    document.addEventListener("keydown", onKey)
    rootRef.current?.querySelector("[role=menuitem]")?.focus()
    return () => {
      document.removeEventListener("pointerdown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  function onMenuKey(e) {
    const items = [...rootRef.current.querySelectorAll("[role=menuitem]")]
    const i = items.indexOf(document.activeElement)
    if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length]?.focus() }
    if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus() }
  }

  return (
    <div className="menu" ref={rootRef}>
      <button
        ref={buttonRef}
        className="icon-btn icon-btn-sm menu-trigger"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <MoreHorizontal size={16} strokeWidth={2} />
      </button>
      {open && (
        <div className="menu-list" role="menu" onKeyDown={onMenuKey}>
          {items.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              className={`menu-item${item.danger ? " is-danger" : ""}`}
              onClick={() => { setOpen(false); item.onSelect() }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
