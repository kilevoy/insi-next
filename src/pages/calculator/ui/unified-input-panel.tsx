import {
  MAX_SUPPORTED_BUILDING_HEIGHT_M,
  MAX_SUPPORTED_BUILDING_LENGTH_M,
  MAX_SUPPORTED_WIND_SPAN_M,
  MIN_SUPPORTED_BUILDING_HEIGHT_M,
} from '@/shared/config/calculation-limits'
import type { UnifiedInputState } from '../model/unified-input'
import {
  PRESENCE_OPTIONS,
  PROFILE_SHEET_OPTIONS,
  ROOF_TYPE_OPTIONS,
  SNOW_BAG_MODE_OPTIONS,
  SPAN_MODE_OPTIONS,
  SPANS_COUNT_OPTIONS,
  SUPPORT_CRANE_CAPACITY_OPTIONS,
  SUPPORT_CRANE_COUNT_OPTIONS,
  TERRAIN_OPTIONS,
  UNIFIED_CITY_OPTIONS,
  UNIFIED_COVERING_OPTIONS,
} from '../model/unified-input-options'

interface UnifiedInputPanelProps {
  input: UnifiedInputState
  onChange: <K extends keyof UnifiedInputState>(key: K, value: UnifiedInputState[K]) => void
}

function NumberField({
  label,
  value,
  onValue,
  step = '0.1',
  min,
  max,
}: {
  label: string
  value: number
  onValue: (value: number) => void
  step?: string
  min?: number
  max?: number
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        className="field-input"
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(event) => onValue(Number(event.target.value))}
      />
    </label>
  )
}

