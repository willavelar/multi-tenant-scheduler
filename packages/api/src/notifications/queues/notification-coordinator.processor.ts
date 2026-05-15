import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { and, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { appointments, professionals, services, users } from '@scheduler/shared';
import { DB, DrizzleDB } from '../../database/database.module';
import { withTenant } from '../../database/with-tenant';
import { EmailQueueProducer } from '../../email-queue/email-queue.producer';
import { NOTIFICATION_COORDINATOR_QUEUE, CoordinateNotificationJobData } from './notification-coordinator.producer';
import { SystemNotificationProducer } from './system-notification.producer';
import { WhatsAppProducer } from './whatsapp.producer';

const STATUS_LABELS: Record<string, string> = {
  confirmed:                 'confirmado',
  cancelled_by_client:       'cancelado pelo cliente',
  cancelled_by_professional: 'cancelado pelo profissional',
  completed:                 'concluído',
  pending:                   'pendente',
};

function formatDate(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  return `${d}/${m} às ${h}:${min}`;
}

function buildMessage(
  event: 'appointment_created' | 'appointment_status_changed',
  appt: { clientName: string; professionalName: string; serviceName: string; startsAt: Date },
  isForProfessional: boolean,
  newStatus?: string,
): { title: string; body: string } {
  const dateStr = formatDate(appt.startsAt);
  if (event === 'appointment_created') {
    if (isForProfessional) {
      return {
        title: 'Novo agendamento',
        body:  `${appt.clientName} criou um agendamento de ${appt.serviceName} para ${dateStr}`,
      };
    }
    return {
      title: 'Agendamento criado',
      body:  `Seu agendamento de ${appt.serviceName} com ${appt.professionalName} foi agendado para ${dateStr}`,
    };
  }
  const statusLabel = STATUS_LABELS[newStatus ?? ''] ?? newStatus ?? 'atualizado';
  return {
    title: 'Agendamento atualizado',
    body:  `O status do agendamento de ${appt.serviceName} foi ${statusLabel}`,
  };
}

@Processor(NOTIFICATION_COORDINATOR_QUEUE)
export class NotificationCoordinatorProcessor extends WorkerHost {
  constructor(
    @Inject(DB) private readonly db: DrizzleDB,
    private readonly systemProducer: SystemNotificationProducer,
    private readonly emailProducer:  EmailQueueProducer,
    private readonly whatsAppProducer: WhatsAppProducer,
  ) {
    super();
  }

  async process(job: Job<CoordinateNotificationJobData>): Promise<void> {
    const { appointmentId, tenantId, actorRole, event, newStatus } = job.data;

    const profUsers = alias(users, 'prof_users');

    const apptData = await withTenant(this.db, tenantId, async (tx) => {
      const [row] = await tx
        .select({
          clientId:                      appointments.clientId,
          clientName:                    users.name,
          clientEmail:                   users.email,
          clientPhone:                   users.phone,
          clientNotifyViaSystem:         users.notifyViaSystem,
          clientNotifyViaEmail:          users.notifyViaEmail,
          clientNotifyViaWhatsapp:       users.notifyViaWhatsapp,
          professionalUserId:            profUsers.id,
          professionalName:              profUsers.name,
          professionalEmail:             profUsers.email,
          professionalPhone:             profUsers.phone,
          professionalNotifyViaSystem:   profUsers.notifyViaSystem,
          professionalNotifyViaEmail:    profUsers.notifyViaEmail,
          professionalNotifyViaWhatsapp: profUsers.notifyViaWhatsapp,
          serviceName:                   services.name,
          startsAt:                      appointments.startsAt,
        })
        .from(appointments)
        .innerJoin(users,         eq(appointments.clientId,        users.id))
        .innerJoin(services,      eq(appointments.serviceId,       services.id))
        .innerJoin(professionals, eq(appointments.professionalId,  professionals.id))
        .innerJoin(profUsers,     eq(professionals.userId,         profUsers.id))
        .where(and(
          eq(appointments.id,       appointmentId),
          eq(appointments.tenantId, tenantId),
        ));
      return row ?? null;
    });

    if (!apptData) return;

    type Recipient = {
      userId:              string;
      email:               string;
      phone:               string | null;
      notifyViaSystem:     boolean;
      notifyViaEmail:      boolean;
      notifyViaWhatsapp:   boolean;
      isForProfessional:   boolean;
    };

    const recipients: Recipient[] = [];

    if (actorRole === 'client') {
      recipients.push({
        userId:            apptData.professionalUserId,
        email:             apptData.professionalEmail,
        phone:             apptData.professionalPhone,
        notifyViaSystem:   apptData.professionalNotifyViaSystem,
        notifyViaEmail:    apptData.professionalNotifyViaEmail,
        notifyViaWhatsapp: apptData.professionalNotifyViaWhatsapp,
        isForProfessional: true,
      });
    } else if (actorRole === 'professional') {
      recipients.push({
        userId:            apptData.clientId,
        email:             apptData.clientEmail,
        phone:             apptData.clientPhone,
        notifyViaSystem:   apptData.clientNotifyViaSystem,
        notifyViaEmail:    apptData.clientNotifyViaEmail,
        notifyViaWhatsapp: apptData.clientNotifyViaWhatsapp,
        isForProfessional: false,
      });
    } else {
      recipients.push(
        {
          userId:            apptData.clientId,
          email:             apptData.clientEmail,
          phone:             apptData.clientPhone,
          notifyViaSystem:   apptData.clientNotifyViaSystem,
          notifyViaEmail:    apptData.clientNotifyViaEmail,
          notifyViaWhatsapp: apptData.clientNotifyViaWhatsapp,
          isForProfessional: false,
        },
        {
          userId:            apptData.professionalUserId,
          email:             apptData.professionalEmail,
          phone:             apptData.professionalPhone,
          notifyViaSystem:   apptData.professionalNotifyViaSystem,
          notifyViaEmail:    apptData.professionalNotifyViaEmail,
          notifyViaWhatsapp: apptData.professionalNotifyViaWhatsapp,
          isForProfessional: true,
        },
      );
    }

    for (const recipient of recipients) {
      const { title, body } = buildMessage(event, apptData, recipient.isForProfessional, newStatus);

      if (recipient.notifyViaSystem) {
        await this.systemProducer.add({
          tenantId,
          userId:      recipient.userId,
          type:        event,
          referenceId: appointmentId,
          title,
          body,
        });
      }

      if (recipient.notifyViaEmail) {
        await this.emailProducer.addAppointmentNotificationJob({ to: recipient.email, title, body });
      }

      if (recipient.notifyViaWhatsapp && recipient.phone) {
        await this.whatsAppProducer.add({ to: recipient.phone, body });
      }
    }
  }
}
