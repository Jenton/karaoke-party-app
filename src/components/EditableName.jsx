import { useState } from 'react'

// A singer name you can fill in or change on the spot. Empty = "not named yet".
export default function EditableName({ value, onSave, placeholder = '+ add singer name', className = '', inputClassName = '' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  if (!onSave) return <span className={className}>{value || ''}</span>

  const start = (e) => {
    e?.stopPropagation()
    setDraft(value || '')
    setEditing(true)
  }
  const finish = (save) => {
    setEditing(false)
    if (save && draft.trim() !== (value || '')) onSave(draft.trim())
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        placeholder="Singer name"
        maxLength={30}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => finish(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') finish(true)
          if (e.key === 'Escape') finish(false)
        }}
        onClick={(e) => e.stopPropagation()}
        className={`rounded-lg border-2 border-pink-400 px-2 py-0.5 text-slate-900 bg-white w-40 ${inputClassName}`}
      />
    )
  }
  return (
    <button
      type="button"
      onClick={start}
      title="Click to edit the singer's name"
      className={`text-left underline decoration-dotted underline-offset-4 hover:decoration-solid ${value ? '' : 'text-pink-600 font-semibold'} ${className}`}
    >
      {value || placeholder}
    </button>
  )
}
