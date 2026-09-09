const guestSections = [
  "guests",
  "guests-active",
  "guests-history",
  "guests-debtors",
  "receipts",
  "groups",
];

export const hasFullAccess = (role = "") =>
  role === "__system_admin__";

export const hasSectionAccess = (sections = [], requiredSection = "") => {
  const current = Array.isArray(sections)
    ? sections.map((section) => String(section).toLowerCase().trim())
    : [];
  const required = String(requiredSection).toLowerCase().trim();

  if (!required) return false;
  if (current.includes(required)) return true;

  if (required.startsWith("guests-") && current.includes("guests")) {
    return true;
  }

  if (required === "groups" && current.includes("guests")) {
    return true;
  }

  if (required === "guests") {
    return guestSections.some((section) => current.includes(section));
  }

  return false;
};
