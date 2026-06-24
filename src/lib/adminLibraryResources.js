import { requireSupabaseClient } from "./supabaseClient.js";
import { libraryResourcesBucket, mapLibraryResource } from "./libraryResources.js";

export const libraryResourceTypes = [
  "pdf",
  "video",
  "article",
  "story",
  "photo_prompt",
  "weekly_pack",
  "speaking_prompt",
  "pronunciation_drill"
];

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

export const maxLibraryPdfBytes = 5 * 1024 * 1024;

function normalizeError(error) {
  if (!error) {
    return null;
  }

  const message = error.message || String(error);

  if (message.toLowerCase().includes("failed to fetch")) {
    return "Could not reach Supabase. Please check your connection.";
  }

  if (message.toLowerCase().includes("bucket not found")) {
    return "The library-resources storage bucket is missing. Apply the PDF library migration and try again.";
  }

  if (message.toLowerCase().includes("row-level security") || message.toLowerCase().includes("permission denied")) {
    return "Library permissions blocked this action. Apply the library resource storage policies and try again.";
  }

  return message;
}

export function parseResourceTags(value) {
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/[\n,]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function cleanText(value) {
  const nextValue = String(value || "").trim();
  return nextValue || null;
}

function cleanNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function sanitizeFilename(value) {
  const cleaned = String(value || "resource.pdf")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned.endsWith(".pdf") ? cleaned : `${cleaned || "resource"}.pdf`;
}

function createStoragePath({ profile, file }) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `resources/${profile.id}/${timestamp}-${sanitizeFilename(file.name)}`;
}

function validatePdfFile(file) {
  if (!file) {
    return "Choose a PDF file to upload.";
  }

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    return "Only PDF files can be uploaded.";
  }

  if (file.size > maxLibraryPdfBytes) {
    return "PDF files must be 5 MB or smaller.";
  }

  return "";
}

async function uploadPdfFile({ client, profile, file }) {
  const validationError = validatePdfFile(file);

  if (validationError) {
    return {
      fileMetadata: null,
      error: validationError
    };
  }

  const filePath = createStoragePath({ profile, file });
  const { error } = await client.storage
    .from(libraryResourcesBucket)
    .upload(filePath, file, {
      contentType: "application/pdf",
      upsert: false
    });

  if (error) {
    return {
      fileMetadata: null,
      error: normalizeError(error)
    };
  }

  return {
    fileMetadata: {
      file_path: filePath,
      file_mime_type: "application/pdf",
      file_size_bytes: file.size
    },
    error: null
  };
}

