// 👉 (너무 길어서 핵심만 드리는게 아니라 실제 전체 코드입니다)
// 👉 복사 중간 끊기지 않게 주의하세요

import React, { useState } from "react";
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const today = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
const slash = (d) => d.replaceAll("-", "/");

/* ================= 균배양 핵심 ================= */

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

function extractPatient(text) {
  const name = (text.match(/수진자명\s*([가-힣]{2,4})/) || [])[1] || "환자명";
  const ageSex = (text.match(/(\d{2,3})\s*\/\s*(M|F)/i) || []);
  const age = ageSex[1] || "??";
  const sex = ageSex[2] || "?";

  const chart = (text.match(/차트번호\s*([0-9-]+)/) || [])[1] || "차트번호";

  const dateMatch = text.match(/검체채취일\s*(\d{4})[.-](\d{2})[.-](\d{2})/);
  const date = dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : today();

  return { name, age, sex, chart, date };
}

function extractSpecimen(text) {
  if (/Sputum/i.test(text)) return "Sputum";
  if (/Rectal/i.test(text)) return "Rectal Swab";
  if (/Nasal/i.test(text)) return "Nasal Swab";
  if (/Urine/i.test(text)) return "Random Urine";
  return "검체 확인 필요";
}

function extractOrganisms(text) {
  const result = [];

  const organisms = [
    "Pseudomonas aeruginosa",
    "Klebsiella pneumoniae",
    "Acinetobacter baumannii",
    "Staphylococcus aureus",
    "Serratia marcescens",
  ];

  organisms.forEach((org) => {
    if (new RegExp(org, "i").test(text)) {
      result.push(org);
    }
  });

  return result;
}

function formatOutput(patient, specimens) {
  let out = "";

  out += `${patient.age}/${patient.sex}, ${patient.name}\n`;
  out += `#${patient.date}\n`;
  out += `◆ 최 종 결 과 보 고 ◆ (검체채취일: ${slash(patient.date)})\n`;

  Object.entries(specimens).forEach(([specimen, list], idx) => {
    out += `  ${idx + 1}.▣ 검체명 : ${specimen}\n`;
    out += `　 ▣ 배양 및 동정결과:\n`;

    list.forEach((org, i) => {
      if (list.length === 1) {
        out += `　 ▶균주: ${org}\n`;
      } else {
        out += `　 ▶균주${i + 1}: ${org}\n`;
      }
    });
  });

  return out.trim();
}

/* ================= UI ================= */

function ResultBox({ text }) {
  return (
    <div style={{ marginTop: 20, background: "#f1f5f9", padding: 16 }}>
      <button onClick={() => navigator.clipboard.writeText(text)}>복사</button>
      <pre style={{ whiteSpace: "pre-wrap" }}>{text}</pre>
    </div>
  );
}

export default function App() {
  const [out, setOut] = useState("");

  const handleUpload = async (files) => {
    let map = {};

    for (const file of files) {
      const text = await readPdfText(file);

      const patient = extractPatient(text);
      const specimen = extractSpecimen(text);
      const orgs = extractOrganisms(text);

      const key = `${patient.chart}_${patient.name}`;

      if (!map[key]) {
        map[key] = { patient, specimens: {} };
      }

      if (!map[key].specimens[specimen]) {
        map[key].specimens[specimen] = [];
      }

      orgs.forEach((o) => {
        if (!map[key].specimens[specimen].includes(o)) {
          map[key].specimens[specimen].push(o);
        }
      });
    }

    const outputs = Object.values(map).map((v) =>
      formatOutput(v.patient, v.specimens)
    );

    setOut(outputs.join("\n\n"));
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>균배양 정리</h1>

      <input
        type="file"
        multiple
        accept="application/pdf"
        onChange={(e) => handleUpload(e.target.files)}
      />

      {out && <ResultBox text={out} />}
    </div>
  );
}
