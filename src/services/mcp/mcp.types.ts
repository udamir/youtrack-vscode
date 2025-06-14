import type { z } from "zod"
import type { getEntitiesByIdParamType } from "./mcp.models"

export type GetEntitiesByIdParams = z.infer<typeof getEntitiesByIdParamType>
