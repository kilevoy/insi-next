import { calculateWindowRigel } from '@/domain/window-rigel/model/calculate-window-rigel'
import { formatWindowRigelDemoReport } from '@/domain/window-rigel/model/format-window-rigel-demo'
import { defaultWindowRigelInput } from '@/domain/window-rigel/model/window-rigel-input'

const result = calculateWindowRigel(defaultWindowRigelInput)

console.log(formatWindowRigelDemoReport(result))
