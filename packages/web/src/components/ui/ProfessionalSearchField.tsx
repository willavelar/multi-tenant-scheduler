'use client'

import { useState, useRef, useEffect } from 'react'
import { useProfessionals } from '@/hooks/useProfessionals'
import { AvatarName } from '@/components/ui/AvatarName'
import { cn } from '@/lib/utils'

interface ProfessionalSearchFieldProps {
  value: string
  onChange: (value: string) => void
  onSelect: (id: string, name: string) => void
  selectedId?: string
  onClear?: () => void
  showSearchIcon?: boolean
  placeholder?: string
  inputClassName?: string
}

export function ProfessionalSearchField({
  value,
  onChange,
  onSelect,
  selectedId,
  onClear,
  showSearchIcon,
  placeholder = 'Buscar por nome…',
  inputClassName,
}: ProfessionalSearchFieldProps) {
  const [dropOpen, setDropOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data: allProfessionals = [] } = useProfessionals()

  const query = selectedId ? '' : value.toLowerCase()
  const results = query
    ? allProfessionals.filter(p => p.name.toLowerCase().includes(query))
    : allProfessionals

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleChange(val: string) {
    onChange(val)
    setDropOpen(true)
  }

  function handleSelect(id: string, name: string) {
    onSelect(id, name)
    setDropOpen(false)
  }

  const showDrop = dropOpen && !selectedId && results.length > 0

  return (
    <div className="relative" ref={ref}>
      {showSearchIcon && (
        <svg
          width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af"
          strokeWidth="2" strokeLinecap="round"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
        >
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      )}

      <input
        type="text"
        className={cn(
          'w-full text-gray-900 bg-white border border-gray-200 rounded-lg outline-none focus:border-indigo-500 transition-colors',
          showSearchIcon ? 'pl-[30px]' : 'pl-3',
          selectedId && onClear ? 'pr-[30px]' : 'pr-3',
          inputClassName,
        )}
        placeholder={placeholder}
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => { if (!selectedId) setDropOpen(true) }}
      />

      {selectedId && onClear && (
        <button
          onClick={onClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-0 cursor-pointer text-gray-400 flex p-0.5"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}

      {showDrop && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-[200px] overflow-y-auto animate-in fade-in slide-in-from-top-1.5 duration-150">
          {results.map(p => (
            <button
              key={p.id}
              className="flex items-center gap-2 px-3 py-2 cursor-pointer border-0 bg-transparent w-full text-left hover:bg-gray-50 transition-colors"
              onMouseDown={() => handleSelect(p.id, p.name)}
            >
              <AvatarName name={p.name} subtitle={p.position ?? p.email} size={28} avatarUrl={p.avatarUrl} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
