import React, { useState } from "react";
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

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
  return 142 * Math.pow(min, alpha) * Math.pow(max, -1.2) * Math.pow(0.9938, age) * (female ? 1.012 : 1);
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
Nitrite(U):${urineValue(d.nitrite)} , Ketone(U):${urineValue(d.ketone)} , Protein(U):${urineValue(d.proteinU)}
2.요침사검사
RBC:${urineValue(d.urbc)} / WBC:${urineValue(d.uwbc)} / EPcell:${urineValue(d.ep)}
Cast:${urineValue(d.cast)} / Bacteria:${urineValue(d.bacteria)}`;
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
GFR: ${f(c.gfr,1)} mL/min/1.73m² (${c.stage})
·TotalCO2=${f(d.co2)}
·Lactic acid:${f(d.lactate)} , Ketone(U):${urineValue(d.ketone)}
·AG(anion gap)=${f(c.ag)}
·uAG(urine aniongap)=${mark(c.uag,-999,0)}
·Cl(S)/Cl(U): ${f(d.cl)} / ${f(d.clu)}`;
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

/* ================= 균배양 ================= */

async function readPdfText(file) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join("\n");
    fullText += "\n" + pageText;
  }

  return fullText;
}

function pick(patterns, text, fallback = "") {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return (m[1] || "").trim();
  }
  return fallback;
}

function normalizeCultureText(text) {
  return text
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n");
}

