import { requireSupabaseClient } from "./supabaseClient.js";

export const PROFILE_AVATAR_BUCKET = "profile-avatars";

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);
const profileColumns = "id, full_name, email, role, avatar_url, status, created_at, updated_at";

function normalizeError(error) {
  if (!error) {
    return "";
  }

  return error.message || String(error);
}

function buildSafeTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function validateAvatarFile(file) {
  if (!file) {
    return "Choose an image to upload.";
  }

  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    return "Please upload a JPG, PNG, or WebP image.";
  }

  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    return "Please upload an image under 2MB.";
  }

  return "";
}

export async function uploadProfileAvatar(userId, file) {
  const validationError = validateAvatarFile(file);

  if (validationError) {
    return {
      avatarUrl: null,
      error: validationError,
      profile: null,
      storagePath: null
    };
  }

  try {
    const client = requireSupabaseClient();
    const { data: authData, error: authError } = await client.auth.getUser();
    const currentUser = authData?.user;

    if (authError || !currentUser) {
      return {
        avatarUrl: null,
        error: "Please sign in again before uploading a profile photo.",
        profile: null,
        storagePath: null
      };
    }

    if (currentUser.id !== userId) {
      return {
        avatarUrl: null,
        error: "You can only update your own profile photo.",
        profile: null,
        storagePath: null
      };
    }

    const extension = ALLOWED_AVATAR_TYPES.get(file.type);
    const storagePath = `${userId}/avatar-${buildSafeTimestamp()}.${extension}`;
    const { error: uploadError } = await client.storage
      .from(PROFILE_AVATAR_BUCKET)
      .upload(storagePath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      return {
        avatarUrl: null,
        error: `Could not upload your profile photo. ${normalizeError(uploadError)}`,
        profile: null,
        storagePath
      };
    }

    const { data: publicUrlData } = client.storage
      .from(PROFILE_AVATAR_BUCKET)
      .getPublicUrl(storagePath);
    const avatarUrl = publicUrlData?.publicUrl || null;

    if (!avatarUrl) {
      return {
        avatarUrl: null,
        error: "Profile photo uploaded, but its public URL could not be created.",
        profile: null,
        storagePath
      };
    }

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", userId)
      .select(profileColumns)
      .maybeSingle();

    if (profileError || !profile) {
      return {
        avatarUrl,
        error: `Profile photo uploaded, but your profile could not be updated. ${normalizeError(profileError)}`,
        profile: null,
        storagePath
      };
    }

    return {
      avatarUrl,
      error: "",
      profile,
      storagePath
    };
  } catch (error) {
    return {
      avatarUrl: null,
      error: `Could not upload your profile photo. ${normalizeError(error)}`,
      profile: null,
      storagePath: null
    };
  }
}
