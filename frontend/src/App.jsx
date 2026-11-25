import React, { useEffect, useRef, useState } from "react";

const API = import.meta.env.VITE_API_URL || "";
export default function App() {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [language, setLanguage] = useState("auto");
  const [title, setTitle] = useState("My transcription");
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const mediaRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  async function loadHistory() {
    try {
      const res = await fetch(`${API}/api/transcriptions`);
      if (!res.ok) throw new Error("Could not load history");
      setHistory(await res.json());
    } catch { setMessage("Cannot connect to backend. Start the application with Docker Compose."); }
  }
  useEffect(() => { loadHistory(); }, []);

  async function sendChunk(blob) {
    if (!blob || blob.size < 1000) return;
    const form = new FormData();
    form.append("audio", blob, "speech.webm");
    setBusy(true);
    try {
      const res = await fetch(`${API}/api/speech/transcribe`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Transcription failed");
      if (data.text) {
        setTranscript(prev => `${prev}${prev ? " " : ""}${data.text}`.trim());
        setLanguage(data.language || "auto");
      }
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  async function startRecording() {
    setMessage("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("Microphone access requires localhost or HTTPS and a supported browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = event => { if (event.data.size) sendChunk(event.data); };
      recorder.start(5000);
      setRecording(true);
    } catch (error) { setMessage(`Microphone error: ${error.message}`); }
  }

  function stopRecording() {
    if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
    mediaRef.current?.getTracks().forEach(track => track.stop());
    setRecording(false);
  }

  async function saveTranscript() {
    if (!transcript.trim()) return setMessage("Record or type a transcript before saving.");
    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `${API}/api/transcriptions/${editingId}` : `${API}/api/transcriptions`;
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, transcript, language })
    });
    const data = await res.json();
    if (!res.ok) return setMessage(data.error || "Save failed");
    setMessage(editingId ? "Transcription updated." : "Transcription saved.");
    setEditingId(null); setTranscript(""); setTitle("My transcription"); loadHistory();
  }

  function editItem(item) {
    setEditingId(item.id); setTitle(item.title); setTranscript(item.transcript); setLanguage(item.language || "auto");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteItem(id) {
    if (!window.confirm("Delete this transcription?")) return;
    const res = await fetch(`${API}/api/transcriptions/${id}`, { method: "DELETE" });
    if (res.ok) { setMessage("Transcription deleted."); loadHistory(); }
    else setMessage("Could not delete transcription.");
  }

  return <main className="page">
    <header><div><p className="eyebrow">AI POWERED • MULTILINGUAL</p><h1>Speech to Text</h1><p className="sub">Speak naturally. Capture your words. Keep your history.</p></div><span className="pill">Whisper AI</span></header>
    <section className="panel recorder">
      <div className="section-head"><div><h2>Live transcription</h2><p>Speak in English, Hindi or a mixture of both.</p></div><span className={recording ? "status live" : "status"}>{recording ? "● Recording" : "● Ready"}</span></div>
      <div className="controls">
        {!recording ? <button className="primary" onClick={startRecording}>🎙 Start recording</button> : <button className="danger" onClick={stopRecording}>■ Stop recording</button>}
        <span className="hint">{busy ? "Processing audio…" : "Audio is processed in short chunks."}</span>
      </div>
      <label>Title<input value={title} onChange={e => setTitle(e.target.value)} placeholder="Meeting notes" /></label>
      <label>Transcript<textarea rows="7" value={transcript} onChange={e => setTranscript(e.target.value)} placeholder="Your recognized speech will appear here. You can also edit the text manually." /></label>
      <div className="actions"><button className="primary" onClick={saveTranscript}>{editingId ? "Update transcript" : "Save transcript"}</button><button className="secondary" onClick={() => {setTranscript("");setEditingId(null);}}>Clear</button></div>
      {language !== "auto" && <p className="hint">Detected language: {language}</p>}
      {message && <p className="message">{message}</p>}
    </section>
    <section className="panel">
      <div className="section-head"><div><h2>Transcription history</h2><p>Your saved transcripts appear here.</p></div><button className="secondary" onClick={loadHistory}>Refresh</button></div>
      {history.length === 0 ? <div className="empty">No saved transcriptions yet. Record something and save it.</div> :
        <div className="history">{history.map(item => <article className="history-item" key={item.id}>
          <div className="history-top"><div><h3>{item.title}</h3><p className="meta">{item.language || "Language unknown"} · {new Date(item.created_at).toLocaleString()}</p></div><div className="item-actions"><button onClick={() => editItem(item)}>Edit</button><button className="delete" onClick={() => deleteItem(item.id)}>Delete</button></div></div>
          <p className="transcript-text">{item.transcript}</p>
        </article>)}</div>}
    </section>
    <footer>Built with React · Node.js · PostgreSQL · Open-source Whisper</footer>
  </main>;
}
