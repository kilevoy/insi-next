from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

import win32com.client as win32

REPO_ROOT = Path(__file__).resolve().parent.parent
WORKBOOK_PATH = next(Path(r'C:\Users\RAN\Downloads').glob('Подбор оконых ригелей v2.0.xlsx'))

CASES = {
    'cases': [
        {
            'name': 'moscow_type_3_reference',
            'city': 'Москва',
            'windLoadKpa': 0.23,
            'windowHeightM': 1,
            'frameStepM': 6,
            'windowType': 3,
            'buildingHeightM': 9,
            'buildingSpanM': 18,
            'buildingLengthM': 42,
            'terrainType': 'А',
            'windowConstruction': '2ой стеклопакет',
            'maxUtilization': 0.85,
        },
        {
            'name': 'new_urengoy_type_1_default',
            'city': 'Новый Уренгой',
            'windLoadKpa': 0.38,
            'windowHeightM': 1,
            'frameStepM': 6,
            'windowType': 1,
            'buildingHeightM': 6,
            'buildingSpanM': 18,
            'buildingLengthM': 42,
            'terrainType': 'А',
            'windowConstruction': '2ой стеклопакет',
            'maxUtilization': 0.85,
        },
        {
            'name': 'moscow_type_2_taller_window',
            'city': 'Москва',
            'windLoadKpa': 0.23,
            'windowHeightM': 1.4,
            'frameStepM': 6,
            'windowType': 2,
            'buildingHeightM': 9,
            'buildingSpanM': 18,
            'buildingLengthM': 42,
            'terrainType': 'А',
            'windowConstruction': '2ой стеклопакет',
            'maxUtilization': 0.85,
        },
        {
            'name': 'moscow_type_4_longer_step',
            'city': 'Москва',
            'windLoadKpa': 0.23,
            'windowHeightM': 1,
            'frameStepM': 7.5,
            'windowType': 4,
            'buildingHeightM': 9,
            'buildingSpanM': 24,
            'buildingLengthM': 48,
            'terrainType': 'А',
            'windowConstruction': '2ой стеклопакет',
            'maxUtilization': 0.85,
        },
        {
            'name': 'new_urengoy_type_5_high_building',
            'city': 'Новый Уренгой',
            'windLoadKpa': 0.38,
            'windowHeightM': 1.2,
            'frameStepM': 6,
            'windowType': 5,
            'buildingHeightM': 20,
            'buildingSpanM': 24,
            'buildingLengthM': 60,
            'terrainType': 'А',
            'windowConstruction': '2ой стеклопакет',
            'maxUtilization': 0.85,
        },
    ]
}


def is_excel_error(value: Any) -> bool:
    return isinstance(value, int) and value < 0


def rounded_excel_number(value: Any) -> float | None:
    if value in (None, '') or is_excel_error(value):
        return None

    return round(float(value), 4)


def run_engine_cases(case_file: Path) -> dict:
    command = [
        str(REPO_ROOT / 'node_modules' / '.bin' / 'tsx.cmd'),
        '--tsconfig',
        'tsconfig.app.json',
        str(REPO_ROOT / 'scripts' / 'window_rigel_compare_cases.ts'),
        str(case_file),
    ]
    completed = subprocess.run(
        command,
        cwd=REPO_ROOT,
        check=True,
        capture_output=True,
        text=True,
        encoding='utf-8',
    )
    return json.loads(completed.stdout)


def excel_list(ws, start_row: int, end_row: int) -> list[dict]:
    rows: list[dict] = []
    for row in range(start_row, end_row + 1):
        rank = ws.Range(f'A{row}').Value
        profile = ws.Range(f'B{row}').Value
        steel = ws.Range(f'C{row}').Value
        mass = ws.Range(f'D{row}').Value
        if profile in (None, ''):
            continue
        if is_excel_error(rank) or is_excel_error(profile) or is_excel_error(steel) or is_excel_error(mass):
            raise ValueError(f'Excel returned an error in result row {row}')

        rows.append(
            {
                'rank': int(rank) if rank is not None else None,
                'profile': str(profile),
                'steelGrade': str(steel),
                'massKg': round(float(mass), 4) if mass is not None else None,
            }
        )
    return rows


