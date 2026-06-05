'use client'

import { useRef, useState } from 'react'

const MAX_RAW_FILE_MB = 5
const MAX_OUTPUT_PX   = 800

async function resizeImage(file: File, dataUrl: string): Promise<string> {
  if (file.type === 'image/svg+xml') return dataUrl

  const isPng = file.type === 'image/png'

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, MAX_OUTPUT_PX / Math.max(img.width, img.height))
      const w = Math.round(img.width  * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas unavailable')); return }
      ctx.drawImage(img, 0, 0, w, h)
      resolve(isPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = dataUrl
  })
}

interface LogoCropFieldProps {
  value:    string | null
  onChange: (v: string | null) => void
}

export function LogoCropField({ value, onChange }: LogoCropFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setError(null)

    if (file.size > MAX_RAW_FILE_MB * 1024 * 1024) {
      setError(`Arquivo muito grande. Máximo permitido: ${MAX_RAW_FILE_MB}MB.`)
      return
    }

    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const resized = await resizeImage(file, reader.result as string)
        onChange(resized)
      } catch {
        setError('Não foi possível processar a imagem. Tente outro arquivo.')
      }
    }
    reader.onerror = () => setError('Não foi possível ler o arquivo.')
    reader.readAsDataURL(file)
  }

  return (
    <div className="w-full">
      <div
        className="relative cursor-pointer group w-full"
        onClick={() => inputRef.current?.click()}
      >
        {value ? (
          <div className="w-full rounded-lg border border-border bg-muted/30 p-2 flex items-center justify-center">
            <img
              src={value}
              alt="Logo"
              className="max-w-full max-h-[200px] h-auto object-contain"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
          </div>
        ) : (
          <div className="w-full h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs group-hover:border-indigo-400 transition-colors">
            Clique para enviar logo
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {error && (
        <p className="mt-1.5 text-[11px] text-red-500 m-0">{error}</p>
      )}
    </div>
  )
}
