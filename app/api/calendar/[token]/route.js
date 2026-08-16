import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

function escapeICS(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}
function dateStamp(iso) {
  return iso.replace(/-/g, "");
}
function nextDay(iso) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}
function nowStamp() {
  return new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export async function GET(req, { params }) {
  const { token } = params;

  const { data: settings, error: settingsErr } = await supabaseAdmin
    .from("academic_settings")
    .select("user_id")
    .eq("webcal_token", token)
    .maybeSingle();

  if (settingsErr || !settings) {
    return new NextResponse("Enlace de calendario no válido.", { status: 404 });
  }

  const { data: evaluations } = await supabaseAdmin
    .from("evaluations")
    .select("id, name, type, date, weight, grade, contents, subject_id")
    .eq("user_id", settings.user_id);

  const { data: subjects } = await supabaseAdmin
    .from("subjects")
    .select("id, name")
    .eq("user_id", settings.user_id);

  const subjectName = (id) => (subjects || []).find((s) => s.id === id)?.name || "";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Centro de Control Academico//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Evaluaciones académicas",
    "X-WR-TIMEZONE:UTC",
  ];

  (evaluations || []).forEach((ev) => {
    if (!ev.date) return;
    const subj = subjectName(ev.subject_id);
    const title = subj ? `${ev.type || "Evaluación"} — ${subj}: ${ev.name}` : `${ev.type || "Evaluación"}: ${ev.name}`;
    const descParts = [];
    if (ev.weight) descParts.push(`Ponderación: ${ev.weight}%`);
    if (ev.grade !== null && ev.grade !== undefined) descParts.push(`Nota: ${ev.grade}`);
    if (ev.contents) descParts.push(`Contenidos: ${ev.contents}`);

    lines.push(
      "BEGIN:VEVENT",
      `UID:${ev.id}@centro-control-academico`,
      `DTSTAMP:${nowStamp()}`,
      `DTSTART;VALUE=DATE:${dateStamp(ev.date)}`,
      `DTEND;VALUE=DATE:${nextDay(ev.date)}`,
      `SUMMARY:${escapeICS(title)}`,
      `DESCRIPTION:${escapeICS(descParts.join(" · "))}`,
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");
  const body = lines.join("\r\n");

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="centro-control-academico.ics"',
      "Cache-Control": "public, max-age=1800",
    },
  });
}
