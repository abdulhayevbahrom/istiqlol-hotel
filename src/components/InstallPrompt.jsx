import { useEffect, useState } from "react";

function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (isStandalone) return undefined;

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallEvent(event);
      setVisible(true);
    };
    const handleInstalled = () => {
      setInstallEvent(null);
      setVisible(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (!visible || !installEvent) return null;

  const install = async () => {
    await installEvent.prompt();
    setInstallEvent(null);
    setVisible(false);
  };

  return (
    <div className="install-prompt" role="dialog" aria-label="Ilovani o'rnatish">
      <button type="button" onClick={install}>Yuklab olish</button>
      <button
        type="button"
        className="install-prompt-close"
        onClick={() => setVisible(false)}
        aria-label="Yopish"
      >
        ×
      </button>
    </div>
  );
}

export default InstallPrompt;
