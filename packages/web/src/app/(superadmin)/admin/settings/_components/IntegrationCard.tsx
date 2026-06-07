'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { FormCard } from '@/components/sections/FormCard'
import { Alert } from '@/components/feedback/Alert'

const saveIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
)

interface IntegrationCardProps {
  title: string
  enabled: boolean
  onToggle: () => void
  onSave: () => void
  saving: boolean
  feedback: { message: string; variant: 'success' | 'error' } | null
  children: ReactNode
}

export function IntegrationCard({ title, enabled, onToggle, onSave, saving, feedback, children }: IntegrationCardProps) {
  return (
    <FormCard title={title}>
      <div className="flex items-center justify-between -mt-1 mb-5">
        <span className="flex items-center gap-1.5">
          <span className={cn('w-2 h-2 rounded-full', enabled ? 'bg-green-500' : 'bg-muted-foreground/40')} />
          <span className="text-xs text-muted-foreground">{enabled ? 'Ativo' : 'Inativo'}</span>
        </span>
        <button
          type="button"
          onClick={onToggle}
          disabled={saving}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-65',
            enabled ? 'bg-indigo-600' : 'bg-muted-foreground/30',
          )}
          aria-label={`${enabled ? 'Desativar' : 'Ativar'} ${title}`}
        >
          <span className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
            enabled ? 'translate-x-6' : 'translate-x-1',
          )} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {children}
      </div>

      {feedback && (
        <div className="mt-4">
          <Alert variant={feedback.variant} size="sm">{feedback.message}</Alert>
        </div>
      )}

      <Button
        type="button"
        variant="primary"
        size="lg"
        icon={saveIcon}
        loading={saving}
        disabled={!enabled}
        onClick={onSave}
        className="w-full mt-4"
      >
        Salvar
      </Button>
    </FormCard>
  )
}
