import { z } from 'zod'
import { purlinCityLoads } from '@/domain/purlin/model/purlin-reference.generated'

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/ё/g, 'е')
}

const availableCities = new Set(purlinCityLoads.map((item) => normalizeText(item.city)))

export const windowRigelInputSchema = z.object({
  city: z
    .string()
    .min(1)
    .refine((value) => availableCities.has(normalizeText(value)), 'Unknown window rigel city'),
  responsibilityLevel: z.number().positive(),
  windowHeightM: z.number().positive(),
  frameStepM: z.number().positive(),
  windowType: z.number().int().min(1).max(5),
  buildingHeightM: z.number().positive(),
  buildingSpanM: z.number().positive(),
  buildingLengthM: z.number().positive(),
  terrainType: z.enum(['А', 'В', 'С']),
  windowConstruction: z.string().min(1),
  maxUtilization: z.number().positive(),
})

export type WindowRigelInput = z.infer<typeof windowRigelInputSchema>

export const defaultWindowRigelInput: WindowRigelInput = {
  city: 'Новый уренгой',
  responsibilityLevel: 1,
  windowHeightM: 1,
  frameStepM: 6,
  windowType: 1,
  buildingHeightM: 6,
  buildingSpanM: 18,
  buildingLengthM: 42,
  terrainType: 'А',
  windowConstruction: '2ой стеклопакет',
  maxUtilization: 0.85,
}

export function normalizeWindowRigelCity(value: string): string {
  return normalizeText(value)
}