def run_excel_cases(cases: list[dict]) -> dict[str, dict]:
    excel = win32.DispatchEx('Excel.Application')
    excel.Visible = False
    excel.DisplayAlerts = False

    try:
        results: dict[str, dict] = {}

        for case in cases:
            workbook = excel.Workbooks.Open(str(WORKBOOK_PATH))
            try:
                ws = workbook.Worksheets(1)
                ws.Range('B2').Value = case['city']
                ws.Range('B3').Value = case.get('responsibilityLevel', 1)
                ws.Range('B6').Value = case['windowHeightM']
                ws.Range('B7').Value = case['frameStepM']
                ws.Range('B8').Value = case['windowType']
                ws.Range('B9').Value = case['buildingHeightM']
                ws.Range('B10').Value = case['buildingSpanM']
                ws.Range('B11').Value = case['buildingLengthM']
                ws.Range('B14').Value = case.get('terrainType', 'А')
                ws.Range('B17').Value = case.get('windowConstruction', '2ой стеклопакет')
                ws.Range('B20').Value = case.get('maxUtilization', 0.85)
                ws.Range('B15').Value = case['windLoadKpa']

                excel.CalculateFullRebuild()

                calc_sheet = workbook.Worksheets(2)
                workbook_health = {
                    'windCase1Kpa': calc_sheet.Range('D9').Value,
                    'windCase2Kpa': calc_sheet.Range('F9').Value,
                    'bottomStrengthUtilization': calc_sheet.Range('AK20').Value,
                    'bottomDeflectionUtilization': calc_sheet.Range('AQ20').Value,
                    'bottomRankScore': calc_sheet.Range('AV20').Value,
                }

                if any(is_excel_error(value) for value in workbook_health.values()):
                    results[case['name']] = {
                        'verifiable': False,
                        'reason': 'Excel workbook returned formula errors after the input update; live comparison is not reliable for this case.',
                        'health': workbook_health,
                    }
                    continue

                results[case['name']] = {
                    'verifiable': True,
                    'loads': {
                        'windLoadKpa': rounded_excel_number(ws.Range('B15').Value),
                        'verticalLoadKpa': rounded_excel_number(ws.Range('D17').Value),
                    },
                    'bottom': excel_list(ws, 24, 33),
                    'top': excel_list(ws, 37, 46),
                }
            finally:
                workbook.Close(SaveChanges=False)

        return results
    finally:
        excel.Quit()


def compare_lists(excel_rows: list[dict], engine_rows: list[dict]) -> dict:
    excel_view = [(row['profile'], row['steelGrade'], row['massKg']) for row in excel_rows]
    engine_view = [(row['profile'], row['steelGrade'], row['massKg']) for row in engine_rows]
    return {
        'matches': excel_view == engine_view,
        'excel': excel_view,
        'engine': engine_view,
    }


def main() -> int:
    with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False, encoding='utf-8') as handle:
        json.dump(CASES, handle, ensure_ascii=False, indent=2)
        case_file = Path(handle.name)

    try:
        engine_payload = run_engine_cases(case_file)
    finally:
        case_file.unlink(missing_ok=True)

    excel_results = run_excel_cases(CASES['cases'])

    report = {'cases': []}
    for case in engine_payload['cases']:
        excel_case = excel_results[case['name']]

        if not excel_case.get('verifiable', True):
            report['cases'].append(
                {
                    'name': case['name'],
                    'verifiable': False,
                    'reason': excel_case['reason'],
                    'health': excel_case['health'],
                    'engine': {
                        'loads': {
                            'windLoadKpa': round(case['engine']['loads']['windLoadKpa'], 4),
                            'verticalLoadKpa': round(case['engine']['loads']['verticalLoadKpa'], 4),
                        },
                        'bottom': case['engine']['bottom'],
                        'top': case['engine']['top'],
                    },
                }
            )
            continue

        report['cases'].append(
            {
                'name': case['name'],
                'verifiable': True,
                'loads': {
                    'excel': excel_case['loads'],
                    'engine': {
                        'windLoadKpa': round(case['engine']['loads']['windLoadKpa'], 4),
                        'verticalLoadKpa': round(case['engine']['loads']['verticalLoadKpa'], 4),
                    },
                },
                'bottom': compare_lists(excel_case['bottom'], case['engine']['bottom']),
                'top': compare_lists(excel_case['top'], case['engine']['top']),
            }
        )

    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    sys.exit(main())
