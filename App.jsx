import React, { useState } from "react";
import * as XLSX from "xlsx";

const today = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
const slash = (d) => d.replaceAll("-", "/");

function val(text, keys) {
  for (const key of keys) {
    const r = new RegExp(`${key}[^\\n\\d.-]*([<>]?[0-9]+\\.?[0-9]*)`, "i");
    const m = text.match(r);
    if (m) return Number(m[1].replace(/[<>]/g, ""));
  }
  return "";
}

function str(text, keys) {
  for (const key of keys) {
    const r = new RegExp(`${key}[^\\n]*`, "i");
    const m = text.match(r);
    if (m) return m[0];
  }
  return "";
}

const f = (v, n = 1) =>
  v === "" || v === null || isNaN(v)
    ? ""
    : Number(v).toFixed(n).replace(/\.0$/, "");

const mark = (v, low, high) =>
  v === "" ? "" : v < low ? `${f(v)} ▼` : v > high ? `${f(v)} ▲` : f(v);

function urineValue(line) {
  if (!line) return "";
  if (/Negative/i.test(line)) return "(-)";
  const p = line.match(/([123])\s*Positive/i);
  if (p) return `${p[1]}(+)`;
  if (/Positive/i.test(line)) return "(+)";
  if (/Trace/i.test(line)) return "Trace";
  if (/Many/i.test(line)) return "Many";
  if (/Bacteria are seen/i.test(line)) return "Bacteria are seen";
  if (/Not Found/i.test(line)) return "Not Found";
  const range = line.match(/[0-9]+~[0-9]+/);
  if (range) return range[0];
  return "";
}

function gfrCkdEpi2021(cr, age = 66, sex = "F") {
  if (!cr) return "";
  const female = sex === "F";
  const k = female ? 0.7 : 0.9;
  const alpha = female ? -0.241 : -0.302;
  const min = Math.min(cr / k, 1);
  const max = Math.max(cr / k, 1);
  const gfr = 142 * Math.pow(min, alpha) * Math.pow(max, -1.2) * Math.pow(0.9938, age) * (female ? 1.012 : 1);
  return gfr;
}

function gfrStage(gfr) {
  if (gfr === "") return "";
  if (gfr >= 90) return "G1";
  if (gfr >= 60) return "G2";
  if (gfr >= 45) return "G3a";
  if (gfr >= 30) return "G3b";
  if (gfr >= 15) return "G4";
  return "G5";
}

