from __future__ import annotations

import json
import math
import shutil
import subprocess
import tempfile
from pathlib import Path

import win32com.client as win32

REPO_ROOT = Path(__file__).resolve().parent.parent
WORKBOOK_SOURCE = Path(r"C:\Users\RAN\Downloads\подбор прокатной подкрановой балки v2.0.xlsx")

SCENARIOS = [
    {"id": "S1", "loadCapacityT": 5, "craneSpanM": 24, "suspensionType": "гибкий", "dutyGroup": "3К", "craneCountInSpan": "один", "craneRail": "Р50", "beamSpanM": 6, "brakeStructure": "нет"},
    {"id": "S2", "loadCapacityT": 5, "craneSpanM": 12, "suspensionType": "гибкий", "dutyGroup": "3К", "craneCountInSpan": "один", "craneRail": "Р50", "beamSpanM": 6, "brakeStructure": "нет"},
    {"id": "S3", "loadCapacityT": 5, "craneSpanM": 30, "suspensionType": "гибкий", "dutyGroup": "3К", "craneCountInSpan": "один", "craneRail": "Р50", "beamSpanM": 6, "brakeStructure": "нет"},
    {"id": "S4", "loadCapacityT": 8, "craneSpanM": 24, "suspensionType": "гибкий", "dutyGroup": "3К", "craneCountInSpan": "один", "craneRail": "Р50", "beamSpanM": 6, "brakeStructure": "нет"},
    {"id": "S5", "loadCapacityT": 10, "craneSpanM": 36, "suspensionType": "гибкий", "dutyGroup": "3К", "craneCountInSpan": "один", "craneRail": "Р50", "beamSpanM": 6, "brakeStructure": "нет"},
    {"id": "S6", "loadCapacityT": 5, "craneSpanM": 24, "suspensionType": "жесткий", "dutyGroup": "3К", "craneCountInSpan": "один", "craneRail": "Р50", "beamSpanM": 6, "brakeStructure": "нет"},
    {"id": "S7", "loadCapacityT": 5, "craneSpanM": 24, "suspensionType": "гибкий", "dutyGroup": "7К", "craneCountInSpan": "один", "craneRail": "Р50", "beamSpanM": 6, "brakeStructure": "нет"},
    {"id": "S8", "loadCapacityT": 5, "craneSpanM": 24, "suspensionType": "гибкий", "dutyGroup": "3К", "craneCountInSpan": "два", "craneRail": "Р50", "beamSpanM": 6, "brakeStructure": "нет"},
    {"id": "S9", "loadCapacityT": 5, "craneSpanM": 24, "suspensionType": "гибкий", "dutyGroup": "3К", "craneCountInSpan": "один", "craneRail": "КР70", "beamSpanM": 6, "brakeStructure": "нет"},
    {"id": "S10", "loadCapacityT": 5, "craneSpanM": 24, "suspensionType": "гибкий", "dutyGroup": "3К", "craneCountInSpan": "один", "craneRail": "Р50", "beamSpanM": 12, "brakeStructure": "есть"},
]


def run_app_dump(tmp_dir: Path) -> dict[str, dict]:
    scenarios_path = tmp_dir / "crane-beam-scenarios.json"
    app_out_path = tmp_dir / "crane-beam-app-out.json"
    script_path = tmp_dir / "crane-beam-app-dump.ts"

    scenarios_path.write_text(json.dumps(SCENARIOS, ensure_ascii=False, indent=2), encoding="utf-8")
    script_path.write_text(
        """
import { readFileSync, writeFileSync } from 'node:fs'
import { calculateCraneBeam } from 'C:/insi-next/src/domain/crane-beam/model/calculate-crane-beam'
import { defaultCraneBeamInput } from 'C:/insi-next/src/domain/crane-beam/model/crane-beam-input'

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
  }
})

writeFileSync(process.argv[3], JSON.stringify(rows, null, 2), 'utf8')
""",
        encoding="utf-8",
    )

    subprocess.run(
        ["npx.cmd", "tsx", str(script_path), str(scenarios_path), str(app_out_path)],
        cwd=REPO_ROOT,
        check=True,
    )

    return {item["id"]: item for item in json.loads(app_out_path.read_text(encoding="utf-8"))}


