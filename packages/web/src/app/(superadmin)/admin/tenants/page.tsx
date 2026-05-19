'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { superAdminFetch } from '@/lib/super-admin-api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

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

  const totalPages = data ? Math.ceil(data.total / limit) : 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tenants</h1>
        <Button onClick={() => router.push('/admin/tenants/new')}>
          Novo tenant
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Carregando...</p>}
      {isError  && <p className="text-destructive text-sm">Erro ao carregar tenants.</p>}

      {data && (
        <>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Nome</th>
                  <th className="px-4 py-3 text-left font-medium">Slug</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Criado em</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.data.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{tenant.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{tenant.slug}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        tenant.active
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-muted text-muted-foreground',
                      )}>
                        {tenant.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(tenant.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/tenants/${tenant.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="secondary" size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="secondary" size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
