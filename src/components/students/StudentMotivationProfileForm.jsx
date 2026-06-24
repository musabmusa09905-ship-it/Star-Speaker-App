import { useEffect, useState } from "react";
import {
  motivationProfileToForm,
  motivationStyleOptions,
  saveStudentMotivationProfile
} from "../../lib/studentMotivationProfiles.js";

export function StudentMotivationProfileForm({
  student,
  actorProfile,
  onSaved
}) {
  const [form, setForm] = useState(() => motivationProfileToForm(student?.motivationProfile));
  const [status, setStatus] = useState({
    type: "idle",
    message: "",
    detail: ""
  });
  const isSaving = status.type === "saving";

  useEffect(() => {
    setForm(motivationProfileToForm(student?.motivationProfile));
    setStatus({
      type: "idle",
      message: "",
      detail: ""
    });
  }, [student]);

  function updateField(field, value) {
    setStatus({
      type: "idle",
      message: "",
      detail: ""
    });
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setStatus({
      type: "saving",
      message: "Saving motivation profile...",
      detail: ""
    });

    const result = await saveStudentMotivationProfile({
      actorProfile,
      studentId: student.id,
      values: form
    });

    if (result.error) {
      setStatus({
        type: "error",
        message: "Could not save motivation profile.",
        detail: result.error
      });
      return;
    }

    setStatus({
      type: "success",
      message: "Student Motivation Profile saved.",
      detail: ""
    });
    onSaved?.(student.id, result.motivationProfile);
  }

  return (
    <section className="student-motivation-profile-card" aria-labelledby={`student-motivation-${student.id}`}>
      <div className="student-motivation-profile-card__header">
        <div>
          <p className="card-eyebrow card-eyebrow--red">Reminder personalization</p>
          <h3 id={`student-motivation-${student.id}`}>Student Motivation Profile</h3>
        </div>
        <span>{student.motivationProfile?.id ? "Personalized" : "Teacher voice only"}</span>
      </div>

      <p className="student-motivation-profile-card__note">
        Private teacher/admin notes. Students do not edit these fields.
      </p>

      <form className="student-motivation-profile-form" onSubmit={handleSubmit}>
        <div className="teacher-task-form-grid">
          <label className="admin-user-form-wide">
            Goal
            <input
              type="text"
              value={form.goal}
              disabled={isSaving}
              onChange={(event) => updateField("goal", event.target.value)}
              placeholder="IELTS speaking, flight attendant interview, life abroad, daily confidence..."
            />
          </label>

          <label>
            Motivation style
            <select
              value={form.motivation_style}
              disabled={isSaving}
              onChange={(event) => updateField("motivation_style", event.target.value)}
            >
              {motivationStyleOptions.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-user-form-wide">
            Personal trigger
            <textarea
              rows="3"
              value={form.personal_trigger}
              disabled={isSaving}
              onChange={(event) => updateField("personal_trigger", event.target.value)}
              placeholder="What makes this student move? Example: She wants to become a flight attendant. He wants IELTS soon. He responds well to playful pressure."
            />
          </label>

          <label>
            Strength note
            <textarea
              rows="3"
              value={form.strength_note}
              disabled={isSaving}
              onChange={(event) => updateField("strength_note", event.target.value)}
              placeholder="What should the reminder remind them about? Example: hardworking, brave, improving, warm, disciplined when focused..."
            />
          </label>

          <label>
            Struggle note
            <textarea
              rows="3"
              value={form.struggle_note}
              disabled={isSaving}
              onChange={(event) => updateField("struggle_note", event.target.value)}
              placeholder="What usually stops them? Example: overthinking, inconsistency, nervousness, laziness, exam stress..."
            />
          </label>

          <label>
            Preferred push
            <textarea
              rows="3"
              value={form.preferred_push}
              disabled={isSaving}
              onChange={(event) => updateField("preferred_push", event.target.value)}
              placeholder="What kind of push works? Example: playful challenge, calm encouragement, direct discipline, emotional future-self reminder..."
            />
          </label>

          <label>
            Avoid note
            <textarea
              rows="3"
              value={form.avoid_note}
              disabled={isSaving}
              onChange={(event) => updateField("avoid_note", event.target.value)}
              placeholder="What should the reminder avoid? Example: don't mention exam stress, don't joke too much, don't sound harsh..."
            />
          </label>
        </div>

        <div className="teacher-assign-submit">
          <button className="primary-button" type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Motivation Profile"}
          </button>
        </div>

        {status.message && (
          <div className={`teacher-assign-message teacher-assign-message--${status.type === "saving" ? "submitting" : status.type}`}>
            <p>{status.message}</p>
            {status.detail && <span>{status.detail}</span>}
          </div>
        )}
      </form>
    </section>
  );
}