function extractPatientInfo(text, filename = "") {
  const compact = text.replace(/\s+/g, " ");

  // 차트번호
  const chartMatch = compact.match(/차트번호\s*([0-9-]+)/);
  const chart = chartMatch ? chartMatch[1] : "차트번호미상";

  // 이름
  const nameMatch = compact.match(/수진자명\s*([가-힣]{2,4})/);
  const name = nameMatch ? nameMatch[1] : "환자명미상";

  // 나이/성별
  const ageSexMatch = compact.match(/(\d{2,3})\s*\/?\s*(M|F)/i);
  const age = ageSexMatch ? ageSexMatch[1] : "";
  const sex = ageSexMatch ? ageSexMatch[2].toUpperCase() : "";

  // 날짜
  const dateMatch = compact.match(/검체채취일\s*(\d{4})[./-](\d{2})[./-](\d{2})/);
  const date = dateMatch
    ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`
    : today();

  return {
    chart,
    name,
    age,
    sex,
    date,
    filename,
  };
}

function extractSpecimen(text) {
  const compact = text.replace(/\s+/g, " ");
  const m = compact.match(/검\s*체\s*(Random Urine|Rectal Swab|Nasal Swab|Sputum|Blood|Urine|Stool|Wound|Throat Swab)/i);
  if (m) return m[1].trim();
  if (/Random Urine/i.test(text)) return "Random Urine";
  if (/Rectal Swab/i.test(text)) return "Rectal Swab";
  if (/Nasal Swab/i.test(text)) return "Nasal Swab";
  if (/Sputum/i.test(text)) return "Sputum";
  if (/Blood/i.test(text)) return "Blood";
  if (/Urine/i.test(text)) return "Urine";
  return "검체 확인 필요";
}

function extractOrganismNames(text) {
  const names = [];
  const known = [
    "Klebsiella pneumoniae",
    "Acinetobacter baumannii",
    "Pseudomonas aeruginosa",
    "Staphylococcus aureus",
    "Escherichia coli",
    "Enterococcus faecium",
    "Enterococcus faecalis",
    "Proteus mirabilis",
    "Enterobacter cloacae",
    "Serratia marcescens",
    "Streptococcus pneumoniae",
    "Salmonella",
    "Shigella",
    "Vibrio",
  ];

  known.forEach((k) => {
    const re = new RegExp(k.replace(/ /g, "\\s+"), "i");
    if (re.test(text) && !names.includes(k)) names.push(k);
  });

  return names;
}

function extractResistanceLabel(org, section, sList, rCount) {
  if (/MRSA|Methicillin Resistant Staphylococcus aureus/i.test(section) && /Staphylococcus aureus/i.test(org)) return "MRSA";
  if (/MRPA|Multidrug resistant Pseudomonas aeruginosa/i.test(section) && /Pseudomonas aeruginosa/i.test(org)) return "MRPA";
  if (/MRAB|Multidrug resistant Acinetobacter baumannii/i.test(section) && /Acinetobacter baumannii/i.test(org)) return "MRAB";
  if (/CRE|Carbapenem-Resistant Enterobacteriaceae/i.test(section) && /Klebsiella|Escherichia|Enterobacter/i.test(org)) return "CRE";

  if (/Klebsiella|Escherichia|Enterobacter/i.test(org) && rCount >= 8) return "CRE";
  if (/Acinetobacter baumannii/i.test(org) && rCount >= 8) return "MRAB";
  if (/Pseudomonas aeruginosa/i.test(org) && rCount >= 8) return "MRPA";
  if (/Staphylococcus aureus/i.test(org) && rCount >= 5) return "MRSA";

  return "";
}

function extractDrugResultsForOrg(text, org, index, allOrgs) {
  const lines = text.split(/\n/).map((x) => x.trim()).filter(Boolean);
  const startPatterns = [
    new RegExp(`균주\\s*${index + 1}\\s*[:：]\\s*${org.replace(/ /g, "\\s+")}`, "i"),
    new RegExp(org.replace(/ /g, "\\s+"), "i"),
  ];

  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (startPatterns.some((p) => p.test(lines[i]))) {
      start = i;
      break;
    }
  }

  let end = lines.length;
  if (start >= 0) {
    for (let i = start + 1; i < lines.length; i++) {
      const otherOrg = allOrgs.find((o) => o !== org && new RegExp(o.replace(/ /g, "\\s+"), "i").test(lines[i]));
      if (otherOrg && /균주|결과|항생제/i.test(lines[i])) {
        end = i;
        break;
      }
    }
  }

  const section = start >= 0 ? lines.slice(start, end).join("\n") : text;
  const sList = [];
  let rCount = 0;

  const drugLineRegex = /^([A-Za-z][A-Za-z\-/ ]{2,40})\s+(?:[<>=]*\s*[0-9.]+)?\s*([SIR])$/i;

  section.split(/\n/).forEach((line) => {
    const m = line.trim().match(drugLineRegex);
    if (!m) return;

    const drug = m[1].trim().replace(/\s+/g, " ");
    const result = m[2].toUpperCase();

    if (["MIC", "결과", "항생제"].some((bad) => drug.includes(bad))) return;
    if (result === "S" && !sList.includes(drug)) sList.push(drug);
    if (result === "R") rCount++;
  });

  return { sList, rCount, section };
}

function extractCultureOrganisms(text) {
  const organisms = [];
  const orgs = extractOrganismNames(text);

  if (orgs.length === 0) {
    if (/MRAB.*미검출|미검출.*MRAB/i.test(text)) organisms.push("MRAB 미검출");
    if (/Salmonella|Shigella|Vibrio/i.test(text) && /미검출/i.test(text)) {
      organisms.push("Salmonella, Shigella, Vibrio 미검출");
    }
    return organisms.length ? organisms : ["배양 및 동정결과 확인 필요"];
  }

  orgs.forEach((org, idx) => {
    const { sList, rCount, section } = extractDrugResultsForOrg(text, org, idx, orgs);
    const label = extractResistanceLabel(org, text + "\n" + section, sList, rCount);

    let line = org;
    if (label) line += ` (${label})`;
    if (sList.length > 0) line += `, S: ${sList.join(", ")}`;

    organisms.push(line);
  });

  return organisms;
}

function parseCultureReports(combinedText) {
  const chunks = combinedText
    .split(/\n=====\s*PDF_FILE:\s*/)
    .map((x) => x.trim())
    .filter((x) => x.length > 50);

  const patientMap = new Map();

  chunks.forEach((chunk) => {
    const firstLineEnd = chunk.indexOf("=====\n");
    let filename = "";
    let text = chunk;

    if (firstLineEnd >= 0) {
      filename = chunk.slice(0, firstLineEnd).replace(/=====/g, "").trim();
      text = chunk.slice(firstLineEnd + 6);
    }

    text = normalizeCultureText(text);
    const patient = extractPatientInfo(text, filename);
    const key = `${patient.chart}_${patient.name}`;

    if (!patientMap.has(key)) {
      patientMap.set(key, {
        chart: patient.chart,
        name: patient.name,
        date: patient.date,
        specimens: [],
      });
    }

    const item = patientMap.get(key);
    const specimen = extractSpecimen(text);
    const organisms = extractCultureOrganisms(text);

    item.specimens.push({
      date: patient.date,
      name: specimen,
      organisms,
      filename,
    });
  });

  return Array.from(patientMap.values()).map((patient) => {
    patient.specimens.sort((a, b) => a.name.localeCompare(b.name));
    patient.date = patient.specimens[0]?.date || patient.date || today();
    return patient;
  });
}

function formatCultureReport(result) {
  let output = "";

  output += `[${result.chart} / ${result.name}]\n`;
  output += `#${result.date}\n`;
  output += `◆최종결과보고◆(검체채취일:${slash(result.date)})\n`;

  result.specimens.forEach((item, index) => {
    output += `${index + 1}.▣ 검체명 : ${item.name}\n`;
    output += `　▣ 배양 및 동정결과:\n`;

    item.organisms.forEach((org, orgIndex) => {
      if (item.organisms.length === 1) {
        output += `　▶균주: ${org}\n`;
      } else {
        output += `　▶균주${orgIndex + 1}: ${org}\n`;
      }
    });
  });

  return output.trim();
}

