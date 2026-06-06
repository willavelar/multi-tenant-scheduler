'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { superAdminFetch } from '@/lib/super-admin-api'
import { Button } from '@/components/ui/button'
import { TableSkeleton } from '@/components/loading/TableSkeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { EmptyState } from '@/components/feedback/EmptyState'
import { StatusBadge } from '@/components/feedback/StatusBadge'
import { DateTimeCell } from '@/components/data-display/DateTimeCell'

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
            <Table>
              <TableHeader>
                <TableRow>
                  {COLS.map((col, i) => (
                    <TableHead key={i}>{col}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{tenant.slug}</TableCell>
                    <TableCell>
                      <StatusBadge
                        label={tenant.active ? 'Ativo' : 'Inativo'}
                        variant={tenant.active ? 'success' : 'neutral'}
                      />
                    </TableCell>
                    <TableCell><DateTimeCell iso={tenant.createdAt} /></TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/tenants/${tenant.id}`} className="text-sm text-primary hover:underline">
                        Ver
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

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
