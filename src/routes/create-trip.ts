import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import dayjs from "dayjs"
import { z } from 'zod'
import { db } from "../db/connection";
import { getMailClient } from "../lib/mail";
import nodemailer from 'nodemailer'

export async function createTrip(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>()
    .post('/trips', {
      schema: {
        body: z.object({
          destination: z.string().min(4),
          startsAt: z.coerce.date(),
          endsAt: z.coerce.date(),
          ownerName: z.string(),
          ownerEmail: z.string().email()
        })
      }
    }, async (request, reply) => {
      const { destination, endsAt, startsAt, ownerEmail, ownerName } = request.body

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
        }
      })

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
        subject: 'E-mail de confirmação do agendamento',
        html: '<p>Teste do envio de e-mail</p>'
      })

      console.log(nodemailer.getTestMessageUrl(message))

      return reply.status(201).send({ tripId: trip.id })
    })
}