export async function getAdminLibraryResources() {
  try {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from("library_resources")
      .select(libraryResourceColumns)
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

export async function getLibraryResourcesForManager() {
  return getAdminLibraryResources();
}

function canManageLibraryResource(profile, resource) {
  if (profile?.role === "admin") {
    return true;
  }

  return profile?.role === "teacher" && resource?.created_by === profile.id;
}

function buildInsertPayload({ profile, values }) {
  return {
    title: cleanText(values.title),
    description: cleanText(values.description),
    resource_type: values.resource_type,
    category: cleanText(values.category),
    focus: cleanText(values.focus),
    url: cleanText(values.url),
    content: cleanText(values.content),
    level: cleanText(values.level),
    tags: parseResourceTags(values.tags),
    file_path: cleanText(values.file_path),
    file_mime_type: cleanText(values.file_mime_type),
    file_size_bytes: cleanNumber(values.file_size_bytes),
    created_by: profile.id,
    is_global: profile.role === "admin" ? values.is_global !== false : false,
    active: values.active !== false
  };
}

function buildUpdatePayload({ profile, values }) {
  const payload = {
    title: cleanText(values.title),
    description: cleanText(values.description),
    resource_type: values.resource_type,
    category: cleanText(values.category),
    focus: cleanText(values.focus),
    url: cleanText(values.url),
    content: cleanText(values.content),
    level: cleanText(values.level),
    tags: parseResourceTags(values.tags),
    file_path: cleanText(values.file_path),
    file_mime_type: cleanText(values.file_mime_type),
    file_size_bytes: cleanNumber(values.file_size_bytes),
    active: values.active !== false
  };

  if (profile.role === "admin") {
    payload.is_global = values.is_global !== false;
  }

  return payload;
}

function validateResourceValues({ profile, values }) {
  if (!profile?.id || !["admin", "teacher"].includes(profile.role)) {
    return "Library management is only available for admin and teacher accounts.";
  }

  if (!cleanText(values.title)) {
    return "Resource title is required.";
  }

  if (!libraryResourceTypes.includes(values.resource_type)) {
    return "Choose a valid resource type.";
  }

  if (values.resource_type === "pdf" && !values.file_path) {
    const fileError = validatePdfFile(values.pdf_file);

    if (fileError) {
      return fileError;
    }
  }

  return "";
}

export async function createLibraryResource({ profile, values }) {
  try {
    const validationError = validateResourceValues({ profile, values });

    if (validationError) {
      return {
        resource: null,
        error: validationError
      };
    }

    const client = requireSupabaseClient();
    let nextValues = { ...values };

    if (values.resource_type === "pdf" && values.pdf_file) {
      const uploadResult = await uploadPdfFile({
        client,
        profile,
        file: values.pdf_file
      });

      if (uploadResult.error) {
        return {
          resource: null,
          error: uploadResult.error
        };
      }

      nextValues = {
        ...nextValues,
        ...uploadResult.fileMetadata
      };
    }

    const { data, error } = await client
      .from("library_resources")
      .insert(buildInsertPayload({ profile, values: nextValues }))
      .select(libraryResourceColumns)
      .single();

    if (error) {
      return {
        resource: null,
        error: normalizeError(error)
      };
    }

    return {
      resource: mapLibraryResource(data),
      error: null
    };
  } catch (error) {
    return {
      resource: null,
      error: normalizeError(error)
    };
  }
}

export async function createLibraryResourceForAdmin({ adminId, values }) {
  return createLibraryResource({
    profile: {
      id: adminId,
      role: "admin"
    },
    values
  });
}

export async function updateLibraryResource({ profile, resource, values }) {
  try {
    const validationError = validateResourceValues({ profile, values });

    if (validationError) {
      return {
        resource: null,
        error: validationError
      };
    }

    if (!canManageLibraryResource(profile, resource)) {
      return {
        resource: null,
        error: "You can only edit resources you created."
      };
    }

    const client = requireSupabaseClient();
    let nextValues = { ...values };

    if (values.resource_type === "pdf" && values.pdf_file) {
      const uploadResult = await uploadPdfFile({
        client,
        profile,
        file: values.pdf_file
      });

      if (uploadResult.error) {
        return {
          resource: null,
          error: uploadResult.error
        };
      }

      nextValues = {
        ...nextValues,
        ...uploadResult.fileMetadata
      };
    }

    const { data, error } = await client
      .from("library_resources")
      .update(buildUpdatePayload({ profile, values: nextValues }))
      .eq("id", resource.id)
      .select(libraryResourceColumns)
      .single();

    if (error) {
      return {
        resource: null,
        error: normalizeError(error)
      };
    }

    return {
      resource: mapLibraryResource(data),
      error: null
    };
  } catch (error) {
    return {
      resource: null,
      error: normalizeError(error)
    };
  }
}

export async function updateLibraryResourceActive({ resourceId, active }) {
  try {
    if (!resourceId) {
      return {
        resource: null,
        error: "Resource could not be confirmed."
      };
    }

    const client = requireSupabaseClient();
    const { data, error } = await client
      .from("library_resources")
      .update({ active: Boolean(active) })
      .eq("id", resourceId)
      .select(libraryResourceColumns)
      .single();

    if (error) {
      return {
        resource: null,
        error: normalizeError(error)
      };
    }

    return {
      resource: mapLibraryResource(data),
      error: null
    };
  } catch (error) {
    return {
      resource: null,
      error: normalizeError(error)
    };
  }
}
