'use client'

import { useRouter } from 'next/navigation'
import { useProfessionals, useDeleteProfessional } from '@/hooks/useProfessionals'
import { AvatarName } from '@/components/ui/AvatarName'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { Professional } from '@/types'

export default function ProfessionalsPage() {
  const router = useRouter()
  const { data: professionals = [], isLoading } = useProfessionals()
  const del = useDeleteProfessional()

  function handleDelete(prof: Professional) {
    if (!confirm(`Excluir ${prof.name}? Esta ação não pode ser desfeita.`)) return
    del.mutate(prof.id)
  }

  return (
    <div className="max-w-[900px]">
      <div className="flex justify-between items-center mb-6">
        <p className="text-[13px] text-gray-500 m-0">
          {professionals.length} profissional{professionals.length !== 1 ? 'is' : ''} cadastrado{professionals.length !== 1 ? 's' : ''}
        </p>
        <button
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white text-[13.5px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-indigo-600 transition-colors"
          onClick={() => router.push('/professionals/new')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Cadastrar profissional
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Carregando...</div>
        ) : !professionals.length ? (
          <EmptyState
            title="Nenhum profissional"
            description='Clique em "Cadastrar profissional" para adicionar.'
          />
        ) : (
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-gray-100">
                {['Profissional', 'Cargo', 'Função', 'Status', 'Ações'].map(col => (
                  <th key={col} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em]">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {professionals.map((prof: Professional) => (
                <tr key={prof.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <button
                      className="block w-full text-left bg-transparent border-0 p-0 cursor-pointer"
                      onClick={() => router.push(`/professionals/${prof.id}`)}
                    >
                      <AvatarName name={prof.name} subtitle={prof.email} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{prof.position ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {prof.role === 'tenant_admin' ? 'Administrador' : 'Profissional'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={prof.active ? 'Ativo' : 'Inativo'}
                      variant={prof.active ? 'success' : 'neutral'}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="px-3 py-[5px] border border-red-200 bg-white text-red-600 rounded-md text-xs font-medium cursor-pointer hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      onClick={() => handleDelete(prof)}
                      disabled={del.isPending && del.variables === prof.id}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