function parse(text) {
  const sexMatch = text.match(/\((M|F)\/(\d+)\)/i);
  const sex = sexMatch ? sexMatch[1].toUpperCase() : "F";
  const age = sexMatch ? Number(sexMatch[2]) : 66;

  return {
    sex, age,
    protein: val(text, ["Protein, total", "Protein"]),
    albumin: val(text, ["Albumin\\(S\\)", "Albumin"]),
    bili: val(text, ["Bilirubin, total"]),
    ast: val(text, ["AST\\(SGOT\\)", "AST"]),
    alt: val(text, ["ALT\\(SGPT\\)", "ALT"]),
    alp: val(text, ["ALP", "Alkaline"]),
    ggt: val(text, ["γ-GT", "GGT", "r-GT"]),
    chol: val(text, ["Cholesterol, total"]),
    tg: val(text, ["Triglyceride"]),
    glucose: val(text, ["Glucose\\(S\\)", "Glucose"]),
    na: val(text, ["Na\\(Sodium\\)", "Na\\(S\\)", "Na"]),
    k: val(text, ["K\\(Potassium\\)", "K\\(S\\)", "K"]),
    cl: val(text, ["Cl\\(Chloride\\)", "Cl\\(S\\)", "Cl"]),
    mg: val(text, ["Mg\\(Magnesium\\)", "Mg"]),
    ca: val(text, ["Ionized Ca", "Ca"]),
    p: val(text, ["Inorganic phosphorus", "Phosphorus"]),
    nau: val(text, ["Na\\(U\\)"]),
    ku: val(text, ["K\\(U\\)"]),
    clu: val(text, ["Cl\\(U\\)"]),
    bun: val(text, ["BUN\\(S\\)", "BUN"]),
    cr: val(text, ["Creatinine\\(S\\)", "Creatinine"]),
    bunu: val(text, ["BUN\\(U\\)"]),
    cru: val(text, ["Creatinine\\(U\\)"]),
    co2: val(text, ["Total CO2", "TotalCO2"]),
    crp: val(text, ["CRP\\(정량\\)", "CRP"]),
    pct: val(text, ["Procalcitonin"]),
    lactate: val(text, ["Lactic acid", "Lactate"]),
    wbc: val(text, ["WBC"]),
    rbc: val(text, ["RBC"]),
    plt: val(text, ["Platelet"]),
    hb: val(text, ["Hb"]),
    hct: val(text, ["Hct"]),
    mcv: val(text, ["MCV"]),
    mch: val(text, ["MCH"]),
    mchc: val(text, ["MCHC"]),
    seg: val(text, ["Seg neutrophil", "Seg"]),
    lymph: val(text, ["Lymphocyte"]),
    mono: val(text, ["Monocyte"]),
    eos: val(text, ["Eosinophil"]),
    baso: val(text, ["Basophil"]),
    nrbc: val(text, ["N-RBC"]),
    blast: val(text, ["Blast"]),
    phu: val(text, ["pH\\(U\\)"]),
    sg: val(text, ["Specific Gravity\\(U\\)", "SG\\(U\\)"]),
    uosm: val(text, ["Osmolality\\(U\\)", "Uosm"]),
    bloodu: str(text, ["Blood\\(U\\)"]),
    wbcu: str(text, ["WBC\\(U\\)"]),
    urob: str(text, ["Urobilinogen\\(U\\)"]),
    nitrite: str(text, ["Nitrite\\(U\\)"]),
    ketone: str(text, ["Ketone\\(U\\)"]),
    proteinU: str(text, ["Protein\\(U\\)"]),
    urbc: str(text, ["요침사\\(RBC\\)"]),
    uwbc: str(text, ["요침사\\(WBC\\)"]),
    ep: str(text, ["요침사\\(EP Cell\\)", "요침사\\(EPCell\\)"]),
    cast: str(text, ["요침사\\(Cast\\)"]),
    bacteria: str(text, ["요침사\\(Bacteria\\)"]),
  };
}

function calc(d) {
  const gfr = gfrCkdEpi2021(d.cr, d.age, d.sex);
  return {
    sosm: d.na && d.glucose && d.bun ? 2 * d.na + d.glucose / 18 + d.bun / 2.8 : "",
    buncr: d.bun && d.cr ? d.bun / d.cr : "",
    fena: d.nau && d.cr && d.na && d.cru ? (d.nau * d.cr) / (d.na * d.cru) * 100 : "",
    feu: d.bunu && d.cr && d.bun && d.cru ? (d.bunu * d.cr) / (d.bun * d.cru) * 100 : "",
    ag: d.na && d.cl && d.co2 ? d.na - (d.cl + d.co2) : "",
    uag: d.nau && d.ku && d.clu ? d.nau + d.ku - d.clu : "",
    gfr,
    stage: gfrStage(gfr),
  };
}

