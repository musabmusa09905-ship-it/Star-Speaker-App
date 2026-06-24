import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "../Header.jsx";
import { StudentMotivationProfileForm } from "../students/StudentMotivationProfileForm.jsx";
import { ArticleIcon, FeedbackIcon, ProfileIcon, TargetIcon } from "../icons.jsx";
import {
  createUserWithAdminFunction,
  createProfileForExistingAuthUser,
  getAdminUsersOverview,
  testAdminCreateUserSetup,
  updateProfileFromAdmin
} from "../../lib/adminUsers.js";
import {
  formatLevelForStaff,
  getLevelDescriptionForStaff,
  heartOfEnglishLevels
} from "../../lib/heartOfEnglishLevels.js";
import { canCreateRole, canManageUsers, isAdmin } from "../../lib/rolePermissions.js";
import {
  formatWhatsAppInputValue,
  getWhatsAppInputValueWithDefault
} from "../../lib/whatsappReminders.js";

const roleFilters = [
  { label: "All roles", value: "all" },
  { label: "Students", value: "student" },
  { label: "Teachers", value: "teacher" },
  { label: "Coordinators", value: "coordinator" },
  { label: "Admins", value: "admin" }
];

const statusFilters = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "active" },
  { label: "Pending", value: "pending" },
  { label: "Inactive", value: "inactive" }
];

const adminSections = [
  {
    label: "Overview",
    value: "overview",
    description: "All users and school account health.",
    filters: { role: "all", status: "all" }
  },
  {
    label: "Students",
    value: "students",
    description: "Student profiles, learning details, and reminders.",
    filters: { role: "student", status: "all" }
  },
  {
    label: "Teachers",
    value: "teachers",
    description: "Teacher accounts that can manage assigned students.",
    filters: { role: "teacher", status: "all" }
  },
  {
    label: "Coordinators",
    value: "coordinators",
    description: "Coordinator accounts for student support workflows.",
    filters: { role: "coordinator", status: "all" }
  },
  {
    label: "Admins",
    value: "admins",
    description: "Admin accounts with school management access.",
    filters: { role: "admin", status: "all" }
  },
  {
    label: "Pending approvals",
    value: "pending",
    description: "Accounts that still need activation or follow-up.",
    filters: { role: "all", status: "pending" }
  }
];

const roleGroups = [
  { label: "Admins", value: "admin" },
  { label: "Coordinators", value: "coordinator" },
  { label: "Teachers", value: "teacher" },
  { label: "Students", value: "student" }
];

const presetOptions = {
  main_goal: [
    "Speaking confidence",
    "Daily speaking practice",
    "IELTS speaking",
    "IELTS writing",
    "Flight attendant interview",
    "Work English",
    "Life abroad",
    "University prep",
    "Vocabulary activation",
    "Pronunciation improvement",
    "Interview preparation",
    "General fluency"
  ],
  speaking_focus: [
    "Fluency and clear details",
    "Speaking with confidence",
    "Answer structure",
    "Daily conversation",
    "IELTS speaking answers",
    "Interview speaking",
    "Storytelling",
    "Opinion practice",
    "Problem-solving language",
    "Professional communication"
  ],
  pronunciation_focus: [
    "Word stress or rhythm",
    "Clear sentence stress",
    "Reducing mother-language influence",
    "Difficult sounds",
    "Smooth connected speech",
    "Intonation",
    "Read-aloud clarity",
    "Professional speaking tone"
  ],
  vocabulary_focus: [
    "Linking words",
    "Daily phrases",
    "Collocations",
    "Phrasal verbs",
    "Interview vocabulary",
    "IELTS vocabulary",
    "Work vocabulary",
    "Travel/life abroad vocabulary",
    "Vocabulary activation"
  ],
  practice_target: [
    "Speak for five minutes on weekdays",
    "One short recording every day",
    "One writing answer every day",
    "Speaking + writing on weekdays",
    "Read aloud and submit audio",
    "IELTS answer practice",
    "Interview answer practice",
    "Build daily speaking confidence"
  ],
  preferred_practice_time: [
    "Morning",
    "Afternoon",
    "Evening",
    "After school",
    "After work",
    "Weekend",
    "Flexible"
  ],
  practice_duration_target: ["5", "8", "10", "15", "20"]
};

const emptyCreateForm = {
  full_name: "",
  email: "",
  password: "",
  role: "student",
  status: "active",
  level: "",
  main_goal: "",
  speaking_focus: "",
  pronunciation_focus: "",
  vocabulary_focus: "",
  practice_target: "",
  practice_duration_target: "",
  preferred_practice_time: "",
  whatsapp_number: "",
  whatsapp_opt_in: false,
  title: "",
  bio: "",
  notes: ""
};

