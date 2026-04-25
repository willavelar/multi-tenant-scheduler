export type User = {
  id: string
  email: string
  name: string
  role: 'tenant_admin' | 'professional' | 'client'
  tenantId: string | null
  avatarUrl?: string | null
}

export type Professional = {
  id: string
  tenantId: string
  userId: string
  bio: string | null
  avatarUrl: string | null
  position: string | null
  timezone: string
  timeFormat: '12h' | '24h'
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
  active: boolean
  avatarUrl: string | null
  timezone: string
  timeFormat: '12h' | '24h'
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
  clientAvatarUrl: string | null
  serviceName: string
  professionalName: string
  professionalAvatarUrl: string | null
}

export type AppointmentPage = {
  data: Appointment[]
  total: number
  page: number
  limit: number
}

export type Admin = {
  id: string
  name: string
  email: string
  phone: string | null
  avatarUrl: string | null
  active: boolean
  timezone: string
  timeFormat: '12h' | '24h'
  lastLoginAt: string | null
  createdAt: string
}

export type AdminPage = {
  data: Admin[]
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
