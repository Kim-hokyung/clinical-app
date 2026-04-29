import React, { useState } from "react";

export default function App() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const handleAnalyze = () => {
    const date = new Date().toISOString().slice(0, 10);

    // 간단 파싱 (핵심 값 추출)
    const getVal = (name) => {
      const regex = new RegExp(name + ".*?(\\d+\\.?\\d*)");
      const match = input.match(regex);
      return match ? parseFloat(match[1]) : null;
    };

    const Na = getVal("Na");
    const K = getVal("K");
    const Cl = getVal("Cl");
    const BUN = getVal("BUN");
    const Cr = getVal("Creatinine");
    const CRP = getVal("CRP");
    const Hb = getVal("Hb");
    const CO2 = getVal("TotalCO2");

    // 계산
    const AG = Na && Cl && CO2 ? (Na - Cl - CO2).toFixed(1) : "";
    const ratio = BUN && Cr ? (BUN / Cr).toFixed(1) : "";

    // ▲ ▼ 판단
    const mark = (val, low, high) => {
      if (val === null) return "";
      if (val < low) return `${val} ▼`;
      if (val > high) return `${val} ▲`;
      return val;
    };

    // 1. 최종결과보고
    const report = `#${date}
◆최종결과보고◆
▶임상화학검사
Na/K/Cl=${mark(Na,136,146)}/${mark(K,3.5,5.1)}/${mark(Cl,98,110)}
BUN/Cr=${mark(BUN,8,25)}/${mark(Cr,0.6,1.2)}
TotalCO2=${mark(CO2,22,29)} , CRP=${mark(CRP,0,0.5)}

▶진단혈액검사
Hb=${mark(Hb,12,16)}
`;

    // 2. 비정상 요약
    let abnormal = `#${date}
◆비정상 수치 요약◆\n`;

    if (Na && Na < 130) abnormal += "- 저나트륨혈증\n";
    if (CRP && CRP > 0.5) abnormal += "- 염증 반응 증가\n";
    if (Hb && Hb < 10) abnormal += "- 빈혈\n";
    if (CO2 && CO2 < 22) abnormal += "- 대사성 산증\n";

    abnormal += `
<<현재체액상태>>
AG=${AG}
BUN/Cr=${ratio}
`;

    // 3. 임상해석
    const interpretation = `#${date}
[검사결과임상해석]

${Na && Na < 130 ? "1.전해질\n- 저나트륨혈증\n" : ""}
${CO2 && CO2 < 22 ? "2.산염기\n- 대사성 산증\n" : ""}
${CRP && CRP > 0.5 ? "3.염증\n- 감염 가능성\n" : ""}
${Hb && Hb < 10 ? "4.혈액\n- 빈혈\n" : ""}

[한줄요약]
이상 소견 기반 임상 판단 필요
`;

    setOutput(report + "\n\n" + abnormal + "\n\n" + interpretation);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>임상결과 자동 정리</h2>

      <textarea
        rows={10}
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
