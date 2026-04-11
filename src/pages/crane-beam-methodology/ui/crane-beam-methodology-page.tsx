import type { ReactNode } from 'react'
import insiLogo from '@/assets/insi-logo.png'

const text = {
  title: 'Цель и методика подбора подкрановой балки',
  backToCalculator: 'Открыть основной калькулятор',
  openDemo: 'Открыть модуль подкрановой балки',
  intro:
    'Эта страница объясняет, для чего нужен калькулятор подкрановой балки, какие входные данные он использует и по какой логике выбирает профиль.',
} as const

function resolveMainCalculatorHref(pathname: string): string {
  return pathname.startsWith('/insi-next/') ? '/insi-next/' : '/'
}

function resolveCraneBeamDemoHref(pathname: string): string {
  return pathname.startsWith('/insi-next/') ? '/insi-next/crane-beam-demo' : '/crane-beam-demo'
}

function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section
      style={{
        display: 'grid',
        gap: 12,
        padding: 20,
        borderRadius: 16,
        background: '#ffffff',
        border: '1px solid rgba(148, 163, 184, 0.18)',
      }}
    >
      <h2 style={{ margin: 0, fontSize: 22, color: '#0f172a' }}>{title}</h2>
      <div style={{ display: 'grid', gap: 10, color: '#334155', lineHeight: 1.6 }}>{children}</div>
    </section>
  )
}

export function CraneBeamMethodologyPage() {
  const pathname = typeof window === 'undefined' ? '/' : window.location.pathname
  const mainCalculatorHref = resolveMainCalculatorHref(pathname)
  const craneBeamDemoHref = resolveCraneBeamDemoHref(pathname)

  return (
    <div className="app-shell">
      <main
        data-testid="crane-beam-methodology-page"
        className="page"
        style={{ display: 'grid', gap: 16, maxWidth: 'none', padding: '28px 0 64px' }}
      >
        <section
          style={{
            display: 'flex',
            gap: 18,
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            padding: '12px 18px',
            borderRadius: 16,
            background: '#ffffff',
            border: '1px solid rgba(148, 163, 184, 0.18)',
          }}
        >
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <img src={insiLogo} alt="INSI" style={{ width: 100, height: 100, objectFit: 'contain' }} />
            <div style={{ display: 'grid', gap: 8 }}>
              <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.05, color: '#0f172a' }}>{text.title}</h1>
              <div style={{ maxWidth: 760, color: '#475569', lineHeight: 1.5 }}>{text.intro}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a
              href={craneBeamDemoHref}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 44,
                padding: '0 18px',
                borderRadius: 10,
                background: '#e2f3ef',
                color: '#0f766e',
                border: '1px solid rgba(15, 118, 110, 0.22)',
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              {text.openDemo}
            </a>
            <a
              href={mainCalculatorHref}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 44,
                padding: '0 18px',
                borderRadius: 10,
                background: '#eef2f6',
                color: '#334155',
                border: '1px solid rgba(148, 163, 184, 0.35)',
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              {text.backToCalculator}
            </a>
          </div>
        </section>

        <Section title="Цель калькулятора">
          <p style={{ margin: 0 }}>
            Калькулятор нужен для подбора прокатной подкрановой балки под заданный крановый режим без
            постоянного возврата в Excel. Его задача — по входным данным крана и балки получить такие
            же расчетные усилия и такой же итоговый профиль, как в исходной рабочей книге.
          </p>
          <p style={{ margin: 0 }}>
            На практике это ответ на три вопроса: какой профиль принять, сколько он весит и насколько
            он загружен по расчету.
          </p>
        </Section>

        <Section title="Какие данные задает пользователь">
          <p style={{ margin: 0 }}>
            Пользователь задает грузоподъемность и пролет крана, тип подвеса, группу режима работы,
            число кранов в пролете, тип рельса, пролет самой подкрановой балки и наличие тормозной
            конструкции.
          </p>
          <p style={{ margin: 0 }}>
            Паспортные параметры крана и рельса модуль может брать из встроенного каталога либо из
            ручного ввода. Это позволяет работать и со стандартными сочетаниями, и с нестандартными
            паспортными данными.
          </p>
        </Section>

        <Section title="Как устроен подбор">
          <p style={{ margin: 0 }}>
            Сначала модуль определяет паспортные параметры: нагрузку на колесо, массу тележки, базу и
            габарит крана, размеры рельса. Затем из них вычисляет производные значения вроде `Tbн`,
            `Qbн`, коэффициентов режима и расчетного случая для двух кранов.
          </p>
          <p style={{ margin: 0 }}>
            После этого строятся расчетные усилия в балке: `Mx`, `My`, `Q`, `Qop` и локальные
            воздействия. Эти усилия уже используются для проверки сортамента и выбора подходящего
            профиля.
          </p>
          <p style={{ margin: 0 }}>
            На этапе выбора модуль сравнивает кандидаты из базы прокатных профилей и берет тот
            вариант, который соответствует workbook-логике подбора и проходит по допустимому уровню
            использования.
          </p>
        </Section>

        <Section title="Что считается результатом">
          <p style={{ margin: 0 }}>
            Результат подбора — это не только название профиля. Модуль также показывает массу балки,
            коэффициент использования и расчетные усилия, чтобы инженер видел и итог выбора, и его
            расчетное основание.
          </p>
          <p style={{ margin: 0 }}>
            Такой формат нужен, чтобы можно было быстро проверить, почему выбран именно этот профиль и
            не скрыта ли за ним перегрузка или пограничный режим.
          </p>
        </Section>

        <Section title="На чем держится доверие к модулю">
          <p style={{ margin: 0 }}>
            Модуль сверяется с исходным Excel не по одному примеру, а по двум контурам проверки:
            контрольным сценариям и расширенной матрице сочетаний. Сейчас для покрытого пространства
            сценариев сохранено совпадение с workbook.
          </p>
          <p style={{ margin: 0 }}>
            Это значит, что Excel остается источником эталона, но ежедневная работа уже может идти
            через модуль. Возвращаться в Excel нужно в основном тогда, когда мы расширяем методику или
            добавляем новые классы сценариев.
          </p>
        </Section>
      </main>
    </div>
  )
}
