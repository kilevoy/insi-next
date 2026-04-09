import { calculateWindowRigel } from '../../src/domain/window-rigel/model/calculate-window-rigel'
import { defaultWindowRigelInput } from '../../src/domain/window-rigel/model/window-rigel-input'

describe('window rigel public API', () => {
  it('returns a populated result for valid input', () => {
    const result = calculateWindowRigel(defaultWindowRigelInput)

    expect(result.input.city).toBe('Новый уренгой')
    expect(result.loads.windLoadKpa).toBeGreaterThan(0)
    expect(result.bottomCandidates.length).toBeGreaterThan(0)
    expect(result.topCandidates.length).toBeGreaterThan(0)
  })

  it('throws a clear error for unsupported cities', () => {
    expect(() =>
      calculateWindowRigel({
        ...defaultWindowRigelInput,
        city: 'Несуществующий город',
      }),
    ).toThrow(/city/i)
  })
})
