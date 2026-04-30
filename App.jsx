import React, { useMemo, useState } from "react";

const todayKST = () => {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
};

const toSlash = (d) => d.replaceAll("-", "/");

const num = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const fmt = (v, digit = 1) => {
  if (v === null || v === undefined || v === "") return "";
  if (!Number.isFinite(Number(v))) return String(v);
  return Number(v).toFixed(digit).replace(/\.0$/, "");
};

const mark = (v, low, high) => {
  const n = num(v);
  if (n === null) return "";
  if (n < low) return `${fmt(n)} ▼`;
  if (n > high) return `${fmt(n)} ▲`;
  return `${fmt(n)}`;
};

const findVal = (text, names) => {
  for (const name of names) {
    const re = new RegExp(`${name}[^\\n\\d.-]*([<>]?[\\d.]+)`, "i");
    const m = text.match(re);
    if (m) return num(m[1]);
  }
  return null;
};

function parseLab(text) {
  return {
    protein: findVal(text, ["Protein, total", "Protein total", "Protein"]),
    albumin: findVal(text, ["Albumin\\(S\\)", "Albumin"]),
    bilirubin: findVal(text, ["Bilirubin, total"]),
    ast: findVal(text, ["AST\\(SGOT\\)", "AST"]),
    alt: findVal(text, ["ALT\\(SGPT\\)", "ALT"]),
    alp: findVal(text, ["ALP", "Alkaline"]),
    ggt: findVal(text, ["γ-GT", "r-GT", "GGT"]),
    chol: findVal(text, ["Cholesterol, total"]),
    tg: findVal(text, ["Triglyceride"]),
    bun: findVal(text, ["BUN\\(S\\)", "BUN"]),
    cr: findVal(text, ["Creatinine\\(S\\)", "Creatinine"]),
    glucose: findVal(text, ["Glucose\\(S\\)", "Glucose"]),
    p: findVal(text, ["Inorganic phosphorus", "Phosphorus"]),
    ca: findVal(text, ["Ionized Ca", "Ca"]),
    mg: findVal(text, ["Mg\\(Magnesium\\)", "Magnesium"]),
    na: findVal(text, ["Na\\(Sodium\\)", "Na\\(S\\)", "Na"]),
    k: findVal(text, ["K\\(Potassium\\)", "K\\(S\\)", "K"]),
    cl: findVal(text, ["Cl\\(Chloride\\)", "Cl\\(S\\)", "Cl"]),
    co2: findVal(text, ["Total CO2", "TotalCO2"]),
    nau: findVal(text, ["Na\\(U\\)"]),
    ku: findVal(text, ["K\\(U\\)"]),
    clu: findVal(text, ["Cl\\(U\\)"]),
    cru: findVal(text, ["Creatinine\\(U\\)"]),
    bunu: findVal(text, ["BUN\\(U\\)"]),
    pct: findVal(text, ["Procalcitonin"]),
    lactate: findVal(text, ["Lactic acid", "Lactate"]),
    wbc: findVal(text, ["WBC"]),
    rbc: findVal(text, ["RBC"]),
    hb: findVal(text, ["Hb"]),
    hct: findVal(text, ["Hct"]),
    plt: findVal(text, ["Platelet"]),
    mcv: findVal(text, ["MCV"]),
    mch: findVal(text, ["MCH"]),
    mchc: findVal(text, ["MCHC"]),
    seg: findVal(text, ["Seg neutrophil", "Seg"]),
    lymph: findVal(text, ["Lymphocyte"]),
    mono: findVal(text, ["Monocyte"]),
    eos: findVal(text, ["Eosinophil"]),
    baso: findVal(text, ["Basophil"]),
    nrbc: findVal(text, ["N-RBC"]),
    blast: findVal(text, ["Blast"]),
    crp: findVal(text, ["CRP\\(정량\\)", "CRP"]),
    uosm: findVal(text, ["Osmolality\\(U\\)", "Uosm"]),
    sg: findVal(text, ["Specific Gravity\\(U\\)", "SG\\(U\\)"]),
    phu: findVal(text, ["pH\\(U\\)"]),
    raw: text
  };
}

function calc(d) {
  const sosm =
    d.na !== null && d.glucose !== null && d.bun !== null
      ? 2 * d.na + d.glucose / 18 + d.bun / 2.8
      : null;

  const ag =
    d.na !== null && d.cl !== null && d.co2 !== null
      ? d.na - (d.cl + d.co2)
      : null;

  const uag =
    d.nau !== null && d.ku !== null && d.clu !== null
      ? d.nau + d.ku - d.clu
      : null;

  const buncr = d.bun !== null && d.cr ? d.bun / d.cr : null;

  const fena =
    d.nau !== null && d.cr !== null && d.na !== null && d.cru
      ? ((d.nau * d.cr) / (d.na * d.cru)) * 100
      : null;

  const feu =
    d.bunu !== null && d.cr !== null && d.bun !== null && d.cru
      ? ((d.bunu * d.cr) / (d.bun * d.cru)) * 100
      : null;

  return { sosm, ag, uag, buncr, fena, feu };
}