/* ================= 약품정리 ================= */

const drugDB = {
  "심혈관계": [
    ["엔테론정", "포도씨건조엑스", "정맥순환개선"],
    ["실로스타졸정", "실로스타졸", "혈류개선"],
    ["딜라트렌정", "카르베딜롤", "고혈압"],
    ["로수듀오정", "로수바스타틴 + 에제티미브", "고지혈증"],
  ],
  "소화기계": [
    ["모티리톤정", "현호색·견우자추출물", "위장운동개선"],
    ["메디락에스장용캡슐", "바실루스서브틸리스균·엔테로코쿠스", "장내균조절"],
    ["가스터정", "파모티딘", "위산억제"],
    ["가스티인씨알정", "모사프리드", "위장운동촉진"],
  ],
  "비뇨기계": [
    ["젤미론캡슐", "펜토산폴리설페이트나트륨", "간질성방광염"],
    ["쏘메토연질캡슐", "세레노아레펜스추출물", "전립선비대증"],
    ["베타미가서방정", "미라베그론", "과민성방광"],
    ["하루신서방정", "탐스로신", "전립선비대증"],
    ["유로박솜캡슐", "균체용해물", "요로감염예방"],
  ],
  "신장/이뇨": [
    ["아미로정", "아미로라이드", "이뇨"],
    ["후릭스정", "푸로세미드", "이뇨"],
  ],
  "내분비계": [
    ["아마릴정", "글리메피리드", "당뇨"],
    ["네시나액트정", "알로글립틴 + 피오글리타존", "당뇨"],
  ],
};

function drugSort(input) {
  const text = input.replace(/\s+/g, "");
  let out = "작용부위        약이름              성분                              용도\n";
  out += "--------------------------------------------------------------------------\n";

  Object.entries(drugDB).forEach(([group, items]) => {
    const matched = items.filter(([name]) => text.includes(name.replace(/\s+/g, "")));
    if (!matched.length) return;

    matched.forEach(([name, comp, use], i) => {
      out += `${i === 0 ? group.padEnd(10, " ") : " ".repeat(10)}  ${name.padEnd(14, " ")}  ${comp.padEnd(30, " ")}  ${use}\n`;
    });
    out += "--------------------------------------------------------------------------\n";
  });

  return out.trim();
}

