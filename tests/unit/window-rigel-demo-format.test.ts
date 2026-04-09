import { calculateWindowRigel } from '../../src/domain/window-rigel/model/calculate-window-rigel'
import { defaultWindowRigelInput } from '../../src/domain/window-rigel/model/window-rigel-input'
import { formatWindowRigelDemoReport } from '../../src/domain/window-rigel/model/format-window-rigel-demo'

describe('window rigel demo report', () => {
  it('renders a readable text report for the default case', () => {
    const result = calculateWindowRigel(defaultWindowRigelInput)

    const report = formatWindowRigelDemoReport(result)

    expect(report).toContain('Оконные ригели')
    expect(report).toContain('Новый уренгой')
    expect(report).toContain('Нагрузки')
    expect(report).toContain('Нижний ригель')
    expect(report).toContain('Верхний ригель')
    expect(report).toContain('кв.120х3')
    expect(report).toContain('кв.100х3')
  })
})
