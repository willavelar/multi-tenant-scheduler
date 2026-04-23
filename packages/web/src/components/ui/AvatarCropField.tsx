'use client'

import { useState, useRef, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { cn } from '@/lib/utils'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b']

function pickColor(str: string) {
  let h = 0
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return COLORS[h % COLORS.length]
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  outputWidth: number,
  outputHeight: number,
): Promise<string> {
  const image = new Image()
  image.src = imageSrc
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Image failed to load'))
  })

  const canvas = document.createElement('canvas')
  canvas.width  = outputWidth
  canvas.height = outputHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, outputWidth, outputHeight,
  )

  return canvas.toDataURL('image/jpeg', 0.9)
}

interface AvatarCropFieldProps {
  value:         string | null
  onChange:      (v: string | null) => void
  name?:         string
  aspect?:       number
  outputWidth?:  number
  outputHeight?: number
  shape?:        'circle' | 'rect'
}

export function AvatarCropField({
  value,
  onChange,
  name = '',
  aspect       = 1,
  outputWidth  = 256,
  outputHeight = 256,
  shape        = 'circle',
}: AvatarCropFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [cropError, setCropError] = useState(false)

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setImageSrc(reader.result as string)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setModalOpen(true)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleCrop() {
    if (!imageSrc || !croppedAreaPixels) return
    setCropError(false)
    try {
      const base64 = await getCroppedImg(imageSrc, croppedAreaPixels, outputWidth, outputHeight)
      onChange(base64)
      setModalOpen(false)
      setImageSrc(null)
    } catch {
      setCropError(true)
    }
  }

  function handleCancel() {
    setModalOpen(false)
    setImageSrc(null)
    setCropError(false)
  }

  const isRect = shape === 'rect'

  return (
    <>
      <div
        className="relative inline-block cursor-pointer group"
        onClick={() => inputRef.current?.click()}
      >
        {value ? (
          <img
            src={value}
            alt="Imagem"
            className={cn(
              'object-cover',
              isRect ? 'w-[180px] h-10 object-cover rounded-lg' : 'w-20 h-20 rounded-full',
            )}
          />
        ) : isRect ? (
          <div className="h-10 w-[180px] rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">
            Clique para enviar logo
          </div>
        ) : (
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold select-none"
            style={{ background: name ? pickColor(name) : '#6366f1' }}
          >
            {name ? initials(name) : '?'}
          </div>
        )}

        <div className={cn(
          'absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity',
          isRect ? 'rounded-lg' : 'rounded-full',
        )}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {modalOpen && imageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-xl shadow-xl w-[480px] overflow-hidden">
            <div className="relative h-[300px] bg-gray-900">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                cropShape={isRect ? 'rect' : 'round'}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="px-5 py-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">Zoom</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
            </div>
            {cropError && (
              <p className="px-5 pb-2 text-xs text-red-500 m-0">Não foi possível processar a imagem. Tente outro arquivo.</p>
            )}
            <div className="flex justify-end gap-3 px-5 pb-5">
              <button type="button" onClick={handleCancel}
                className="h-9 px-4 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button type="button" onClick={handleCrop}
                className="h-9 px-4 bg-indigo-500 text-white rounded-lg text-sm font-semibold cursor-pointer hover:bg-indigo-600 transition-colors">
                Recortar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
