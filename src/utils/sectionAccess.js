const guestSections = [
  "guests",
  "guests-active",
  "guests-history",
  "guests-debtors",
];

export const hasSectionAccess = (sections = [], requiredSection = "") => {
  const current = Array.isArray(sections) ? sections : [];
  if (!requiredSection) return false;
  if (current.includes(requiredSection)) return true;

  if (requiredSection.startsWith("guests-") && current.includes("guests")) {
    return true;
  }

  if (requiredSection === "guests") {
    return guestSections.some((section) => current.includes(section));
  }

  return false;
};
