from __future__ import annotations

import argparse
import json
import math
import os
import shutil
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Any

import pythoncom
import win32com.client as win32

REPO_ROOT = Path(__file__).resolve().parent.parent
WORKBOOK_ENV_VAR = 'CRANE_BEAM_REFERENCE_WORKBOOK'
WORKBOOK_BASENAME = 'подбор прокатной подкрановой балки v2.0.xlsx'

DEFAULT_SCENARIO = {
    'loadCapacityT': 5,
    'craneSpanM': 24,
    'suspensionType': 'гибкий',
    'dutyGroup': '3К',
    'craneCountInSpan': 'один',
    'craneRail': 'Р50',
    'beamSpanM': 6,
    'brakeStructure': 'нет',
}

CONTROL_SCENARIOS = [
    {'id': 'S1', 'name': 'Базовый случай', 'input': {}},
    {'id': 'S2', 'name': '5 т, пролет крана 12 м', 'input': {'craneSpanM': 12}},
    {'id': 'S3', 'name': '5 т, пролет крана 30 м', 'input': {'craneSpanM': 30}},
    {'id': 'S4', 'name': '8 т, пролет крана 24 м', 'input': {'loadCapacityT': 8}},
    {'id': 'S5', 'name': '10 т, пролет крана 36 м', 'input': {'loadCapacityT': 10, 'craneSpanM': 36}},
    {'id': 'S6', 'name': 'Жесткий подвес', 'input': {'suspensionType': 'жесткий'}},
    {'id': 'S7', 'name': 'Режим работы 7К', 'input': {'dutyGroup': '7К'}},
    {'id': 'S8', 'name': 'Два крана в пролете', 'input': {'craneCountInSpan': 'два'}},
    {'id': 'S9', 'name': 'Рельс КР70', 'input': {'craneRail': 'КР70'}},
    {'id': 'S10', 'name': 'Балка 12 м с тормозной конструкцией', 'input': {'beamSpanM': 12, 'brakeStructure': 'есть'}},
]

PROFILE_FIX = str.maketrans(
    {
        'Ê': 'К',
        'Ø': 'Ш',
        'Ð': 'Р',
        'Ñ': 'С',
        'À': 'А',
        'Á': 'Б',
        'Â': 'В',
        'Ã': 'Г',
        'Ä': 'Д',
        'Å': 'Е',
    }
)


def build_expanded_scenarios() -> list[dict[str, Any]]:
    scenarios: list[dict[str, Any]] = []
    index = 1

    for load_capacity in (5, 8, 10):
        for crane_span in (12, 18, 24, 30, 36):
            for suspension_type in ('гибкий', 'жесткий'):
                for duty_group in ('1К', '3К', '6К', '7К', '8К'):
                    for crane_count in ('один', 'два'):
                        scenarios.append(
                            {
                                'id': f'E{index:03d}',
                                'name': (
                                    f'{load_capacity} т / {crane_span} м / {suspension_type} / '
                                    f'{duty_group} / {crane_count}'
                                ),
                                'input': {
                                    'loadCapacityT': load_capacity,
                                    'craneSpanM': crane_span,
                                    'suspensionType': suspension_type,
                                    'dutyGroup': duty_group,
                                    'craneCountInSpan': crane_count,
                                },
                            }
                        )
                        index += 1

    for load_capacity, crane_span in ((5, 24), (8, 24), (10, 36), (5, 30), (10, 24)):
        scenarios.append(
            {
                'id': f'E{index:03d}',
                'name': f'{load_capacity} т / {crane_span} м / КР70',
                'input': {
                    'loadCapacityT': load_capacity,
                    'craneSpanM': crane_span,
                    'craneRail': 'КР70',
                },
            }
        )
        index += 1

    for load_capacity, crane_span in ((5, 24), (8, 24), (10, 36), (5, 30), (10, 24)):
        scenarios.append(
            {
                'id': f'E{index:03d}',
                'name': f'{load_capacity} т / {crane_span} м / балка 12 м / тормоз есть',
                'input': {
                    'loadCapacityT': load_capacity,
                    'craneSpanM': crane_span,
                    'beamSpanM': 12,
                    'brakeStructure': 'есть',
                },
            }
        )
        index += 1

    return scenarios


