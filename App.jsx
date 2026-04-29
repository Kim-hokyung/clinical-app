import React, { useState } from "react";

export default function App() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const getVal = (name) => {
    const regex = new RegExp(name + ".*?(\\d+\\.?\\d*)");
    const match = input.match(regex);
    return match ? parseFloat(match[1]) : null;
  };

  const mark = (val, low, high) => {
    if (val === null) return "";
    if (val < low) return `${val} ▼`;
    if (val > high) return `${val} ▲`;
    return `${val}`;
  };

  const handleAnalyze = () => {
    const date = new Date().toISOString().slice(0, 10);

    const Na = getVal("Na");
    const K = getVal("K");
    const Cl = getVal("Cl");
    const BUN = getVal("BUN");
    const Cr = getVal("Creatinine");
    const CRP = getVal("CRP");
    const Hb = getVal("Hb");
    const CO2 = getVal("TotalCO2");
    const Glucose = getVal("Glucose");

    const AG = Na && Cl && CO2 ? (Na - Cl - CO2).toFixed(1) : "";
    const ratio = BUN && Cr ? (BUN / Cr).toFixed(1) : "";

    // 1. 최종결과보고
    const part1 = `#${date}
◆최종결과보고◆
▶임상화학검사
Na:K:Cl=${mark(Na,136,146)}/${mark(K,3.5,5.1)}/${mark(Cl,98,110)}
BUN:Creatinine=${mark(BUN,8,25)}/${mark(Cr,0.6,1.2)}
Glucose=${mark(Glucose,70,110)}
TotalCO2=${mark(CO2,22,29)} , CRP=${mark(CRP,0,0.5)}

▶진단혈액검사
Hb=${mark(Hb,12,16)}
`;

    // 2. 비정상 요약
    let abnormal = `#${date}
◆비정상 수치 요약◆\n`;

    if (Na && Na < 130) abnormal += "- 심한 저나트륨혈증\n";
    if (Na && Na < 136 && Na >= 130) abnormal += "- 경도 저나트륨혈증\n";
    if (CRP && CRP > 0.5) abnormal += "- 염증 반응 증가\n";
    if (Hb && Hb < 10) abnormal += "- 빈혈\n";
    if (CO2 && CO2 < 22) abnormal += "- 대사성 산증\n";
    if (Glucose && Glucose > 126) abnormal += "- 고혈당\n";

    abnormal += `
<<현재체액상태>>
Na=${Na || ""}
AG=${AG}
BUN/Cr=${ratio}
`;

    // 3. 임상해석
    const part3 = `#${date}
[검사결과임상해석]

1.전해질
${Na && Na < 130 ? "- 심한 저나트륨혈증, 즉각 교정 필요\n" : ""}

2.산염기
${CO2 && CO2 < 22 ? "- 대사성 산증 의심\n" : ""}

3.염증/감염
${CRP && CRP > 0.5 ? "- 감염 가능성 높음\n" : ""}

4.혈액
${Hb && Hb < 10 ? "- 중등도 빈혈\n" : ""}

[한줄요약]
주요 이상 수치 기반 임상적 판단 필요
`;

    setOutput(part1 + "\n\n" + abnormal + "\n\n" + part3);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>임상결과 자동 정리 (업그레이드)</h2>

      <textarea
        rows={12}
        style={{ width: "100%" }}
        placeholder="검사결과 붙여넣기"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <br /><br />

      <button onClick={handleAnalyze}>정리하기</button>

      <pre style={{ whiteSpace: "pre-wrap", marginTop: 20 }}>
        {output}
      </pre>
    </div>
  );
}
