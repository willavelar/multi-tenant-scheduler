export type User = {
  id: string
  email: string
  role: 'tenant_admin' | 'professional' | 'client'
  tenantId: string | null
}

export type Professional = {
  id: string
  tenantId: string
  userId: string
  bio: string | null
  avatarUrl: string | null
  position: string | null
  active: boolean
  name: string
  email: string
  phone: string | null
  role: 'tenant_admin' | 'professional' | 'client'
}

export type Client = {
  id: string
  name: string
  email: string
  phone: string | null
  createdAt: string
}

export type Service = {
  id: string
  tenantId: string
  name: string
  durationMinutes: number
  description: string | null
  active: boolean
}

export type Appointment = {
  id: string
  tenantId: string
  professionalId: string
  serviceId: string
  clientId: string
  startsAt: string
  endsAt: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  notes: string | null
  createdAt: string
}

export type WeeklyAvailability = {
  id: string
  professionalId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  slotDurationMinutes: number
}

export type ScheduleException = {
  id: string
  professionalId: string
  date: string
  type: 'block' | 'extra'
  startTime: string
  endTime: string
  reason: string | null
}