const emptyManualConnectForm = {
  authUserId: "",
  full_name: "",
  email: "",
  role: "student",
  status: "pending",
  level: "",
  main_goal: "",
  speaking_focus: "",
  pronunciation_focus: "",
  vocabulary_focus: "",
  practice_target: "",
  practice_duration_target: "",
  preferred_practice_time: "",
  whatsapp_number: "",
  whatsapp_opt_in: false,
  notes: ""
};

function formatRole(value) {
  if (!value) {
    return "Unknown";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function getName(profile) {
  return profile?.full_name || profile?.email || "Unnamed user";
}

function buildEditForm(user) {
  const learningProfile = user?.learningProfile || {};

  return {
    full_name: user?.full_name || "",
    email: user?.email || "",
    role: user?.role || "student",
    status: user?.status || "pending",
    level: learningProfile.level || "",
    main_goal: learningProfile.main_goal || "",
    speaking_focus: learningProfile.speaking_focus || "",
    pronunciation_focus: learningProfile.pronunciation_focus || "",
    vocabulary_focus: learningProfile.vocabulary_focus || "",
    practice_target: learningProfile.practice_target || "",
    practice_duration_target: learningProfile.practice_duration_target
      ? String(learningProfile.practice_duration_target)
      : "",
    preferred_practice_time: learningProfile.preferred_practice_time || "",
    whatsapp_number: user?.whatsapp_number || "",
    whatsapp_opt_in: Boolean(user?.whatsapp_opt_in),
    notes: learningProfile.notes || ""
  };
}

function matchesSearch(user, searchValue) {
  const needle = searchValue.trim().toLowerCase();

  if (!needle) {
    return true;
  }

  return [user.full_name, user.email]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(needle));
}

function AdminState({ title, message, action }) {
  return (
    <section className="card admin-state-card" aria-labelledby="admin-state-title">
      <div className="admin-state-card__icon" aria-hidden="true">
        <ProfileIcon />
      </div>
      <div>
        <p className="card-eyebrow card-eyebrow--red">Admin</p>
        <h2 id="admin-state-title">{title}</h2>
        <p>{message}</p>
        {action}
      </div>
    </section>
  );
}

function AdminStats({ users, activeFilters, onFilter }) {
  const stats = [
    {
      label: "Total users",
      value: users.length,
      icon: <ProfileIcon />,
      filter: { role: "all", status: "all" }
    },
    {
      label: "Students",
      value: users.filter((user) => user.role === "student").length,
      icon: <TargetIcon />,
      filter: { role: "student", status: "all" }
    },
    {
      label: "Teachers",
      value: users.filter((user) => user.role === "teacher").length,
      icon: <FeedbackIcon />,
      filter: { role: "teacher", status: "all" }
    },
    {
      label: "Coordinators",
      value: users.filter((user) => user.role === "coordinator").length,
      icon: <ArticleIcon />,
      filter: { role: "coordinator", status: "all" }
    },
    {
      label: "Admins",
      value: users.filter((user) => user.role === "admin").length,
      icon: <ArticleIcon />,
      filter: { role: "admin", status: "all" }
    },
    {
      label: "Inactive",
      value: users.filter((user) => user.status === "inactive").length,
      icon: <ArticleIcon />,
      filter: { role: "all", status: "inactive" }
    }
  ];

  return (
    <section className="admin-stats-grid" aria-label="Admin user stats">
      {stats.map((stat) => (
        <button
          className={`card admin-stat-card admin-stat-card--button ${
            activeFilters.role === stat.filter.role && activeFilters.status === stat.filter.status ? "is-active" : ""
          }`}
          key={stat.label}
          type="button"
          onClick={() => onFilter(stat.filter)}
        >
          <div aria-hidden="true">{stat.icon}</div>
          <span>{stat.label}</span>
          <strong>{stat.value}</strong>
        </button>
      ))}
    </section>
  );
}

function UserFilters({ filters, onFilterChange }) {
  return (
    <section className="card admin-search-card" aria-label="Search and filter users">
      <label>
        Search users
        <input
          type="search"
          value={filters.search}
          onChange={(event) => onFilterChange({ search: event.target.value })}
          placeholder="Search by name or email"
        />
      </label>

      <div className="admin-filter-row" aria-label="Role filters">
        {roleFilters.map((filter) => (
          <button
            className={filters.role === filter.value ? "is-active" : ""}
            key={filter.value}
            type="button"
            onClick={() => onFilterChange({ role: filter.value })}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="admin-filter-row" aria-label="Status filters">
        {statusFilters.map((filter) => (
          <button
            className={filters.status === filter.value ? "is-active" : ""}
            key={filter.value}
            type="button"
            onClick={() => onFilterChange({ status: filter.value })}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function AdminSectionTabs({ activeSection, onSectionChange }) {
  return (
    <section className="card admin-section-tabs-card" aria-label="Admin management sections">
      <div className="admin-section-heading">
        <div>
          <p className="card-eyebrow card-eyebrow--red">Management</p>
          <h2>Choose a workspace</h2>
        </div>
      </div>
      <div className="admin-section-tabs">
        {adminSections.map((section) => (
          <button
            className={activeSection === section.value ? "is-active" : ""}
            key={section.value}
            type="button"
            onClick={() => onSectionChange(section)}
          >
            <strong>{section.label}</strong>
            <span>{section.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function SelectOrCustomField({ label, value, options, disabled, onChange, placeholder, type = "text" }) {
  const isPresetValue = options.includes(String(value || ""));
  const selectValue = value && isPresetValue ? value : value ? "__custom" : "";

  return (
    <label>
      {label}
      <select
        value={selectValue}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value === "__custom" ? "" : event.target.value)}
      >
        <option value="">Choose preset</option>
        {options.map((option) => (
          <option value={option} key={option}>
            {option}
          </option>
        ))}
        <option value="__custom">Custom</option>
      </select>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function StudentProfileFields({ form, isDisabled, onChange }) {
  const selectedLevelDescription = getLevelDescriptionForStaff(form.level);

  return (
    <div className="admin-student-profile-fields">
      <p className="admin-note">
        These fields use the same student_profiles columns shown on student and teacher pages.
      </p>
      <div className="admin-user-form-grid">
        <label>
          Level
          <select
            value={form.level}
            disabled={isDisabled}
            onChange={(event) => onChange("level", event.target.value)}
          >
            <option value="">No level selected</option>
            {heartOfEnglishLevels.map((level) => (
              <option value={level.code} key={level.code}>
                {level.staffLabel}
              </option>
            ))}
            {form.level && !heartOfEnglishLevels.some((level) => level.code === form.level) && (
              <option value={form.level}>{formatLevelForStaff(form.level)}</option>
            )}
          </select>
          {selectedLevelDescription && <small>{selectedLevelDescription}</small>}
        </label>
        <SelectOrCustomField
          label="Main goal"
          value={form.main_goal}
          options={presetOptions.main_goal}
          disabled={isDisabled}
          onChange={(value) => onChange("main_goal", value)}
          placeholder="Speaking confidence"
        />
        <SelectOrCustomField
          label="Speaking focus"
          value={form.speaking_focus}
          options={presetOptions.speaking_focus}
          disabled={isDisabled}
          onChange={(value) => onChange("speaking_focus", value)}
          placeholder="Fluency and clear details"
        />
        <SelectOrCustomField
          label="Pronunciation focus"
          value={form.pronunciation_focus}
          options={presetOptions.pronunciation_focus}
          disabled={isDisabled}
          onChange={(value) => onChange("pronunciation_focus", value)}
          placeholder="Word stress or rhythm"
        />
        <SelectOrCustomField
          label="Vocabulary focus"
          value={form.vocabulary_focus}
          options={presetOptions.vocabulary_focus}
          disabled={isDisabled}
          onChange={(value) => onChange("vocabulary_focus", value)}
          placeholder="Linking words"
        />
        <SelectOrCustomField
          label="Practice target"
          value={form.practice_target}
          options={presetOptions.practice_target}
          disabled={isDisabled}
          onChange={(value) => onChange("practice_target", value)}
          placeholder="Speak for five minutes on weekdays"
        />
        <SelectOrCustomField
          label="Preferred practice time"
          value={form.preferred_practice_time}
          options={presetOptions.preferred_practice_time}
          disabled={isDisabled}
          onChange={(value) => onChange("preferred_practice_time", value)}
          placeholder="After school"
        />
        <SelectOrCustomField
          label="Practice duration target"
          value={form.practice_duration_target}
          options={presetOptions.practice_duration_target}
          disabled={isDisabled}
          onChange={(value) => onChange("practice_duration_target", value)}
          placeholder="10"
          type="number"
        />
        <label>
          WhatsApp number
          <input
            type="tel"
            value={form.whatsapp_number}
            disabled={isDisabled}
            onFocus={() => onChange("whatsapp_number", getWhatsAppInputValueWithDefault(form.whatsapp_number))}
            onChange={(event) => onChange("whatsapp_number", event.target.value)}
            onBlur={(event) => onChange("whatsapp_number", formatWhatsAppInputValue(event.target.value))}
            placeholder="+90 555 123 45 67"
          />
        </label>
        <label className="admin-user-checkbox-field">
          <input
            type="checkbox"
            checked={form.whatsapp_opt_in}
            disabled={isDisabled}
            onChange={(event) => onChange("whatsapp_opt_in", event.target.checked)}
          />
          WhatsApp reminders allowed
        </label>
        <label className="admin-user-form-wide">
          Teacher notes
          <textarea
            rows="3"
            value={form.notes}
            disabled={isDisabled}
            onChange={(event) => onChange("notes", event.target.value)}
            placeholder="Notes for this student's learning profile."
          />
        </label>
      </div>
    </div>
  );
}

function TeacherProfileFields({ form, isDisabled, onChange }) {
  return (
    <div className="admin-student-profile-fields">
      <p className="admin-note">
        These optional fields create the matching teacher_profiles row when supported.
      </p>
      <div className="admin-user-form-grid">
        <label>
          Teacher title
          <input
            type="text"
            value={form.title}
            disabled={isDisabled}
            onChange={(event) => onChange("title", event.target.value)}
            placeholder="Speaking Coach"
          />
        </label>
        <label className="admin-user-form-wide">
          Teacher bio
          <textarea
            rows="3"
            value={form.bio}
            disabled={isDisabled}
            onChange={(event) => onChange("bio", event.target.value)}
            placeholder="Optional teacher profile note."
          />
        </label>
      </div>
    </div>
  );
}

function AddUserCard({ form, actorProfile, status, onChange, onSubmit }) {
  const isSubmitting = status.type === "submitting";
  const isStudent = form.role === "student";
  const isTeacher = form.role === "teacher";
  const createRoleOptions = ["student", "teacher", "coordinator"].filter((role) =>
    canCreateRole(actorProfile, role)
  );

  return (
    <section className="card admin-add-user-card" aria-labelledby="admin-add-user-title">
      <div className="admin-section-heading">
        <div>
          <p className="card-eyebrow card-eyebrow--red">Add user</p>
          <h2 id="admin-add-user-title">Create Student or Teacher</h2>
        </div>
      </div>

      <div className="admin-instruction-panel">
        <strong>Secure server-side user creation.</strong>
        <p>
          This form calls the admin-create-user Edge Function. The browser sends only the signed-in
          admin session and form fields; privileged Auth creation happens on the server.
        </p>
      </div>

      <form className="admin-user-form" onSubmit={onSubmit}>
        <div className="admin-user-form-grid">
          <label>
            Full name
            <input
              type="text"
              value={form.full_name}
              disabled={isSubmitting}
              onChange={(event) => onChange("full_name", event.target.value)}
              placeholder="Student or teacher name"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              disabled={isSubmitting}
              onChange={(event) => onChange("email", event.target.value)}
              placeholder="person@school.com"
            />
          </label>
          <label>
            Temporary password
            <input
              type="password"
              value={form.password}
              disabled={isSubmitting}
              onChange={(event) => onChange("password", event.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </label>
          <label>
            Role
            <select
              value={form.role}
              disabled={isSubmitting}
              onChange={(event) => onChange("role", event.target.value)}
            >
              {createRoleOptions.map((role) => (
                <option value={role} key={role}>
                  {formatRole(role)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={form.status}
              disabled={isSubmitting}
              onChange={(event) => onChange("status", event.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>

        {isStudent && (
          <StudentProfileFields form={form} isDisabled={isSubmitting} onChange={onChange} />
        )}

        {isTeacher && (
          <TeacherProfileFields form={form} isDisabled={isSubmitting} onChange={onChange} />
        )}

        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating user..." : "Create User"}
        </button>
      </form>

      {status.message && (
        <div className={`admin-message admin-message--${status.type}`}>
          <p>{status.message}</p>
          {status.detail && <span>{status.detail}</span>}
        </div>
      )}
    </section>
  );
}

function DiagnosticCard({ status, onRun }) {
  const isTesting = status.type === "submitting";
  const diagnostics = status.diagnostics || null;

  return (
    <section className="card admin-add-user-card" aria-labelledby="admin-diagnostics-title">
      <div className="admin-section-heading">
        <div>
          <p className="card-eyebrow card-eyebrow--red">Diagnostics</p>
          <h2 id="admin-diagnostics-title">Test User Creation Setup</h2>
        </div>
      </div>

      <p className="admin-note">
        Run this after deploying the Edge Function. It checks the admin token, service-role secret,
        project URL, and profile permission path without creating a user.
      </p>

      <button className="secondary-button" type="button" disabled={isTesting} onClick={onRun}>
        {isTesting ? "Testing setup..." : "Test User Creation Setup"}
      </button>

      {status.message && (
        <div className={`admin-message admin-message--${status.type}`}>
          <p>{status.message}</p>
          {status.detail && <span>{status.detail}</span>}
        </div>
      )}

      {diagnostics && (
        <div className="admin-diagnostic-panel" aria-label="Admin create user diagnostic result">
          {Object.entries(diagnostics).map(([key, value]) => (
            <div key={key}>
              <span>{key}</span>
              <strong>{value === null || value === undefined ? "null" : String(value)}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ManualConnectCard({ form, actorProfile, status, onChange, onSubmit }) {
  const isSubmitting = status.type === "submitting";
  const isStudent = form.role === "student";
  const createRoleOptions = ["student", "teacher", "coordinator"].filter((role) =>
    canCreateRole(actorProfile, role)
  );

  return (
    <section className="card admin-add-user-card" aria-labelledby="admin-manual-connect-title">
      <div className="admin-section-heading">
        <div>
          <p className="card-eyebrow card-eyebrow--red">Fallback</p>
          <h2 id="admin-manual-connect-title">Connect Existing Auth User</h2>
        </div>
      </div>

      <div className="admin-instruction-panel">
        <strong>Use this only if the Edge Function is not deployed yet.</strong>
        <p>
          Create the user in Supabase Auth, paste the Auth user ID, and connect the public profile
          row here.
        </p>
      </div>

      <form className="admin-user-form" onSubmit={onSubmit}>
        <div className="admin-user-form-grid">
          <label className="admin-user-form-wide">
            Supabase Auth user ID
            <input
              type="text"
              value={form.authUserId}
              disabled={isSubmitting}
              onChange={(event) => onChange("authUserId", event.target.value)}
              placeholder="Paste the auth.users id"
            />
          </label>
          <label>
            Full name
            <input
              type="text"
              value={form.full_name}
              disabled={isSubmitting}
              onChange={(event) => onChange("full_name", event.target.value)}
              placeholder="Student or teacher name"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              disabled={isSubmitting}
              onChange={(event) => onChange("email", event.target.value)}
              placeholder="person@school.com"
            />
          </label>
          <label>
            Role
            <select
              value={form.role}
              disabled={isSubmitting}
              onChange={(event) => onChange("role", event.target.value)}
            >
              {createRoleOptions.map((role) => (
                <option value={role} key={role}>
                  {formatRole(role)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={form.status}
              disabled={isSubmitting}
              onChange={(event) => onChange("status", event.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>

        {isStudent && (
          <StudentProfileFields form={form} isDisabled={isSubmitting} onChange={onChange} />
        )}

        <button className="secondary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Connecting profile..." : "Connect existing profile"}
        </button>
      </form>

      {status.message && (
        <div className={`admin-message admin-message--${status.type}`}>
          <p>{status.message}</p>
          {status.detail && <span>{status.detail}</span>}
        </div>
      )}
    </section>
  );
}

function GroupedUserList({ users, selectedUserId, onSelectUser }) {
  if (!users.length) {
    return (
      <section className="card admin-list-card">
        <p className="card-eyebrow card-eyebrow--red">Users</p>
        <h2>No users match these filters.</h2>
        <p>Try another search, role, or status filter.</p>
      </section>
    );
  }

  return (
    <section className="card admin-list-card" aria-labelledby="admin-users-title">
      <div className="admin-section-heading">
        <div>
          <p className="card-eyebrow card-eyebrow--red">Users</p>
          <h2 id="admin-users-title">Grouped App Users</h2>
        </div>
        <span>{users.length} shown</span>
      </div>

      <div className="admin-user-groups">
        {roleGroups.map((group) => {
          const groupUsers = users.filter((user) => user.role === group.value);

          if (!groupUsers.length) {
            return null;
          }

          return (
            <div className="admin-user-group" key={group.value}>
              <h3>{group.label}</h3>
              <div className="admin-user-list">
                {groupUsers.map((user) => (
                  <button
                    className={selectedUserId === user.id ? "admin-user-row is-selected" : "admin-user-row"}
                    key={user.id}
                    type="button"
                    onClick={() => onSelectUser(user)}
                  >
                    <span>
                      <strong>{user.full_name || "Name not set"}</strong>
                      <small>{user.email || "No email"}</small>
                    </span>
                    <span className="admin-user-meta">
                      <i>{formatRole(user.role)}</i>
                      <i>{formatRole(user.status)}</i>
                      <i>Created {formatDate(user.created_at)}</i>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function UserDetailPanel({ user, profile, status, onSave, onMotivationSaved, onCancel }) {
  const [form, setForm] = useState(() => buildEditForm(user));
  const isSaving = status.type === "submitting";
  const isStudent = form.role === "student";

  useEffect(() => {
    setForm(buildEditForm(user));
  }, [user]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await onSave(user.id, form);
  }

  if (!user) {
    return (
      <section className="card admin-user-detail-card">
        <p className="card-eyebrow card-eyebrow--red">User details</p>
        <h2>Select a user to edit.</h2>
        <p className="admin-note">Choose a profile from the grouped list to update safe profile fields.</p>
      </section>
    );
  }

  return (
    <section className="card admin-user-detail-card" aria-labelledby="admin-user-detail-title">
      <div className="admin-section-heading">
        <div>
          <p className="card-eyebrow card-eyebrow--red">User details</p>
          <h2 id="admin-user-detail-title">{getName(user)}</h2>
        </div>
        <button className="text-button" type="button" onClick={onCancel}>
          Close
        </button>
      </div>

      <form className="admin-user-form" onSubmit={handleSubmit}>
        <div className="admin-user-form-grid">
          <label>
            Full name
            <input
              type="text"
              value={form.full_name}
              disabled={isSaving}
              onChange={(event) => updateField("full_name", event.target.value)}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              disabled={isSaving || !isAdmin(profile)}
              onChange={(event) => updateField("email", event.target.value)}
            />
          </label>
          <label>
            Role
            <select
              value={form.role}
              disabled={isSaving || !isAdmin(profile)}
              onChange={(event) => updateField("role", event.target.value)}
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="coordinator">Coordinator</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label>
            Status
            <select
              value={form.status}
              disabled={isSaving}
              onChange={(event) => updateField("status", event.target.value)}
            >
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>

        {isStudent ? (
          <StudentProfileFields form={form} isDisabled={isSaving} onChange={updateField} />
        ) : (
          <p className="admin-note">
            Student learning profile fields appear only for student accounts.
          </p>
        )}

        <button className="primary-button" type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save user"}
        </button>
      </form>

      {status.message && (
        <div className={`admin-message admin-message--${status.type}`}>
          <p>{status.message}</p>
          {status.detail && <span>{status.detail}</span>}
        </div>
      )}

      {isStudent && (
        <StudentMotivationProfileForm
          student={user}
          actorProfile={profile}
          onSaved={onMotivationSaved}
        />
      )}
    </section>
  );
}

export function AdminUsersPage({ user, profile, mode = "users" }) {
  const managementRef = useRef(null);
  const [state, setState] = useState({
    isLoading: false,
    error: "",
    users: [],
    activeTeachers: [],
    activeStudents: [],
    relationships: []
  });
  const [filters, setFilters] = useState({
    search: "",
    role: "all",
    status: "all"
  });
  const [activeSection, setActiveSection] = useState("overview");
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [createStatus, setCreateStatus] = useState({
    type: "idle",
    message: "",
    detail: ""
  });
  const [manualConnectForm, setManualConnectForm] = useState(emptyManualConnectForm);
  const [manualConnectStatus, setManualConnectStatus] = useState({
    type: "idle",
    message: "",
    detail: ""
  });
  const [diagnosticStatus, setDiagnosticStatus] = useState({
    type: "idle",
    message: "",
    detail: "",
    diagnostics: null
  });
  const isAddMode = mode === "add";
  const pageTitle = isAddMode ? "Add Users" : "Admin Users";
  const pageSubtitle = isAddMode
    ? "Create student and teacher accounts through the secure admin flow."
    : "Manage real app users and teacher-student links.";
  const [selectedUserId, setSelectedUserId] = useState("");
  const [editStatus, setEditStatus] = useState({
    type: "idle",
    message: "",
    detail: ""
  });

  async function loadAdminOverview({ silent = false } = {}) {
    if (!silent) {
      setState((current) => ({
        ...current,
        isLoading: true,
        error: ""
      }));
    } else {
      setState((current) => ({
        ...current,
        error: ""
      }));
    }

    const result = await getAdminUsersOverview();

    setState((current) => ({
      isLoading: false,
      error: result.error || "",
      users: result.users,
      activeTeachers: result.activeTeachers,
      activeStudents: result.activeStudents,
      relationships: result.relationships
    }));
  }

  useEffect(() => {
    if (canManageUsers(profile)) {
      loadAdminOverview();
    }
  }, [profile?.role]);

  const filteredUsers = useMemo(
    () =>
      state.users.filter((item) => {
        const roleMatches = filters.role === "all" || item.role === filters.role;
        const statusMatches = filters.status === "all" || item.status === filters.status;
        return roleMatches && statusMatches && matchesSearch(item, filters.search);
      }),
    [filters, state.users]
  );

  const selectedUser = useMemo(
    () => state.users.find((item) => item.id === selectedUserId) || null,
    [selectedUserId, state.users]
  );

  function updateFilters(nextValues) {
    setFilters((current) => ({
      ...current,
      ...nextValues
    }));
  }

  function applyAdminSection(section) {
    setActiveSection(section.value);
    updateFilters(section.filters);
    window.requestAnimationFrame(() => {
      managementRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function applyStatFilter(nextFilters) {
    const matchingSection = adminSections.find(
      (section) =>
        section.filters.role === nextFilters.role && section.filters.status === nextFilters.status
    );
    setActiveSection(matchingSection?.value || "overview");
    updateFilters(nextFilters);
    window.requestAnimationFrame(() => {
      managementRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function updateUserInState(nextUser) {
    if (!nextUser?.id) {
      return;
    }

    setState((current) => ({
      ...current,
      users: current.users.map((item) => (item.id === nextUser.id ? { ...item, ...nextUser } : item)),
      activeStudents: current.activeStudents.map((item) =>
        item.id === nextUser.id ? { ...item, ...nextUser } : item
      ),
      activeTeachers: current.activeTeachers.map((item) =>
        item.id === nextUser.id ? { ...item, ...nextUser } : item
      ),
      relationships: current.relationships.map((relationship) => ({
        ...relationship,
        student:
          relationship.student?.id === nextUser.id
            ? { ...relationship.student, ...nextUser }
            : relationship.student,
        teacher:
          relationship.teacher?.id === nextUser.id
            ? { ...relationship.teacher, ...nextUser }
            : relationship.teacher
      }))
    }));
  }

  function updateCreateForm(field, value) {
    setCreateStatus({
      type: "idle",
      message: "",
      detail: ""
    });
    setCreateForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function updateManualConnectForm(field, value) {
    setManualConnectStatus({
      type: "idle",
      message: "",
      detail: ""
    });
    setManualConnectForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function handleCreateUser(event) {
    event.preventDefault();
    if (!canCreateRole(profile, createForm.role)) {
      setCreateStatus({
        type: "error",
        message: "You do not have permission to create that role.",
        detail: ""
      });
      return;
    }

    setCreateStatus({
      type: "submitting",
      message: "Creating user...",
      detail: ""
    });

    const result = await createUserWithAdminFunction(createForm);

    if (result.error) {
      setCreateStatus({
        type: "error",
        message: result.error,
        detail: ""
      });
      return;
    }

    setCreateStatus({
      type: "success",
      message: result.message || "User created successfully.",
      detail: "Share the temporary password through your school's approved private channel."
    });
    setCreateForm(emptyCreateForm);
    setSelectedUserId(result.profile?.id || "");
    if (result.profile) {
      updateUserInState(result.profile);
    }
    await loadAdminOverview({ silent: true });
  }

  async function handleManualConnectProfile(event) {
    event.preventDefault();
    if (!canCreateRole(profile, manualConnectForm.role)) {
      setManualConnectStatus({
        type: "error",
        message: "You do not have permission to connect that role.",
        detail: ""
      });
      return;
    }

    setManualConnectStatus({
      type: "submitting",
      message: "Connecting profile...",
      detail: ""
    });

    const result = await createProfileForExistingAuthUser({
      authUserId: manualConnectForm.authUserId,
      values: manualConnectForm
    });

    if (result.error) {
      if (result.profile) {
        setManualConnectStatus({
          type: "error",
          message: "Profile connected, but student learning details could not be saved.",
          detail: result.error
        });
        setSelectedUserId(result.profile.id);
        await loadAdminOverview({ silent: true });
        return;
      }

      setManualConnectStatus({
        type: "error",
        message: result.error,
        detail: ""
      });
      return;
    }

    setManualConnectStatus({
      type: "success",
      message: "Profile connected successfully.",
      detail: "The Auth account must already exist before this user can sign in."
    });
    setManualConnectForm(emptyManualConnectForm);
    setSelectedUserId(result.profile?.id || "");
    if (result.profile) {
      updateUserInState(result.profile);
    }
    await loadAdminOverview({ silent: true });
  }

  async function handleRunDiagnostics() {
    setDiagnosticStatus({
      type: "submitting",
      message: "Testing setup...",
      detail: "",
      diagnostics: null
    });

    const result = await testAdminCreateUserSetup();

    if (result.error) {
      setDiagnosticStatus({
        type: "error",
        message: result.error,
        detail: "",
        diagnostics: result.diagnostics
      });
      return;
    }

    setDiagnosticStatus({
      type: "success",
      message: "User creation setup diagnostic completed.",
      detail: "",
      diagnostics: result.diagnostics
    });
  }

  async function handleSaveUser(profileId, values) {
    if (!isAdmin(profile) && values.role !== "student") {
      setEditStatus({
        type: "error",
        message: "Coordinators can update student profiles only.",
        detail: ""
      });
      return;
    }

    setEditStatus({
      type: "submitting",
      message: "Saving user...",
      detail: ""
    });
    const scrollY = window.scrollY;

    const result = await updateProfileFromAdmin({
      profileId,
      values
    });

    if (result.error) {
      setEditStatus({
        type: "error",
        message: "Could not save this user.",
        detail: result.error
      });
      return;
    }

    setEditStatus({
      type: "success",
      message: "User profile updated successfully.",
      detail: ""
    });
    updateUserInState(result.profile);
    await loadAdminOverview({ silent: true });
    window.requestAnimationFrame(() => window.scrollTo({ top: scrollY }));
  }

  function handleMotivationSaved(studentId, motivationProfile) {
    setState((current) => ({
      ...current,
      users: current.users.map((item) =>
        item.id === studentId
          ? {
              ...item,
              motivationProfile
            }
          : item
      ),
      activeStudents: current.activeStudents.map((item) =>
        item.id === studentId
          ? {
              ...item,
              motivationProfile
            }
          : item
      ),
      relationships: current.relationships.map((relationship) => ({
        ...relationship,
        student: relationship.student?.id === studentId
          ? {
              ...relationship.student,
              motivationProfile
            }
          : relationship.student
      }))
    }));
  }

  function handleSelectUser(nextUser) {
    setSelectedUserId(nextUser.id);
    setEditStatus({
      type: "idle",
      message: "",
      detail: ""
    });
  }

  if (!canManageUsers(profile)) {
    return (
      <div className="admin-users-page">
        <Header user={user} title={pageTitle} subtitle={pageSubtitle} />
        <AdminState
          title="Admin user management is only available for admin accounts."
          message="Use a school admin account to view users and manage teacher-student relationships."
        />
      </div>
    );
  }

  return (
    <div className="admin-users-page">
      <Header user={user} title={pageTitle} subtitle={pageSubtitle} />

      {state.isLoading ? (
        <AdminState title="Loading users..." message="Please wait while we load public profile data." />
      ) : state.error ? (
        <AdminState title="Could not load admin users." message={state.error} />
      ) : (
        <div className="admin-users-grid">
          {isAddMode ? (
            <>
              <AddUserCard
                form={createForm}
                actorProfile={profile}
                status={createStatus}
                onChange={updateCreateForm}
                onSubmit={handleCreateUser}
              />
              <DiagnosticCard status={diagnosticStatus} onRun={handleRunDiagnostics} />
              <ManualConnectCard
                form={manualConnectForm}
                actorProfile={profile}
                status={manualConnectStatus}
                onChange={updateManualConnectForm}
                onSubmit={handleManualConnectProfile}
              />
              <AdminState
                title="Need to edit existing users?"
                message="Open the Users page to search, filter, group, and update existing profile rows."
                action={<a className="secondary-button" href="/admin/users">Open Users</a>}
              />
            </>
          ) : (
            <>
              <AdminStats users={state.users} activeFilters={filters} onFilter={applyStatFilter} />
              <AdminSectionTabs activeSection={activeSection} onSectionChange={applyAdminSection} />
              <AdminState
                title="Create a new user"
                message="Use the Add Users page for the secure account creation flow. Manual connect remains there as an emergency fallback."
                action={<a className="primary-button" href="/admin/add-users">Add Users</a>}
              />
              <div ref={managementRef}>
                <UserFilters filters={filters} onFilterChange={updateFilters} />
              </div>

              <div className="admin-users-management-layout">
                <GroupedUserList
                  users={filteredUsers}
                  selectedUserId={selectedUserId}
                  onSelectUser={handleSelectUser}
                />
                <UserDetailPanel
                  user={selectedUser}
                  profile={profile}
                  status={editStatus}
                  onSave={handleSaveUser}
                  onMotivationSaved={handleMotivationSaved}
                  onCancel={() => {
                    setSelectedUserId("");
                    setEditStatus({
                      type: "idle",
                      message: "",
                      detail: ""
                    });
                  }}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
