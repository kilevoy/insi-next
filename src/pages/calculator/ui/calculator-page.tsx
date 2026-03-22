import { useEffect, useState, useTransition } from 'react'
import type { DomainTab } from '@/app/App'
import { calculateColumn, type ColumnCalculationResult } from '@/domain/column/model/calculate-column'
import { calculatePurlin, type PurlinCalculationResult } from '@/domain/purlin/model/calculate-purlin'
import { useCalculatorStore } from '../model/calculator-store'
import { mapToColumnInput, mapToPurlinInput } from '../model/input-mapper'
import type { UnifiedInputState } from '../model/unified-input'
import { ResultsPanel } from './results-panel'
import { UnifiedInputPanel } from './unified-input-panel'

interface CalculatorPageProps {
  initialDomain: DomainTab
  onBack?: () => void
}

type ColumnGroupKey = 'extreme' | 'fachwerk' | 'middle'
type CalculationState<T> = { result: T | null; error: string | null }
type ThemeMode = 'light' | 'dark'
const THEME_STORAGE_KEY = 'metalcalc-theme'

const PROFILE_FIELD_BY_GROUP: Record<
  ColumnGroupKey,
  keyof Pick<
    UnifiedInputState,
    'selectedProfileExtreme' | 'selectedProfileFachwerk' | 'selectedProfileMiddle'
  >
> = {
  extreme: 'selectedProfileExtreme',
  fachwerk: 'selectedProfileFachwerk',
  middle: 'selectedProfileMiddle',
}