/* ================= 공통 UI ================= */

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
  const [activeTab, setActiveTab] = useState("lab");
  const [text, setText] = useState("");
  const [out, setOut] = useState([]);

  const [cultureFiles, setCultureFiles] = useState([]);
  const [cultureText, setCultureText] = useState("");
  const [cultureOut, setCultureOut] = useState([]);
  const [cultureLoading, setCultureLoading] = useState(false);

  const readFile = async (file) => {
    if (!file) return;
    const name = file.name.toLowerCase();

    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      let t = "";

      wb.SheetNames.forEach((s) => {
        XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1 }).forEach((r) => {
          t += r.join(" ") + "\n";
        });
      });

      setText(t);
    } else if (name.endsWith(".txt")) {
      setText(await file.text());
    } else {
      alert("엑셀(.xlsx/.xls) 또는 텍스트(.txt)만 지원합니다.");
    }
  };

  const handleCultureUpload = async (files) => {
    const arr = Array.from(files || []);
    if (!arr.length) return;

    setCultureFiles(arr);
    setCultureLoading(true);
    setCultureOut([]);

    try {
      let combined = "";

      for (const file of arr) {
        const pdfText = await readPdfText(file);
        combined += `\n===== PDF_FILE: ${file.name} =====\n`;
        combined += pdfText;
      }

      setCultureText(combined);
      setCultureOut(parseCultureReports(combined));
    } catch (err) {
      console.error(err);
      alert("PDF 읽기 중 오류가 발생했습니다.");
    } finally {
      setCultureLoading(false);
    }
  };

  const run = () => {
    if (activeTab === "drug") {
      setOut([["약품정리", drugSort(text)]]);
      return;
    }

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

      <div style={styles.nav}>
        <button style={activeTab === "lab" ? styles.active : styles.navBtn} onClick={() => { setActiveTab("lab"); setOut([]); }}>검사결과</button>
        <button style={activeTab === "culture" ? styles.active : styles.navBtn} onClick={() => { setActiveTab("culture"); setOut([]); }}>균배양</button>
        <button style={activeTab === "chart" ? styles.active : styles.navBtn} onClick={() => setActiveTab("chart")}>초진차트</button>
        <button style={activeTab === "doc" ? styles.active : styles.navBtn} onClick={() => setActiveTab("doc")}>진단서류</button>
        <button style={activeTab === "drug" ? styles.active : styles.navBtn} onClick={() => { setActiveTab("drug"); setOut([]); }}>약품정리</button>
      </div>

      <main style={styles.card}>
       {activeTab === "culture" && (
  <>
    <h2>균배양 PDF 테스트</h2>

    <input
      type="file"
      multiple
      accept="application/pdf"
      onChange={async (e) => {
        const files = e.target.files;
        let text = "";

        for (const file of files) {
          const buf = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(i => i.str).join("\n") + "\n";
          }
        }

        alert(text.slice(0, 500)); // 확인용
      }}
    />
  </>
)}
            <h2>검사결과 정리</h2>
            <input type="file" accept=".xlsx,.xls,.txt" onChange={(e) => readFile(e.target.files[0])} />
            <textarea
              style={styles.textarea}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="검사결과를 붙여넣거나 파일을 올리세요"
            />
            <button onClick={run} style={styles.run}>정리하기</button>
            {out.map(([title, text], i) => <ResultBox key={i} title={title} text={text} />)}
          </>
        )}

        {activeTab === "culture" && (
          <>
            <h2>균배양 PDF 정리</h2>
            <input
              type="file"
              accept="application/pdf"
              multiple
              onChange={(e) => handleCultureUpload(e.target.files)}
            />
            <p style={styles.help}>여러 환자의 PDF를 한 번에 업로드하면 차트번호/이름 기준으로 나눠 정리합니다.</p>

            {cultureLoading && <p>PDF 읽는 중입니다...</p>}

            {!!cultureFiles.length && (
              <div style={styles.fileList}>
                <b>업로드 파일</b>
                {cultureFiles.map((file, i) => <div key={i}>- {file.name}</div>)}
              </div>
            )}

            {cultureOut.map((r, i) => {
              const txt = formatCultureReport(r);
              return <ResultBox key={i} title={`균배양 결과 ${i + 1} - ${r.chart} / ${r.name}`} text={txt} />;
            })}

            {cultureText && (
              <details style={styles.details}>
                <summary>PDF 추출 원문 확인</summary>
                <pre style={styles.rawPre}>{cultureText}</pre>
              </details>
            )}
          </>
        )}

        {activeTab === "drug" && (
          <>
            <h2>약품정리</h2>
            <textarea
              style={styles.textarea}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="약 이름 목록을 붙여넣으세요"
            />
            <button onClick={run} style={styles.run}>정리하기</button>
            {out.map(([title, text], i) => <ResultBox key={i} title={title} text={text} />)}
          </>
        )}

        {activeTab === "chart" && (
          <>
            <h2>초진차트</h2>
            <p>초진차트 기능은 아직 연결되지 않았습니다.</p>
          </>
        )}

        {activeTab === "doc" && (
          <>
            <h2>진단서류</h2>
            <p>진단서류 기능은 아직 연결되지 않았습니다.</p>
          </>
        )}
      </main>
    </div>
  );
}

const styles = {
  page: { background: "#eef3f8", minHeight: "100vh", fontFamily: "Arial" },
  header: { background: "#1f3b5c", color: "white", padding: 28, textAlign: "center" },
  nav: { display: "flex", justifyContent: "center", gap: 10, background: "white", padding: 18 },
  navBtn: { padding: "10px 18px", border: "1px solid #c9d6e2", background: "#e8eef5" },
  active: { padding: "10px 18px", border: "1px solid #1f3b5c", background: "#1f3b5c", color: "white" },
  card: { background: "white", maxWidth: 1100, margin: "28px auto", padding: 26, borderRadius: 12 },
  textarea: { width: "100%", height: 220, marginTop: 14, padding: 12, boxSizing: "border-box" },
  run: { marginTop: 14, background: "#2b8fd8", color: "white", border: 0, padding: "12px 22px" },
  box: { marginTop: 22, background: "#f1f5f9", border: "1px solid #d8e1ea" },
  boxTop: { display: "flex", justifyContent: "space-between", padding: 10, background: "#e2e8f0" },
  copy: { padding: "6px 12px" },
  pre: { padding: 16, whiteSpace: "pre-wrap", overflowX: "hidden", lineHeight: 1.45, fontSize: 14 },
  help: { color: "#555", fontSize: 14 },
  fileList: { marginTop: 14, padding: 12, background: "#f8fafc", border: "1px solid #e2e8f0" },
  details: { marginTop: 20 },
  rawPre: { background: "#111827", color: "white", padding: 14, whiteSpace: "pre-wrap", maxHeight: 300, overflowY: "auto" },
};
