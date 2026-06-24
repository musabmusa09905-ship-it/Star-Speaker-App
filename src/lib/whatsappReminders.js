export const DEFAULT_TURKISH_WHATSAPP_PREFIX = "+90 ";

function formatTurkishMobileNumber(localNumber) {
  return `+90 ${localNumber.slice(0, 3)} ${localNumber.slice(3, 6)} ${localNumber.slice(6, 8)} ${localNumber.slice(8, 10)}`;
}

export function getWhatsAppInputValueWithDefault(value) {
  return String(value || "").trim() ? value : DEFAULT_TURKISH_WHATSAPP_PREFIX;
}

export function formatWhatsAppInputValue(value) {
  const rawValue = String(value || "").trim();

  if (!rawValue) {
    return DEFAULT_TURKISH_WHATSAPP_PREFIX;
  }

  if (rawValue.startsWith("+")) {
    return rawValue;
  }

  const digits = rawValue.replace(/\D/g, "");
  let localNumber = "";

  if (/^5\d{9}$/.test(digits)) {
    localNumber = digits;
  } else if (/^05\d{9}$/.test(digits)) {
    localNumber = digits.slice(1);
  } else if (/^90(5\d{9})$/.test(digits)) {
    localNumber = digits.slice(2);
  }

  return localNumber ? formatTurkishMobileNumber(localNumber) : rawValue;
}

export function cleanWhatsAppInputValue(value) {
  const rawValue = String(value || "").trim();
  const digits = normalizeWhatsAppNumber(rawValue);

  if (!rawValue || digits === "90") {
    return null;
  }

  return rawValue;
}

export function normalizeWhatsAppNumber(phoneNumber) {
  return String(phoneNumber || "")
    .trim()
    .replace(/[\s*()[\]-]/g, "")
    .replace(/^\+/, "")
    .replace(/\D/g, "");
}

export function isValidWhatsAppNumber(phoneNumber) {
  const normalizedNumber = normalizeWhatsAppNumber(phoneNumber);
  return /^\d{8,15}$/.test(normalizedNumber);
}

export function buildWhatsAppLink({ phoneNumber, message }) {
  const normalizedNumber = normalizeWhatsAppNumber(phoneNumber);

  if (!isValidWhatsAppNumber(normalizedNumber) || !message) {
    return "";
  }

  return `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}`;
}

export function getWhatsAppContactState({ phoneNumber, optIn, status }) {
  if (status && status !== "active") {
    return {
      canUse: false,
      label: "Student inactive",
      tone: "warning"
    };
  }

  if (!phoneNumber) {
    return {
      canUse: false,
      label: "Missing WhatsApp number.",
      tone: "warning"
    };
  }

  if (!isValidWhatsAppNumber(phoneNumber)) {
    return {
      canUse: false,
      label: "Invalid WhatsApp number.",
      tone: "warning"
    };
  }

  if (!optIn) {
    return {
      canUse: false,
      label: "Opt-in missing.",
      tone: "warning"
    };
  }

  return {
    canUse: true,
    label: "WhatsApp ready",
    tone: "success"
  };
}
