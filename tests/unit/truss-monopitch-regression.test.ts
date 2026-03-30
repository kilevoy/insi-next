import { calculatePurlin } from '@/domain/purlin/model/calculate-purlin'
import { calculateTruss } from '@/domain/truss/model/calculate-truss'
import { mapToPurlinInput, mapToTrussInput } from '@/pages/calculator/model/input-mapper'
import { defaultUnifiedInput } from '@/pages/calculator/model/unified-input'

describe('truss monopitch branch', () => {
  it('propagates roof type into truss input and summary payload', () => {
    const baseInput = {
      ...defaultUnifiedInput,
      roofType: 'односкатная',
      city: 'Благовещенск',
      spanM: 24,
      frameStepM: 6,
    }

    const purlinResult = calculatePurlin(mapToPurlinInput(baseInput))
    const trussInput = mapToTrussInput(baseInput, purlinResult)
    const trussResult = calculateTruss(trussInput)

    expect('roofType' in trussInput).toBe(true)
    expect((trussInput as { roofType?: string }).roofType).toBe(baseInput.roofType)
    expect((trussResult.loadSummary as { roofType?: string }).roofType).toBe(baseInput.roofType)
  })

  it.each([18, 24, 30])(
    'keeps truss selection valid for Благовещенск with monopitch roof at %im',
    (spanM) => {
      const input = {
        ...defaultUnifiedInput,
        city: 'Благовещенск',
        roofType: 'односкатная',
        spanM,
        frameStepM: 6,
      }

      const purlinResult = calculatePurlin(mapToPurlinInput(input))
      const trussResult = calculateTruss(mapToTrussInput(input, purlinResult))

      expect(trussResult.totalMassKg).not.toBeNull()
      expect(trussResult.groups.vp.status).toBe('ok')
      expect(trussResult.groups.np.status).toBe('ok')
      expect(trussResult.groups.orb.status).toBe('ok')
      expect(trussResult.groups.or.status).toBe('ok')
      expect(trussResult.groups.rr.status).toBe('ok')
    },
    15000,
  )
})
