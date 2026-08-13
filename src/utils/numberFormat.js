export const blockNonIntegerKeys = (event) => {
  const allowedControlKeys = [
    "Backspace",
    "Delete",
    "Tab",
    "ArrowLeft",
    "ArrowRight",
    "Home",
    "End",
  ];
  if (allowedControlKeys.includes(event.key)) return;
  if (!/^\d$/.test(event.key)) {
    event.preventDefault();
    return;
  }

  const currentDigits = String(event.currentTarget?.value || "").replace(
    /\D/g,
    "",
  );
  if (event.key === "0" && currentDigits.length === 0) {
    event.preventDefault();
  }
};

export const preventInvalidAmountPaste = (event) => {
  const pastedText = event.clipboardData?.getData("text") || "";
  const normalized = String(pastedText).trim();
  if (!/^[1-9]\d*$/.test(normalized)) {
    event.preventDefault();
  }
};
