'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMyProfessionalProfile } from '@/hooks/useProfessionals'

export default function MeRedirectPage() {
  const router = useRouter()
  const { data: prof, isLoading } = useMyProfessionalProfile()

  useEffect(() => {
    if (prof) {
      router.replace(`/professionals/${prof.id}`)
    }
  }, [prof, router])

  if (isLoading || !prof) {
    return <div style={{ padding: 48, color: '#9ca3af', fontSize: 14 }}>Carregando perfil...</div>
  }
  return null
}
