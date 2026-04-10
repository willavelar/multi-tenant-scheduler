'use client'

import { useReducer } from 'react'
import { StepProfessional } from './StepProfessional'
import { StepService } from './StepService'

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

  return (
    <div className="max-w-lg mx-auto py-10 px-4">
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
        <p className="text-gray-400">Etapa 3 — em breve (Task 6)</p>
      )}
      {state.step === 4 && (
        <p className="text-gray-400">Etapa 4 — em breve (Task 6)</p>
      )}
    </div>
  )
}
