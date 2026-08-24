const guestSections = [
  "guests",
  "guests-active",
  "guests-history",
  "guests-debtors",
  "groups",
];

export const hasFullAccess = (role = "") =>
  ["admin", "owner"].includes(String(role).toLowerCase().trim());

export const hasSectionAccess = (sections = [], requiredSection = "") => {
  const current = Array.isArray(sections) ? sections : [];
  if (!requiredSection) return false;
  if (current.includes(requiredSection)) return true;

  if (requiredSection.startsWith("guests-") && current.includes("guests")) {
    return true;
  }

  if (requiredSection === "groups" && current.includes("guests")) {
    return true;
  }

  if (requiredSection === "guests") {
    return guestSections.some((section) => current.includes(section));
  }

  return false;
};
