import { AlertTriangle, X } from 'lucide-react'

// Inline field error message
export function FieldError({ error }) {
  if (!error) return null
  return (
    <p className="flex items-center gap-1 text-error text-xs mt-1 font-mono">
      <AlertTriangle size={11} />
      {error}
    </p>
  )
}

// Confirmation modal (replaces browser confirm())
export function ConfirmModal({ title, message, confirmLabel = 'Delete', onConfirm, onCancel, danger = true }) {
  return (
    <div className="modal modal-open z-50">
      <div className="modal-box bg-base-200 border border-base-300 max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-lg">{title}</h3>
          <button className="btn btn-ghost btn-sm btn-circle" onClick={onCancel}><X size={16} /></button>
        </div>
        <p className="text-base-content/70 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className={`btn ${danger ? 'btn-error' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onCancel} />
    </div>
  )
}
