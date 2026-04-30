import React, { useState } from "react";
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function App() {
  const [activeTab, setActiveTab] = useState("lab");
  const [text, setText] = useState("");
  const [out, setOut] = useState("");

  /* ================= 검사결과 파일 ================= */
  const readLabFile = async (file) => {
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
    }
  };

  /* ================= 균배양 PDF ================= */
  const readCulturePDFs = async (files) => {
    let merged = "";

    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

      merged += `\n===== ${file.name} =====\n`;

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const txt = content.items.map((it) => it.str).join(" ");
        merged += txt + "\n";
      }
    }

    setText(merged);
  };

  /* ================= 실행 ================= */
  const run = () => {
    if (activeTab === "culture") {
      setOut("PDF 여러개 합쳐진 텍스트:\n\n" + text);
      return;
    }

    setOut("검사결과 텍스트:\n\n" + text);
  };

  return (
    <div style={{ padding: 30 }}>
      <h1>Clinical Assistant</h1>

      {/* 탭 */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => setActiveTab("lab")}>검사결과</button>
        <button onClick={() => setActiveTab("culture")}>균배양</button>
      </div>

      {/* 검사결과 */}
      {activeTab === "lab" && (
        <input
          type="file"
          accept=".xlsx,.xls,.txt"
          onChange={(e) => readLabFile(e.target.files[0])}
        />
      )}

      {/* 균배양 */}
      {activeTab === "culture" && (
        <input
          type="file"
          accept=".pdf"
          multiple
          onChange={(e) => readCulturePDFs(Array.from(e.target.files))}
        />
      )}

      <textarea
        style={{ width: "100%", height: 200, marginTop: 20 }}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <button onClick={run} style={{ marginTop: 10 }}>
        실행
      </button>

      <pre style={{ marginTop: 20 }}>{out}</pre>
    </div>
  );
}
