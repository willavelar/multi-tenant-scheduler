'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { superAdminFetch } from '@/lib/super-admin-api'
import { Button } from '@/components/ui/button'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { DateTimeCell } from '@/components/ui/DateTimeCell'

interface Tenant {
  id: string
  slug: string
  name: string
  active: boolean
  createdAt: string
}

interface TenantsPage {
  data: Tenant[]
  total: number
  page: number
  limit: number
}

const COLS = ['Nome', 'Slug', 'Status', 'Criado em', '']

export default function TenantsPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, isLoading, isError } = useQuery<TenantsPage>({
    queryKey: ['sa-tenants', page],
    queryFn: async () => {
      const res = await superAdminFetch(`/super-admin/tenants?page=${page}&limit=${limit}`)
      return res.json()
    },
  })

  const tenants    = data?.data ?? []
  const totalPages = data ? Math.ceil(data.total / limit) : 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tenants</h1>
        <Button onClick={() => router.push('/admin/tenants/new')}>Novo tenant</Button>
      </div>

      <div className="bg-background border border-border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <TableSkeleton cols={5} />
        ) : isError ? (
          <EmptyState title="Erro ao carregar" description="Não foi possível carregar os tenants." />
        ) : !tenants.length ? (
          <EmptyState
            title="Nenhum tenant"
            description="Tenants aparecerão aqui após serem cadastrados."
            action={{ label: 'Novo tenant', onClick: () => router.push('/admin/tenants/new') }}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    {COLS.map((col, i) => (
                      <th key={i} className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em] whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="border-b border-border transition-colors hover:bg-accent">
                      <td className="px-4 py-3 font-medium">{tenant.name}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{tenant.slug}</td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          label={tenant.active ? 'Ativo' : 'Inativo'}
                          variant={tenant.active ? 'success' : 'neutral'}
                        />
                      </td>
                      <td className="px-4 py-3"><DateTimeCell iso={tenant.createdAt} /></td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/tenants/${tenant.id}`} className="text-sm text-primary hover:underline">
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-[13px] text-muted-foreground m-0">
                  Página {page} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary" size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="secondary" size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
