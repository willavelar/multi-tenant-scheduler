'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { superAdminFetch } from '@/lib/super-admin-api'

type Tenant = {
  id: string
  slug: string
  name: string
  createdAt: string
}

type TenantsResponse = {
  data: Tenant[]
  total: number
  page: number
  limit: number
}

export default function TenantsPage() {
  const [page, setPage] = useState(1)
  const router = useRouter()
  const limit = 20

  const { data, isLoading, error } = useQuery({
    queryKey: ['sa-tenants', page],
    queryFn: async () => {
      const res = await superAdminFetch(`/super-admin/tenants?page=${page}&limit=${limit}`)
      return res.json() as Promise<TenantsResponse>
    },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-foreground">Tenants</h1>
        <button
          onClick={() => router.push('/tenants/new')}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Novo Tenant
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
          Carregando...
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          Erro ao carregar tenants.
        </div>
      )}

      {data && (
        <>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Nome</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Slug</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {data.data.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum tenant encontrado.
                    </td>
                  </tr>
                )}
                {data.data.map((tenant) => (
                  <tr
                    key={tenant.id}
                    onClick={() => router.push(`/tenants/${tenant.id}`)}
                    className="border-b border-border last:border-0 hover:bg-accent cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{tenant.name}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{tenant.slug}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(tenant.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.total > limit && (
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>
                {(page - 1) * limit + 1}–{Math.min(page * limit, data.total)} de {data.total}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-border hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * limit >= data.total}
                  className="px-3 py-1.5 rounded-lg border border-border hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Próximo
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
