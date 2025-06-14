import { z } from "zod"

export const getEntitiesByIdParams = {
  ids: z.array(z.string()),
}

export const getEntitiesByIdParamType = z.object(getEntitiesByIdParams)
