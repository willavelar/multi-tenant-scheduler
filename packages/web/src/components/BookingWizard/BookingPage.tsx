'use client'

import { useReducer } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { Button } from '@/components/ui/button'
import { StepProfessional } from './StepProfessional'
import { StepService } from './StepService'
import { StepDateTime } from './StepDateTime'
import { StepConfirm } from './StepConfirm'

type BookingState = {
  step: 1 | 2 | 3 | 4
  professionalId: string | null
  serviceId: string | null
  date: string | null
  startTime: string | null
}

type Action =
  | { type: 'SELECT_PROFESSIONAL'; id: string }
  | { type: 'SELECT_SERVICE'; id: string }
  | { type: 'SELECT_SLOT'; date: string; startTime: string }
  | { type: 'BACK' }
  | { type: 'RESET' }

const initialState: BookingState = {
  step: 1,
  professionalId: null,
  serviceId: null,
  date: null,
  startTime: null,
}

function reducer(state: BookingState, action: Action): BookingState {
  switch (action.type) {
    case 'SELECT_PROFESSIONAL':
      return { ...state, step: 2, professionalId: action.id }
    case 'SELECT_SERVICE':
      return { ...state, step: 3, serviceId: action.id }
    case 'SELECT_SLOT':
      return { ...state, step: 4, date: action.date, startTime: action.startTime }
    case 'BACK':
      return { ...state, step: Math.max(1, state.step - 1) as BookingState['step'] }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

const STEPS = ['Profissional', 'Serviço', 'Data & Horário', 'Confirmação']

export function BookingPage() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { user, logout } = useAuth()
  const router = useRouter()

  function handleLogout() {
    logout()
    router.push('/login')
  }

  return (
    <div className="max-w-lg mx-auto py-10 px-4">
      {user && (
        <div className="flex items-center justify-between mb-6 text-sm text-gray-500">
          <span>{user.email}</span>
          <div className="flex gap-2">
            {(user.role === 'tenant_admin' || user.role === 'professional') && (
              <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
                Dashboard
              </Button>
            )}
            {user.role === 'client' && (
              <Button variant="ghost" size="sm" onClick={() => router.push('/appointments')}>
                Meus agendamentos
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-red-500" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </div>
      )}
      {/* Progress bar */}
      <div className="flex gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1">
            <div
              className={`h-1.5 rounded-full ${
                i + 1 <= state.step ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            />
            <p className={`text-xs mt-1 ${i + 1 === state.step ? 'text-indigo-600 font-semibold' : 'text-gray-400'}`}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {state.step === 1 && (
        <StepProfessional onSelect={(id) => dispatch({ type: 'SELECT_PROFESSIONAL', id })} />
      )}
      {state.step === 2 && (
        <StepService
          onSelect={(id) => dispatch({ type: 'SELECT_SERVICE', id })}
          onBack={() => dispatch({ type: 'BACK' })}
        />
      )}
      {state.step === 3 && (
        <StepDateTime
          professionalId={state.professionalId!}
          onSelect={(date, startTime) => dispatch({ type: 'SELECT_SLOT', date, startTime })}
          onBack={() => dispatch({ type: 'BACK' })}
        />
      )}
      {state.step === 4 && (
        <StepConfirm
          professionalId={state.professionalId!}
          serviceId={state.serviceId!}
          date={state.date!}
          startTime={state.startTime!}
          onBack={() => dispatch({ type: 'BACK' })}
          onDone={() => dispatch({ type: 'RESET' })}
        />
      )}
    </div>
  )
}
