import React, { useState } from "react";

export default function App() {
  const [activeTab, setActiveTab] = useState("lab");

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Clinical Assistant</h1>

      {/* 메뉴 */}
      <div style={styles.menu}>
        <button onClick={() => setActiveTab("lab")} style={styles.button}>검사결과</button>
        <button onClick={() => setActiveTab("culture")} style={styles.button}>균배양</button>
        <button onClick={() => setActiveTab("chart")} style={styles.button}>초진차트</button>
        <button onClick={() => setActiveTab("doc")} style={styles.button}>진단서류</button>
        <button onClick={() => setActiveTab("drug")} style={styles.button}>약품정리</button>
      </div>

      {/* 내용 */}
      <div style={styles.card}>
        {activeTab === "lab" && <Lab />}
        {activeTab === "culture" && <Culture />}
        {activeTab === "chart" && <Chart />}
        {activeTab === "doc" && <Doc />}
        {activeTab === "drug" && <Drug />}
      </div>
    </div>
  );
}

/* ================= 기능별 컴포넌트 ================= */

function Lab() {
  const [input, setInput] = useState("");

  return (
    <div>
      <h2>검사결과 정리</h2>
      <textarea
        style={styles.textarea}
        placeholder="검사결과 붙여넣기 또는 파일 업로드 예정"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <button style={styles.run}>정리하기</button>
    </div>
  );
}

function Culture() {
  return (
    <div>
      <h2>균배양검사 정리</h2>
      <p>PDF 여러개 업로드 예정</p>
    </div>
  );
}

function Chart() {
  return (
    <div>
      <h2>초진차트</h2>
      <p>이미지 업로드 (OCR 예정)</p>
    </div>
  );
}

function Doc() {
  return (
    <div>
      <h2>진단서/소견서</h2>
      <textarea style={styles.textarea} placeholder="내용 붙여넣기" />
      <button style={styles.run}>정리하기</button>
    </div>
  );
}

function Drug() {
  return (
    <div>
      <h2>약품정리</h2>
      <textarea style={styles.textarea} placeholder="약 목록 붙여넣기" />
      <button style={styles.run}>정리하기</button>
    </div>
  );
}

/* ================= 스타일 ================= */

const styles = {
  container: {
    padding: "30px",
    fontFamily: "Arial",
    background: "#f4f6f9",
    minHeight: "100vh"
  },
  title: {
    textAlign: "center",
    marginBottom: "20px"
  },
  menu: {
    display: "flex",
    gap: "10px",
    justifyContent: "center",
    marginBottom: "20px"
  },
  button: {
    padding: "10px 15px",
    border: "none",
    background: "#2c3e50",
    color: "white",
    cursor: "pointer"
  },
  card: {
    background: "white",
    padding: "20px",
    borderRadius: "10px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
  },
  textarea: {
    width: "100%",
    height: "200px",
    marginTop: "10px",
    marginBottom: "10px"
  },
  run: {
    padding: "10px 20px",
    background: "#3498db",
    color: "white",
    border: "none",
    cursor: "pointer"
  }
};