PRESETS: dict[str, dict[str, Any]] = {
    'control': {
        'scenarios': CONTROL_SCENARIOS,
        'json': REPO_ROOT / 'docs' / 'crane_beam_10_scenarios_comparison.json',
        'md': REPO_ROOT / 'docs' / 'crane_beam_10_scenarios_comparison.md',
    },
    'expanded': {
        'scenarios': build_expanded_scenarios(),
        'json': REPO_ROOT / 'docs' / 'crane_beam_expanded_scenarios_comparison.json',
        'md': REPO_ROOT / 'docs' / 'crane_beam_expanded_scenarios_comparison.md',
    },
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Compare the crane beam module against the Excel workbook.')
    parser.add_argument('--preset', choices=sorted(PRESETS.keys()), default='control')
    return parser.parse_args()


def find_workbook_path() -> Path:
    env_path = os.environ.get(WORKBOOK_ENV_VAR)
    if env_path:
        candidate = Path(env_path)
        if candidate.exists():
            return candidate
        raise FileNotFoundError(f'Workbook from {WORKBOOK_ENV_VAR} was not found: {candidate}')

    candidates = [
        REPO_ROOT / WORKBOOK_BASENAME,
        REPO_ROOT.parent / WORKBOOK_BASENAME,
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate

    for candidate in REPO_ROOT.glob('*.xlsx'):
        if 'подкран' in candidate.name.lower():
            return candidate

    raise FileNotFoundError(
        f'Unable to locate {WORKBOOK_BASENAME!r}. Put it in the repo root or set {WORKBOOK_ENV_VAR}.'
    )


def normalize_profile(value: Any) -> str:
    text = '' if value is None else str(value).replace('\xa0', ' ').strip()
    return text.translate(PROFILE_FIX)


def scenario_payload(scenarios: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [{'id': scenario['id'], **DEFAULT_SCENARIO, **scenario['input']} for scenario in scenarios]


def run_app_dump(tmp_dir: Path, scenarios: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    scenarios_path = tmp_dir / 'crane-beam-scenarios.json'
    app_out_path = tmp_dir / 'crane-beam-app-out.json'
    script_path = tmp_dir / 'crane-beam-app-dump.ts'

    scenarios_path.write_text(json.dumps(scenario_payload(scenarios), ensure_ascii=False, indent=2), encoding='utf-8')
    script_path.write_text(
        """
import { readFileSync, writeFileSync } from 'node:fs'
import { calculateCraneBeam } from 'C:/insi_next/src/domain/crane-beam/model/calculate-crane-beam'
import { defaultCraneBeamInput } from 'C:/insi_next/src/domain/crane-beam/model/crane-beam-input'

const scenarios = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const rows = scenarios.map((scenario: any) => {
  const result = calculateCraneBeam({
    ...defaultCraneBeamInput,
    ...scenario,
  })

  return {
    id: scenario.id,
    profile: result.selection.profile,
    weightKg: result.selection.weightKg,
    utilization: result.selection.utilization,
    maxUtilizationPercent: result.selection.maxUtilizationPercent,
    mx: result.loads.designMxGeneralKnM,
    my: result.loads.designMyGeneralKnM,
    q: result.loads.designQGeneralKn,
    qop: result.loads.designQAdditionalKn,
    lookup: result.lookup,
    derived: result.derived,
  }
})

writeFileSync(process.argv[3], JSON.stringify(rows, null, 2), 'utf8')
""",
        encoding='utf-8',
    )

    subprocess.run(['npx.cmd', 'tsx', str(script_path), str(scenarios_path), str(app_out_path)], cwd=REPO_ROOT, check=True)
    return {item['id']: item for item in json.loads(app_out_path.read_text(encoding='utf-8'))}


def set_excel_inputs(ws_summary, scenario: dict[str, Any]) -> None:
    ws_summary.Range('B1').Value = scenario['loadCapacityT']
    ws_summary.Range('B2').Value = scenario['craneSpanM']
    ws_summary.Range('B4').Value = 4
    ws_summary.Range('B8').Value = scenario['suspensionType']
    ws_summary.Range('B9').Value = scenario['dutyGroup']
    ws_summary.Range('B11').Value = scenario['craneCountInSpan']
    ws_summary.Range('B13').Value = scenario['craneRail']
    ws_summary.Range('B17').Value = scenario['beamSpanM']
    ws_summary.Range('B18').Value = scenario['brakeStructure']
    ws_summary.Range('B19').Value = 0


def wait_for_excel(excel, timeout_seconds: float = 15.0) -> None:
    started_at = time.time()
    while time.time() - started_at < timeout_seconds:
        if excel.CalculationState == 0:
            return
        time.sleep(0.05)
    raise TimeoutError('Excel did not finish recalculation in time.')


def read_excel_rows(workbook_path: Path, scenarios: list[dict[str, Any]]) -> list[dict[str, Any]]:
    workbook = None
    pythoncom.CoInitialize()
    excel = win32.DispatchEx('Excel.Application')
    excel.Visible = False
    excel.DisplayAlerts = False
    excel.AskToUpdateLinks = False

    try:
        workbook = excel.Workbooks.Open(str(workbook_path), UpdateLinks=0, ReadOnly=False, IgnoreReadOnlyRecommended=True)
        ws_summary = workbook.Worksheets(1)
        ws_calculation = workbook.Worksheets(2)

        rows: list[dict[str, Any]] = []

        for scenario in scenario_payload(scenarios):
            set_excel_inputs(ws_summary, scenario)
            excel.CalculateFullRebuild()
            wait_for_excel(excel)

            rows.append(
                {
                    'id': scenario['id'],
                    'profile': normalize_profile(ws_summary.Range('B85').Value),
                    'weightKg': float(ws_summary.Range('B86').Value or 0),
                    'utilization': float(ws_calculation.Range('C14').Value or 0),
                    'maxUtilizationPercent': float(ws_summary.Range('C84').Value or 0),
                    'mx': float(ws_summary.Range('B68').Value or 0),
                    'my': float(ws_summary.Range('B69').Value or 0),
                    'q': float(ws_summary.Range('B70').Value or 0),
                    'qop': float(ws_summary.Range('B72').Value or 0),
                    'lookup': {
                        'wheelLoadKn': float(ws_summary.Range('B3').Value or 0),
                        'trolleyMassT': float(ws_summary.Range('B5').Value or 0),
                        'craneBaseMm': float(ws_summary.Range('B6').Value or 0),
                        'craneGaugeMm': float(ws_summary.Range('B7').Value or 0),
                        'railFootWidthM': float(ws_summary.Range('B14').Value or 0),
                        'railHeightM': float(ws_summary.Range('B15').Value or 0),
                    },
                    'derived': {
                        'tbnKn': float(ws_summary.Range('B21').Value or 0),
                        'qbnKn': float(ws_summary.Range('B22').Value or 0),
                        'gammaLocal': float(ws_summary.Range('B26').Value or 0),
                        'fatigueNvyn': float(ws_summary.Range('B27').Value or 0),
                        'alpha': float(ws_summary.Range('B29').Value or 0),
                        'caseForTwoCranes': int(ws_summary.Range('B34').Value or 0),
                    },
                }
            )

        return rows
    finally:
        if workbook is not None:
            try:
                workbook.Close(SaveChanges=False)
            except Exception:
                pass
        excel.Quit()
        pythoncom.CoUninitialize()


def compare_rows(app_rows: dict[str, dict[str, Any]], excel_rows: list[dict[str, Any]], scenarios: list[dict[str, Any]]) -> list[dict[str, Any]]:
    excel_by_id = {item['id']: item for item in excel_rows}
    report_rows: list[dict[str, Any]] = []

    for scenario in scenarios:
        app_row = app_rows[scenario['id']]
        excel_row = excel_by_id[scenario['id']]
        report_rows.append(
            {
                'id': scenario['id'],
                'name': scenario['name'],
                'scenario': {'id': scenario['id'], **DEFAULT_SCENARIO, **scenario['input']},
                'excel': excel_row,
                'app': app_row,
                'matches': {
                    'profile': excel_row['profile'] == app_row['profile'],
                    'weightKg': math.isclose(excel_row['weightKg'], app_row['weightKg'], rel_tol=1e-9, abs_tol=1e-6),
                    'utilization': math.isclose(excel_row['utilization'], app_row['utilization'], rel_tol=1e-9, abs_tol=1e-9),
                    'maxUtilizationPercent': math.isclose(
                        excel_row['maxUtilizationPercent'], app_row['maxUtilizationPercent'], rel_tol=1e-9, abs_tol=1e-9
                    ),
                    'mx': math.isclose(excel_row['mx'], app_row['mx'], rel_tol=1e-9, abs_tol=1e-9),
                    'my': math.isclose(excel_row['my'], app_row['my'], rel_tol=1e-9, abs_tol=1e-9),
                    'q': math.isclose(excel_row['q'], app_row['q'], rel_tol=1e-9, abs_tol=1e-9),
                    'qop': math.isclose(excel_row['qop'], app_row['qop'], rel_tol=1e-9, abs_tol=1e-9),
                },
            }
        )

    return report_rows


def build_markdown(report_rows: list[dict[str, Any]], workbook_path: Path, preset: str) -> str:
    lines = [
        '# Сравнение модуля подкрановой балки с Excel',
        '',
        f'- Источник Excel: `{workbook_path.name}`',
        f'- Дата проверки: `{time.strftime("%Y-%m-%d %H:%M:%S")}`',
        f'- Набор сценариев: `{preset}` (`{len(report_rows)}` шт.)',
        '- Проверяются профиль, масса, коэффициент использования и усилия `Mx`, `My`, `Q`, `Qop`.',
        '',
        '| Сценарий | Профиль | Масса | Использование | Mx/My/Q/Qop |',
        '|---|---:|---:|---:|---:|',
    ]

    for row in report_rows:
        matches = row['matches']
        lines.append(
            f"| {row['id']} | {'да' if matches['profile'] else 'нет'} | {'да' if matches['weightKg'] else 'нет'} | "
            f"{'да' if matches['utilization'] else 'нет'} | "
            f"{'да' if all((matches['mx'], matches['my'], matches['q'], matches['qop'])) else 'нет'} |"
        )

    mismatch_rows = [row for row in report_rows if not all(row['matches'].values())]
    lines.extend(['', '## Итог', ''])
    if mismatch_rows:
        lines.append(f'- Обнаружены расхождения: `{len(mismatch_rows)}` сценариев.')
    else:
        lines.append(
            f"- Расхождений по ключевым выходам не обнаружено: `{len(report_rows)}/{len(report_rows)}` сценариев совпали с Excel."
        )

    return '\n'.join(lines) + '\n'


def main() -> int:
    args = parse_args()
    preset = PRESETS[args.preset]
    scenarios = preset['scenarios']
    workbook_source = find_workbook_path()

    with tempfile.TemporaryDirectory(prefix='crane_beam_compare_') as tmp:
        tmp_dir = Path(tmp)
        workbook_copy = tmp_dir / workbook_source.name
        shutil.copy2(workbook_source, workbook_copy)

        app_rows = run_app_dump(tmp_dir, scenarios)
        excel_rows = read_excel_rows(workbook_copy, scenarios)
        report_rows = compare_rows(app_rows, excel_rows, scenarios)

    payload = {
        'preset': args.preset,
        'workbook': str(workbook_source),
        'scenarios': scenario_payload(scenarios),
        'report': report_rows,
    }

    preset['json'].write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    preset['md'].write_text(build_markdown(report_rows, workbook_source, args.preset), encoding='utf-8')

    matched_count = sum(1 for row in report_rows if all(row['matches'].values()))
    print(f'Workbook: {workbook_source}')
    print(f'JSON: {preset["json"]}')
    print(f'MD: {preset["md"]}')
    print(f'Parity: {matched_count}/{len(report_rows)} scenarios fully matched')

    return 0 if matched_count == len(report_rows) else 1


if __name__ == '__main__':
    raise SystemExit(main())
