'use client'

import { DatePickerField } from '@/components/ui/DatePickerField'
import { ClientSearchField } from '@/components/ui/ClientSearchField'
import { ProfessionalSearchField } from '@/components/ui/ProfessionalSearchField'
import { useTenantSettingsContext } from '@/providers/TenantSettingsProvider'
import { Button } from '@/components/ui/button'
import type { Service } from '@/types'

type Props = {
  viewMode: 'calendar' | 'list'
  timeRange: '' | 'future' | 'past'
  dateFrom: string
  dateTo: string
  serviceId: string
  status: string
  clientId: string
  professionalId: string
  clientDisplayValue: string
  professionalDisplayValue: string
  servicesList: Service[]
  hasFilters: boolean
  onTimeRangeChange: (v: '' | 'future' | 'past') => void
  onDateFromChange: (v: string) => void
  onDateToChange: (v: string) => void
  onServiceIdChange: (v: string) => void
  onStatusChange: (v: string) => void
  onClientInput: (v: string) => void
  onClientSelect: (id: string, name: string) => void
  onClientClear: () => void
  onProfessionalInput: (v: string) => void
  onProfessionalSelect: (id: string, name: string) => void
  onProfessionalClear: () => void
  onClearFilters: () => void
}

const selectClass =
  'h-9 w-full pl-3 pr-8 text-[13px] text-foreground bg-background border border-border rounded-lg appearance-none cursor-pointer outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors'
const labelClass = 'block text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] mb-1'
const ChevronDown = () => (
  <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

export function AppointmentFilters({
  viewMode, timeRange, dateFrom, dateTo, serviceId, status,
  clientId, professionalId, clientDisplayValue, professionalDisplayValue,
  servicesList, hasFilters,
  onTimeRangeChange, onDateFromChange, onDateToChange, onServiceIdChange, onStatusChange,
  onClientInput, onClientSelect, onClientClear,
  onProfessionalInput, onProfessionalSelect, onProfessionalClear,
  onClearFilters,
}: Props) {
  const { allowPaidStatus } = useTenantSettingsContext()

  return (
    <div className="bg-card border border-border rounded-xl px-5 py-4 mb-4 shadow-sm">
      <div className="flex flex-wrap gap-3 items-end">

        {/* Period — list mode only */}
        {viewMode === 'list' && (
          <div className="min-w-[140px] flex-[1_1_140px]">
            <label className={labelClass}>Período</label>
            <div className="relative">
              <select className={selectClass} value={timeRange} onChange={e => onTimeRangeChange(e.target.value as '' | 'future' | 'past')}>
                <option value="">Todos</option>
                <option value="future">Futuros</option>
                <option value="past">Passados</option>
              </select>
              <ChevronDown />
            </div>
          </div>
        )}

        {/* Date pickers — list mode + no period selected */}
        {viewMode === 'list' && timeRange === '' && (
          <>
            <div className="min-w-[140px] flex-[1_1_140px]">
              <label className={labelClass}>De</label>
              <DatePickerField value={dateFrom} onChange={onDateFromChange} inputClassName="h-9 text-[13px]" />
            </div>
            <div className="min-w-[140px] flex-[1_1_140px]">
              <label className={labelClass}>Até</label>
              <DatePickerField value={dateTo} onChange={onDateToChange} inputClassName="h-9 text-[13px]" />
            </div>
          </>
        )}

        {/* Service */}
        <div className="min-w-[160px] flex-[1_1_160px]">
          <label className={labelClass}>Serviço</label>
          <div className="relative">
            <select className={selectClass} value={serviceId} onChange={e => onServiceIdChange(e.target.value)}>
              <option value="">Todos</option>
              {servicesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <ChevronDown />
          </div>
        </div>

        {/* Status */}
        <div className="min-w-[140px] flex-[1_1_140px]">
          <label className={labelClass}>Status</label>
          <div className="relative">
            <select className={selectClass} value={status} onChange={e => onStatusChange(e.target.value)}>
              <option value="">Todos</option>
              <option value="pending">Aguardando confirmação</option>
              <option value="confirmed">Confirmado</option>
              <option value="cancelled">Cancelado</option>
              {allowPaidStatus && <option value="completed">Pago</option>}
            </select>
            <ChevronDown />
          </div>
        </div>

        {/* Professional */}
        <div className="min-w-[180px] flex-[2_1_180px]">
          <label className={labelClass}>Profissional</label>
          <ProfessionalSearchField
            value={professionalDisplayValue}
            onChange={onProfessionalInput}
            onSelect={onProfessionalSelect}
            selectedId={professionalId}
            onClear={onProfessionalClear}
            showSearchIcon
            inputClassName="h-9 text-[13px] focus:ring-2 focus:ring-indigo-500/10"
          />
        </div>

        {/* Client */}
        <div className="min-w-[200px] flex-[2_1_200px]">
          <label className={labelClass}>Cliente</label>
          <ClientSearchField
            value={clientDisplayValue}
            onChange={onClientInput}
            onSelect={onClientSelect}
            selectedId={clientId}
            onClear={onClientClear}
            showSearchIcon
            inputClassName="h-9 text-[13px] focus:ring-2 focus:ring-indigo-500/10"
          />
        </div>

        {/* Clear */}
        {hasFilters && (
          <div className="flex items-end">
            <Button variant="secondary" size="sm" onClick={onClearFilters}>
              Limpar filtros
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
