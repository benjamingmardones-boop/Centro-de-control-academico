"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Home, Calendar as CalIcon, BookOpen, ClipboardList, Target, Timer,
  BarChart3, Settings as SettingsIcon, Plus, X, Trash2, Flame, Zap,
  TrendingUp, AlertTriangle, CheckCircle2, Circle, ChevronLeft,
  ChevronRight, Sun, Moon, Radio, Pencil, Play, Pause, RotateCcw,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

/* ============================== THEME ============================== */
const PALETTES = {
  dark: {
    bg: "#0A0F1E", bgElev: "#121A2E", bgElev2: "#1A2540", border: "#263454",
    text: "#E7ECF7", textDim: "#8A96B5", amber: "#F5A623", mint: "#33D6A6",
    red: "#FF5A5A", blue: "#4C8DFF", purple: "#9B7BFF",
  },
  light: {
    bg: "#F3F5FA", bgElev: "#FFFFFF", bgElev2: "#EDF0F8", border: "#DCE1EE",
    text: "#131A2B", textDim: "#5C6785", amber: "#B9720B", mint: "#0F9D72",
    red: "#D6423F", blue: "#2E63D6", purple: "#6E4FD9",
  },
};

/* ============================== UTILS ============================== */
/* uid() is defined below, in the AUTH + SUPABASE STATE section (needs to produce valid UUIDs) */
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (iso, n) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const diffDays = (iso) => {
  const a = new Date(todayISO() + "T00:00:00");
  const b = new Date(iso + "T00:00:00");
  return Math.round((b - a) / 86400000);
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fmtDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
const fmtDateLong = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" });
const N1 = (v) => (v === null || v === undefined || isNaN(v) ? "—" : Number(v).toFixed(1));

/* =========================== SEED DATA =========================== */
function buildSeed() {
  const s1 = uid(), s2 = uid(), s3 = uid(), s4 = uid();
  const subjects = [
    { id: s1, name: "Matemáticas", color: "#F5A623", teacher: "", dificultad: 5, confianza: 2, objetivo: 6.0, minimo: 4.0, horasSemana: 5 },
    { id: s2, name: "Historia", color: "#4C8DFF", teacher: "", dificultad: 2, confianza: 4, objetivo: 6.3, minimo: 4.0, horasSemana: 2 },
    { id: s3, name: "Biología", color: "#33D6A6", teacher: "", dificultad: 3, confianza: 3, objetivo: 6.2, minimo: 4.0, horasSemana: 3 },
    { id: s4, name: "Inglés", color: "#9B7BFF", teacher: "", dificultad: 1, confianza: 5, objetivo: 6.5, minimo: 4.0, horasSemana: 1.5 },
  ];
  const evaluations = [
    { id: uid(), subjectId: s1, name: "Prueba de funciones", type: "Prueba", date: addDays(todayISO(), 2), weight: 30, grade: null, contents: "Funciones y ecuaciones", notes: "" },
    { id: uid(), subjectId: s1, name: "Control álgebra", type: "Control", date: addDays(todayISO(), -10), weight: 20, grade: 5.1, contents: "Álgebra básica", notes: "" },
    { id: uid(), subjectId: s2, name: "Ensayo revolución", type: "Trabajo", date: addDays(todayISO(), 9), weight: 25, grade: null, contents: "Revolución industrial", notes: "" },
    { id: uid(), subjectId: s2, name: "Prueba unidad 1", type: "Prueba", date: addDays(todayISO(), -15), weight: 30, grade: 6.4, contents: "Edad media", notes: "" },
    { id: uid(), subjectId: s3, name: "Prueba célula y ADN", type: "Prueba", date: addDays(todayISO(), 5), weight: 35, grade: null, contents: "Célula, ADN, Genética", notes: "" },
    { id: uid(), subjectId: s3, name: "Informe laboratorio", type: "Trabajo", date: addDays(todayISO(), -6), weight: 15, grade: 6.0, contents: "Mitosis", notes: "" },
    { id: uid(), subjectId: s4, name: "Speaking test", type: "Exposición", date: addDays(todayISO(), 14), weight: 20, grade: null, contents: "Presente perfecto", notes: "" },
    { id: uid(), subjectId: s4, name: "Reading quiz", type: "Control", date: addDays(todayISO(), -4), weight: 15, grade: 6.6, contents: "Comprensión lectora", notes: "" },
  ];
  let sessions = [];
  evaluations.filter((e) => e.grade === null && diffDays(e.date) > 0).forEach((ev) => {
    const subj = subjects.find((s) => s.id === ev.subjectId);
    sessions = sessions.concat(generateSessions(ev, subj));
  });
  const goals = [
    { id: uid(), type: "avgGeneral", target: 6.0, description: "Terminar el semestre con promedio 6,0" },
    { id: uid(), type: "avgSubject", subjectId: s1, target: 5.8, description: "Subir Matemáticas" },
    { id: uid(), type: "hoursWeek", target: 10, description: "Estudiar 10 horas esta semana" },
  ];
  return {
    settings: { scaleMin: 1, scaleMax: 7, passing: 4.0, theme: "dark" },
    subjects, evaluations, sessions, goals, studyLog: [],
  };
}

/* ==================== STUDY-SESSION GENERATOR ==================== */
const TEMPLATE = [
  { label: "Contenido base", min: 45 },
  { label: "Ejercicios", min: 60 },
  { label: "Problemas difíciles", min: 60 },
  { label: "Repaso", min: 45 },
  { label: "Simulación de prueba", min: 60 },
  { label: "Repaso final", min: 30 },
];
function generateSessions(ev, subject) {
  const days = diffDays(ev.date);
  if (days <= 0) return [];
  const count = clamp(days - 1, 1, 6);
  const slice = TEMPLATE.slice(TEMPLATE.length - count); // the count items closest to exam
  const startOffset = days - count; // first session date offset from today
  return slice.map((t, i) => ({
    id: uid(),
    evaluationId: ev.id,
    subjectId: ev.subjectId,
    date: addDays(todayISO(), startOffset + i),
    title: `${subject ? subject.name : ""} — ${t.label}`,
    duration: t.min,
    status: "pending", // pending | completed | partial | missed
    actualMinutes: null,
    auto: true,
  }));
}

/* ========================= CALC ENGINE ========================= */
function subjectAverage(subjectId, evaluations) {
  const evs = evaluations.filter((e) => e.subjectId === subjectId && e.grade !== null && e.grade !== undefined);
  const totalW = evs.reduce((a, e) => a + Number(e.weight || 0), 0);
  if (totalW === 0) return null;
  const sum = evs.reduce((a, e) => a + Number(e.grade) * Number(e.weight), 0);
  return sum / totalW;
}
function subjectWeightedSum(subjectId, evaluations) {
  // sum(grade*weight) among graded evals, and sum of ALL weights registered (graded + pending)
  const all = evaluations.filter((e) => e.subjectId === subjectId);
  const graded = all.filter((e) => e.grade !== null && e.grade !== undefined);
  const sumGraded = graded.reduce((a, e) => a + Number(e.grade) * Number(e.weight), 0);
  const weightGraded = graded.reduce((a, e) => a + Number(e.weight), 0);
  const weightAll = all.reduce((a, e) => a + Number(e.weight), 0);
  return { sumGraded, weightGraded, weightAll, all, graded };
}
function neededGrade(subjectId, evaluations, targetAvg, scaleMax) {
  const { sumGraded, weightAll, weightGraded } = subjectWeightedSum(subjectId, evaluations);
  const remainingWeight = Math.max(weightAll - weightGraded, 0);
  if (remainingWeight <= 0) return { possible: null, needed: null, remainingWeight: 0 };
  const needed = (targetAvg * 100 - sumGraded) / remainingWeight * (weightAll >= 99 ? 1 : 100 / weightAll) ;
  // If total registered weight isn't ~100, scale so the "remaining" represents its true share.
  // Simpler & transparent fallback: assume total weight across the subject sums to 100.
  const neededSimple = (targetAvg * 100 - sumGraded) / remainingWeight;
  return { possible: neededSimple <= scaleMax, needed: neededSimple, remainingWeight };
}
function projectedAverage(subjectId, evaluations, scaleMax) {
  const cur = subjectAverage(subjectId, evaluations);
  if (cur === null) return null;
  // naive projection: assume remaining evaluations land at current average (no magic uplift)
  return cur;
}
function subjectPriority(subject, evaluations, scaleMax) {
  const upcoming = evaluations
    .filter((e) => e.subjectId === subject.id && diffDays(e.date) >= 0 && (e.grade === null || e.grade === undefined))
    .sort((a, b) => diffDays(a.date) - diffDays(b.date))[0];
  const cur = subjectAverage(subject.id, evaluations);
  const gap = cur === null ? 40 : clamp(((subject.objetivo - cur) / (scaleMax - 1)) * 100, 0, 100);
  const difficultyScore = (subject.dificultad / 5) * 100;
  const confidenceGapScore = ((5 - subject.confianza) / 5) * 100;
  let urgencyScore = 20, weightScore = 20, days = null, evName = null;
  if (upcoming) {
    days = diffDays(upcoming.date);
    urgencyScore = clamp(100 - days * 6, 0, 100);
    weightScore = clamp(upcoming.weight, 0, 100);
    evName = upcoming.name;
  }
  const score = Math.round(
    urgencyScore * 0.35 + weightScore * 0.15 + gap * 0.2 + difficultyScore * 0.15 + confidenceGapScore * 0.15
  );
  return { score: clamp(score, 0, 100), days, evName, gap, urgencyScore, weightScore, difficultyScore, confidenceGapScore };
}
function urgencyColor(days, palette) {
  if (days === null) return palette.textDim;
  if (days <= 2) return palette.red;
  if (days <= 5) return "#FF8A3D";
  if (days <= 10) return palette.amber;
  return palette.mint;
}
function urgencyLabel(days) {
  if (days === null) return "—";
  if (days <= 2) return "Urgente";
  if (days <= 5) return "Importante";
  if (days <= 10) return "Próxima";
  return "Lejana";
}

/* ============================ AUTH + SUPABASE STATE ============================ */
function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const subjectFromRow = (r) => ({ id: r.id, name: r.name, color: r.color, teacher: r.teacher, dificultad: r.dificultad, confianza: r.confianza, objetivo: Number(r.objetivo), minimo: Number(r.minimo), horasSemana: Number(r.horas_semana) });
const subjectToRow = (s, userId) => ({ id: s.id, user_id: userId, name: s.name, color: s.color, teacher: s.teacher || null, dificultad: s.dificultad, confianza: s.confianza, objetivo: s.objetivo, minimo: s.minimo, horas_semana: s.horasSemana });

const evaluationFromRow = (r) => ({ id: r.id, subjectId: r.subject_id, name: r.name, type: r.type, date: r.date, weight: Number(r.weight), grade: r.grade === null ? null : Number(r.grade), contents: r.contents, notes: r.notes });
const evaluationToRow = (e, userId) => ({ id: e.id, user_id: userId, subject_id: e.subjectId, name: e.name, type: e.type, date: e.date, weight: e.weight, grade: e.grade === undefined ? null : e.grade, contents: e.contents || null, notes: e.notes || null });

const sessionFromRow = (r) => ({ id: r.id, evaluationId: r.evaluation_id, subjectId: r.subject_id, date: r.date, title: r.title, duration: r.duration, status: r.status, actualMinutes: r.actual_minutes, auto: !!r.auto });
const sessionToRow = (s, userId) => ({ id: s.id, user_id: userId, evaluation_id: s.evaluationId || null, subject_id: s.subjectId, date: s.date, title: s.title, duration: s.duration, status: s.status || "pending", actual_minutes: s.actualMinutes === undefined ? null : s.actualMinutes, auto: !!s.auto });

const goalFromRow = (r) => ({ id: r.id, type: r.type, subjectId: r.subject_id, target: Number(r.target), description: r.description });
const goalToRow = (g, userId) => ({ id: g.id, user_id: userId, type: g.type, subject_id: g.subjectId || null, target: g.target, description: g.description });

const studyLogFromRow = (r) => ({ id: r.id, sessionId: r.session_id, subjectId: r.subject_id, date: r.date, minutes: r.minutes, status: r.status });
const studyLogToRow = (l, userId) => ({ id: l.id, user_id: userId, session_id: l.sessionId || null, subject_id: l.subjectId, date: l.date, minutes: l.minutes, status: l.status });

const settingsFromRow = (r) => ({ scaleMin: Number(r.scale_min), scaleMax: Number(r.scale_max), passing: Number(r.passing), theme: r.theme, webcalToken: r.webcal_token });
const settingsToRow = (s, userId) => ({ user_id: userId, scale_min: s.scaleMin, scale_max: s.scaleMax, passing: s.passing, theme: s.theme, ...(s.webcalToken ? { webcal_token: s.webcalToken } : {}) });

function useSupabaseState() {
  const [session, setSession] = useState(undefined); // undefined = checking, null = logged out
  const [state, setState] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess || null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (!session) { setState(null); setLoaded(true); return; }
    (async () => {
      setLoaded(false);
      setError(null);
      try {
        const userId = session.user.id;
        const [subR, evR, seR, goR, logR, setR] = await Promise.all([
          supabase.from("subjects").select("*").eq("user_id", userId),
          supabase.from("evaluations").select("*").eq("user_id", userId),
          supabase.from("study_sessions").select("*").eq("user_id", userId),
          supabase.from("goals").select("*").eq("user_id", userId),
          supabase.from("study_log").select("*").eq("user_id", userId),
          supabase.from("academic_settings").select("*").eq("user_id", userId).maybeSingle(),
        ]);
        for (const r of [subR, evR, seR, goR, logR, setR]) if (r.error) throw r.error;

        let subjects = (subR.data || []).map(subjectFromRow);
        let evaluations = (evR.data || []).map(evaluationFromRow);
        let sessions = (seR.data || []).map(sessionFromRow);
        let goals = (goR.data || []).map(goalFromRow);
        let studyLog = (logR.data || []).map(studyLogFromRow);
        let settings = setR.data ? settingsFromRow(setR.data) : null;

        if (!settings) {
          const { data: inserted } = await supabase
            .from("academic_settings")
            .insert({ user_id: userId, scale_min: 1, scale_max: 7, passing: 4.0, theme: "dark" })
            .select()
            .single();
          settings = inserted ? settingsFromRow(inserted) : { scaleMin: 1, scaleMax: 7, passing: 4.0, theme: "dark" };
        }

        if (subjects.length === 0) {
          const seed = buildSeed();
          await supabase.from("subjects").insert(seed.subjects.map((s) => subjectToRow(s, userId)));
          await supabase.from("evaluations").insert(seed.evaluations.map((e) => evaluationToRow(e, userId)));
          await supabase.from("study_sessions").insert(seed.sessions.map((s) => sessionToRow(s, userId)));
          await supabase.from("goals").insert(seed.goals.map((g) => goalToRow(g, userId)));
          subjects = seed.subjects; evaluations = seed.evaluations; sessions = seed.sessions; goals = seed.goals;
        }

        setState({ subjects, evaluations, sessions, goals, studyLog, settings });
      } catch (e) {
        setError(e.message || "Error de conexión con Supabase");
      } finally {
        setLoaded(true);
      }
    })();
  }, [session]);

  return { session, state, setState, loaded, error, userId: session?.user?.id || null };
}

