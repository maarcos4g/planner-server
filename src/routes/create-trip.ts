import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import dayjs from "dayjs"
import localizedFormat from 'dayjs/plugin/localizedFormat'
import 'dayjs/locale/pt-br'
import { z } from 'zod'
import { db } from "../db/connection";
import { getMailClient } from "../lib/mail";
import nodemailer from 'nodemailer'

dayjs.locale('pt-br')
dayjs.extend(localizedFormat)

export async function createTrip(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>()
    .post('/trips', {
      schema: {
        body: z.object({
          destination: z.string().min(4),
          startsAt: z.coerce.date(),
          endsAt: z.coerce.date(),
          ownerName: z.string(),
          ownerEmail: z.string().email(),
          emailsToInvite: z.array(z.string().email())
        })
      }
    }, async (request, reply) => {
      const { destination, endsAt, startsAt, ownerEmail, ownerName, emailsToInvite } = request.body

      if (dayjs(startsAt).isBefore(new Date())) {
        throw new Error('Invalid trip start date.')
      }

      if (dayjs(endsAt).isBefore(startsAt)) {
        throw new Error('Invalid trip end date')
      }

      const trip = await db.trip.create({
        data: {
          destination,
          endsAt,
          startsAt,
          participants: {
            createMany: {
              data: [
                {
                  name: ownerName,
                  email: ownerEmail,
                  isOwner: true,
                  isConfirmed: true,
                },
                ...emailsToInvite.map(email => {
                  return { email }
                })
              ]
            }
          }
        },
      })

      const formattedStartDate = dayjs(trip.startsAt).format('LL')
      const formattedEndDate = dayjs(trip.endsAt).format('LL')

      const confirmationLink = `http://localhost:3333/trips/${trip.id}/confirm`

      const mail = await getMailClient()

      const message = await mail.sendMail({
        from: {
          name: 'Equipe plann.er',
          address: 'automatic@planner.com'
        },
        to: {
          name: ownerName,
          address: ownerEmail,
        },
        subject: `Confirme sua viagem para ${destination} em ${formattedStartDate}`,
        html: `
        <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6;">
          <p>Você solicitou a criação de uma viagem para <strong>${destination}</strong> nas datas de <strong>${formattedStartDate}</strong> até <strong>${formattedEndDate}</strong>.</p>
          <p></p>
          <p>Para confirmar sua viagem, clique no link abaixo:</p>
          <p></p>
          <p>
            <a href="${confirmationLink}">Confirmar viagem</a>
          </p>
          <p></p>
          <p>Caso você não saiba do que se trata esse e-mail, apenas ignore.</p>
        </div>
        `.trim()
      })

      console.log(nodemailer.getTestMessageUrl(message))

      return reply.status(201).send({ tripId: trip.id })
    })
}