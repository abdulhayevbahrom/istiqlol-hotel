import { memo } from "react";

export function RosarySpinner({ compact = false }) {
  return (
    <div
      className={`page-rosary-loader ${compact ? "is-compact" : ""}`.trim()}
      aria-hidden="true"
    >
      {Array.from({ length: 12 }).map((_, index) => (
        <span
          key={`page-rosary-dot-${index}`}
          style={{ "--dot-index": index }}
        />
      ))}
    </div>
  );
}

function PageLoader({
  title = "Ma'lumotlar yuklanmoqda",
  text = "Jadval tayyorlanmoqda, bir lahza kuting",
  className = "",
}) {
  return (
    <div
      className={`page-loader-card ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <RosarySpinner />
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

export default memo(PageLoader);
