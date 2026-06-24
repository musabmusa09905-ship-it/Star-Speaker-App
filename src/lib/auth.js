import { requireSupabaseClient, supabase, supabaseConfigError } from "./supabaseClient.js";

const profileColumns = "id, full_name, email, role, avatar_url, status, created_at, updated_at";

function normalizeError(error) {
  if (!error) {
    return null;
  }

  const message = error.message || String(error);

  if (message.toLowerCase().includes("failed to fetch")) {
    return "Could not reach Supabase. Check VITE_SUPABASE_URL and your internet connection.";
  }

  return message;
}

export async function getCurrentProfile(userId) {
  try {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from("profiles")
      .select(profileColumns)
      .eq("id", userId)
      .maybeSingle();

    return {
      profile: data || null,
      error: normalizeError(error)
    };
  } catch (error) {
    return {
      profile: null,
      error: normalizeError(error)
    };
  }
}

export async function getCurrentAuthState() {
  if (supabaseConfigError) {
    return {
      session: null,
      user: null,
      profile: null,
      error: supabaseConfigError,
      profileError: null
    };
  }

  try {
    const client = requireSupabaseClient();
    const { data: sessionData, error: sessionError } = await client.auth.getSession();

    if (sessionError) {
      return {
        session: null,
        user: null,
        profile: null,
        error: normalizeError(sessionError),
        profileError: null
      };
    }

    const session = sessionData.session;

    if (!session) {
      return {
        session: null,
        user: null,
        profile: null,
        error: null,
        profileError: null
      };
    }

    const { data: userData, error: userError } = await client.auth.getUser();
    const user = userData.user || session.user;

    if (userError) {
      return {
        session,
        user,
        profile: null,
        error: normalizeError(userError),
        profileError: null
      };
    }

    const { profile, error: profileError } = await getCurrentProfile(user.id);

    return {
      session,
      user,
      profile,
      error: null,
      profileError
    };
  } catch (error) {
    return {
      session: null,
      user: null,
      profile: null,
      error: normalizeError(error),
      profileError: null
    };
  }
}

export async function signInWithEmailPassword(email, password) {
  try {
    const client = requireSupabaseClient();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return {
        session: null,
        user: null,
        profile: null,
        error: normalizeError(error),
        profileError: null
      };
    }

    const user = data.user;
    const { profile, error: profileError } = await getCurrentProfile(user.id);

    return {
      session: data.session,
      user,
      profile,
      error: null,
      profileError
    };
  } catch (error) {
    return {
      session: null,
      user: null,
      profile: null,
      error: normalizeError(error),
      profileError: null
    };
  }
}

export async function signOut() {
  try {
    const client = requireSupabaseClient();
    const { error } = await client.auth.signOut();

    return {
      error: normalizeError(error)
    };
  } catch (error) {
    return {
      error: normalizeError(error)
    };
  }
}

export function subscribeToAuthChanges(callback) {
  if (!supabase) {
    return () => {};
  }

  const { data } = supabase.auth.onAuthStateChange(() => {
    callback();
  });

  return () => {
    data.subscription.unsubscribe();
  };
}