export function CalculatorPage({ initialDomain, onBack }: CalculatorPageProps) {
  const [activeTab, setActiveTab] = useState<DomainTab>(initialDomain)
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') {
      return 'light'
    }

    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const { input, setField, setFields } = useCalculatorStore()
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode)
  }, [themeMode])
  const safeCalculatePurlin = (nextInput: UnifiedInputState): CalculationState<PurlinCalculationResult> => {
    try {
      return {
        result: calculatePurlin(mapToPurlinInput(nextInput)),
        error: null,
      }
    } catch (error) {
      console.warn('Purlin calculation failed:', error)
      return {
        result: null,
        error: error instanceof Error ? error.message : 'Ошибка расчета прогонов',
      }
    }
  }

  const safeCalculateColumn = (nextInput: UnifiedInputState): CalculationState<ColumnCalculationResult> => {
    try {
      return {
        result: calculateColumn(mapToColumnInput(nextInput), {
          selectionMode: nextInput.columnSelectionMode,
        }),
        error: null,
      }
    } catch (error) {
      console.warn('Column calculation failed:', error)
      return {
        result: null,
        error: error instanceof Error ? error.message : 'Ошибка расчета колонн',
      }
    }
  }

  const [initialPurlinState] = useState(() => safeCalculatePurlin(input))
  const [initialColumnState] = useState(() => safeCalculateColumn(input))
  const [purlinResult, setPurlinResult] = useState<PurlinCalculationResult | null>(initialPurlinState.result)
  const [columnResult, setColumnResult] = useState<ColumnCalculationResult | null>(initialColumnState.result)
  const [purlinError, setPurlinError] = useState<string | null>(initialPurlinState.error)
  const [columnError, setColumnError] = useState<string | null>(initialColumnState.error)

  const recalculate = (nextInput: UnifiedInputState) => {
    const nextPurlinState = safeCalculatePurlin(nextInput)
    setPurlinResult(nextPurlinState.result)
    setPurlinError(nextPurlinState.error)

    const nextColumnState = safeCalculateColumn(nextInput)
    setColumnResult(nextColumnState.result)
    setColumnError(nextColumnState.error)
  }

  const handleFieldChange = <K extends keyof UnifiedInputState>(key: K, value: UnifiedInputState[K]) => {
    setField(key, value)
    const nextInput = { ...input, [key]: value }
    startTransition(() => recalculate(nextInput))
  }

  const handleFieldsChange = (patch: Partial<UnifiedInputState>) => {
    setFields(patch)
    const nextInput = { ...input, ...patch }
    startTransition(() => recalculate(nextInput))
  }

  const handleColumnManualModeChange = (isManualMode: boolean) => {
    if (isManualMode) {
      handleFieldsChange({ isManualMode: true })
      return
    }

    handleFieldsChange({
      isManualMode: false,
      selectedProfileExtreme: 0,
      selectedProfileFachwerk: 0,
      selectedProfileMiddle: 0,
    })
  }

  const handleColumnProfileSelection = (group: ColumnGroupKey, selectedIndex: number) => {
    const field = PROFILE_FIELD_BY_GROUP[group]
    handleFieldChange(field, selectedIndex)
  }

  const handleColumnSelectionModeChange = (mode: UnifiedInputState['columnSelectionMode']) => {
    handleFieldChange('columnSelectionMode', mode)
  }

  const handlePurlinSpecificationSourceChange = (
    source: UnifiedInputState['purlinSpecificationSource'],
  ) => {
    handleFieldChange('purlinSpecificationSource', source)
  }

  const handlePurlinSelectionModeChange = (mode: UnifiedInputState['purlinSelectionMode']) => {
    handleFieldChange('purlinSelectionMode', mode)
  }

  const handleSortPurlinSelect = (selectedIndex: number) => {
    handleFieldChange('selectedSortPurlinIndex', selectedIndex)
  }

  const handleLstkPurlinSelect = (selectedIndex: number) => {
    handleFieldChange('selectedLstkPurlinIndex', selectedIndex)
  }

  return (
    <div className="app-shell dark-mode-ready" data-testid="calculator-page" data-theme={themeMode}>
      <header className="topbar">
        {onBack && (
          <button className="btn-back" data-testid="back-to-home" onClick={onBack}>
            ← Назад
          </button>
        )}

        <div className="brand-mark" style={{ marginLeft: 16 }}>
          <div className="brand-seal brand-seal--insi">INSI</div>
          <strong className="brand-title">Предварительный расчет здания</strong>
        </div>

        <div className="topbar-actions">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
              data-testid="tab-summary"
              onClick={() => setActiveTab('summary')}
            >
              Сводная
            </button>
            <button
              className={`tab ${activeTab === 'column' ? 'active' : ''}`}
              data-testid="tab-column"
              onClick={() => setActiveTab('column')}
            >
              Колонны
            </button>
            <button
              className={`tab ${activeTab === 'purlin' ? 'active' : ''}`}
              data-testid="tab-purlin"
              onClick={() => setActiveTab('purlin')}
            >
              Прогоны
            </button>
          </div>

          <div className="topbar-utility-group">
            <button
              className={`tab tab--utility ${activeTab === 'methodology' ? 'active' : ''}`}
              data-testid="tab-methodology"
              onClick={() => setActiveTab('methodology')}
            >
              Методика
            </button>

            <div className="theme-toggle" role="group" aria-label="Переключение темы">
              <button
                className={`theme-button ${themeMode === 'light' ? 'active' : ''}`}
                data-testid="theme-light"
                onClick={() => setThemeMode('light')}
              >
                Светлая
              </button>
              <button
                className={`theme-button ${themeMode === 'dark' ? 'active' : ''}`}
                data-testid="theme-dark"
                onClick={() => setThemeMode('dark')}
              >
                Тёмная
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="split-view">
        <div className="split-left">
          <UnifiedInputPanel input={input} onChange={handleFieldChange} />
        </div>

        <div className="split-right">
          <ResultsPanel
            input={input}
            activeTab={activeTab}
            purlinResult={purlinResult}
            columnResult={columnResult}
            isPending={isPending}
            purlinError={purlinError}
            columnError={columnError}
            isColumnManualMode={input.isManualMode}
            onColumnManualModeChange={handleColumnManualModeChange}
            onColumnProfileSelect={handleColumnProfileSelection}
            columnSelectionMode={input.columnSelectionMode}
            onColumnSelectionModeChange={handleColumnSelectionModeChange}
            purlinSpecificationSource={input.purlinSpecificationSource}
            onPurlinSpecificationSourceChange={handlePurlinSpecificationSourceChange}
            purlinSelectionMode={input.purlinSelectionMode}
            onPurlinSelectionModeChange={handlePurlinSelectionModeChange}
            selectedSortPurlinIndex={input.selectedSortPurlinIndex}
            selectedLstkPurlinIndex={input.selectedLstkPurlinIndex}
            onSortPurlinSelect={handleSortPurlinSelect}
            onLstkPurlinSelect={handleLstkPurlinSelect}
          />
        </div>
      </div>
    </div>
  )
}


