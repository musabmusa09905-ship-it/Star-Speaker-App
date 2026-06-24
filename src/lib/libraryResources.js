import { requireSupabaseClient } from "./supabaseClient.js";

const libraryResourceColumns = [
  "id",
  "title",
  "description",
  "resource_type",
  "category",
  "focus",
  "url",
  "content",
  "level",
  "tags",
  "file_path",
  "file_mime_type",
  "file_size_bytes",
  "created_by",
  "is_global",
  "active",
  "created_at",
  "updated_at"
].join(", ");

export const libraryResourcesBucket = "library-resources";

function normalizeError(error) {
  if (!error) {
    return null;
  }

  return "Could not load library resources. Please try again.";
}

function normalizeTags(tags) {
  return Array.isArray(tags) ? tags.filter(Boolean) : [];
}

export function mapLibraryResource(resource) {
  if (!resource) {
    return null;
  }

  return {
    ...resource,
    tags: normalizeTags(resource.tags)
  };
}

export async function createLibraryResourceSignedUrl(filePath) {
  try {
    if (!filePath) {
      return {
        signedUrl: "",
        error: "No PDF file is connected to this resource."
      };
    }

    const client = requireSupabaseClient();
    const { data, error } = await client.storage
      .from(libraryResourcesBucket)
      .createSignedUrl(filePath, 300);

    if (error) {
      return {
        signedUrl: "",
        error: "Could not open this PDF. Please try again."
      };
    }

    return {
      signedUrl: data?.signedUrl || "",
      error: null
    };
  } catch (error) {
    return {
      signedUrl: "",
      error: "Could not open this PDF. Please try again."
    };
  }
}

export async function getActiveLibraryResources() {
  try {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from("library_resources")
      .select(libraryResourceColumns)
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (error) {
      return {
        resources: [],
        error: normalizeError(error)
      };
    }

    return {
      resources: (data || []).map(mapLibraryResource),
      error: null
    };
  } catch (error) {
    return {
      resources: [],
      error: normalizeError(error)
    };
  }
}
