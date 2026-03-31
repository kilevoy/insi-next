import { useEffect, useState } from 'react'
import {
  MAX_SUPPORTED_BUILDING_HEIGHT_M,
  MAX_SUPPORTED_BUILDING_LENGTH_M,
  MAX_SUPPORTED_WIND_SPAN_M,
  MIN_SUPPORTED_BUILDING_HEIGHT_M,
} from '@/shared/config/calculation-limits'
import { deriveHeights } from '../model/height-derivations'
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

function parseLocalizedDecimal(value: string): number | null {
  const normalized = value.replaceAll(/\s+/g, '').replace(',', '.').trim()

  if (normalized === '') {
    return null
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
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

function TrussSettingRow({
  code,
  label,
  value,
  onValue,
  step = '1',
  min = 0,
}: {
  code: string
  label: string
  value: number
  onValue: (value: number) => void
  step?: string
  min?: number
}) {
  return (
    <div className="truss-settings-row">
      <span className="truss-settings-code">{code}</span>
      <input
        className="truss-settings-input"
        type="number"
        value={value}
        step={step}
        min={min}
        aria-label={label}
        onChange={(event) => onValue(Number(event.target.value))}
      />
    </div>
  )
}

export function UnifiedInputPanel({ input, onChange }: UnifiedInputPanelProps) {
  const derivedHeights = deriveHeights(input)
  const usesManualTrussEaveDepth = input.manualTrussEaveDepthM !== null
  const [manualTrussEaveDepthDraft, setManualTrussEaveDepthDraft] = useState('')
  const [isManualTrussEaveDepthFocused, setIsManualTrussEaveDepthFocused] = useState(false)
  const clearHeightLabel = '\u0412\u044B\u0441\u043E\u0442\u0430 \u0434\u043E \u043D\u0438\u0437\u0430 \u043D\u0435\u0441\u0443\u0449\u0438\u0445, \u043C'
  const trussEaveDepthLabel = '\u0412\u044B\u0441\u043E\u0442\u0430 \u0444\u0435\u0440\u043C\u044B \u0432 \u043A\u0430\u0440\u043D\u0438\u0437\u0435, \u043C'
  const useManualLabel = '\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u0440\u0443\u0447\u043D\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435'
  const manualPriorityHint =
    '\u0420\u0443\u0447\u043D\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0438\u043C\u0435\u0435\u0442 \u043F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442 \u043D\u0430\u0434 \u0442\u0430\u0431\u043B\u0438\u0447\u043D\u044B\u043C.'
  const resetToStandardLabel = '\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u043A \u0441\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u043E\u043C\u0443'
  const panelTitleLabel = '\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B \u0440\u0430\u0441\u0447\u0435\u0442\u0430'
  const panelCopyLabel = '\u041E\u0431\u0449\u0438\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0434\u043B\u044F \u043A\u043E\u043B\u043E\u043D\u043D \u0438 \u043F\u0440\u043E\u0433\u043E\u043D\u043E\u0432'
  const constructionAreaLabel = '\u0420\u0430\u0439\u043E\u043D \u0441\u0442\u0440\u043E\u0438\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u0430'
  const cityLabel = '\u0413\u043E\u0440\u043E\u0434'

  useEffect(() => {
    if (isManualTrussEaveDepthFocused) {
      return
    }

    setManualTrussEaveDepthDraft(
      input.manualTrussEaveDepthM === null ? '' : String(input.manualTrussEaveDepthM).replace('.', ','),
    )
  }, [input.manualTrussEaveDepthM, isManualTrussEaveDepthFocused])

  const roofCoveringNormalized = input.roofCoveringType.toLowerCase()
  const wallCoveringNormalized = input.wallCoveringType.toLowerCase()
  const showRoofProfileSheet =
    roofCoveringNormalized.includes('РїСЂРѕС„Р»РёСЃС‚') ||
    roofCoveringNormalized.includes('РЅР°С€Рµ') ||
    roofCoveringNormalized.includes('РјР°Р»РѕСѓРєР»РѕРЅРЅР°СЏ РєСЂРѕРІР»СЏ')
  const showWallProfileSheet =
    wallCoveringNormalized.includes('РЅР°С€Рµ') && wallCoveringNormalized.includes('РіРІР»')

  return (
    <div className="unified-input-panel">
      <div className="panel-header">
        <h2 className="panel-title">{panelTitleLabel}</h2>
        <p className="panel-copy">{panelCopyLabel}</p>
      </div>

      <section className="form-section">
        <h3 className="form-section-title">{constructionAreaLabel}</h3>

        <label className="field">
          <span className="field-label">{cityLabel}</span>
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
            <span className="field-label">РўРёРї РјРµСЃС‚РЅРѕСЃС‚Рё</span>
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
            <span className="field-label">РЈСЂРѕРІРµРЅСЊ РѕС‚РІРµС‚СЃС‚.</span>
            <input
              className="field-input"
              type="text"
              value={input.responsibilityLevel}
              onChange={(event) => onChange('responsibilityLevel', event.target.value)}
            />
          </label>

          <NumberField
            label="РќР°РґР±Р°РІРєР°, %"
            value={input.extraLoadPercent}
            onValue={(value) => onChange('extraLoadPercent', value)}
            min={0}
            max={100}
          />
        </div>
      </section>

      <section className="form-section">
        <h3 className="form-section-title">РџР°СЂР°РјРµС‚СЂС‹ Р·РґР°РЅРёСЏ</h3>

        <div className="field-row field-row--three">
          <NumberField
            label="РЁРёСЂРёРЅР°, Рј"
            value={input.spanM}
            onValue={(value) => onChange('spanM', value)}
            min={1}
            max={MAX_SUPPORTED_WIND_SPAN_M}
          />
          <NumberField
            label="Р”Р»РёРЅР°, Рј"
            value={input.buildingLengthM}
            onValue={(value) => onChange('buildingLengthM', value)}
            min={1}
            max={MAX_SUPPORTED_BUILDING_LENGTH_M}
          />
          <NumberField
            label={clearHeightLabel}
            value={input.clearHeightToBottomChordM}
            onValue={(value) => onChange('clearHeightToBottomChordM', value)}
            min={MIN_SUPPORTED_BUILDING_HEIGHT_M}
            max={MAX_SUPPORTED_BUILDING_HEIGHT_M}
          />
        </div>

        <div className="field">
          <span className="field-label">{trussEaveDepthLabel}</span>
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                aria-label={useManualLabel}
                checked={usesManualTrussEaveDepth}
                onChange={(event) =>
                  onChange(
                    'manualTrussEaveDepthM',
                    event.target.checked ? derivedHeights.eaveTrussDepthM : null,
                  )
                }
              />
              <span className="field-label" style={{ margin: 0 }}>
                {useManualLabel}
              </span>
            </label>

            {usesManualTrussEaveDepth ? (
              <>
                <input
                  className="field-input"
                  type="text"
                  inputMode="decimal"
                  aria-label={trussEaveDepthLabel}
                  value={manualTrussEaveDepthDraft}
                  onFocus={() => setIsManualTrussEaveDepthFocused(true)}
                  onChange={(event) => {
                    const nextDraft = event.target.value
                    setManualTrussEaveDepthDraft(nextDraft)

                    const parsed = parseLocalizedDecimal(nextDraft)
                    if (parsed !== null) {
                      onChange('manualTrussEaveDepthM', parsed)
                    }
                  }}
                  onBlur={() => {
                    setIsManualTrussEaveDepthFocused(false)
                    const parsed = parseLocalizedDecimal(manualTrussEaveDepthDraft)

                    if (parsed === null) {
                      setManualTrussEaveDepthDraft(
                        String(input.manualTrussEaveDepthM ?? derivedHeights.eaveTrussDepthM).replace('.', ','),
                      )
                    }
                  }}
                />
                <small style={{ color: 'rgba(15, 23, 42, 0.72)' }}>
                  {manualPriorityHint}
                </small>
                <button
                  type="button"
                  className="results-print-action"
                  onClick={() => onChange('manualTrussEaveDepthM', null)}
                >
                  {resetToStandardLabel}
                </button>
              </>
            ) : (
              <>
                <input
                  className="field-input"
                  type="text"
                  aria-label={trussEaveDepthLabel}
                  value={derivedHeights.eaveTrussDepthM.toFixed(2)}
                  readOnly
                />
                <small style={{ color: 'rgba(15, 23, 42, 0.72)' }}>
                  {derivedHeights.eaveTrussDepthSource === 'standard-table'
                    ? `Стандартное значение по таблице для пролёта ${input.spanM} м: ${derivedHeights.eaveTrussDepthM.toFixed(2)} м`
                    : `РќРµС‚ СЃС‚Р°РЅРґР°СЂС‚РЅРѕРіРѕ С‚Р°Р±Р»РёС‡РЅРѕРіРѕ Р·РЅР°С‡РµРЅРёСЏ РґР»СЏ РїСЂРѕР»С‘С‚Р° ${input.spanM} Рј, РёСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ fallback ${derivedHeights.eaveTrussDepthM.toFixed(2)} Рј`}
                </small>
              </>
            )}
          </div>
        </div>

        <div className="field-row">
          <label className="field">
            <span className="field-label">РљРѕР»-РІРѕ РїСЂРѕР»РµС‚РѕРІ</span>
            <select
              className="field-select"
              value={input.spansCount}
              onChange={(event) =>
                onChange('spansCount', event.target.value as UnifiedInputState['spansCount'])
              }
            >
              <option value={SPANS_COUNT_OPTIONS[0]}>РѕРґРёРЅ</option>
              <option value={SPANS_COUNT_OPTIONS[1]}>РЅРµСЃРєРѕР»СЊРєРѕ</option>
            </select>
          </label>

          <label className="field">
            <span className="field-label">РўРёРї РєСЂРѕРІР»Рё</span>
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
          <NumberField label="РЈРєР»РѕРЅ РєСЂРѕРІР»Рё, В°" value={input.roofSlopeDeg} onValue={(value) => onChange('roofSlopeDeg', value)} min={0} max={60} />
          <NumberField label="РЁР°Рі СЂР°Рј, Рј" value={input.frameStepM} onValue={(value) => onChange('frameStepM', value)} min={1} max={MAX_SUPPORTED_BUILDING_LENGTH_M} />
          <NumberField label="РЁР°Рі С„Р°С…РІРµСЂРєР°, Рј" value={input.fakhverkStepM} onValue={(value) => onChange('fakhverkStepM', value)} min={1} max={MAX_SUPPORTED_WIND_SPAN_M} />
        </div>

        <label className="field">
          <span className="field-label">РЎРІСЏР·Рё РїРѕ РїРµСЂРёРјРµС‚СЂСѓ</span>
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
        <h3 className="form-section-title">РЎС‚РµРЅС‹ Рё РєСЂРѕРІР»СЏ</h3>

        <label className="field">
          <span className="field-label">РџРѕРєСЂС‹С‚РёРµ РєСЂРѕРІР»Рё</span>
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
          <span className="field-label">РћРіСЂР°Р¶РґРµРЅРёРµ СЃС‚РµРЅ</span>
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
                <span className="field-label">РџСЂРѕС„Р»РёСЃС‚ РєСЂРѕРІР»Рё</span>
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
                <span className="field-label">РџСЂРѕС„Р»РёСЃС‚ СЃС‚РµРЅ</span>
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
        <h3 className="form-section-title">РљСЂРѕРІР»СЏ Рё РїСЂРѕРіРѕРЅС‹</h3>

        <div className="field-row">
          <label className="field">
            <span className="field-label">РЎРЅРµРіРѕРІРѕР№ РјРµС€РѕРє</span>
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
            <NumberField label="РџРµСЂРµРїР°Рґ, Рј" value={input.heightDifferenceM} onValue={(value) => onChange('heightDifferenceM', value)} min={0} />
            <NumberField
              label="Р Р°Р·РјРµСЂ СЃРѕСЃРµРґРЅРµРіРѕ Р·РґР°РЅРёСЏ, Рј"
              value={input.adjacentBuildingSizeM}
              onValue={(value) => onChange('adjacentBuildingSizeM', value)}
              min={0}
            />
          </div>
        )}

        <div className="field-row">
          <label className="field">
            <span className="field-label">РЎРЅРµРіРѕР·Р°РґРµСЂР¶Р°С‚РµР»СЊ</span>
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
            <span className="field-label">РћРіСЂР°Р¶РґРµРЅРёРµ РєСЂРѕРІР»Рё</span>
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
          <NumberField label="РњРёРЅ. С€Р°Рі, РјРј" value={input.manualMinStepMm} onValue={(value) => onChange('manualMinStepMm', value)} step="1" min={0} />
          <NumberField label="РњР°РєСЃ. С€Р°Рі, РјРј" value={input.manualMaxStepMm} onValue={(value) => onChange('manualMaxStepMm', value)} step="1" min={0} />
          <NumberField label="РЁР°Рі СЂР°СЃРїРѕСЂРѕРє" value={input.braceSpacingM} onValue={(value) => onChange('braceSpacingM', value)} step="0.1" min={0.1} />
        </div>
        <div className="field-row">
          <NumberField
            label="РњР°РєСЃ. Рє-С‚ РёСЃРї."
            value={input.maxUtilizationRatio}
            onValue={(value) => onChange('maxUtilizationRatio', value)}
            step="0.01"
            min={0.01}
            max={1}
          />
        </div>
      </section>

      <section className="form-section">
        <h3 className="form-section-title">РќР°СЃС‚СЂРѕР№РєР° С„РµСЂРј</h3>
        <p className="truss-settings-legend">
          РћР±РѕР·РЅР°С‡РµРЅРёСЏ: Р’Рџ вЂ” РІРµСЂС…РЅРёР№ РїРѕСЏСЃ, РќРџ вЂ” РЅРёР¶РЅРёР№ РїРѕСЏСЃ, РћР Р± вЂ” РѕРїРѕСЂРЅС‹Р№ СЂР°СЃРєРѕСЃ Р±РѕР»СЊС€РѕР№,
          РћР  вЂ” РѕРїРѕСЂРЅС‹Р№ СЂР°СЃРєРѕСЃ, Р Р  вЂ” СЂСЏРґРѕРІРѕР№ СЂР°СЃРєРѕСЃ.
        </p>

        <div className="truss-settings-grid">
          <div className="truss-settings-block">
            <p className="truss-settings-subtitle">РњРёРЅРёРјР°Р»СЊРЅР°СЏ С‚РѕР»С‰РёРЅР°</p>
            <TrussSettingRow
              code="Р’Рџ, РјРј"
              label="РњРёРЅРёРјР°Р»СЊРЅР°СЏ С‚РѕР»С‰РёРЅР° Р’Рџ, РјРј"
              value={input.trussMinThicknessVpMm}
              onValue={(value) => onChange('trussMinThicknessVpMm', value)}
            />
            <TrussSettingRow
              code="РќРџ, РјРј"
              label="РњРёРЅРёРјР°Р»СЊРЅР°СЏ С‚РѕР»С‰РёРЅР° РќРџ, РјРј"
              value={input.trussMinThicknessNpMm}
              onValue={(value) => onChange('trussMinThicknessNpMm', value)}
            />
            <TrussSettingRow
              code="РћР Р±, РјРј"
              label="РњРёРЅРёРјР°Р»СЊРЅР°СЏ С‚РѕР»С‰РёРЅР° РћР Р±, РјРј"
              value={input.trussMinThicknessOrbMm}
              onValue={(value) => onChange('trussMinThicknessOrbMm', value)}
            />
            <TrussSettingRow
              code="РћР , РјРј"
              label="РњРёРЅРёРјР°Р»СЊРЅР°СЏ С‚РѕР»С‰РёРЅР° РћР , РјРј"
              value={input.trussMinThicknessOrMm}
              onValue={(value) => onChange('trussMinThicknessOrMm', value)}
            />
            <TrussSettingRow
              code="Р Р , РјРј"
              label="РњРёРЅРёРјР°Р»СЊРЅР°СЏ С‚РѕР»С‰РёРЅР° Р Р , РјРј"
              value={input.trussMinThicknessRrMm}
              onValue={(value) => onChange('trussMinThicknessRrMm', value)}
            />
          </div>

          <div className="truss-settings-block">
            <p className="truss-settings-subtitle">РњР°РєСЃРёРјР°Р»СЊРЅР°СЏ С€РёСЂРёРЅР°</p>
            <TrussSettingRow
              code="Р’Рџ, РјРј"
              label="РњР°РєСЃРёРјР°Р»СЊРЅР°СЏ С€РёСЂРёРЅР° Р’Рџ, РјРј"
              value={input.trussMaxWidthVpMm}
              onValue={(value) => onChange('trussMaxWidthVpMm', value)}
            />
            <TrussSettingRow
              code="РќРџ, РјРј"
              label="РњР°РєСЃРёРјР°Р»СЊРЅР°СЏ С€РёСЂРёРЅР° РќРџ, РјРј"
              value={input.trussMaxWidthNpMm}
              onValue={(value) => onChange('trussMaxWidthNpMm', value)}
            />
          </div>

          <div className="truss-settings-block">
            <p className="truss-settings-subtitle">РњРёРЅРёРјР°Р»СЊРЅР°СЏ С€РёСЂРёРЅР°</p>
            <TrussSettingRow
              code="РћР Р±, РјРј"
              label="РњРёРЅРёРјР°Р»СЊРЅР°СЏ С€РёСЂРёРЅР° РћР Р±, РјРј"
              value={input.trussMinWidthOrbMm}
              onValue={(value) => onChange('trussMinWidthOrbMm', value)}
            />
            <TrussSettingRow
              code="РћР , РјРј"
              label="РњРёРЅРёРјР°Р»СЊРЅР°СЏ С€РёСЂРёРЅР° РћР , РјРј"
              value={input.trussMinWidthOrMm}
              onValue={(value) => onChange('trussMinWidthOrMm', value)}
            />
            <TrussSettingRow
              code="Р Р , РјРј"
              label="РњРёРЅРёРјР°Р»СЊРЅР°СЏ С€РёСЂРёРЅР° Р Р , РјРј"
              value={input.trussMinWidthRrMm}
              onValue={(value) => onChange('trussMinWidthRrMm', value)}
            />
          </div>
        </div>
      </section>

      <section className="form-section">
        <h3 className="form-section-title">РљСЂР°РЅРѕРІРѕРµ РѕР±РѕСЂСѓРґРѕРІР°РЅРёРµ</h3>

        <div className="field-row">
          <label className="field">
            <span className="field-label">РћРїРѕСЂРЅС‹Р№ РєСЂР°РЅ</span>
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
            <span className="field-label">РџРѕРґРІРµСЃРЅРѕР№ РєСЂР°РЅ</span>
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
              <span className="field-label">Р“/Рї, С‚</span>
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
              <span className="field-label">РљРѕР»РёС‡РµСЃС‚РІРѕ РєСЂР°РЅРѕРІ</span>
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
              <span className="field-label">РћРґРЅРѕРїСЂРѕР»РµС‚РЅС‹Р№ СЂРµР¶РёРј</span>
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
              label="РЈСЂРѕРІРµРЅСЊ СЂРµР»СЊСЃР°, Рј"
              value={input.supportCraneRailLevelM}
              onValue={(value) => onChange('supportCraneRailLevelM', value)}
              min={0}
            />
          </div>
        )}

        {input.hangingCraneMode === 'есть' && (
          <div className="field-row animate-in">
            <label className="field">
              <span className="field-label">РћРґРЅРѕРїСЂРѕР»РµС‚РЅС‹Р№ СЂРµР¶РёРј</span>
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
              label="Р“/Рї РїРѕРґРІРµСЃРЅРѕРіРѕ, С‚"
              value={input.hangingCraneCapacityT}
              onValue={(value) => onChange('hangingCraneCapacityT', value)}
              min={0}
            />
          </div>
        )}
      </section>

      <section className="form-section">
        <h3 className="form-section-title">Р­РєРѕРЅРѕРјРёРєР° (СЂСѓР±/РєРі)</h3>
        <div className="field-row">
          <NumberField
            label="Р”РІСѓС‚Р°РІСЂ РЎ255"
            value={input.iBeamS255PriceRubPerKg}
            onValue={(value) => onChange('iBeamS255PriceRubPerKg', value)}
            step="0.01"
            min={0.01}
          />
          <NumberField
            label="Р”РІСѓС‚Р°РІСЂ РЎ355"
            value={input.iBeamS355PriceRubPerKg}
            onValue={(value) => onChange('iBeamS355PriceRubPerKg', value)}
            step="0.01"
            min={0.01}
          />
        </div>

        <div className="field-row">
          <NumberField
            label="РўСЂСѓР±Р° РЎ245"
            value={input.tubeS245PriceRubPerKg}
            onValue={(value) => onChange('tubeS245PriceRubPerKg', value)}
            step="0.01"
            min={0.01}
          />
          <NumberField
            label="РўСЂСѓР±Р° РЎ345"
            value={input.tubeS345PriceRubPerKg}
            onValue={(value) => onChange('tubeS345PriceRubPerKg', value)}
            step="0.01"
            min={0.01}
          />
        </div>

        <div className="field-row">
          <NumberField
            label="Р¦РµРЅР° Р›РЎРўРљ РњРџ350"
            value={input.lstkMp350PriceRubPerKg}
            onValue={(value) => onChange('lstkMp350PriceRubPerKg', value)}
            step="0.01"
            min={0.01}
          />
          <NumberField
            label="Р¦РµРЅР° Р›РЎРўРљ РњРџ390"
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
