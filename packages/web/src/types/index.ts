export type User = {
  id: string
  email: string
  name: string
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
  lastLoginAt: string | null
  createdAt: string
}

export type ProfessionalPage = {
  data: Professional[]
  total: number
  page: number
  limit: number
}

export type Client = {
  id: string
  name: string
  email: string
  phone: string | null
  lastLoginAt: string | null
  createdAt: string
  profileId: string | null
  birthDate: string | null
  notes: string | null
  active: boolean | null
  avatarUrl: string | null
  allProfessionals: boolean | null
  allServices: boolean | null
  serviceLimitCount: number | null
  serviceLimitPeriod: 'day' | 'week' | 'month' | null
}

export type ClientPage = {
  data: Client[]
  total: number
  page: number
  limit: number
}

export type ClientDetail = Client & {
  linkedProfessionals: { professionalId: string; name: string; position: string | null }[]
  linkedServices: { serviceId: string; name: string }[]
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
  professionalId: string
  serviceId: string
  clientId: string
  startsAt: string
  endsAt: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  createdAt: string
  clientName: string
  serviceName: string
  professionalName: string
}

export type AppointmentPage = {
  data: Appointment[]
  total: number
  page: number
  limit: number
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