function buildReport(d, c, date) {
  return `#${date}
◆최종결과보고◆(검체채취일:${toSlash(date)})
▶임상화학검사
Protein:Albumin=${mark(d.protein, 6.6, 8.3)}/${mark(d.albumin, 3.5, 5.2)}
Bilirubin,total=${fmt(d.bilirubin)}
AST:ALT=${mark(d.ast, 0, 40)}/${mark(d.alt, 0, 40)}
ALP:γ-GT=${mark(d.alp, 30, 120)}/${mark(d.ggt, 0, 64)}
Cholesterol,total:Triglyceride=${fmt(d.chol)}/${mark(d.tg, 0, 150)}
Glucose:${mark(d.glucose, 60, 100)}
Na:K:Cl=${mark(d.na, 136, 146)}/${mark(d.k, 3.5, 5.1)}/${mark(d.cl, 101, 109)}
Mg:Ca²⁺:P=${mark(d.mg, 1.6, 2.6)}/${mark(d.ca, 1.16, 1.32)}/${mark(d.p, 2.5, 4.5)}
Na(U):K(U):Cl(U)=${fmt(d.nau)}/${fmt(d.ku)}/${fmt(d.clu)}
BUN:Creatinine=${mark(d.bun, 7.9, 25)}/${mark(d.cr, 0.55, 0.98)}
BUN(U):Creatinine(U)=${fmt(d.bunu)}/${fmt(d.cru)}
TotalCO2:${mark(d.co2, 22, 29)}
CRP:Procalcitonin=${mark(d.crp, 0, 0.5)}/${mark(d.pct, 0, 0.5)}
Lactic acid=${fmt(d.lactate)}

▶진단혈액검사
RBC:WBC:Platelet=${mark(d.rbc, 3.7, 5.2)}/${mark(d.wbc, 4, 10)}/${mark(d.plt, 150, 450)}
Hb:Hct=${mark(d.hb, 11.3, 15)}/${mark(d.hct, 32, 44)}
MCV:MCH:MCHC=${mark(d.mcv, 80, 99.9)}/${mark(d.mch, 25.7, 33)}/${mark(d.mchc, 32, 36)}
WBC:${fmt(d.wbc)}/Seg:Neutrophil ${mark(d.seg, 41.7, 75)}
Lymphocyte:Monocyte:Eosinophil:Basophil=${mark(d.lymph, 18.4, 45)}/${fmt(d.mono)}/${fmt(d.eos)}/${fmt(d.baso)}
N-RBC:Blast=${fmt(d.nrbc)}/${fmt(d.blast)}`;
}

function abnormalSummary(d, c, date) {
  const lines = [];

  if (d.protein < 6.6 || d.albumin < 3.5)
    lines.push(`- Protein/Albumin: ${mark(d.protein,6.6,8.3)} / ${mark(d.albumin,3.5,5.2)} (저단백/저알부민 소견)`);
  if (d.alp > 120 || d.ggt > 64)
    lines.push(`- ALP/γ-GT: ${mark(d.alp,30,120)} / ${mark(d.ggt,0,64)} (간담도계 부하 가능성)`);
  if (d.crp > 0.5 || d.wbc > 10)
    lines.push(`- WBC/CRP: ${mark(d.wbc,4,10)} / ${mark(d.crp,0,0.5)} (염증 반응 증가)`);
  if (d.hb < 11.3)
    lines.push(`- Hb/Hct: ${mark(d.hb,11.3,15)} / ${mark(d.hct,32,44)} (빈혈 소견)`);
  if (d.co2 < 22)
    lines.push(`- TotalCO2: ${mark(d.co2,22,29)} (대사성 산증 의심)`);
  if (d.na < 136)
    lines.push(`- Na: ${mark(d.na,136,146)} (저나트륨혈증)`);

  return `#${date}
◆비정상 수치 요약◆
▶임상화학 및 혈액 비정상 소견
${lines.length ? lines.join("\n") : "- 특이 비정상 소견 없음"}

<<현재체액상태>>
Na(S)=${fmt(d.na)}, Sosm=${mark(c.sosm,275,295)}
Na(U)=${fmt(d.nau)}, Uosm=${fmt(d.uosm)}
SG(U)=${fmt(d.sg,3)}, pH(U)=${fmt(d.phu)}
BUN/Cr.=${fmt(c.buncr)}
FENa=${fmt(c.fena,2)}%, FEUrea=${fmt(c.feu,2)}%
TotalCO2=${fmt(d.co2)}, AG=${fmt(c.ag)}
uAG=${mark(c.uag, -999, 0)}
Cl(S):Cl(U)=${fmt(d.cl)}:${fmt(d.clu)}`;
}

