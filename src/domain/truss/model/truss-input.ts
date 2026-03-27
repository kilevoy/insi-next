import { z } from 'zod'

function isPositiveNumericString(value: string): boolean {
  const normalized = Number(value.trim().replace(',', '.'))
  return Number.isFinite(normalized) && normalized > 0
}

export const trussInputSchema = z.object({
  spanM: z.number().min(18).max(30),
  frameStepM: z.number().positive(),
  roofSlopeDeg: z.number().nonnegative().max(89),
  responsibilityLevel: z
    .string()
    .min(1)
    .refine(isPositiveNumericString, 'Responsibility level must be a positive number'),
  designSnowKpa: z.number().nonnegative(),
  windRoofKpa: z.number().nonnegative(),
  coveringKpa: z.number().nonnegative(),
  purlinBracingStepMm: z.number().nonnegative().default(0),
})

export type TrussInput = z.infer<typeof trussInputSchema>

export const defaultTrussInput: TrussInput = {
  spanM: 24,
  frameStepM: 6,
  roofSlopeDeg: 6,
  responsibilityLevel: '1',
  designSnowKpa: 2.076800402783843,
  windRoofKpa: 0.106912366848,
  coveringKpa: 0.24,
  purlinBracingStepMm: 0,
}
