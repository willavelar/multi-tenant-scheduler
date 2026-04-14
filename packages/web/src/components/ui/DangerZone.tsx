'use client'

import { useState } from 'react'

type Props = {
  title: string
  description: string
  onDelete: () => Promise<void>
  deleteLabel?: string
}

export function DangerZone({ title, description, onDelete, deleteLabel = 'Excluir' }: Props) {
  const [confirm, setConfirm] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError]     = useState('')

  async function handleDelete() {
    setPending(true)
    setError('')
    try {
      await onDelete()
    } catch {
      setError('Não foi possível excluir. Tente novamente.')
      setConfirm(false)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mt-2">
      <h3 className="text-sm font-bold text-red-600 m-0 mb-3">Zona de perigo</h3>
      <div className="bg-white border border-red-200 rounded-xl px-6 py-5 shadow-sm">
        <p className="text-sm font-semibold text-gray-900 m-0 mb-1.5">{title}</p>
        <p className="text-[13px] text-gray-500 m-0 mb-4">{description}</p>

        {!confirm ? (
          <button
            onClick={() => setConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white text-[13px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-red-700 transition-colors"
          >
            {deleteLabel}
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-red-700 font-medium">Tem certeza?</span>
            <button
              onClick={handleDelete}
              disabled={pending}
              className="px-4 py-2 bg-red-600 text-white text-[13px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-red-700 disabled:opacity-65 disabled:cursor-not-allowed transition-colors"
            >
              {pending ? 'Excluindo...' : 'Sim, excluir'}
            </button>
            <button
              onClick={() => setConfirm(false)}
              className="px-4 py-2 bg-white text-gray-700 text-[13px] font-medium rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}

        {error && <p className="text-xs text-red-600 mt-2.5 m-0">{error}</p>}
      </div>
    </div>
  )
}