export function UnifiedInputPanel({ input, onChange }: UnifiedInputPanelProps) {
  const roofCoveringNormalized = input.roofCoveringType.toLowerCase()
  const wallCoveringNormalized = input.wallCoveringType.toLowerCase()
  const showRoofProfileSheet =
    roofCoveringNormalized.includes('профлист') ||
    roofCoveringNormalized.includes('наше') ||
    roofCoveringNormalized.includes('малоуклонная кровля')
  const showWallProfileSheet =
    wallCoveringNormalized.includes('наше') && wallCoveringNormalized.includes('гвл')

  return (
    <div className="unified-input-panel">
      <div className="panel-header">
        <h2 className="panel-title">Параметры расчета</h2>
        <p className="panel-copy">Общие данные для колонн и прогонов</p>
      </div>

      <section className="form-section">
        <h3 className="form-section-title">Район строительства</h3>

        <label className="field">
          <span className="field-label">Город</span>
          <select
            className="field-select"
            value={input.city}
            onChange={(event) => onChange('city', event.target.value)}
          >
            {UNIFIED_CITY_OPTIONS.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>

        <div className="field-row field-row--three">
          <label className="field">
            <span className="field-label">Тип местности</span>
            <select
              className="field-select"
              value={input.terrainType}
              onChange={(event) =>
                onChange('terrainType', event.target.value as UnifiedInputState['terrainType'])
              }
            >
              {TERRAIN_OPTIONS.map((terrain) => (
                <option key={terrain} value={terrain}>
                  {terrain}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Уровень ответст.</span>
            <input
              className="field-input"
              type="text"
              value={input.responsibilityLevel}
              onChange={(event) => onChange('responsibilityLevel', event.target.value)}
            />
          </label>

          <NumberField
            label="Надбавка, %"
            value={input.extraLoadPercent}
            onValue={(value) => onChange('extraLoadPercent', value)}
            min={0}
            max={100}
          />
        </div>
      </section>

      <section className="form-section">
        <h3 className="form-section-title">Параметры здания</h3>

        <div className="field-row field-row--three">
          <NumberField
            label="Ширина, м"
            value={input.spanM}
            onValue={(value) => onChange('spanM', value)}
            min={1}
            max={MAX_SUPPORTED_WIND_SPAN_M}
          />
          <NumberField
            label="Длина, м"
            value={input.buildingLengthM}
            onValue={(value) => onChange('buildingLengthM', value)}
            min={1}
            max={MAX_SUPPORTED_BUILDING_LENGTH_M}
          />
          <NumberField
            label="Высота, м"
            value={input.buildingHeightM}
            onValue={(value) => onChange('buildingHeightM', value)}
            min={MIN_SUPPORTED_BUILDING_HEIGHT_M}
            max={MAX_SUPPORTED_BUILDING_HEIGHT_M}
          />
        </div>

        <div className="field-row">
          <label className="field">
            <span className="field-label">Кол-во пролетов</span>
            <select
              className="field-select"
              value={input.spansCount}
              onChange={(event) =>
                onChange('spansCount', event.target.value as UnifiedInputState['spansCount'])
              }
            >
              <option value={SPANS_COUNT_OPTIONS[0]}>один</option>
              <option value={SPANS_COUNT_OPTIONS[1]}>несколько</option>
            </select>
          </label>

          <label className="field">
            <span className="field-label">Тип кровли</span>
            <select
              className="field-select"
              value={input.roofType}
              onChange={(event) => onChange('roofType', event.target.value as UnifiedInputState['roofType'])}
            >
              {ROOF_TYPE_OPTIONS.map((roofType) => (
                <option key={roofType} value={roofType}>
                  {roofType}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="field-row field-row--three">
          <NumberField label="Уклон кровли, °" value={input.roofSlopeDeg} onValue={(value) => onChange('roofSlopeDeg', value)} min={0} max={60} />
          <NumberField label="Шаг рам, м" value={input.frameStepM} onValue={(value) => onChange('frameStepM', value)} min={1} max={MAX_SUPPORTED_BUILDING_LENGTH_M} />
          <NumberField label="Шаг фахверка, м" value={input.fakhverkStepM} onValue={(value) => onChange('fakhverkStepM', value)} min={1} max={MAX_SUPPORTED_WIND_SPAN_M} />
        </div>

        <label className="field">
          <span className="field-label">Связи по периметру</span>
          <select
            className="field-select"
            value={input.perimeterBracing}
            onChange={(event) =>
              onChange('perimeterBracing', event.target.value as UnifiedInputState['perimeterBracing'])
            }
          >
            {PRESENCE_OPTIONS.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="form-section">
        <h3 className="form-section-title">Стены и кровля</h3>

        <label className="field">
          <span className="field-label">Покрытие кровли</span>
          <select
            className="field-select"
            value={input.roofCoveringType}
            onChange={(event) => onChange('roofCoveringType', event.target.value)}
          >
            {UNIFIED_COVERING_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Ограждение стен</span>
          <select
            className="field-select"
            value={input.wallCoveringType}
            onChange={(event) => onChange('wallCoveringType', event.target.value)}
          >
            {UNIFIED_COVERING_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        {(showRoofProfileSheet || showWallProfileSheet) && (
          <div className="field-row">
            {showRoofProfileSheet && (
              <label className="field">
                <span className="field-label">Профлист кровли</span>
                <select
                  className="field-select"
                  value={input.profileSheet}
                  onChange={(event) => onChange('profileSheet', event.target.value)}
                >
                  {PROFILE_SHEET_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {showWallProfileSheet && (
              <label className="field">
                <span className="field-label">Профлист стен</span>
                <select
                  className="field-select"
                  value={input.wallProfileSheet}
                  onChange={(event) => onChange('wallProfileSheet', event.target.value)}
                >
                  {PROFILE_SHEET_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}
      </section>

      <section className="form-section">
        <h3 className="form-section-title">Кровля и прогоны</h3>

        <div className="field-row">
          <label className="field">
            <span className="field-label">Снеговой мешок</span>
            <select
              className="field-select"
              value={input.snowBagMode}
              onChange={(event) =>
                onChange('snowBagMode', event.target.value as UnifiedInputState['snowBagMode'])
              }
            >
              {SNOW_BAG_MODE_OPTIONS.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>
        </div>

        {input.snowBagMode !== 'нет' && (
          <div className="field-row animate-in">
            <NumberField label="Перепад, м" value={input.heightDifferenceM} onValue={(value) => onChange('heightDifferenceM', value)} min={0} />
            <NumberField
              label="Размер соседнего здания, м"
              value={input.adjacentBuildingSizeM}
              onValue={(value) => onChange('adjacentBuildingSizeM', value)}
              min={0}
            />
          </div>
        )}

        <div className="field-row">
          <label className="field">
            <span className="field-label">Снегозадержатель</span>
            <select
              className="field-select"
              value={input.snowRetentionPurlin}
              onChange={(event) =>
                onChange(
                  'snowRetentionPurlin',
                  event.target.value as UnifiedInputState['snowRetentionPurlin'],
                )
              }
            >
              {PRESENCE_OPTIONS.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Ограждение кровли</span>
            <select
              className="field-select"
              value={input.barrierPurlin}
              onChange={(event) =>
                onChange('barrierPurlin', event.target.value as UnifiedInputState['barrierPurlin'])
              }
            >
              {PRESENCE_OPTIONS.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="field-row">
          <NumberField label="Мин. шаг, мм" value={input.manualMinStepMm} onValue={(value) => onChange('manualMinStepMm', value)} step="1" min={0} />
          <NumberField label="Макс. шаг, мм" value={input.manualMaxStepMm} onValue={(value) => onChange('manualMaxStepMm', value)} step="1" min={0} />
          <NumberField label="Шаг распорок" value={input.braceSpacingM} onValue={(value) => onChange('braceSpacingM', value)} step="0.1" min={0.1} />
        </div>
        <div className="field-row">
          <NumberField
            label="Макс. к-т исп."
            value={input.maxUtilizationRatio}
            onValue={(value) => onChange('maxUtilizationRatio', value)}
            step="0.01"
            min={0.01}
            max={1}
          />
        </div>
      </section>

      <section className="form-section">
        <h3 className="form-section-title">Крановое оборудование</h3>

        <div className="field-row">
          <label className="field">
            <span className="field-label">Опорный кран</span>
            <select
              className="field-select"
              value={input.supportCraneMode}
              onChange={(event) =>
                onChange('supportCraneMode', event.target.value as UnifiedInputState['supportCraneMode'])
              }
            >
              {PRESENCE_OPTIONS.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Подвесной кран</span>
            <select
              className="field-select"
              value={input.hangingCraneMode}
              onChange={(event) =>
                onChange('hangingCraneMode', event.target.value as UnifiedInputState['hangingCraneMode'])
              }
            >
              {PRESENCE_OPTIONS.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>
        </div>

        {input.supportCraneMode === 'есть' && (
          <div className="field-row animate-in">
            <label className="field">
              <span className="field-label">Г/п, т</span>
              <select
                className="field-select"
                value={input.supportCraneCapacity}
                onChange={(event) => onChange('supportCraneCapacity', event.target.value)}
              >
                {SUPPORT_CRANE_CAPACITY_OPTIONS.map((capacity) => (
                  <option key={capacity} value={capacity}>
                    {capacity}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Количество кранов</span>
              <select
                className="field-select"
                value={input.supportCraneCount}
                onChange={(event) =>
                  onChange('supportCraneCount', event.target.value as UnifiedInputState['supportCraneCount'])
                }
              >
                {SUPPORT_CRANE_COUNT_OPTIONS.map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {input.supportCraneMode === 'есть' && (
          <div className="field-row animate-in">
            <label className="field">
              <span className="field-label">Однопролетный режим</span>
              <select
                className="field-select"
                value={input.supportCraneSingleSpanMode}
                onChange={(event) =>
                  onChange(
                    'supportCraneSingleSpanMode',
                    event.target.value as UnifiedInputState['supportCraneSingleSpanMode'],
                  )
                }
              >
                {SPAN_MODE_OPTIONS.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </label>
            <NumberField
              label="Уровень рельса, м"
              value={input.supportCraneRailLevelM}
              onValue={(value) => onChange('supportCraneRailLevelM', value)}
              min={0}
            />
          </div>
        )}

        {input.hangingCraneMode === 'есть' && (
          <div className="field-row animate-in">
            <label className="field">
              <span className="field-label">Однопролетный режим</span>
              <select
                className="field-select"
                value={input.hangingCraneSingleSpanMode}
                onChange={(event) =>
                  onChange(
                    'hangingCraneSingleSpanMode',
                    event.target.value as UnifiedInputState['hangingCraneSingleSpanMode'],
                  )
                }
              >
                {SPAN_MODE_OPTIONS.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </label>
            <NumberField
              label="Г/п подвесного, т"
              value={input.hangingCraneCapacityT}
              onValue={(value) => onChange('hangingCraneCapacityT', value)}
              min={0}
            />
          </div>
        )}
      </section>

      <section className="form-section">
        <h3 className="form-section-title">Экономика (руб/кг)</h3>
        <div className="field-row">
          <NumberField
            label="Двутавр С255"
            value={input.iBeamS255PriceRubPerKg}
            onValue={(value) => onChange('iBeamS255PriceRubPerKg', value)}
            step="0.01"
            min={0.01}
          />
          <NumberField
            label="Двутавр С355"
            value={input.iBeamS355PriceRubPerKg}
            onValue={(value) => onChange('iBeamS355PriceRubPerKg', value)}
            step="0.01"
            min={0.01}
          />
        </div>

        <div className="field-row">
          <NumberField
            label="Труба С245"
            value={input.tubeS245PriceRubPerKg}
            onValue={(value) => onChange('tubeS245PriceRubPerKg', value)}
            step="0.01"
            min={0.01}
          />
          <NumberField
            label="Труба С345"
            value={input.tubeS345PriceRubPerKg}
            onValue={(value) => onChange('tubeS345PriceRubPerKg', value)}
            step="0.01"
            min={0.01}
          />
        </div>

        <div className="field-row">
          <NumberField
            label="Цена ЛСТК МП350"
            value={input.lstkMp350PriceRubPerKg}
            onValue={(value) => onChange('lstkMp350PriceRubPerKg', value)}
            step="0.01"
            min={0.01}
          />
          <NumberField
            label="Цена ЛСТК МП390"
            value={input.lstkMp390PriceRubPerKg}
            onValue={(value) => onChange('lstkMp390PriceRubPerKg', value)}
            step="0.01"
            min={0.01}
          />
        </div>
      </section>
    </div>
  )
}