def set_excel_inputs(ws, scenario: dict) -> None:
    ws.Range("B1").Value = scenario["loadCapacityT"]
    ws.Range("B2").Value = scenario["craneSpanM"]
    ws.Range("B4").Value = 4
    ws.Range("B8").Value = scenario["suspensionType"]
    ws.Range("B9").Value = scenario["dutyGroup"]
    ws.Range("B11").Value = scenario["craneCountInSpan"]
    ws.Range("B13").Value = scenario["craneRail"]
    ws.Range("B17").Value = scenario["beamSpanM"]
    ws.Range("B18").Value = scenario["brakeStructure"]
    ws.Range("B19").Value = 0


def clean(value) -> str:
    if value is None:
        return ""
    return str(value).replace("\xa0", " ").strip()


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        workbook_copy = tmp_dir / WORKBOOK_SOURCE.name
        shutil.copy2(WORKBOOK_SOURCE, workbook_copy)

        app_rows = run_app_dump(tmp_dir)

        excel = win32.DispatchEx("Excel.Application")
        excel.Visible = False
        excel.DisplayAlerts = False
        excel.AskToUpdateLinks = False

        try:
            workbook = excel.Workbooks.Open(str(workbook_copy), UpdateLinks=0)
            ws_summary = workbook.Worksheets("Сводка")
            ws_calculation = workbook.Worksheets("Расчет")

            report_rows: list[dict] = []

            for scenario in SCENARIOS:
                set_excel_inputs(ws_summary, scenario)
                excel.CalculateFullRebuild()

                excel_row = {
                    "profile": clean(ws_summary.Range("B85").Value),
                    "weightKg": float(ws_summary.Range("B86").Value or 0),
                    "utilization": float(ws_calculation.Range("C14").Value or 0),
                    "maxUtilizationPercent": float(ws_summary.Range("C84").Value or 0),
                    "mx": float(ws_summary.Range("B68").Value or 0),
                    "my": float(ws_summary.Range("B69").Value or 0),
                    "q": float(ws_summary.Range("B70").Value or 0),
                    "qop": float(ws_summary.Range("B72").Value or 0),
                }
                app_row = app_rows[scenario["id"]]

                matches = {
                    "profile": excel_row["profile"] == app_row["profile"],
                    "weightKg": math.isclose(excel_row["weightKg"], app_row["weightKg"], rel_tol=1e-9, abs_tol=1e-6),
                    "utilization": math.isclose(excel_row["utilization"], app_row["utilization"], rel_tol=1e-9, abs_tol=1e-9),
                    "maxUtilizationPercent": math.isclose(excel_row["maxUtilizationPercent"], app_row["maxUtilizationPercent"], rel_tol=1e-9, abs_tol=1e-9),
                    "mx": math.isclose(excel_row["mx"], app_row["mx"], rel_tol=1e-9, abs_tol=1e-9),
                    "my": math.isclose(excel_row["my"], app_row["my"], rel_tol=1e-9, abs_tol=1e-9),
                    "q": math.isclose(excel_row["q"], app_row["q"], rel_tol=1e-9, abs_tol=1e-9),
                    "qop": math.isclose(excel_row["qop"], app_row["qop"], rel_tol=1e-9, abs_tol=1e-9),
                }

                report_rows.append(
                    {
                        "id": scenario["id"],
                        "scenario": scenario,
                        "excel": excel_row,
                        "app": app_row,
                        "matches": matches,
                    }
                )

            print(json.dumps(report_rows, ensure_ascii=False, indent=2))
        finally:
            try:
                workbook.Close(SaveChanges=False)
            except Exception:
                pass
            excel.Quit()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