function interpretation(d, c, date) {
  const parts = [];

  if (d.na < 136 || c.sosm < 275)
    parts.push(`1.전해질상태
- Na ${fmt(d.na)}로 저나트륨혈증 소견.
- Sosm ${fmt(c.sosm)}로 저삼투 상태 여부 확인 필요.`);

  if (d.co2 < 22 || c.ag > 16)
    parts.push(`2.산염기상태
- TotalCO2 ${fmt(d.co2)}로 감소 소견.
- AG ${fmt(c.ag)}로 대사성 산증 여부 평가 필요.`);

  if (d.cr > 0.98 || c.fena > 2 || c.feu > 50)
    parts.push(`3.신장기능
- Cr ${fmt(d.cr)}, BUN/Cr ${fmt(c.buncr)}.
- FENa ${fmt(c.fena,2)}%, FEUrea ${fmt(c.feu,2)}%로 신장성/신전성 원인 감별 필요.`);

  if (d.crp > 0.5 || d.wbc > 10 || d.pct > 0.5)
    parts.push(`4.염증/감염
- CRP ${fmt(d.crp)}, PCT ${fmt(d.pct)}, WBC ${fmt(d.wbc)}.
- 감염 또는 염증 반응 가능성 있음.`);

  if (d.hb < 11.3)
    parts.push(`5.혈액
- Hb ${fmt(d.hb)}로 빈혈 소견.`);

  if (d.alp > 120 || d.ggt > 64)
    parts.push(`6.간담도
- ALP ${fmt(d.alp)}, γ-GT ${fmt(d.ggt)} 상승으로 간담도계 부하 가능성.`);

  const summary =
    d.crp > 0.5 || d.pct > 0.5
      ? "- 염증/감염 소견 동반되어 임상 증상 및 배양검사 확인 필요."
      : d.na < 136
      ? "- 저나트륨혈증 중심으로 체액 상태 평가 필요."
      : "- 주요 검사 이상 소견에 따른 임상적 추적 필요.";

  return `#${date}
[검사결과임상해석]
${parts.length ? parts.join("\n\n") : "- 특이 임상 이상 소견 뚜렷하지 않음."}

[한줄요약]
#${date}
${summary}`;
}

export default function App() {
  const [activeTab, setActiveTab] = useState("lab");
  const [input, setInput] = useState("");
  const [results, setResults] = useState([]);

  const analyzeLab = () => {
    const date = todayKST();
    const d = parseLab(input);
    const c = calc(d);
    setResults([
      buildReport(d, c, date),
      abnormalSummary(d, c, date),
      interpretation(d, c, date),
    ]);
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1>Clinical Assistant</h1>
        <p>임상검사 · 균배양 · 초진차트 · 진단서류 · 약품정리</p>
      </header>

      <nav style={styles.nav}>
        {[
          ["lab", "검사결과"],
          ["culture", "균배양"],
          ["chart", "초진차트"],
          ["doc", "진단서류"],
          ["drug", "약품정리"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={activeTab === key ? styles.activeBtn : styles.btn}
          >
            {label}
          </button>
        ))}
      </nav>

      <main style={styles.card}>
        {activeTab === "lab" && (
          <>
            <h2>검사결과 정리</h2>
            <textarea
              style={styles.textarea}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="검사결과 텍스트를 붙여넣으세요"
            />
            <button style={styles.run} onClick={analyzeLab}>정리하기</button>

            <div style={styles.resultArea}>
              {results.map((r, i) => (
                <pre key={i} style={styles.result}>{r}</pre>
              ))}
            </div>
          </>
        )}

        {activeTab !== "lab" && (
          <div style={styles.ready}>
            <h2>{activeTab} 기능</h2>
            <p>다음 단계에서 구현합니다.</p>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#eef3f8",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    background: "#1f3b5c",
    color: "white",
    padding: "24px",
    textAlign: "center",
  },
  nav: {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    padding: "18px",
    background: "white",
  },
  btn: {
    background: "#e8eef5",
    border: "1px solid #c9d6e2",
    padding: "10px 18px",
    cursor: "pointer",
  },
  activeBtn: {
    background: "#1f3b5c",
    color: "white",
    border: "1px solid #1f3b5c",
    padding: "10px 18px",
    cursor: "pointer",
  },
  card: {
    background: "white",
    margin: "24px auto",
    maxWidth: "1050px",
    padding: "24px",
    borderRadius: "12px",
    boxShadow: "0 4px 18px rgba(0,0,0,0.08)",
  },
  textarea: {
    width: "100%",
    minHeight: "230px",
    fontSize: "15px",
    padding: "12px",
    boxSizing: "border-box",
  },
  run: {
    marginTop: "14px",
    background: "#2b8fd8",
    color: "white",
    border: "none",
    padding: "12px 22px",
    cursor: "pointer",
  },
  resultArea: {
    marginTop: "24px",
    display: "grid",
    gap: "18px",
  },
  result: {
    background: "#f1f5f9",
    border: "1px solid #d8e1ea",
    padding: "16px",
    whiteSpace: "pre-wrap",
    lineHeight: "1.55",
    overflowX: "hidden",
    fontSize: "14px",
  },
  ready: {
    textAlign: "center",
    padding: "60px",
    color: "#666",
  },
};