function report(d, c, date) {
  return `#${date}
◆최종결과보고◆(검체채취일:${slash(date)})
▶임상화학검사
Protein:Albumin=${mark(d.protein,6.6,8.3)}/${mark(d.albumin,3.5,5.2)}
Bilirubin,total=${f(d.bili)}
AST:ALT=${mark(d.ast,0,40)}/${mark(d.alt,0,40)}
ALP:γ-GT=${mark(d.alp,30,120)}/${mark(d.ggt,0,64)}
Cholesterol,total:Triglyceride=${f(d.chol)}/${mark(d.tg,0,150)}
Glucose:${mark(d.glucose,60,100)}
Na:K:Cl=${mark(d.na,136,146)}/${mark(d.k,3.5,5.1)}/${mark(d.cl,101,109)}
Mg:Ca²⁺:P=${mark(d.mg,1.6,2.6)}/${mark(d.ca,1.16,1.32)}/${mark(d.p,2.5,4.5)}
Na(U):K(U):Cl(U)=${f(d.nau)}/${f(d.ku)}/${f(d.clu)}
BUN:Creatinine=${mark(d.bun,7.9,25)}/${mark(d.cr,0.55,0.98)}
BUN(U):Creatinine(U)=${f(d.bunu)}/${f(d.cru)}
TotalCO2:${mark(d.co2,22,29)}
CRP:Procalcitonin=${mark(d.crp,0,0.5)}/${mark(d.pct,0,0.5)}
Lactic acid=${f(d.lactate)}
▶진단혈액검사
RBC:WBC:Platelet=${mark(d.rbc,3.7,5.2)}/${mark(d.wbc,4,10)}/${mark(d.plt,150,450)}
Hb:Hct=${mark(d.hb,11.3,15)}/${mark(d.hct,32,44)}
MCV:MCH:MCHC=${mark(d.mcv,80,99.9)}/${mark(d.mch,25.7,33)}/${mark(d.mchc,32,36)}
WBC:${f(d.wbc)}/Seg:Neutrophil ${mark(d.seg,41.7,75)}
Lymphocyte:Monocyte:Eosinophil:Basophil=${mark(d.lymph,18.4,45)}/${f(d.mono)}/${f(d.eos)}/${f(d.baso)}
N-RBC:Blast=${f(d.nrbc)}/${f(d.blast)}
▶뇨화학및검경검사
1.Routineurine(10종)
pH(U) ${f(d.phu)},SG(U):${f(d.sg,3)}
Blood(U):${urineValue(d.bloodu)} / WBC(U):${urineValue(d.wbcu)} / Urobilinogen(U):${urineValue(d.urob)}
Nitrite(U):${urineValue(d.nitrite)} , Ketone(U):${urineValue(d.ketone)} , Protein(U):${urineValue(d.proteinU)}\n
2.요침사검사
요침사(RBC):${urineValue(d.urbc)}/요침사(WBC):${urineValue(d.uwbc)}/요침사(EPCell):${urineValue(d.ep)}
요침사(Cast):${urineValue(d.cast)}/요침사(Bacteria):${urineValue(d.bacteria)}`;
}

function summary(d, c, date) {
  const abn = [];
  if (d.protein < 6.6 || d.albumin < 3.5) abn.push(`- Protein/Albumin: ${mark(d.protein,6.6,8.3)} / ${mark(d.albumin,3.5,5.2)}`);
  if (d.alp > 120 || d.ggt > 64) abn.push(`- ALP/γ-GT: ${mark(d.alp,30,120)} / ${mark(d.ggt,0,64)}`);
  if (d.crp > 0.5 || d.wbc > 10) abn.push(`- WBC/CRP: ${mark(d.wbc,4,10)} / ${mark(d.crp,0,0.5)}`);
  if (d.hb < 11.3) abn.push(`- Hb/Hct: ${mark(d.hb,11.3,15)} / ${mark(d.hct,32,44)}`);
  if (d.na < 136) abn.push(`- Na: ${mark(d.na,136,146)}`);
  if (d.co2 < 22) abn.push(`- TotalCO2: ${mark(d.co2,22,29)}`);

  return `#${date}
◆비정상 수치 요약◆
▶임상화학 및 혈액 비정상 소견
${abn.length ? abn.join("\n") : "- 특이 비정상 소견 없음"}
<<현재체액상태>>
·Na(S)=${f(d.na)}, Sosm=${mark(c.sosm,275,295)}
·Na(U)=${f(d.nau)}, Uosm=${f(d.uosm)}
·SG(U)=${f(d.sg,3)}, pH(U)=${f(d.phu)}
·BUN/Cr.=${f(c.buncr)}
·FENa=${f(c.fena,2)}%, FEUrea=${f(c.feu,2)}%
·GFR: ${f(c.gfr,1)} mL/min/1.73m² (${c.stage})
·TotalCO2=${f(d.co2)}
·Lactic acid:${f(d.lactate)} , Ketone(U):${urineValue(d.ketone)}
·AG(anion gap)=${f(c.ag)}
·uAG(urine aniongap)=${mark(c.uag,-999,0)}
·Cl(S):Cl(U)=${f(d.cl)}:${f(d.clu)}`;
}

