import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'

import {
  windowRigelCandidateCatalog,
  windowRigelNuGrid,
  windowRigelNuXValues,
  windowRigelNuYValues,
  windowRigelPressureCoefficients,
  windowRigelTerrainHeightTable,
  windowRigelWindowConstructionLoads,
  windowRigelWindowTypeFactors,
} from '../../src/domain/window-rigel/model/window-rigel-reference.generated'

interface CandidateSample {
  row: number
  ordinal: number
  excluded: boolean
  steelGrade: string
  strengthResistanceMpa: number
  profile: string
  areaCm2: number
  unitMassKgPerM: number
  momentOfInertiaXCm4: number
  sectionModulusXCm3: number
  radiusXcm: number
  momentOfInertiaYCm4: number
  sectionModulusYCm3: number
  radiusYcm: number
}

interface WorkbookSmokeSample {
  candidateRowCount: number
  candidateSamples: CandidateSample[]
  windowTypeFactors: Array<{
    windowType: number
    momentFactor: number
    lengthFactor: number
    deflectionFactor: number
  }>
  constructionLoads: Array<{
    name: string
    loadKpa: number
  }>
  pressureCoefficients: {
    negativeEdge: number
    negativeMiddle: number
    positive: number
    gustFactor: number
  }
  terrainHeightSamples: Array<{
    heightM: number
    kByTerrain: Record<'А' | 'В' | 'С', number>
    zetaByTerrain: Record<'А' | 'В' | 'С', number>
  }>
  nuX: number[]
  nuY: number[]
  nuGrid: {
    topLeft: number
    center: number
    bottomRight: number
  }
}

function findWorkbookPath(): string | null {
  const candidates = [
    process.env.WINDOW_RIGEL_REFERENCE_WORKBOOK,
    'C:\\Users\\RAN\\Downloads\\Подбор оконых ригелей v2.0.xlsx',
  ]

  return candidates.find((candidate) => candidate && existsSync(candidate)) ?? null
}

function readWorkbookSmokeSample(workbookPath: string): WorkbookSmokeSample {
  const pythonScript = `
import json
from pathlib import Path
from openpyxl import load_workbook

workbook = load_workbook(Path(r"${workbookPath.replace(/\\/g, '\\\\')}"), data_only=True, read_only=False)
ws_input = workbook.worksheets[0]
ws_calc = workbook.worksheets[1]
ws_wind = workbook.worksheets[3]

candidate_samples = []
for row in [4, 105, 215, 413]:
    candidate_samples.append({
        'row': row,
        'ordinal': int(ws_calc[f'O{row}'].value),
        'excluded': ws_calc[f'N{row}'].value == '-',
        'steelGrade': str(ws_calc[f'P{row}'].value).strip(),
        'strengthResistanceMpa': float(ws_calc[f'Q{row}'].value),
        'profile': str(ws_calc[f'R{row}'].value).strip(),
        'areaCm2': float(ws_calc[f'X{row}'].value),
        'unitMassKgPerM': float(ws_calc[f'Y{row}'].value),
        'momentOfInertiaXCm4': float(ws_calc[f'Z{row}'].value),
        'sectionModulusXCm3': float(ws_calc[f'AA{row}'].value),
        'radiusXcm': float(ws_calc[f'AC{row}'].value),
        'momentOfInertiaYCm4': float(ws_calc[f'AD{row}'].value),
        'sectionModulusYCm3': float(ws_calc[f'AE{row}'].value),
        'radiusYcm': float(ws_calc[f'AF{row}'].value),
    })

terrain_height_samples = []
for row in [52, 58, 63]:
    terrain_height_samples.append({
        'heightM': int(ws_wind[f'J{row}'].value),
        'kByTerrain': {
            'А': float(ws_wind[f'K{row}'].value),
            'В': float(ws_wind[f'L{row}'].value),
            'С': float(ws_wind[f'M{row}'].value),
        },
        'zetaByTerrain': {
            'А': float(ws_wind[f'S{row}'].value),
            'В': float(ws_wind[f'T{row}'].value),
            'С': float(ws_wind[f'U{row}'].value),
        },
    })

result = {
    'candidateRowCount': 410,
    'candidateSamples': candidate_samples,
    'windowTypeFactors': [
        {
            'windowType': int(ws_input[f'I{row}'].value),
            'momentFactor': float(ws_input[f'J{row}'].value),
            'lengthFactor': float(ws_input[f'K{row}'].value),
            'deflectionFactor': float(ws_input[f'L{row}'].value),
        }
        for row in range(34, 39)
    ],
    'constructionLoads': [
        {
            'name': str(ws_input[f'P{row}'].value).strip(),
            'loadKpa': float(ws_input[f'Q{row}'].value) / 100,
        }
        for row in range(13, 16)
    ],
    'pressureCoefficients': {
        'negativeEdge': float(ws_wind['C25'].value),
        'negativeMiddle': float(ws_wind['C26'].value),
        'positive': float(ws_wind['C35'].value),
        'gustFactor': float(ws_wind['C13'].value),
    },
    'terrainHeightSamples': terrain_height_samples,
    'nuX': [float(ws_wind[f'Z{row}'].value) for row in range(68, 75)],
    'nuY': [float(ws_wind.cell(row=67, column=column).value) for column in range(27, 34)],
    'nuGrid': {
        'topLeft': float(ws_wind['AA68'].value),
        'center': float(ws_wind['AD71'].value),
        'bottomRight': float(ws_wind['AG74'].value),
    },
}

print(json.dumps(result, ensure_ascii=True))
`.trim()

  return JSON.parse(
    execFileSync('python', ['-c', pythonScript], {
      encoding: 'utf-8',
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
      },
    }),
  ) as WorkbookSmokeSample
}

const workbookPath = findWorkbookPath()
const runIfWorkbookExists = workbookPath ? it : it.skip

describe('window rigel workbook parity smoke', () => {
  runIfWorkbookExists('matches key control points from the source workbook', () => {
    const workbook = readWorkbookSmokeSample(workbookPath!)

    expect(windowRigelCandidateCatalog).toHaveLength(workbook.candidateRowCount)
    for (const sample of workbook.candidateSamples) {
      const { row, ...expected } = sample
      expect(windowRigelCandidateCatalog[row - 4]).toMatchObject(expected)
    }

    expect(windowRigelWindowTypeFactors).toEqual(workbook.windowTypeFactors)
    expect(windowRigelWindowConstructionLoads).toEqual(workbook.constructionLoads)
    expect(windowRigelPressureCoefficients).toEqual(workbook.pressureCoefficients)

    expect(windowRigelTerrainHeightTable).toHaveLength(12)
    expect(windowRigelTerrainHeightTable[0]).toEqual(workbook.terrainHeightSamples[0])
    expect(windowRigelTerrainHeightTable[6]).toEqual(workbook.terrainHeightSamples[1])
    expect(windowRigelTerrainHeightTable[windowRigelTerrainHeightTable.length - 1]).toEqual(
      workbook.terrainHeightSamples[2],
    )

    expect(windowRigelNuXValues).toEqual(workbook.nuX)
    expect(windowRigelNuYValues).toEqual(workbook.nuY)
    expect(windowRigelNuGrid[0][0]).toBeCloseTo(workbook.nuGrid.topLeft, 8)
    expect(windowRigelNuGrid[3][3]).toBeCloseTo(workbook.nuGrid.center, 8)
    expect(windowRigelNuGrid[windowRigelNuGrid.length - 1][windowRigelNuGrid[0].length - 1]).toBeCloseTo(
      workbook.nuGrid.bottomRight,
      8,
    )
  }, 30000)
})