function Login({ palette }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg("");
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Cuenta creada. Si tu proyecto de Supabase pide confirmar el correo, revisa tu bandeja antes de entrar.");
      }
    } catch (err) {
      setMsg(err.message || "Ocurrió un error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: palette.bg, fontFamily: "Inter, sans-serif", padding: 16 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600&display=swap');`}</style>
      <form onSubmit={submit} style={{ background: palette.bgElev, border: `1px solid ${palette.border}`, borderRadius: 16, padding: 26, width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 17, color: palette.text, textAlign: "center" }}>Centro de Control Académico</div>
        <div style={{ fontSize: 12, color: palette.textDim, textAlign: "center", marginBottom: 4 }}>{mode === "signin" ? "Inicia sesión" : "Crea tu cuenta"}</div>
        <input type="email" required placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle(palette)} />
        <input type="password" required minLength={6} placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle(palette)} />
        {msg && <div style={{ fontSize: 12, color: palette.amber, lineHeight: 1.4 }}>{msg}</div>}
        <button type="submit" disabled={loading} style={{ background: palette.amber, color: "#1A1200", border: "none", borderRadius: 10, padding: "10px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "Space Grotesk, sans-serif" }}>
          {loading ? "…" : mode === "signin" ? "Entrar" : "Crear cuenta"}
        </button>
        <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMsg(""); }} style={{ background: "none", border: "none", color: palette.textDim, fontSize: 12, cursor: "pointer" }}>
          {mode === "signin" ? "¿No tienes cuenta? Crear una" : "¿Ya tienes cuenta? Inicia sesión"}
        </button>
      </form>
    </div>
  );
}

/* ============================ UI ATOMS ============================ */
function Gauge({ value, max, color, size = 84, label, sub, palette }) {
  const pct = clamp((value || 0) / max, 0, 1);
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const arc = c * 0.75; // 270deg gauge
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(135 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={palette.bgElev2} strokeWidth={7}
            strokeDasharray={`${arc} ${c}`} strokeLinecap="round" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={7}
            strokeDasharray={`${arc * pct} ${c}`} strokeLinecap="round" />
        </g>
        <text x="50%" y="47%" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize={size * 0.22} fontWeight="700" fill={palette.text}>
          {value === null ? "—" : N1(value)}
        </text>
        <text x="50%" y="63%" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize={size * 0.11} fill={palette.textDim}>
          / {max}
        </text>
      </svg>
      {label && <div style={{ fontSize: 11, color: palette.textDim, textAlign: "center", fontFamily: "Space Grotesk, sans-serif", letterSpacing: 0.3 }}>{label}</div>}
      {sub && <div style={{ fontSize: 10, color: palette.textDim, textAlign: "center" }}>{sub}</div>}
    </div>
  );
}

