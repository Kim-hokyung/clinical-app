import React, { useState } from "react";
import * as XLSX from "xlsx";

export default function App() {
  const [activeTab, setActiveTab] = useState("lab");

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
        {activeTab === "lab" && <LabAnalyzer />}
        {activeTab !== "lab" && (
          <div style={styles.ready}>
            <h2>준비 중</h2>
            <p>다음 단계에서 구현합니다.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function LabAnalyzer() {
  const [text, setText] = useState("");
  const [outputs, setOutputs] = useState([]);

  const today = () => {
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return kst.toISOString().slice(0, 10);
  };

  const slash = (d) => d.replaceAll("-", "/");

  const readFile = async (file) => {
    if (!file) return;

    const name = file.name.toLowerCase();

    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });

      let allText = "";
      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        rows.forEach((row) => {
          allText += row.join(" ") + "\n";
        });
      });

      setText(allText);
      return;
    }

    if (name.endsWith(".txt")) {
      const t = await file.text();
      setText(t);
      return;
    }

    alert("현재는 엑셀(.xlsx/.xls) 또는 텍스트(.txt)만 지원합니다.");
  };

  const get = (names) => {
    for (const name of names) {
      const re = new RegExp(`${name}[^\\n\\d.-]*([<>]?[0-9.]+)`, "i");
      const m = text.match(re);
      if (m) return Number(String(m[1]).replace(/[<>]/g, ""));
    }
    return "";
  };

  const fmt = (v) => {
    if (v === "" || v === null || Number.isNaN(v)) return "";
    return Number(v).toFixed(2).replace(/\.00$/, "").replace(/0$/, "");
  };

  const mark = (v, low, high) => {
    if (v === "") return "";
    if (v < low) return `${fmt(v)} ▼`;
    if (v > high) return `${fmt(v)} ▲`;
    return fmt(v);
  };

  const analyze = () => {
    const date = today();

    const d = {
      protein: get(["Protein, total", "Protein"]),
      albumin: get(["Albumin\\(S\\)", "Albumin"]),
      ast: get(["AST\\(SGOT\\)", "AST"]),
      alt: get(["ALT\\(SGPT\\)", "ALT"]),
      alp: get(["ALP", "Alkaline"]),
      ggt: get(["γ-GT", "GGT", "r-GT"]),
      glucose: get(["Glucose\\(S\\)", "Glucose"]),
      na: get(["Na\\(Sodium\\)", "Na"]),
      k: get(["K\\(Potassium\\)", "K"]),
      cl: get(["Cl\\(Chloride\\)", "Cl"]),
      bun: get(["BUN"]),
      cr: get(["Creatinine"]),
      co2: get(["Total CO2", "TotalCO2"]),
      crp: get(["CRP\\(정량\\)", "CRP"]),
      pct: get(["Procalcitonin"]),
      lactate: get(["Lactic acid", "Lactate"]),
      wbc: get(["WBC"]),
      rbc: get(["RBC"]),
      hb: get(["Hb"]),
      hct: get(["Hct"]),
      plt: get(["Platelet"]),
    };

    const ag = d.na && d.cl && d.co2 ? d.na - (d.cl + d.co2) : "";
    const buncr = d.bun && d.cr ? d.bun / d.cr : "";
    const sosm = d.na && d.glucose && d.bun ? 2 * d.na + d.glucose / 18 + d.bun / 2.8 : "";

    const block1 = `#${date}
◆최종결과보고◆(검체채취일:${slash(date)})
▶임상화학검사
Protein:Albumin=${mark(d.protein, 6.6, 8.3)}/${mark(d.albumin, 3.5, 5.2)}
AST:ALT=${mark(d.ast, 0, 40)}/${mark(d.alt, 0, 40)}
ALP:γ-GT=${mark(d.alp, 30, 120)}/${mark(d.ggt, 0, 64)}
Glucose=${mark(d.glucose, 60, 100)}
Na:K:Cl=${mark(d.na, 136, 146)}/${mark(d.k, 3.5, 5.1)}/${mark(d.cl, 101, 109)}
BUN:Creatinine=${mark(d.bun, 7.9, 25)}/${mark(d.cr, 0.55, 0.98)}
TotalCO2=${mark(d.co2, 22, 29)}
CRP:Procalcitonin=${mark(d.crp, 0, 0.5)}/${mark(d.pct, 0, 0.5)}
Lactic acid=${fmt(d.lactate)}
▶진단혈액검사
RBC:WBC:Platelet=${mark(d.rbc, 3.7, 5.2)}/${mark(d.wbc, 4, 10)}/${mark(d.plt, 150, 450)}
Hb:Hct=${mark(d.hb, 11.3, 15)}/${mark(d.hct, 32, 44)}`;

    const abnormal = [];

    if (d.protein < 6.6 || d.albumin < 3.5)
      abnormal.push(`- Protein/Albumin: ${mark(d.protein, 6.6, 8.3)} / ${mark(d.albumin, 3.5, 5.2)} (저단백/저알부민 소견)`);
    if (d.alp > 120 || d.ggt > 64)
      abnormal.push(`- ALP/γ-GT: ${mark(d.alp, 30, 120)} / ${mark(d.ggt, 0, 64)} (간담도계 부하 가능성)`);
    if (d.crp > 0.5 || d.wbc > 10)
      abnormal.push(`- WBC/CRP: ${mark(d.wbc, 4, 10)} / ${mark(d.crp, 0, 0.5)} (염증 반응 증가)`);
    if (d.hb < 11.3)
      abnormal.push(`- Hb/Hct: ${mark(d.hb, 11.3, 15)} / ${mark(d.hct, 32, 44)} (빈혈 소견)`);
    if (d.na < 136)
      abnormal.push(`- Na: ${mark(d.na, 136, 146)} (저나트륨혈증)`);
    if (d.co2 < 22)
      abnormal.push(`- TotalCO2: ${mark(d.co2, 22, 29)} (대사성 산증 의심)`);

    const block2 = `#${date}
◆비정상 수치 요약◆
▶임상화학 및 혈액 비정상 소견
${abnormal.length ? abnormal.join("\n") : "- 특이 비정상 소견 없음"}

<<현재체액상태>>
Na(S)=${fmt(d.na)}, Sosm=${mark(sosm, 275, 295)}
BUN/Cr.=${fmt(buncr)}
TotalCO2=${fmt(d.co2)}
AG=${fmt(ag)}
Cl(S)=${fmt(d.cl)}`;

    const interp = [];

    if (d.na < 136) interp.push("1.전해질상태\n- 저나트륨혈증 소견으로 체액상태 평가 필요.");
    if (d.co2 < 22 || ag > 16) interp.push("2.산염기상태\n- 대사성 산증 가능성 평가 필요.");
    if (d.cr > 0.98 || d.bun > 25) interp.push("3.신장기능\n- BUN/Creatinine 상승 여부 및 신기능 저하 평가 필요.");
    if (d.crp > 0.5 || d.wbc > 10 || d.pct > 0.5) interp.push("4.염증/감염\n- 염증 또는 감염 가능성 있음.");
    if (d.hb < 11.3) interp.push("5.혈액\n- 빈혈 소견 있음.");
    if (d.alp > 120 || d.ggt > 64) interp.push("6.간담도\n- 간담도계 부하 가능성 있음.");

    const block3 = `#${date}
[검사결과임상해석]
${interp.length ? interp.join("\n\n") : "- 특이 임상 이상 소견 뚜렷하지 않음."}

[한줄요약]
#${date}
- 주요 검사 이상 소견에 따른 임상적 추적 필요.`;

    setOutputs([block1, block2, block3]);
  };

  return (
    <>
      <h2>검사결과 정리</h2>

      <input
        type="file"
        accept=".xlsx,.xls,.txt"
        onChange={(e) => readFile(e.target.files[0])}
      />

      <textarea
        style={styles.textarea}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="엑셀/텍스트 파일을 올리거나 검사결과를 붙여넣으세요"
      />

      <button style={styles.run} onClick={analyze}>정리하기</button>

      <div style={styles.resultWrap}>
        {outputs.map((o, i) => (
          <pre key={i} style={styles.resultBox}>{o}</pre>
        ))}
      </div>
    </>
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
    marginTop: "14px",
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
  resultWrap: {
    marginTop: "24px",
    display: "grid",
    gap: "18px",
  },
  resultBox: {
    background: "#f1f5f9",
    border: "1px solid #d8e1ea",
    padding: "16px",
    whiteSpace: "pre-wrap",
    lineHeight: "1.55",
    overflowX: "hidden",
    fontSize: "14px",
  },
};
