import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from 'zod'

export async function createTrip(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>()
    .get('/trips/:tripId/confirm', {
      schema: {
        params: z.object({
          tripId: z.string().uuid(),
        })
      }
    }, async (request, reply) => {
      return { tripId: request.params.tripId }
    })
}