function Card({ children, palette, style, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: palette.bgElev, border: `1px solid ${palette.border}`, borderRadius: 14,
      padding: 16, ...style,
    }}>
      {children}
    </div>
  );
}
function Pill({ children, color, bg }) {
  return (
    <span style={{
      fontSize: 11, fontFamily: "IBM Plex Mono, monospace", padding: "2px 8px", borderRadius: 999,
      color, background: bg, border: `1px solid ${color}55`, whiteSpace: "nowrap",
    }}>{children}</span>
  );
}
function Btn({ children, onClick, palette, variant = "primary", style, type = "button", disabled }) {
  const base = { border: "none", borderRadius: 10, padding: "9px 14px", fontSize: 13, fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer", fontFamily: "Space Grotesk, sans-serif", display: "inline-flex",
    alignItems: "center", gap: 6, opacity: disabled ? 0.5 : 1, transition: "transform .1s" };
  const variants = {
    primary: { background: palette.amber, color: "#1A1200" },
    ghost: { background: "transparent", color: palette.text, border: `1px solid ${palette.border}` },
    danger: { background: "transparent", color: palette.red, border: `1px solid ${palette.red}55` },
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}
function Field({ label, children, palette }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: palette.textDim, fontFamily: "Space Grotesk, sans-serif" }}>
      {label}
      {children}
    </label>
  );
}
function inputStyle(palette) {
  return {
    background: palette.bgElev2, border: `1px solid ${palette.border}`, borderRadius: 8, padding: "8px 10px",
    color: palette.text, fontSize: 13, fontFamily: "Inter, sans-serif", outline: "none",
  };
}
function Modal({ title, onClose, children, palette, wide }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000AA", display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 100, padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: palette.bgElev, border: `1px solid ${palette.border}`, borderRadius: 16, padding: 20,
        width: "100%", maxWidth: wide ? 620 : 440, maxHeight: "88vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontFamily: "Space Grotesk, sans-serif", color: palette.text, fontSize: 17 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: palette.textDim }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ============================ APP ============================ */
export default function App() {
  const { session, state, setState, loaded, error: dbError, userId } = useSupabaseState();
  const [tab, setTab] = useState("inicio");
  const [confirmModal, setConfirmModal] = useState(null);

  const palette = PALETTES[state?.settings?.theme || "dark"];
  const safeState = state || { settings: { scaleMax: 7 }, subjects: [], evaluations: [], sessions: [], goals: [], studyLog: [] };
  const { settings, subjects, evaluations, sessions, goals, studyLog } = safeState;
  const scaleMax = settings.scaleMax;

  const update = useCallback((fn) => setState((prev) => { const next = structuredClone(prev); fn(next); return next; }), [setState]);

  /* ---- derived data (hooks must run on every render, even before data loads) ---- */
  const generalAvg = useMemo(() => {
    const avgs = subjects.map((s) => subjectAverage(s.id, evaluations)).filter((v) => v !== null);
    if (!avgs.length) return null;
    return avgs.reduce((a, b) => a + b, 0) / avgs.length;
  }, [subjects, evaluations]);

  const generalObjective = useMemo(() => {
    if (!subjects.length) return null;
    return subjects.reduce((a, s) => a + Number(s.objetivo), 0) / subjects.length;
  }, [subjects]);

  const upcomingEvals = useMemo(() =>
    evaluations
      .filter((e) => diffDays(e.date) >= 0)
      .sort((a, b) => diffDays(a.date) - diffDays(b.date)),
    [evaluations]
  );

  const priorities = useMemo(() =>
    subjects.map((s) => ({ subject: s, ...subjectPriority(s, evaluations, scaleMax) }))
      .sort((a, b) => b.score - a.score),
    [subjects, evaluations, scaleMax]
  );

  const todaySessions = sessions.filter((se) => se.date === todayISO());

  const weekHours = useMemo(() => {
    const now = new Date();
    const day = (now.getDay() + 6) % 7; // Monday=0
    const monday = addDays(todayISO(), -day);
    const sunday = addDays(monday, 6);
    const mins = studyLog.filter((l) => l.date >= monday && l.date <= sunday).reduce((a, l) => a + l.minutes, 0);
    const plannedMins = sessions.filter((se) => se.date >= monday && se.date <= sunday).reduce((a, se) => a + se.duration, 0);
    return { real: mins / 60, planned: plannedMins / 60 };
  }, [studyLog, sessions]);

  const gamification = useMemo(() => {
    const completed = studyLog.filter((l) => l.status === "completed").length;
    const partial = studyLog.filter((l) => l.status === "partial").length;
    const xp = completed * 15 + partial * 7;
    const level = Math.floor(xp / 100) + 1;
    const xpInLevel = xp % 100;
    // streak: consecutive days (ending today or yesterday) with >=1 completed
    const days = [...new Set(studyLog.filter((l) => l.status === "completed").map((l) => l.date))].sort();
    let streak = 0;
    let cursor = todayISO();
    const set = new Set(days);
    if (!set.has(cursor)) cursor = addDays(cursor, -1);
    while (set.has(cursor)) { streak++; cursor = addDays(cursor, -1); }
    return { xp, level, xpInLevel, streak };
  }, [studyLog]);

  if (session === undefined) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#8A96B5", fontFamily: "Space Grotesk, sans-serif", background: "#0A0F1E" }}>
        Cargando…
      </div>
    );
  }
  if (session === null) {
    return <Login palette={PALETTES.dark} />;
  }
  if (!loaded || !state) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#8A96B5", fontFamily: "Space Grotesk, sans-serif", background: palette.bg }}>
        Cargando tus datos…
      </div>
    );
  }

  /* ---- mutations (optimistic local update + write-through to Supabase) ---- */
  const logErr = (r) => { if (r && r.error) console.error(r.error); };

  const upsertSubject = (subj) => {
    const isNew = !subj.id;
    const full = { ...subj, id: subj.id || uid() };
    update((n) => {
      const i = n.subjects.findIndex((s) => s.id === full.id);
      if (i >= 0) n.subjects[i] = full; else n.subjects.push(full);
    });
    const row = subjectToRow(full, userId);
    (isNew ? supabase.from("subjects").insert(row) : supabase.from("subjects").update(row).eq("id", full.id)).then(logErr);
  };
  const deleteSubject = (id) => {
    update((n) => {
      n.subjects = n.subjects.filter((s) => s.id !== id);
      const evalIds = n.evaluations.filter((e) => e.subjectId === id).map((e) => e.id);
      n.evaluations = n.evaluations.filter((e) => e.subjectId !== id);
      n.sessions = n.sessions.filter((se) => !evalIds.includes(se.evaluationId) && se.subjectId !== id);
    });
    // las tablas relacionadas tienen ON DELETE CASCADE por subject_id, así que esto se limpia solo en Supabase
    supabase.from("subjects").delete().eq("id", id).then(logErr);
  };

  const upsertEvaluation = (ev) => {
    const isNew = !evaluations.find((e) => e.id === ev.id);
    let newSessions = [];
    update((n) => {
      const i = n.evaluations.findIndex((e) => e.id === ev.id);
      if (i >= 0) n.evaluations[i] = ev; else n.evaluations.push(ev);
      n.sessions = n.sessions.filter((se) => se.evaluationId !== ev.id || se.status !== "pending");
      const kept = n.sessions.filter((se) => se.evaluationId === ev.id);
      if (ev.grade === null && diffDays(ev.date) > 0 && kept.length === 0) {
        const subj = n.subjects.find((s) => s.id === ev.subjectId);
        newSessions = generateSessions(ev, subj);
        n.sessions = n.sessions.concat(newSessions);
      }
    });
    const row = evaluationToRow(ev, userId);
    (isNew ? supabase.from("evaluations").insert(row) : supabase.from("evaluations").update(row).eq("id", ev.id)).then(logErr)
      .then(() => supabase.from("study_sessions").delete().eq("evaluation_id", ev.id).eq("status", "pending"))
      .then(() => { if (newSessions.length) return supabase.from("study_sessions").insert(newSessions.map((s) => sessionToRow(s, userId))); })
      .then(logErr);
  };
  const deleteEvaluation = (id, keepSessions) => {
    update((n) => {
      n.evaluations = n.evaluations.filter((e) => e.id !== id);
      if (!keepSessions) n.sessions = n.sessions.filter((se) => se.evaluationId !== id);
      else n.sessions = n.sessions.map((se) => se.evaluationId === id ? { ...se, evaluationId: null } : se);
    });
    (async () => {
      if (!keepSessions) await supabase.from("study_sessions").delete().eq("evaluation_id", id);
      await supabase.from("evaluations").delete().eq("id", id);
    })();
  };

  const setSessionStatus = (id, status, actualMinutes) => {
    let logEntry = null, resolved = actualMinutes;
    update((n) => {
      const se = n.sessions.find((s) => s.id === id);
      if (!se) return;
      se.status = status;
      resolved = actualMinutes ?? se.duration;
      se.actualMinutes = resolved;
      logEntry = { id: uid(), sessionId: id, subjectId: se.subjectId, date: se.date, minutes: resolved, status };
      n.studyLog.push(logEntry);
    });
    supabase.from("study_sessions").update({ status, actual_minutes: resolved }).eq("id", id).then(logErr);
    if (logEntry) supabase.from("study_log").insert(studyLogToRow(logEntry, userId)).then(logErr);
  };
  const addManualSession = (session) => {
    const full = { ...session, id: uid(), evaluationId: null, status: "pending", actualMinutes: null, auto: false };
    update((n) => { n.sessions.push(full); });
    supabase.from("study_sessions").insert(sessionToRow(full, userId)).then(logErr);
  };
  const deleteSession = (id) => {
    update((n) => { n.sessions = n.sessions.filter((s) => s.id !== id); });
    supabase.from("study_sessions").delete().eq("id", id).then(logErr);
  };

  const upsertGoal = (g) => {
    const isNew = !g.id;
    const full = { ...g, id: g.id || uid() };
    update((n) => {
      const i = n.goals.findIndex((x) => x.id === full.id);
      if (i >= 0) n.goals[i] = full; else n.goals.push(full);
    });
    const row = goalToRow(full, userId);
    (isNew ? supabase.from("goals").insert(row) : supabase.from("goals").update(row).eq("id", full.id)).then(logErr);
  };
  const deleteGoal = (id) => {
    update((n) => { n.goals = n.goals.filter((g) => g.id !== id); });
    supabase.from("goals").delete().eq("id", id).then(logErr);
  };

  const setSettings = (patch) => {
    let full = null;
    update((n) => { n.settings = { ...n.settings, ...patch }; full = n.settings; });
    supabase.from("academic_settings").upsert(settingsToRow(full, userId)).then(logErr);
  };

  const resetAllData = async () => {
    await supabase.from("subjects").delete().eq("user_id", userId); // cascada limpia el resto
    const seed = buildSeed();
    await supabase.from("subjects").insert(seed.subjects.map((s) => subjectToRow(s, userId)));
    await supabase.from("evaluations").insert(seed.evaluations.map((e) => evaluationToRow(e, userId)));
    await supabase.from("study_sessions").insert(seed.sessions.map((s) => sessionToRow(s, userId)));
    await supabase.from("goals").insert(seed.goals.map((g) => goalToRow(g, userId)));
    setState((prev) => ({ ...seed, settings: prev.settings }));
  };

  const regenerateWebcalToken = async () => {
    const newToken = uid();
    update((n) => { n.settings = { ...n.settings, webcalToken: newToken }; });
    await supabase.from("academic_settings").update({ webcal_token: newToken }).eq("user_id", userId).then(logErr);
  };

  const askConfirm = (msg, onKeep, onDelete) => setConfirmModal({ msg, onKeep, onDelete });

  /* ---- nav ---- */
  const NAV = [
    { id: "inicio", label: "Inicio", icon: Home },
    { id: "calendario", label: "Calendario", icon: CalIcon },
    { id: "asignaturas", label: "Asignaturas", icon: BookOpen },
    { id: "notas", label: "Notas", icon: ClipboardList },
    { id: "objetivos", label: "Objetivos", icon: Target },
    { id: "estudiar", label: "Estudiar", icon: Timer },
    { id: "estadisticas", label: "Estadísticas", icon: BarChart3 },
  ];

  return (
    <div style={{
      minHeight: "100%", background: palette.bg, color: palette.text,
      fontFamily: "Inter, sans-serif", display: "flex", flexDirection: "column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@500;600&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: ${palette.border}; border-radius: 8px; }
        button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 2px solid ${palette.blue}; outline-offset: 2px; }
      `}</style>

      {/* TOP BAR */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px",
        borderBottom: `1px solid ${palette.border}`, background: palette.bgElev, position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg, ${palette.amber}, ${palette.red})`,
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Radio size={16} color="#1A1200" />
          </div>
          <div>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: 0.3 }}>CENTRO DE CONTROL</div>
            <div style={{ fontSize: 10, color: palette.textDim, letterSpacing: 1.5, textTransform: "uppercase" }}>Académico · Personal</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "IBM Plex Mono, monospace", fontSize: 12, color: palette.purple }}>
            <Zap size={14} /> Nv.{gamification.level} · {gamification.xp} XP
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "IBM Plex Mono, monospace", fontSize: 12, color: palette.amber }}>
            <Flame size={14} /> {gamification.streak}d
          </div>
          <button onClick={() => setSettings({ theme: settings.theme === "dark" ? "light" : "dark" })}
            style={{ background: "none", border: `1px solid ${palette.border}`, borderRadius: 8, padding: 6, color: palette.text, cursor: "pointer" }}>
            {settings.theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <SettingsButton palette={palette} settings={settings} setSettings={setSettings} onReset={resetAllData} onRegenerateWebcal={regenerateWebcalToken} />
        </div>
      </div>
      {dbError && (
        <div style={{ background: `${palette.red}22`, color: palette.red, fontSize: 12, padding: "6px 20px", textAlign: "center" }}>
          {dbError} Tus cambios se están guardando solo en esta sesión del navegador.
        </div>
      )}

      {/* CONTENT */}
      <div style={{ flex: 1, padding: "18px 20px 90px", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        {tab === "inicio" && (
          <Inicio palette={palette} settings={settings} subjects={subjects} evaluations={evaluations}
            sessions={sessions} generalAvg={generalAvg} generalObjective={generalObjective}
            upcomingEvals={upcomingEvals} priorities={priorities} todaySessions={todaySessions}
            weekHours={weekHours} gamification={gamification} setSessionStatus={setSessionStatus}
            setTab={setTab} />
        )}
        {tab === "calendario" && (
          <Calendario palette={palette} subjects={subjects} evaluations={evaluations} sessions={sessions}
            upsertEvaluation={upsertEvaluation} deleteEvaluation={deleteEvaluation} addManualSession={addManualSession}
            deleteSession={deleteSession} setSessionStatus={setSessionStatus} askConfirm={askConfirm} />
        )}
        {tab === "asignaturas" && (
          <Asignaturas palette={palette} subjects={subjects} evaluations={evaluations} scaleMax={scaleMax}
            upsertSubject={upsertSubject} deleteSubject={deleteSubject} priorities={priorities} />
        )}
        {tab === "notas" && (
          <Notas palette={palette} subjects={subjects} evaluations={evaluations} settings={settings}
            upsertEvaluation={upsertEvaluation} deleteEvaluation={deleteEvaluation} askConfirm={askConfirm} />
        )}
        {tab === "objetivos" && (
          <Objetivos palette={palette} goals={goals} subjects={subjects} evaluations={evaluations}
            generalAvg={generalAvg} weekHours={weekHours} upsertGoal={upsertGoal} deleteGoal={deleteGoal} />
        )}
        {tab === "estudiar" && (
          <Estudiar palette={palette} sessions={sessions} subjects={subjects} setSessionStatus={setSessionStatus}
            addManualSession={addManualSession} deleteSession={deleteSession} studyLog={studyLog} />
        )}
        {tab === "estadisticas" && (
          <Estadisticas palette={palette} subjects={subjects} evaluations={evaluations} studyLog={studyLog}
            sessions={sessions} />
        )}
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: palette.bgElev,
        borderTop: `1px solid ${palette.border}`, display: "flex", justifyContent: "space-around",
        padding: "8px 4px", zIndex: 20 }}>
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = tab === n.id;
          return (
            <button key={n.id} onClick={() => setTab(n.id)} style={{
              background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column",
              alignItems: "center", gap: 2, color: active ? palette.amber : palette.textDim, padding: "4px 6px",
              minWidth: 52,
            }}>
              <Icon size={18} />
              <span style={{ fontSize: 9.5, fontFamily: "Space Grotesk, sans-serif", letterSpacing: 0.2 }}>{n.label}</span>
            </button>
          );
        })}
      </div>

      {confirmModal && (
        <Modal title="Confirmar" palette={palette} onClose={() => setConfirmModal(null)}>
          <p style={{ fontSize: 13, color: palette.textDim, lineHeight: 1.5 }}>{confirmModal.msg}</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <Btn palette={palette} variant="ghost" onClick={() => { confirmModal.onKeep(); setConfirmModal(null); }}>Conservar sesiones</Btn>
            <Btn palette={palette} variant="danger" onClick={() => { confirmModal.onDelete(); setConfirmModal(null); }}>Eliminar todo</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ======================== SETTINGS BUTTON ======================== */
function SettingsButton({ palette, settings, setSettings, onReset, onRegenerateWebcal }) {
  const [open, setOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [copied, setCopied] = useState(false);
  const webcalUrl = typeof window !== "undefined" && settings.webcalToken
    ? `${window.location.origin}/api/calendar/${settings.webcalToken}`
    : "";
  return (
    <>
      <button onClick={() => setOpen(true)} style={{ background: "none", border: `1px solid ${palette.border}`, borderRadius: 8, padding: 6, color: palette.text, cursor: "pointer" }}>
        <SettingsIcon size={15} />
      </button>
      {open && (
        <Modal title="Configuración" palette={palette} onClose={() => setOpen(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 12, color: palette.textDim }}>Escala de notas y cálculo — todos los promedios de la app usan estos valores.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <Field label="Nota mínima" palette={palette}>
                <input type="number" step="0.1" value={settings.scaleMin} onChange={(e) => setSettings({ scaleMin: Number(e.target.value) })} style={inputStyle(palette)} />
              </Field>
              <Field label="Nota máxima" palette={palette}>
                <input type="number" step="0.1" value={settings.scaleMax} onChange={(e) => setSettings({ scaleMax: Number(e.target.value) })} style={inputStyle(palette)} />
              </Field>
              <Field label="Nota de aprobación" palette={palette}>
                <input type="number" step="0.1" value={settings.passing} onChange={(e) => setSettings({ passing: Number(e.target.value) })} style={inputStyle(palette)} />
              </Field>
            </div>

            <div style={{ borderTop: `1px solid ${palette.border}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, fontFamily: "Space Grotesk, sans-serif" }}>Conectar con Outlook</div>
              <div style={{ fontSize: 11.5, color: palette.textDim, lineHeight: 1.5 }}>
                Copia este enlace y agrégalo en Outlook como "Suscribirse desde internet" (o "Agregar calendario → Desde internet").
                Tus evaluaciones van a aparecer solas ahí, y se actualizan cada media hora.
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <input readOnly value={webcalUrl} onFocus={(e) => e.target.select()} style={{ ...inputStyle(palette), flex: 1, fontSize: 11 }} />
                <Btn palette={palette} variant="ghost" onClick={() => {
                  navigator.clipboard?.writeText(webcalUrl);
                  setCopied(true); setTimeout(() => setCopied(false), 1500);
                }}>{copied ? "¡Copiado!" : "Copiar"}</Btn>
              </div>
              <Btn palette={palette} variant="ghost" style={{ alignSelf: "flex-start" }} onClick={onRegenerateWebcal}>
                Generar un enlace nuevo
              </Btn>
            </div>

            <div style={{ borderTop: `1px solid ${palette.border}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <Btn palette={palette} variant="danger" disabled={resetting} onClick={async () => {
                if (confirm2()) { setResetting(true); await onReset(); setResetting(false); setOpen(false); }
              }}>{resetting ? "Reiniciando…" : "Reiniciar todos los datos"}</Btn>
              <Btn palette={palette} variant="ghost" onClick={() => supabase.auth.signOut()}>Cerrar sesión</Btn>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
  function confirm2() { return window.confirm ? window.confirm("Esto borrará todos tus datos y volverá a los datos de ejemplo. ¿Continuar?") : true; }
}

/* ============================= INICIO ============================= */
function Inicio({ palette, settings, subjects, evaluations, sessions, generalAvg, generalObjective,
  upcomingEvals, priorities, todaySessions, weekHours, gamification, setSessionStatus, setTab }) {
  const scaleMax = settings.scaleMax;
  const diff = generalAvg !== null && generalObjective !== null ? generalAvg - generalObjective : null;
  const approvedPct = useMemo(() => {
    const withAvg = subjects.map((s) => subjectAverage(s.id, evaluations)).filter((v) => v !== null);
    if (!withAvg.length) return null;
    return Math.round((withAvg.filter((v) => v >= settings.passing).length / withAvg.length) * 100);
  }, [subjects, evaluations, settings.passing]);

  const nextThree = upcomingEvals.slice(0, 5);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* resumen */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 12 }}>
        <Card palette={palette} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Gauge value={generalAvg} max={scaleMax} color={palette.amber} label="PROMEDIO ACTUAL" palette={palette} />
        </Card>
        <Card palette={palette} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Gauge value={generalObjective} max={scaleMax} color={palette.mint} label="PROMEDIO OBJETIVO" palette={palette} />
        </Card>
        <Card palette={palette}>
          <Stat palette={palette} label="Diferencia vs objetivo" value={diff === null ? "—" : `${diff >= 0 ? "+" : ""}${N1(diff)}`} color={diff !== null && diff < 0 ? palette.red : palette.mint} />
          <Stat palette={palette} label="% asignaturas aprobadas" value={approvedPct === null ? "—" : `${approvedPct}%`} />
        </Card>
        <Card palette={palette}>
          <Stat palette={palette} label="Evaluaciones próximas" value={upcomingEvals.filter((e) => e.grade === null).length} />
          <Stat palette={palette} label="Horas esta semana" value={`${weekHours.real.toFixed(1)} / ${weekHours.planned.toFixed(1)}h`} />
        </Card>
        <Card palette={palette} style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: palette.amber, fontFamily: "IBM Plex Mono, monospace" }}>
            <Flame size={16} /> Racha: {gamification.streak} días
          </div>
          <div style={{ height: 6, borderRadius: 4, background: palette.bgElev2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${gamification.xpInLevel}%`, background: palette.purple }} />
          </div>
          <div style={{ fontSize: 11, color: palette.textDim }}>Nivel {gamification.level} · {gamification.xpInLevel}/100 XP</div>
        </Card>
      </div>

      {/* qué estudiar hoy */}
      <Card palette={palette}>
        <SectionTitle palette={palette} icon={Radio}>¿Qué debería estudiar hoy?</SectionTitle>
        {todaySessions.length === 0 ? (
          <FallbackToday palette={palette} priorities={priorities} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {todaySessions.map((se) => {
              const subj = subjects.find((s) => s.id === se.subjectId);
              return (
                <div key={se.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 10px", borderRadius: 10, background: palette.bgElev2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 99, background: subj?.color || palette.textDim }} />
                    <div>
                      <div style={{ fontSize: 13 }}>{se.title}</div>
                      <div style={{ fontSize: 11, color: palette.textDim }}>{se.duration} min</div>
                    </div>
                  </div>
                  {se.status === "pending" ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button title="Completada" onClick={() => setSessionStatus(se.id, "completed")} style={iconBtn(palette, palette.mint)}><CheckCircle2 size={16} /></button>
                      <button title="Parcial" onClick={() => setSessionStatus(se.id, "partial", Math.round(se.duration / 2))} style={iconBtn(palette, palette.amber)}><Circle size={16} /></button>
                    </div>
                  ) : (
                    <Pill color={se.status === "completed" ? palette.mint : palette.amber} bg="transparent">{se.status === "completed" ? "Hecha" : "Parcial"}</Pill>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* próximas evaluaciones */}
      <Card palette={palette}>
        <SectionTitle palette={palette} icon={CalIcon}>Próximas evaluaciones</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
          {nextThree.length === 0 && <Empty palette={palette}>No hay evaluaciones registradas todavía.</Empty>}
          {nextThree.map((ev) => {
            const subj = subjects.find((s) => s.id === ev.subjectId);
            const days = diffDays(ev.date);
            const c = urgencyColor(days, palette);
            return (
              <div key={ev.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "9px 10px", borderRadius: 10, background: palette.bgElev2, borderLeft: `3px solid ${c}` }}>
                <div>
                  <div style={{ fontSize: 13 }}>{ev.name} <span style={{ color: palette.textDim }}>· {subj?.name}</span></div>
                  <div style={{ fontSize: 11, color: palette.textDim }}>{fmtDate(ev.date)} · {ev.type} · {ev.weight}%</div>
                </div>
                <Pill color={c} bg="transparent">{days === 0 ? "Hoy" : `${days}d · ${urgencyLabel(days)}`}</Pill>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 10 }}><Btn palette={palette} variant="ghost" onClick={() => setTab("notas")}>Ver todas</Btn></div>
      </Card>

      {/* prioridad */}
      <Card palette={palette}>
        <SectionTitle palette={palette} icon={TrendingUp}>Nivel de prioridad</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          {priorities.map((p) => {
            const c = p.score >= 75 ? palette.red : p.score >= 50 ? "#FF8A3D" : p.score >= 25 ? palette.amber : palette.mint;
            return (
              <div key={p.subject.id}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                  <span>{p.subject.name}</span>
                  <span style={{ fontFamily: "IBM Plex Mono, monospace", color: c }}>{p.score}/100</span>
                </div>
                <div style={{ height: 7, borderRadius: 5, background: palette.bgElev2 }}>
                  <div style={{ height: "100%", width: `${p.score}%`, background: c, borderRadius: 5 }} />
                </div>
                <div style={{ fontSize: 10.5, color: palette.textDim, marginTop: 2 }}>
                  {p.evName ? `Próxima: ${p.evName} en ${p.days}d` : "Sin evaluación próxima"} · dificultad {p.subject.dificultad}/5 · confianza {p.subject.confianza}/5
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
function FallbackToday({ palette, priorities }) {
  const top = priorities.slice(0, 2);
  if (!top.length) return <Empty palette={palette}>Aún no hay asignaturas registradas.</Empty>;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ fontSize: 12, color: palette.textDim, marginBottom: 6 }}>No hay sesiones programadas para hoy. Sugerencia según prioridad:</div>
      {top.map((p) => (
        <div key={p.subject.id} style={{ fontSize: 13, marginBottom: 3 }}>
          Hoy podrías estudiar <b>{p.subject.name}</b> ~{Math.max(30, Math.round((p.subject.horasSemana * 60) / 3))} min
        </div>
      ))}
    </div>
  );
}
function Stat({ palette, label, value, color }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, color: palette.textDim }}>{label}</div>
      <div style={{ fontSize: 18, fontFamily: "IBM Plex Mono, monospace", fontWeight: 600, color: color || palette.text }}>{value}</div>
    </div>
  );
}
function SectionTitle({ palette, icon: Icon, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, fontSize: 14 }}>
      <Icon size={16} color={palette.amber} /> {children}
    </div>
  );
}
function Empty({ palette, children }) {
  return <div style={{ fontSize: 12.5, color: palette.textDim, padding: "10px 0" }}>{children}</div>;
}
function iconBtn(palette, color) {
  return { background: "none", border: `1px solid ${color}55`, borderRadius: 8, padding: 5, color, cursor: "pointer", display: "flex" };
}

/* ============================ ASIGNATURAS ============================ */
function Asignaturas({ palette, subjects, evaluations, scaleMax, upsertSubject, deleteSubject, priorities }) {
  const [editing, setEditing] = useState(null);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={heading()}>Asignaturas</h2>
        <Btn palette={palette} onClick={() => setEditing({})}><Plus size={14} /> Nueva</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 12 }}>
        {subjects.map((s) => {
          const avg = subjectAverage(s.id, evaluations);
          const pr = priorities.find((p) => p.subject.id === s.id);
          return (
            <Card key={s.id} palette={palette}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 99, background: s.color }} />
                  <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600 }}>{s.name}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setEditing(s)} style={iconBtn(palette, palette.textDim)}><Pencil size={14} /></button>
                  <button onClick={() => deleteSubject(s.id)} style={iconBtn(palette, palette.red)}><Trash2 size={14} /></button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 14, marginTop: 10 }}>
                <Gauge value={avg} max={scaleMax} color={s.color} size={70} palette={palette} />
                <div style={{ flex: 1, fontSize: 11.5, color: palette.textDim, display: "flex", flexDirection: "column", gap: 3, justifyContent: "center" }}>
                  <div>Objetivo: <b style={{ color: palette.text }}>{N1(s.objetivo)}</b></div>
                  <div>Mínimo: <b style={{ color: palette.text }}>{N1(s.minimo)}</b></div>
                  <div>Dificultad: {"●".repeat(s.dificultad)}{"○".repeat(5 - s.dificultad)}</div>
                  <div>Confianza: {"●".repeat(s.confianza)}{"○".repeat(5 - s.confianza)}</div>
                  <div>Prioridad: <span style={{ color: pr?.score >= 60 ? palette.red : palette.mint, fontFamily: "IBM Plex Mono, monospace" }}>{pr?.score}/100</span></div>
                </div>
              </div>
            </Card>
          );
        })}
        {subjects.length === 0 && <Empty palette={palette}>No tienes asignaturas todavía.</Empty>}
      </div>

      {editing && (
        <SubjectModal palette={palette} initial={editing} onClose={() => setEditing(null)}
          onSave={(s) => { upsertSubject(s); setEditing(null); }} />
      )}
    </div>
  );
}
function SubjectModal({ palette, initial, onClose, onSave }) {
  const [f, setF] = useState({
    id: initial.id, name: initial.name || "", color: initial.color || "#4C8DFF", teacher: initial.teacher || "",
    dificultad: initial.dificultad || 3, confianza: initial.confianza || 3, objetivo: initial.objetivo ?? 6.0,
    minimo: initial.minimo ?? 4.0, horasSemana: initial.horasSemana ?? 2,
  });
  const colorOpts = ["#F5A623", "#4C8DFF", "#33D6A6", "#9B7BFF", "#FF5A5A", "#FF8A3D", "#E85DDB"];
  return (
    <Modal title={initial.id ? "Editar asignatura" : "Nueva asignatura"} palette={palette} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Field label="Nombre" palette={palette}><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} style={inputStyle(palette)} /></Field>
        <Field label="Profesor (opcional)" palette={palette}><input value={f.teacher} onChange={(e) => setF({ ...f, teacher: e.target.value })} style={inputStyle(palette)} /></Field>
        <Field label="Color" palette={palette}>
          <div style={{ display: "flex", gap: 6 }}>
            {colorOpts.map((c) => (
              <button key={c} onClick={() => setF({ ...f, color: c })} style={{ width: 24, height: 24, borderRadius: 99, background: c, border: f.color === c ? `2px solid ${palette.text}` : "none", cursor: "pointer" }} />
            ))}
          </div>
        </Field>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Objetivo" palette={palette}><input type="number" step="0.1" value={f.objetivo} onChange={(e) => setF({ ...f, objetivo: Number(e.target.value) })} style={inputStyle(palette)} /></Field>
          <Field label="Mínimo aprobación" palette={palette}><input type="number" step="0.1" value={f.minimo} onChange={(e) => setF({ ...f, minimo: Number(e.target.value) })} style={inputStyle(palette)} /></Field>
          <Field label="Horas/semana" palette={palette}><input type="number" step="0.5" value={f.horasSemana} onChange={(e) => setF({ ...f, horasSemana: Number(e.target.value) })} style={inputStyle(palette)} /></Field>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          <Field label={`Dificultad: ${f.dificultad}/5`} palette={palette}><input type="range" min="1" max="5" value={f.dificultad} onChange={(e) => setF({ ...f, dificultad: Number(e.target.value) })} /></Field>
          <Field label={`Confianza: ${f.confianza}/5`} palette={palette}><input type="range" min="1" max="5" value={f.confianza} onChange={(e) => setF({ ...f, confianza: Number(e.target.value) })} /></Field>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
          <Btn palette={palette} variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn palette={palette} disabled={!f.name.trim()} onClick={() => onSave(f)}>Guardar</Btn>
        </div>
      </div>
    </Modal>
  );
}
function heading() { return { fontFamily: "Space Grotesk, sans-serif", fontSize: 19, margin: 0 }; }

/* ============================== NOTAS ============================== */
function Notas({ palette, subjects, evaluations, settings, upsertEvaluation, deleteEvaluation, askConfirm }) {
  const [editing, setEditing] = useState(null);
  const [calcSubject, setCalcSubject] = useState(subjects[0]?.id || "");
  const [calcTarget, setCalcTarget] = useState(6.0);

  const bySubject = subjects.map((s) => ({ subject: s, evs: evaluations.filter((e) => e.subjectId === s.id).sort((a, b) => a.date < b.date ? -1 : 1) }));

  const calc = calcSubject ? neededGrade(calcSubject, evaluations, calcTarget, settings.scaleMax) : null;
  const calcSum = calcSubject ? subjectWeightedSum(calcSubject, evaluations) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={heading()}>Notas y evaluaciones</h2>
        <Btn palette={palette} onClick={() => setEditing({})}><Plus size={14} /> Nueva evaluación</Btn>
      </div>

      <Card palette={palette}>
        <SectionTitle palette={palette} icon={Target}>¿Qué nota necesito?</SectionTitle>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10, alignItems: "flex-end" }}>
          <Field label="Asignatura" palette={palette}>
            <select value={calcSubject} onChange={(e) => setCalcSubject(e.target.value)} style={inputStyle(palette)}>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Promedio objetivo" palette={palette}>
            <input type="number" step="0.1" value={calcTarget} onChange={(e) => setCalcTarget(Number(e.target.value))} style={inputStyle(palette)} />
          </Field>
        </div>
        {calc && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: palette.bgElev2, fontSize: 13, lineHeight: 1.6 }}>
            {calcSum.weightAll - calcSum.weightGraded <= 0 ? (
              <span style={{ color: palette.textDim }}>No quedan evaluaciones pendientes con ponderación registrada en esta asignatura.</span>
            ) : calc.possible ? (
              <span>Necesitas aproximadamente un <b style={{ color: palette.amber, fontFamily: "IBM Plex Mono, monospace" }}>{N1(calc.needed)}</b> en promedio en tus evaluaciones pendientes (ponderación restante: {calc.remainingWeight}%) para llegar a {N1(calcTarget)}.</span>
            ) : (
              <span style={{ color: palette.red }}>No es posible alcanzar {N1(calcTarget)} solo con las evaluaciones pendientes (se necesitaría {N1(calc.needed)}, sobre la escala máxima). Necesitas subir el objetivo, sumar más ponderación, o mejorar el promedio ya obtenido.</span>
            )}
            <div style={{ color: palette.textDim, fontSize: 11, marginTop: 6 }}>
              Fórmula: (objetivo×100 − Σ nota×ponderación obtenida) / ponderación restante
            </div>
          </div>
        )}
      </Card>

      {bySubject.map(({ subject, evs }) => {
        const avg = subjectAverage(subject.id, evaluations);
        return (
          <Card key={subject.id} palette={palette}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 9, height: 9, borderRadius: 99, background: subject.color }} />
                <b style={{ fontFamily: "Space Grotesk, sans-serif" }}>{subject.name}</b>
              </div>
              <Pill color={subject.color} bg="transparent">Promedio: {N1(avg)}</Pill>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {evs.length === 0 && <Empty palette={palette}>Sin evaluaciones registradas.</Empty>}
              {evs.map((ev) => (
                <div key={ev.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 10px", borderRadius: 10, background: palette.bgElev2 }}>
                  <div>
                    <div style={{ fontSize: 13 }}>{ev.name} <span style={{ color: palette.textDim, fontSize: 11 }}>· {ev.type} · {ev.weight}%</span></div>
                    <div style={{ fontSize: 11, color: palette.textDim }}>{fmtDate(ev.date)}{ev.contents ? ` · ${ev.contents}` : ""}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color: ev.grade === null ? palette.textDim : (ev.grade >= settings.passing ? palette.mint : palette.red) }}>
                      {ev.grade === null ? "Pendiente" : N1(ev.grade)}
                    </span>
                    <button onClick={() => setEditing(ev)} style={iconBtn(palette, palette.textDim)}><Pencil size={14} /></button>
                    <button onClick={() => {
                      askConfirm(`¿Eliminar "${ev.name}"? También hay sesiones de estudio generadas para esta evaluación.`,
                        () => deleteEvaluation(ev.id, true), () => deleteEvaluation(ev.id, false));
                    }} style={iconBtn(palette, palette.red)}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}

      {editing && (
        <EvaluationModal palette={palette} subjects={subjects} initial={editing} onClose={() => setEditing(null)}
          onSave={(ev) => { upsertEvaluation(ev, !editing.id); setEditing(null); }} />
      )}
    </div>
  );
}
function EvaluationModal({ palette, subjects, initial, onClose, onSave }) {
  const [f, setF] = useState({
    id: initial.id || uid(), subjectId: initial.subjectId || subjects[0]?.id || "",
    name: initial.name || "", type: initial.type || "Prueba", date: initial.date || todayISO(),
    weight: initial.weight ?? 20, grade: initial.grade ?? null, contents: initial.contents || "", notes: initial.notes || "",
  });
  const hasGrade = f.grade !== null && f.grade !== "";
  return (
    <Modal title={initial.id ? "Editar evaluación" : "Nueva evaluación"} palette={palette} onClose={onClose} wide>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Asignatura" palette={palette}>
            <select value={f.subjectId} onChange={(e) => setF({ ...f, subjectId: e.target.value })} style={inputStyle(palette)}>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Tipo" palette={palette}>
            <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} style={inputStyle(palette)}>
              {["Prueba", "Control", "Trabajo", "Exposición", "Examen"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Nombre" palette={palette}><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} style={inputStyle(palette)} /></Field>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Fecha" palette={palette}><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} style={inputStyle(palette)} /></Field>
          <Field label="Ponderación %" palette={palette}><input type="number" value={f.weight} onChange={(e) => setF({ ...f, weight: Number(e.target.value) })} style={inputStyle(palette)} /></Field>
          <Field label="Nota (si ya la tienes)" palette={palette}>
            <input type="number" step="0.1" value={f.grade ?? ""} onChange={(e) => setF({ ...f, grade: e.target.value === "" ? null : Number(e.target.value) })} style={inputStyle(palette)} />
          </Field>
        </div>
        <Field label="Contenidos" palette={palette}><input value={f.contents} onChange={(e) => setF({ ...f, contents: e.target.value })} style={inputStyle(palette)} /></Field>
        <Field label="Observaciones" palette={palette}><textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} style={{ ...inputStyle(palette), minHeight: 50 }} /></Field>
        {!hasGrade && diffDays(f.date) > 0 && (
          <div style={{ fontSize: 11.5, color: palette.textDim, background: palette.bgElev2, padding: 8, borderRadius: 8 }}>
            Al guardar, se generarán automáticamente sesiones de estudio en el calendario antes de esta fecha.
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <Btn palette={palette} variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn palette={palette} disabled={!f.name.trim() || !f.subjectId} onClick={() => onSave(f)}>Guardar</Btn>
        </div>
      </div>
    </Modal>
  );
}

/* ============================ CALENDARIO ============================ */
function Calendario({ palette, subjects, evaluations, sessions, upsertEvaluation, deleteEvaluation, addManualSession, deleteSession, setSessionStatus, askConfirm }) {
  const [view, setView] = useState("mes");
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [editingEv, setEditingEv] = useState(null);
  const [addingSession, setAddingSession] = useState(false);

  const dayEvents = (iso) => ({
    evs: evaluations.filter((e) => e.date === iso),
    ses: sessions.filter((s) => s.date === iso),
  });

  const monthGrid = useMemo(() => {
    const first = new Date(cursor); first.setDate(1);
    const startDow = (first.getDay() + 6) % 7; // Monday first
    const gridStart = new Date(first); gridStart.setDate(first.getDate() - startDow);
    const days = [];
    for (let i = 0; i < 42; i++) { const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); days.push(d); }
    return days;
  }, [cursor]);

  const agendaItems = useMemo(() => {
    const items = [
      ...evaluations.map((e) => ({ kind: "eval", date: e.date, data: e })),
      ...sessions.map((s) => ({ kind: "session", date: s.date, data: s })),
    ].filter((i) => diffDays(i.date) >= -1);
    return items.sort((a, b) => a.date < b.date ? -1 : 1).slice(0, 40);
  }, [evaluations, sessions]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <h2 style={heading()}>Calendario</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn palette={palette} variant={view === "mes" ? "primary" : "ghost"} onClick={() => setView("mes")}>Mes</Btn>
          <Btn palette={palette} variant={view === "agenda" ? "primary" : "ghost"} onClick={() => setView("agenda")}>Agenda</Btn>
          <Btn palette={palette} onClick={() => setEditingEv({})}><Plus size={14} /> Evaluación</Btn>
          <Btn palette={palette} variant="ghost" onClick={() => setAddingSession(true)}><Plus size={14} /> Sesión</Btn>
        </div>
      </div>

      {view === "mes" && (
        <Card palette={palette}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <button onClick={() => { const d = new Date(cursor); d.setMonth(d.getMonth() - 1); setCursor(d); }} style={iconBtn(palette, palette.text)}><ChevronLeft size={16} /></button>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, textTransform: "capitalize" }}>
              {cursor.toLocaleDateString("es-CL", { month: "long", year: "numeric" })}
            </div>
            <button onClick={() => { const d = new Date(cursor); d.setMonth(d.getMonth() + 1); setCursor(d); }} style={iconBtn(palette, palette.text)}><ChevronRight size={16} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
            {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
              <div key={i} style={{ fontSize: 10.5, color: palette.textDim, textAlign: "center", fontFamily: "Space Grotesk, sans-serif" }}>{d}</div>
            ))}
            {monthGrid.map((d, i) => {
              const iso = d.toISOString().slice(0, 10);
              const inMonth = d.getMonth() === cursor.getMonth();
              const { evs, ses } = dayEvents(iso);
              const isToday = iso === todayISO();
              return (
                <div key={i} style={{
                  minHeight: 62, borderRadius: 8, padding: 4, background: isToday ? `${palette.amber}22` : palette.bgElev2,
                  opacity: inMonth ? 1 : 0.35, border: isToday ? `1px solid ${palette.amber}` : "1px solid transparent",
                  display: "flex", flexDirection: "column", gap: 2, cursor: evs.length ? "pointer" : "default",
                }} onClick={() => evs[0] && setEditingEv(evs[0])}>
                  <div style={{ fontSize: 10, color: palette.textDim }}>{d.getDate()}</div>
                  {evs.map((e) => <div key={e.id} style={{ fontSize: 9, background: PALETTES.dark === palette ? `${palette.red}33` : `${palette.red}22`, color: palette.red, borderRadius: 4, padding: "1px 3px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{e.name}</div>)}
                  {ses.slice(0, 2).map((s) => <div key={s.id} style={{ fontSize: 9, color: s.status === "completed" ? palette.mint : palette.textDim, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>• {s.title.split("—")[1] || s.title}</div>)}
                  {ses.length > 2 && <div style={{ fontSize: 9, color: palette.textDim }}>+{ses.length - 2} más</div>}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {view === "agenda" && (
        <Card palette={palette}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {agendaItems.map((it) => (
              <AgendaRow key={it.kind + it.data.id} it={it} palette={palette} subjects={subjects}
                onEditEval={setEditingEv} onDeleteSession={deleteSession} setSessionStatus={setSessionStatus} />
            ))}
            {agendaItems.length === 0 && <Empty palette={palette}>No hay eventos próximos.</Empty>}
          </div>
        </Card>
      )}

      {editingEv && (
        <EvaluationModal palette={palette} subjects={subjects} initial={editingEv} onClose={() => setEditingEv(null)}
          onSave={(ev) => { upsertEvaluation(ev, !editingEv.id); setEditingEv(null); }} />
      )}
      {addingSession && (
        <SessionModal palette={palette} subjects={subjects} onClose={() => setAddingSession(false)}
          onSave={(s) => { addManualSession(s); setAddingSession(false); }} />
      )}
    </div>
  );
}
function AgendaRow({ it, palette, subjects, onEditEval, onDeleteSession, setSessionStatus }) {
  const subj = subjects.find((s) => s.id === it.data.subjectId);
  const days = diffDays(it.date);
  if (it.kind === "eval") {
    const c = urgencyColor(days, palette);
    return (
      <div onClick={() => onEditEval(it.data)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "8px 10px", borderRadius: 10, background: palette.bgElev2, borderLeft: `3px solid ${c}`, cursor: "pointer" }}>
        <div>
          <div style={{ fontSize: 13 }}>🔴 {it.data.name} <span style={{ color: palette.textDim }}>· {subj?.name}</span></div>
          <div style={{ fontSize: 11, color: palette.textDim }}>{fmtDateLong(it.date)}</div>
        </div>
        <Pill color={c} bg="transparent">{days < 0 ? "Pasada" : days === 0 ? "Hoy" : `${days}d`}</Pill>
      </div>
    );
  }
  const se = it.data;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 10, background: palette.bgElev2 }}>
      <div>
        <div style={{ fontSize: 13 }}>📚 {se.title}</div>
        <div style={{ fontSize: 11, color: palette.textDim }}>{fmtDateLong(it.date)} · {se.duration} min</div>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {se.status === "pending" ? (
          <>
            <button onClick={() => setSessionStatus(se.id, "completed")} style={iconBtn(palette, palette.mint)}><CheckCircle2 size={14} /></button>
            <button onClick={() => onDeleteSession(se.id)} style={iconBtn(palette, palette.red)}><Trash2 size={14} /></button>
          </>
        ) : <Pill color={se.status === "completed" ? palette.mint : palette.amber} bg="transparent">{se.status === "completed" ? "Hecha" : "Parcial"}</Pill>}
      </div>
    </div>
  );
}
function SessionModal({ palette, subjects, onClose, onSave }) {
  const [f, setF] = useState({ subjectId: subjects[0]?.id || "", title: "", date: todayISO(), duration: 45 });
  return (
    <Modal title="Nueva sesión de estudio" palette={palette} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Field label="Asignatura" palette={palette}>
          <select value={f.subjectId} onChange={(e) => setF({ ...f, subjectId: e.target.value })} style={inputStyle(palette)}>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Título" palette={palette}><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Ej: Repaso de fórmulas" style={inputStyle(palette)} /></Field>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Fecha" palette={palette}><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} style={inputStyle(palette)} /></Field>
          <Field label="Minutos" palette={palette}><input type="number" value={f.duration} onChange={(e) => setF({ ...f, duration: Number(e.target.value) })} style={inputStyle(palette)} /></Field>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn palette={palette} variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn palette={palette} disabled={!f.title.trim() || !f.subjectId} onClick={() => {
            const subj = subjects.find((s) => s.id === f.subjectId);
            onSave({ ...f, title: `${subj.name} — ${f.title}` });
          }}>Agregar</Btn>
        </div>
      </div>
    </Modal>
  );
}

/* ============================ OBJETIVOS ============================ */
function Objetivos({ palette, goals, subjects, evaluations, generalAvg, weekHours, upsertGoal, deleteGoal }) {
  const [editing, setEditing] = useState(null);
  const progressFor = (g) => {
    if (g.type === "avgGeneral") return { cur: generalAvg, target: g.target, label: `${N1(generalAvg)} / ${N1(g.target)}` };
    if (g.type === "avgSubject") {
      const cur = subjectAverage(g.subjectId, evaluations);
      return { cur, target: g.target, label: `${N1(cur)} / ${N1(g.target)}` };
    }
    if (g.type === "hoursWeek") return { cur: weekHours.real, target: g.target, label: `${weekHours.real.toFixed(1)}h / ${g.target}h` };
    return { cur: 0, target: 1, label: "" };
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={heading()}>Objetivos</h2>
        <Btn palette={palette} onClick={() => setEditing({})}><Plus size={14} /> Nuevo objetivo</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 12 }}>
        {goals.map((g) => {
          const p = progressFor(g);
          const pct = p.cur === null ? 0 : clamp((p.cur / p.target) * 100, 0, 100);
          const done = p.cur !== null && p.cur >= p.target;
          return (
            <Card key={g.id} palette={palette}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Target size={14} color={done ? palette.mint : palette.amber} />
                  <b style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 13 }}>{g.description}</b>
                </div>
                <button onClick={() => deleteGoal(g.id)} style={iconBtn(palette, palette.red)}><Trash2 size={13} /></button>
              </div>
              <div style={{ marginTop: 10, height: 8, borderRadius: 6, background: palette.bgElev2 }}>
                <div style={{ height: "100%", width: `${pct}%`, background: done ? palette.mint : palette.amber, borderRadius: 6 }} />
              </div>
              <div style={{ fontSize: 11.5, color: palette.textDim, marginTop: 6, fontFamily: "IBM Plex Mono, monospace" }}>{p.label}</div>
            </Card>
          );
        })}
        {goals.length === 0 && <Empty palette={palette}>No tienes objetivos definidos.</Empty>}
      </div>
      {editing && (
        <GoalModal palette={palette} subjects={subjects} onClose={() => setEditing(null)} onSave={(g) => { upsertGoal(g); setEditing(null); }} />
      )}
    </div>
  );
}
function GoalModal({ palette, subjects, onClose, onSave }) {
  const [type, setType] = useState("avgGeneral");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || "");
  const [target, setTarget] = useState(6.0);
  const [description, setDescription] = useState("");
  return (
    <Modal title="Nuevo objetivo" palette={palette} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Field label="Tipo de objetivo" palette={palette}>
          <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle(palette)}>
            <option value="avgGeneral">Promedio general</option>
            <option value="avgSubject">Promedio de una asignatura</option>
            <option value="hoursWeek">Horas de estudio a la semana</option>
          </select>
        </Field>
        {type === "avgSubject" && (
          <Field label="Asignatura" palette={palette}>
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} style={inputStyle(palette)}>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        )}
        <Field label={type === "hoursWeek" ? "Horas objetivo" : "Nota objetivo"} palette={palette}>
          <input type="number" step="0.1" value={target} onChange={(e) => setTarget(Number(e.target.value))} style={inputStyle(palette)} />
        </Field>
        <Field label="Descripción" palette={palette}>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Terminar el semestre con promedio 6,0" style={inputStyle(palette)} />
        </Field>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn palette={palette} variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn palette={palette} disabled={!description.trim()} onClick={() => onSave({ type, subjectId: type === "avgSubject" ? subjectId : undefined, target, description })}>Guardar</Btn>
        </div>
      </div>
    </Modal>
  );
}

/* ============================ ESTUDIAR ============================ */
function Estudiar({ palette, sessions, subjects, setSessionStatus, addManualSession, deleteSession, studyLog }) {
  const [adding, setAdding] = useState(false);
  const pending = sessions.filter((s) => s.status === "pending" && diffDays(s.date) >= 0).sort((a, b) => a.date < b.date ? -1 : 1);
  const [running, setRunning] = useState(null); // {seconds, active}
  const [seconds, setSeconds] = useState(25 * 60);
  const [active, setActive] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (active) {
      timerRef.current = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    } else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [active]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={heading()}>Estudiar</h2>

      <Card palette={palette} style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 40, fontWeight: 700, color: palette.amber }}>{mm}:{ss}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn palette={palette} onClick={() => setActive((a) => !a)}>{active ? <Pause size={14} /> : <Play size={14} />} {active ? "Pausar" : "Iniciar"}</Btn>
          <Btn palette={palette} variant="ghost" onClick={() => { setActive(false); setSeconds(25 * 60); }}><RotateCcw size={14} /> Reiniciar</Btn>
          {[25, 45, 60].map((m) => (
            <Btn key={m} palette={palette} variant="ghost" onClick={() => { setActive(false); setSeconds(m * 60); }}>{m}m</Btn>
          ))}
        </div>
      </Card>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SectionTitle palette={palette} icon={ClipboardList}>Sesiones pendientes</SectionTitle>
        <Btn palette={palette} variant="ghost" onClick={() => setAdding(true)}><Plus size={14} /> Sesión manual</Btn>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {pending.length === 0 && <Empty palette={palette}>No tienes sesiones pendientes. ¡Vas al día!</Empty>}
        {pending.map((se) => {
          const subj = subjects.find((s) => s.id === se.subjectId);
          return (
            <Card key={se.id} palette={palette} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: subj?.color }} />
                <div>
                  <div style={{ fontSize: 13 }}>{se.title}</div>
                  <div style={{ fontSize: 11, color: palette.textDim }}>{fmtDate(se.date)} · {se.duration} min</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button title="Completada" onClick={() => setSessionStatus(se.id, "completed")} style={iconBtn(palette, palette.mint)}><CheckCircle2 size={16} /></button>
                <button title="Parcial" onClick={() => setSessionStatus(se.id, "partial", Math.round(se.duration / 2))} style={iconBtn(palette, palette.amber)}><Circle size={16} /></button>
                <button title="No realizada" onClick={() => setSessionStatus(se.id, "missed", 0)} style={iconBtn(palette, palette.red)}><X size={16} /></button>
                <button title="Eliminar" onClick={() => deleteSession(se.id)} style={iconBtn(palette, palette.textDim)}><Trash2 size={14} /></button>
              </div>
            </Card>
          );
        })}
      </div>

      {adding && <SessionModal palette={palette} subjects={subjects} onClose={() => setAdding(false)} onSave={(s) => { addManualSession(s); setAdding(false); }} />}
    </div>
  );
}

/* ============================ ESTADÍSTICAS ============================ */
function Estadisticas({ palette, subjects, evaluations, studyLog, sessions }) {
  const evolutionData = useMemo(() => {
    const points = {};
    subjects.forEach((s) => {
      const evs = evaluations.filter((e) => e.subjectId === s.id && e.grade !== null).sort((a, b) => a.date < b.date ? -1 : 1);
      let sumW = 0, sumWG = 0;
      evs.forEach((e) => {
        sumW += Number(e.weight); sumWG += Number(e.weight) * Number(e.grade);
        const avg = sumWG / sumW;
        points[e.date] = points[e.date] || { date: fmtDate(e.date) };
        points[e.date][s.name] = Number(avg.toFixed(2));
      });
    });
    return Object.values(points);
  }, [subjects, evaluations]);

  const hoursByWeek = useMemo(() => {
    const map = {};
    studyLog.forEach((l) => {
      const d = new Date(l.date + "T00:00:00");
      const day = (d.getDay() + 6) % 7;
      const monday = new Date(d); monday.setDate(d.getDate() - day);
      const key = monday.toISOString().slice(0, 10);
      map[key] = (map[key] || 0) + l.minutes / 60;
    });
    return Object.entries(map).sort((a, b) => a[0] < b[0] ? -1 : 1).slice(-8)
      .map(([k, v]) => ({ week: fmtDate(k), horas: Number(v.toFixed(1)) }));
  }, [studyLog]);

  const distribution = useMemo(() => {
    const map = {};
    studyLog.forEach((l) => { map[l.subjectId] = (map[l.subjectId] || 0) + l.minutes; });
    return subjects.filter((s) => map[s.id]).map((s) => ({ name: s.name, value: map[s.id], color: s.color }));
  }, [studyLog, subjects]);

  const completionRate = useMemo(() => {
    const total = sessions.filter((s) => diffDays(s.date) < 0 || s.status !== "pending").length;
    const completed = sessions.filter((s) => s.status === "completed").length;
    return total ? Math.round((completed / total) * 100) : 0;
  }, [sessions]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={heading()}>Estadísticas</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
        <Card palette={palette}><Stat palette={palette} label="Sesiones completadas" value={`${completionRate}%`} /></Card>
        <Card palette={palette}><Stat palette={palette} label="Horas registradas (total)" value={(studyLog.reduce((a, l) => a + l.minutes, 0) / 60).toFixed(1)} /></Card>
        <Card palette={palette}><Stat palette={palette} label="Sesiones programadas" value={sessions.length} /></Card>
      </div>

      <Card palette={palette}>
        <SectionTitle palette={palette} icon={TrendingUp}>Evolución del promedio por asignatura</SectionTitle>
        <div style={{ height: 260, marginTop: 10 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke={palette.border} />
              <XAxis dataKey="date" stroke={palette.textDim} fontSize={11} />
              <YAxis stroke={palette.textDim} fontSize={11} domain={[1, 7]} />
              <Tooltip contentStyle={{ background: palette.bgElev2, border: `1px solid ${palette.border}`, borderRadius: 8, color: palette.text }} />
              <Legend />
              {subjects.map((s) => <Line key={s.id} type="monotone" dataKey={s.name} stroke={s.color} dot connectNulls strokeWidth={2} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card palette={palette}>
        <SectionTitle palette={palette} icon={BarChart3}>Horas de estudio por semana</SectionTitle>
        <div style={{ height: 220, marginTop: 10 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hoursByWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke={palette.border} />
              <XAxis dataKey="week" stroke={palette.textDim} fontSize={11} />
              <YAxis stroke={palette.textDim} fontSize={11} />
              <Tooltip contentStyle={{ background: palette.bgElev2, border: `1px solid ${palette.border}`, borderRadius: 8, color: palette.text }} />
              <Bar dataKey="horas" fill={palette.amber} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card palette={palette}>
        <SectionTitle palette={palette} icon={Radio}>Distribución del tiempo por asignatura</SectionTitle>
        <div style={{ height: 240, marginTop: 10 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => e.name}>
                {distribution.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: palette.bgElev2, border: `1px solid ${palette.border}`, borderRadius: 8, color: palette.text }} />
            </PieChart>
          </ResponsiveContainer>
          {distribution.length === 0 && <Empty palette={palette}>Aún no hay sesiones registradas para graficar.</Empty>}
        </div>
      </Card>
    </div>
  );
}
