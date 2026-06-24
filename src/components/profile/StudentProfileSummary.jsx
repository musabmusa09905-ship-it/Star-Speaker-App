import { useRef, useState } from "react";
import { MascotAnimation } from "../common/MascotAnimation.jsx";
import { LogOutIcon } from "../icons.jsx";
import { UserAvatar } from "../UserAvatar.jsx";
import { uploadProfileAvatar, validateAvatarFile } from "../../lib/profileAvatars.js";

function formatValue(value) {
  return value || "Not set";
}

export function StudentProfileSummary({
  summary,
  initials,
  onProfileUpdated,
  profile,
  onLogout,
  isSigningOut = false
}) {
  const fileInputRef = useRef(null);
  const [uploadState, setUploadState] = useState({
    type: "idle",
    message: ""
  });
  const isUploading = uploadState.type === "uploading";

  function openFilePicker() {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0] || null;
    event.target.value = "";

    const validationError = validateAvatarFile(file);

    if (validationError) {
      setUploadState({
        type: "error",
        message: validationError
      });
      return;
    }

    setUploadState({
      type: "uploading",
      message: "Uploading..."
    });

    const result = await uploadProfileAvatar(profile.id, file);

    if (result.error) {
      setUploadState({
        type: "error",
        message: result.error
      });
      return;
    }

    onProfileUpdated?.(result.profile);
    setUploadState({
      type: "success",
      message: "Profile photo updated."
    });
  }

  return (
    <section className="card profile-summary-card" aria-labelledby="profile-summary-title">
      <div className="profile-avatar-upload">
        <UserAvatar
          avatarUrl={profile?.avatar_url}
          className="profile-summary-card__avatar"
          initials={initials}
          name={summary.displayName}
          decorative
          size="large"
        />
        {profile && (
          <div className="profile-avatar-upload__controls">
            <input
              ref={fileInputRef}
              className="profile-avatar-upload__input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
            />
            <button
              className="secondary-button profile-avatar-upload__button"
              type="button"
              disabled={isUploading}
              onClick={openFilePicker}
            >
              {isUploading ? "Uploading..." : profile.avatar_url ? "Change photo" : "Upload photo"}
            </button>
            <p className="profile-avatar-upload__hint">JPG, PNG, or WebP. Max 2MB.</p>
            {uploadState.message && (
              <p className={`profile-avatar-upload__status profile-avatar-upload__status--${uploadState.type}`}>
                {uploadState.message}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="profile-summary-card__copy">
        <p className="card-eyebrow card-eyebrow--red">{summary.status}</p>
        <h2 id="profile-summary-title">{summary.title}</h2>
        <p className="profile-summary-card__name">{summary.displayName}</p>
        <p>{summary.message}</p>

        {profile && (
          <dl className="profile-account-list" aria-label="Connected account details">
            <div>
              <dt>Role</dt>
              <dd className="profile-account-list__value">{formatValue(profile.role)}</dd>
            </div>
            {profile.role !== "student" && (
              <div>
                <dt>Email</dt>
                <dd className="profile-account-list__value profile-account-list__value--email">
                  {formatValue(profile.email)}
                </dd>
              </div>
            )}
          </dl>
        )}

        {onLogout && (
          <button
            className="secondary-button profile-summary-signout"
            disabled={isSigningOut}
            type="button"
            onClick={onLogout}
          >
            <LogOutIcon />
            {isSigningOut ? "Signing out..." : "Sign out"}
          </button>
        )}
      </div>

      <div className="profile-summary-card__mascot" aria-hidden="true">
        <MascotAnimation
          type="welcome"
          size="small"
          motion="idle"
          label="Welcome mascot for student profile"
        />
      </div>
    </section>
  );
}
