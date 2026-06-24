import { useEffect, useMemo, useState } from "react";
import { FeedbackIcon } from "../icons.jsx";
import {
  getReminderPreviewSet,
  getTeacherReminderVoice,
  humorOptions,
  mapTeacherReminderVoice,
  saveTeacherReminderVoice,
  teacherReminderVoiceToForm,
  toneOptions
} from "../../lib/teacherReminderVoice.js";

function ReminderVoiceField({ label, children }) {
  return (
    <label className="teacher-reminder-voice-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function TeacherReminderVoiceCard({ profile }) {
  const [voiceState, setVoiceState] = useState({
    isLoading: true,
    error: "",
    voice: mapTeacherReminderVoice(null, profile)
  });
  const [form, setForm] = useState(() => teacherReminderVoiceToForm(null, profile));
  const [saveState, setSaveState] = useState({
    type: "idle",
    message: ""
  });
  const isSaving = saveState.type === "saving";
  const previewVoice = useMemo(
    () => mapTeacherReminderVoice(
      {
        teacher_id: profile?.id,
        tone: form.tone,
        humor_level: form.humor_level,
        style_notes: form.style_notes,
        catchphrases: form.catchphrases.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
        forbidden_style: form.forbidden_style,
        signature_name: form.signature_name,
        is_active: form.is_active
      },
      profile
    ),
    [form, profile]
  );
  const previews = getReminderPreviewSet(previewVoice, "Ricmartin");

  useEffect(() => {
    let isMounted = true;

    async function loadVoice() {
      if (!profile?.id || !["teacher", "admin"].includes(profile.role)) {
        return;
      }

      setVoiceState((current) => ({
        ...current,
        isLoading: true,
        error: ""
      }));

      const result = await getTeacherReminderVoice(profile.id, profile);

      if (!isMounted) {
        return;
      }

      setVoiceState({
        isLoading: false,
        error: result.error || "",
        voice: result.voice
      });
      setForm(teacherReminderVoiceToForm(result.voice, profile));
    }

    loadVoice();

    return () => {
      isMounted = false;
    };
  }, [profile?.id, profile?.role]);

  function updateField(field, value) {
    setSaveState({
      type: "idle",
      message: ""
    });
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaveState({
      type: "saving",
      message: "Saving Teacher Reminder Voice..."
    });

    const result = await saveTeacherReminderVoice(profile.id, form, profile);

    if (result.error) {
      setSaveState({
        type: "error",
        message: result.error
      });
      return;
    }

    setVoiceState({
      isLoading: false,
      error: "",
      voice: result.voice
    });
    setForm(teacherReminderVoiceToForm(result.voice, profile));
    setSaveState({
      type: "success",
      message: "Teacher Reminder Voice saved."
    });
  }

  return (
    <section className="card profile-card teacher-reminder-voice-card" aria-labelledby="teacher-reminder-voice-title">
      <div className="profile-card-icon" aria-hidden="true">
        <FeedbackIcon />
      </div>
      <div>
        <p className="card-eyebrow card-eyebrow--red">Reminder voice</p>
        <h2 id="teacher-reminder-voice-title">Teacher Reminder Voice</h2>
        <p>
          {voiceState.error ||
            (voiceState.isLoading
              ? "Loading your reminder voice..."
              : "Shape warm reminder previews so messages sound like your teaching style, not a robot.")}
        </p>

        <form className="teacher-reminder-voice-form" onSubmit={handleSubmit}>
          <div className="teacher-reminder-voice-grid">
            <ReminderVoiceField label="Tone">
              <select
                value={form.tone}
                disabled={voiceState.isLoading || isSaving}
                onChange={(event) => updateField("tone", event.target.value)}
              >
                {toneOptions.map((option) => (
                  <option value={option.value} key={option.value}>{option.label}</option>
                ))}
              </select>
            </ReminderVoiceField>

            <ReminderVoiceField label="Humor level">
              <select
                value={form.humor_level}
                disabled={voiceState.isLoading || isSaving}
                onChange={(event) => updateField("humor_level", event.target.value)}
              >
                {humorOptions.map((option) => (
                  <option value={option.value} key={option.value}>{option.label}</option>
                ))}
              </select>
            </ReminderVoiceField>

            <ReminderVoiceField label="Signature name">
              <input
                type="text"
                value={form.signature_name}
                placeholder="Teacher Ricardo"
                disabled={voiceState.isLoading || isSaving}
                onChange={(event) => updateField("signature_name", event.target.value)}
              />
            </ReminderVoiceField>
          </div>

          <ReminderVoiceField label="Catchphrases">
            <textarea
              value={form.catchphrases}
              placeholder={"One small answer is enough.\nYour future self is waiting."}
              disabled={voiceState.isLoading || isSaving}
              onChange={(event) => updateField("catchphrases", event.target.value)}
            />
          </ReminderVoiceField>

          <ReminderVoiceField label="Style notes">
            <textarea
              value={form.style_notes}
              placeholder="I am cheerful, playful, and calm. I joke with students, but I never shame them."
              disabled={voiceState.isLoading || isSaving}
              onChange={(event) => updateField("style_notes", event.target.value)}
            />
          </ReminderVoiceField>

          <ReminderVoiceField label="Forbidden style">
            <textarea
              value={form.forbidden_style}
              placeholder="No insults, no real threats, no humiliation, no fear, no harsh pressure."
              disabled={voiceState.isLoading || isSaving}
              onChange={(event) => updateField("forbidden_style", event.target.value)}
            />
          </ReminderVoiceField>

          <button className="primary-button" type="submit" disabled={voiceState.isLoading || isSaving}>
            {isSaving ? "Saving..." : "Save Teacher Reminder Voice"}
          </button>

          {saveState.message && (
            <p className={`profile-reminder-status profile-reminder-status--${saveState.type}`}>
              {saveState.message}
            </p>
          )}
        </form>

        <div className="teacher-reminder-preview-panel" aria-label="Message previews">
          <div>
            <p className="card-eyebrow card-eyebrow--red">Message preview</p>
            <h3>Template-based examples</h3>
          </div>
          <div className="teacher-reminder-preview-list">
            {previews.map((preview) => (
              <article
                className={`teacher-reminder-preview-card ${
                  preview.type === "whatsapp_missing" ? "is-whatsapp" : ""
                }`}
                key={preview.type}
              >
                <h4>{preview.title}</h4>
                <pre>{preview.message}</pre>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
