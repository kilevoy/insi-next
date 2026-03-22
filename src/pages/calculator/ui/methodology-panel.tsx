import type { ColumnCalculationResult } from '@/domain/column/model/calculate-column'
import type { PurlinCalculationResult } from '@/domain/purlin/model/calculate-purlin'
import type { UnifiedInputState } from '../model/unified-input'

interface MethodologyPanelProps {
  input: UnifiedInputState
  purlinResult: PurlinCalculationResult | null
  columnResult: ColumnCalculationResult | null
}

function formatNumber(value: number, fractionDigits = 2): string {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  })
}

function formatModeLabel(value: boolean): string {
  return value ? 'Ручной' : 'Авто'
}

export function MethodologyPanel({ input, purlinResult, columnResult }: MethodologyPanelProps) {
  return (
    <div className="tab-pane animate-in">
      <section className="results-section results-section--summary-sheet methodology-sheet">
        <div className="methodology-header">
          <div>
            <h3 className="results-section-title">Методика подбора</h3>
            <p className="results-inline-note methodology-lead">
              Эта страница фиксирует, как калькулятор подбирает колонны и прогоны, какие
              исходные параметры участвуют в расчете, какие проверки выполняются и на какие
              нормативные таблицы опирается модель.
            </p>
          </div>

          <div className="methodology-badges">
            <span className="methodology-badge">Excel parity</span>
            <span className="methodology-badge">Pure domain kernels</span>
            <span className="methodology-badge">Аудируемые reference-таблицы</span>
          </div>
        </div>

        <div className="summary-hero summary-hero--methodology">
          <div className="summary-metric-card summary-metric-card--accent">
            <span>Город и ответственность</span>
            <strong>{`${input.city} / ур. отв ${input.responsibilityLevel}`}</strong>
          </div>
          <div className="summary-metric-card">
            <span>Геометрия</span>
            <strong>{`${formatNumber(input.spanM, 2)} x ${formatNumber(input.buildingLengthM, 2)} x ${formatNumber(input.buildingHeightM, 2)} м`}</strong>
          </div>
          <div className="summary-metric-card">
            <span>Расчет прогонов</span>
            <strong>{`${input.purlinSpecificationSource === 'sort' ? 'Сортовой' : 'ЛСТК'} / ${input.purlinSelectionMode === 'manual' ? 'ручной' : 'авто'}`}</strong>
          </div>
          <div className="summary-metric-card">
            <span>Расчет колонн</span>
            <strong>{`${input.columnSelectionMode === 'engineering' ? 'Инженерный H_max' : 'Excel-режим'} / ${formatModeLabel(input.isManualMode)}`}</strong>
          </div>
        </div>

        <div className="methodology-section-grid">
          <section className="methodology-card">
            <h4>Нормативная база и источник данных</h4>
            <ul className="methodology-list">
              <li>
                Снеговые и ветровые районы, высотные коэффициенты и аэродинамические данные
                берутся из reference-таблиц, перенесенных из исходных Excel-калькуляторов.
              </li>
              <li>
                Основная ветка нагрузок ориентирована на <strong>СП 20.13330.20XX</strong>,
                который также отражен в интерфейсе и workbook-источнике.
              </li>
              <li>
                Для части веток прогонов сохранена совместимость с workbook-режимом{' '}
                <strong>по СП РК EN</strong>, если это предусмотрено исходной таблицей города.
              </li>
              <li>
                Бизнес-формулы находятся только в domain-слое; React-страницы ничего не считают
                сами, а лишь показывают результат ядра.
              </li>
            </ul>
          </section>

          <section className="methodology-card">
            <h4>Какие параметры учитываются</h4>
            <div className="methodology-mini-grid">
              <div className="methodology-mini-tile">
                <span>Геометрия</span>
                <strong>Пролет, длина, высота, уклон, шаг рам, шаг фахверка</strong>
              </div>
              <div className="methodology-mini-tile">
                <span>Климат</span>
                <strong>Город, тип местности, уровень ответственности</strong>
              </div>
              <div className="methodology-mini-tile">
                <span>Ограждающие</span>
                <strong>Тип кровли, покрытие, профлист, стеновое покрытие</strong>
              </div>
              <div className="methodology-mini-tile">
                <span>Особые условия</span>
                <strong>Снеговой мешок, тяжи, снегозадержание, ограждение</strong>
              </div>
              <div className="methodology-mini-tile">
                <span>Колонны</span>
                <strong>Тип колонны, крановые нагрузки, многопролетность, связи</strong>
              </div>
              <div className="methodology-mini-tile">
                <span>Экономика</span>
                <strong>Цены стали по категориям профиля и марке</strong>
              </div>
            </div>
          </section>
        </div>

        <section className="methodology-card">
          <h4>Какие нагрузки формируются в расчете</h4>
          <div className="methodology-columns">
            <div className="methodology-column">
              <h5>Для прогонов</h5>
              <ul className="methodology-list">
                <li>Нормативный снеговой район по городу.</li>
                <li>Ветровой район по городу с учетом типа местности и высоты здания.</li>
                <li>Постоянная нагрузка от покрытия.</li>
                <li>Эксплуатационная нагрузка.</li>
                <li>
                  Повышенная снеговая нагрузка при режиме снегового мешка{' '}
                  <strong>вдоль</strong> или <strong>поперек здания</strong>.
                </li>
                <li>Фасадная ветровая составляющая для проверок устойчивости сортового прогона.</li>
                <li>
                  Ограничение по авто-шагу и, при задании пользователем, ручные пределы
                  минимального и максимального шага.
                </li>
              </ul>
            </div>

            <div className="methodology-column">
              <h5>Для колонн</h5>
              <ul className="methodology-list">
                <li>Снеговая и ветровая нагрузка по городу.</li>
                <li>Нагрузки от кровельного и стенового ограждения.</li>
                <li>Высотные и аэродинамические коэффициенты.</li>
                <li>Осевая сила N и изгибающий момент M как итог сборки расчетного контекста.</li>
                <li>
                  Дополнительные нагрузки от опорных и подвесных кранов, если они включены в
                  параметрах.
                </li>
                <li>Учет схемы связей, шагов рам и фахверка при определении эффективной работы.</li>
              </ul>
            </div>
          </div>

          <div className="load-grid load-grid--summary methodology-load-grid">
            <div className="load-tile">
              <span>Снег район прогонов</span>
              <strong>{purlinResult ? `${formatNumber(purlinResult.loadSummary.snowRegionKpa, 2)} кПа` : '-'}</strong>
            </div>
            <div className="load-tile">
              <span>Ветер район прогонов</span>
              <strong>{purlinResult ? `${formatNumber(purlinResult.loadSummary.windRegionKpa, 2)} кПа` : '-'}</strong>
            </div>
            <div className="load-tile">
              <span>Расчетная нагрузка на прогон</span>
              <strong>{purlinResult ? `${formatNumber(purlinResult.loadSummary.designTotalKpa, 2)} кПа` : '-'}</strong>
            </div>
            <div className="load-tile">
              <span>Осевая сила колонны</span>
              <strong>{columnResult?.derivedContext ? `${formatNumber(columnResult.derivedContext.axialLoadKn, 1)} кН` : '-'}</strong>
            </div>
            <div className="load-tile">
              <span>Момент колонны</span>
              <strong>{columnResult?.derivedContext ? `${formatNumber(columnResult.derivedContext.bendingMomentKnM, 1)} кН·м` : '-'}</strong>
            </div>
            <div className="load-tile">
              <span>Коэф. снегового мешка</span>
              <strong>
                {purlinResult ? formatNumber(purlinResult.loadSummary.snowBagFactor, 2) : '-'}
              </strong>
            </div>
          </div>
        </section>

        <div className="methodology-section-grid">
          <section className="methodology-card">
            <h4>Принцип подбора колонн</h4>
            <ol className="methodology-steps">
              <li>
                Колонны делятся на группы: <strong>крайние</strong>,{' '}
                <strong>фахверковые</strong> и <strong>средние</strong>.
              </li>
              <li>
                Для каждой группы рассчитывается геометрия и рабочая высота. В инженерном режиме
                используется правило <strong>H_max</strong> — профиль выбирается по худшему
                элементу группы.
              </li>
              <li>
                Для кандидатов проверяются прочность, устойчивость по осям X/Y и гибкость по
                осям X/Y.
              </li>
              <li>
                В топ-лист попадают только профили с коэффициентом использования не выше 1.0;
                дальше они ранжируются по workbook-совместимой целевой функции.
              </li>
              <li>
                После выбора профиля спецификация считается уже по фактическим длинам всех колонн
                группы, а не только по критическому элементу.
              </li>
            </ol>

            <div className="methodology-formula">
              <strong>Базовый принцип:</strong> один профиль выбирается на всю группу, а масса и
              стоимость агрегируются по реальным длинам колонн этой группы.
            </div>
          </section>

          <section className="methodology-card">
            <h4>Принцип подбора прогонов</h4>
            <ol className="methodology-steps">
              <li>
                Сначала формируется цепочка нагрузок: снег, ветер, покрытие, эксплуатация,
                снеговой мешок, фасадная ветровая нагрузка и допустимый шаг.
              </li>
              <li>
                Затем параллельно проверяются две ветки: <strong>сортовой прокат</strong> и{' '}
                <strong>ЛСТК</strong>.
              </li>
              <li>
                Для сортового прогона проверяются прочность, устойчивость, гибкость и прогибы.
              </li>
              <li>
                Для ЛСТК проверяется несущая способность по моменту, допустимый шаг, а также
                фильтр толщины панели, если он обязателен для семейства профилей.
              </li>
              <li>
                В авто-режиме в спецификацию попадает лучший кандидат выбранного источника
                (`Сортовой` или `ЛСТК`), в ручном — профиль выбирается пользователем из списка.
              </li>
            </ol>

            <div className="methodology-formula">
              <strong>Особенность ЛСТК:</strong> на итоговую массу влияют не только шаг и масса
              профиля, но и количество линий, снегозадержание, ограждение и шаг распорок.
            </div>
          </section>
        </div>

        <section className="methodology-card">
          <h4>Какие проверки видит инженер в результате</h4>
          <div className="methodology-checks">
            <div className="methodology-check-card">
              <span>Колонны</span>
              <strong>Прочность</strong>
              <p>Контроль суммарных напряжений от N и M для каждого кандидата.</p>
            </div>
            <div className="methodology-check-card">
              <span>Колонны</span>
              <strong>Устойчивость X/Y</strong>
              <p>Проверка с учетом расчетных длин, радиусов инерции и схемы связей.</p>
            </div>
            <div className="methodology-check-card">
              <span>Колонны</span>
              <strong>Гибкость X/Y</strong>
              <p>Отдельные коэффициенты использования по обеим осям.</p>
            </div>
            <div className="methodology-check-card">
              <span>Прогоны сортовые</span>
              <strong>Прочность, устойчивость, прогиб</strong>
              <p>Расчет по вертикальной и фасадной составляющей нагрузки.</p>
            </div>
            <div className="methodology-check-card">
              <span>Прогоны ЛСТК</span>
              <strong>Несущая способность</strong>
              <p>Проверка по расчетному моменту и ограничению коэффициента использования.</p>
            </div>
            <div className="methodology-check-card">
              <span>Экономика</span>
              <strong>Масса и стоимость</strong>
              <p>Считаются отдельно от проверок и используются для ранжирования и спецификации.</p>
            </div>
          </div>
        </section>

        <section className="methodology-card">
          <h4>Что входит в спецификацию</h4>
          <ul className="methodology-list">
            <li>
              Для колонн: группа, координата, длина, профиль, марка стали, число ветвей,
              распорки, масса и ориентировочная стоимость.
            </li>
            <li>
              Для прогонов: семейство, профиль, шаг, масса на погонный метр, масса на шаг,
              масса на здание, масса с распорками и ориентировочная стоимость.
            </li>
            <li>
              Сводная вкладка собирает общую массу и укрупненную стоимость по выбранным колоннам
              и прогонам в одном листе.
            </li>
          </ul>
        </section>

        <section className="methodology-card methodology-card--warning">
          <h4>Ограничения и инженерная оговорка</h4>
          <ul className="methodology-list">
            <li>
              Калькулятор предназначен для предварительного подбора и должен использоваться как
              инструмент предвариательной оценки, а не как замена полного комплекта КМ/КМД.
            </li>
            <li>
              Модель строго ограничена диапазонами интерполяции по высоте, пролету и шагам,
              которые зашиты в reference-таблицы.
            </li>
            <li>
              Если для конкретного сценария не найдено допустимого кандидата, приложение честно
              показывает отсутствие решения и не формирует фиктивную спецификацию.
            </li>
            <li>
              Источником истины для справочных таблиц остаются workbook-файлы, а parity с Excel
              проверяется отдельными smoke- и parity-тестами.
            </li>
          </ul>
        </section>
      </section>
    </div>
  )
}
