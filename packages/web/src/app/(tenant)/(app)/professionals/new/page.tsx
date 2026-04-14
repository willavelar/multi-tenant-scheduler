'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { useRouter } from 'next/navigation'
import { useCreateProfessional } from '@/hooks/useProfessionals'
import { BackButton } from '@/components/ui/BackButton'
import { cn } from '@/lib/utils'

const schema = z.object({
  name:      z.string().min(2, 'Nome obrigatório'),
  email:     z.string().email('E-mail inválido'),
  password:  z.string().min(8, 'Mínimo 8 caracteres'),
  position:  z.string().optional(),
  bio:       z.string().optional(),
})
type FormData = z.infer<typeof schema>

const inputCls = (hasError: boolean) => cn(
  'w-full h-[42px] px-3 text-sm text-gray-900 bg-white rounded-lg border outline-none transition-colors',
  'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10',
  hasError ? 'border-red-400' : 'border-gray-200'
)

export default function NewProfessionalPage() {
  const router = useRouter()
  const create = useCreateProfessional()

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      await create.mutateAsync(data)
      router.push('/professionals')
    } catch {
      setError('root', { message: 'Não foi possível cadastrar. Verifique os dados e tente novamente.' })
    }
  }

  return (
    <div className="max-w-[560px]">
      <BackButton href="/professionals" variant="ghost">Voltar para profissionais</BackButton>

      <div className="bg-white border border-gray-200 rounded-xl p-7 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 m-0 mb-6">Dados do profissional</h2>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {[
            { key: 'name',     label: 'Nome completo', type: 'text',     required: true },
            { key: 'email',    label: 'E-mail',        type: 'email',    required: true },
            { key: 'password', label: 'Senha inicial', type: 'password', required: true },
            { key: 'position', label: 'Cargo',         type: 'text',     required: false },
          ].map(({ key, label, type, required }) => (
            <div key={key} className="mb-4">
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                {label}{required && <span className="text-red-500"> *</span>}
              </label>
              <input
                id={key}
                type={type}
                {...register(key as keyof FormData)}
                className={inputCls(!!errors[key as keyof FormData])}
              />
              {errors[key as keyof FormData] && (
                <p className="mt-1 text-xs text-red-500 m-0">
                  {errors[key as keyof FormData]?.message}
                </p>
              )}
            </div>
          ))}

          <div className="mb-6">
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Observações</label>
            <textarea
              {...register('bio')}
              rows={3}
              className="w-full px-3 py-2.5 text-sm text-gray-900 bg-white rounded-lg border border-gray-200 outline-none resize-y transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>

          {errors.root && (
            <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
              {errors.root.message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-[42px] bg-indigo-500 text-white text-sm font-semibold rounded-lg border-0 cursor-pointer flex items-center justify-center gap-2 hover:bg-indigo-600 disabled:opacity-65 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Salvando...
              </>
            ) : 'Cadastrar profissional'}
          </button>
        </form>
      </div>
    </div>
  )
}