function interpretation(d, c, date) {
  const parts = [];
  if (d.na < 136) parts.push(`1.전해질상태\n- 저나트륨혈증 소견으로 체액상태 및 원인 평가 필요.`);
  if (d.co2 < 22 || c.ag > 16) parts.push(`2.산염기상태\n- TotalCO2 및 AG 기준 대사성 산증 가능성 평가 필요.`);
  if (d.cr > 0.98 || c.fena > 2 || c.feu > 50) parts.push(`3.신장기능\n- Cr/BUN 및 FENa, FEUrea 기준 신장성 원인 감별 필요.`);
  if (urineValue(d.wbcu) || urineValue(d.bacteria) || urineValue(d.nitrite)) parts.push(`4.소변검사\n- 요검사 이상 소견 확인되며 요로감염 여부 평가 필요.`);
  if (d.alp > 120 || d.ggt > 64) parts.push(`5.간담도\n- ALP/γ-GT 상승으로 간담도계 부하 가능성.`);
  if (d.crp > 0.5 || d.pct > 0.5 || d.wbc > 10) parts.push(`6.종합임상판단\n- 염증/감염 소견 동반되어 임상증상과 배양검사 확인 필요.`);

  return `#${date}
[검사결과임상해석]
${parts.length ? parts.join("\n") : "- 특이 임상 이상 소견 뚜렷하지 않음."}
[한줄요약]
#${date}
- 주요 검사 이상 소견에 따른 임상적 추적 필요.`;
}

function ResultBox({ title, text }) {
  return (
    <div style={styles.box}>
      <div style={styles.boxTop}>
        <b>{title}</b>
        <button onClick={() => navigator.clipboard.writeText(text)} style={styles.copy}>복사</button>
      </div>
      <pre style={styles.pre}>{text}</pre>
    </div>
  );
}

export default function App() {
  const [text, setText] = useState("");
  const [out, setOut] = useState([]);

  const readFile = async (file) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      let t = "";
      wb.SheetNames.forEach(s => {
        XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1 }).forEach(r => t += r.join(" ") + "\n");
      });
      setText(t);
    } else if (name.endsWith(".txt")) {
      setText(await file.text());
    } else {
      alert("엑셀(.xlsx/.xls) 또는 텍스트(.txt)만 지원합니다.");
    }
  };

  const run = () => {
    const d = parse(text);
    const c = calc(d);
    const date = today();
    setOut([
      ["최종결과보고", report(d, c, date)],
      ["비정상 수치 요약 및 현재체액상태", summary(d, c, date)],
      ["검사결과 임상해석", interpretation(d, c, date)],
    ]);
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1>Clinical Assistant</h1>
        <p>검사결과 · 균배양 · 초진차트 · 진단서류 · 약품정리</p>
      </header>
      <main style={styles.card}>
        <h2>검사결과 정리</h2>
        <input type="file" accept=".xlsx,.xls,.txt" onChange={e => readFile(e.target.files[0])} />
        <textarea style={styles.textarea} value={text} onChange={e => setText(e.target.value)} />
        <button onClick={run} style={styles.run}>정리하기</button>
        {out.map(([title, text], i) => <ResultBox key={i} title={title} text={text} />)}
      </main>
    </div>
  );
}

const styles = {
  page: { background: "#eef3f8", minHeight: "100vh", fontFamily: "Arial" },
  header: { background: "#1f3b5c", color: "white", padding: 28, textAlign: "center" },
  card: { background: "white", maxWidth: 1100, margin: "28px auto", padding: 26, borderRadius: 12 },
  textarea: { width: "100%", height: 220, marginTop: 14, padding: 12, boxSizing: "border-box" },
  run: { marginTop: 14, background: "#2b8fd8", color: "white", border: 0, padding: "12px 22px" },
  box: { marginTop: 22, background: "#f1f5f9", border: "1px solid #d8e1ea" },
  boxTop: { display: "flex", justifyContent: "space-between", padding: 10, background: "#e2e8f0" },
  copy: { padding: "6px 12px" },
  pre: { padding: 16, whiteSpace: "pre-wrap", overflowX: "hidden", lineHeight: 1.45, fontSize: 14 },
};
