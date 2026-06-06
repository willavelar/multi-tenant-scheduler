'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useCreateSuggestion } from '@/hooks/useSuggestions'

const MAX_IMAGE_BYTES = 2 * 1024 * 1024 // 2MB

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function SupportWidget() {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { mutateAsync, isPending } = useCreateSuggestion()

  function reset() {
    setContent('')
    setImage(null)
    setError(null)
    setSent(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Imagem muito grande (máx 2MB).')
      return
    }
    setError(null)
    setImage(await readFileAsDataUrl(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) {
      setError('Escreva sua sugestão.')
      return
    }
    try {
      await mutateAsync({ content: content.trim(), image })
      setSent(true)
      setTimeout(() => { setOpen(false); reset() }, 1500)
    } catch {
      setError('Não foi possível enviar. Tente novamente.')
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open ? (
        <div className="w-80 bg-background border border-border rounded-2xl shadow-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Enviar sugestão</h2>
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => { setOpen(false); reset() }}
              className="text-muted-foreground hover:text-foreground text-lg leading-none"
            >
              ×
            </button>
          </div>

          {sent ? (
            <p className="text-sm text-green-600 py-6 text-center">Sugestão enviada. Obrigado!</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="Conte para o suporte o que podemos melhorar…"
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />

              {image && (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image} alt="anexo" className="max-h-32 w-full rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImage(null); if (fileRef.current) fileRef.current.value = '' }}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 text-sm"
                    aria-label="Remover imagem"
                  >
                    ×
                  </button>
                </div>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleFile}
                className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium"
              />

              {error && <p className="text-xs text-red-600">{error}</p>}

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Enviando…' : 'Enviar'}
              </Button>
            </form>
          )}
        </div>
      ) : (
        <button
          type="button"
          aria-label="Enviar sugestão para o suporte"
          onClick={() => setOpen(true)}
          className="w-14 h-14 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg flex items-center justify-center transition-colors"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
          </svg>
        </button>
      )}
    </div>
  )
}
