import { useEffect, useRef } from "react"

export default function ConfirmDialog({ title, message, confirmLabel, onConfirm, onClose }) {
  const cancelRef = useRef(null)

  useEffect(() => {
    cancelRef.current?.focus()
    const onKey = (e) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <>
      <div className="scrim" onClick={onClose}></div>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
        <h2 id="confirm-title" className="drawer-title">{title}</h2>
        <p id="confirm-message" className="dialog-sub">{message}</p>
        <div className="dialog-actions">
          <button ref={cancelRef} onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={() => { onConfirm(); onClose() }} className="btn btn-danger-solid">{confirmLabel}</button>
        </div>
      </div>
    </>
  )
}
