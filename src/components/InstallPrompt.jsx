import { useEffect, useState } from "react";

const isAppMode = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

const isIos = () =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
  (window.navigator.platform === "MacIntel" &&
    window.navigator.maxTouchPoints > 1);

const getInstaller = () => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  if (/android/.test(userAgent)) {
    return {
      url: "/downloads/Istiqlol-Hotel-Android.apk",
      help: "Yuklangan APK faylini oching va “O‘rnatish” tugmasini bosing.",
    };
  }
  if (/windows/.test(userAgent)) {
    return {
      url: "/downloads/Istiqlol-Hotel-Windows.exe",
      help: "Yuklangan EXE faylini oching. Ilova Microsoft Edge orqali alohida oynada ishga tushadi.",
    };
  }
  if (/macintosh|mac os x/.test(userAgent) && !isIos()) {
    return {
      url: "/downloads/Istiqlol-Hotel-macOS.dmg",
      help: "Yuklangan DMG faylini ochib, Istiqlol Hotel ilovasini Applications papkasiga ko‘chiring.",
    };
  }
  return null;
};

function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null);
  const [visible, setVisible] = useState(() => !isAppMode());
  const [showInstructions, setShowInstructions] = useState(false);
  const [downloadHelp, setDownloadHelp] = useState("");

  useEffect(() => {
    if (isAppMode()) return undefined;

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallEvent(event);
      setVisible(true);
    };
    const handleInstalled = () => {
      setInstallEvent(null);
      setVisible(false);
      setShowInstructions(false);
    };

    const displayMode = window.matchMedia("(display-mode: standalone)");
    const handleDisplayModeChange = (event) => {
      if (event.matches) setVisible(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    displayMode.addEventListener?.("change", handleDisplayModeChange);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      displayMode.removeEventListener?.("change", handleDisplayModeChange);
    };
  }, []);

  if (!visible) return null;

  const install = async () => {
    const installer = getInstaller();
    if (installer) {
      const download = document.createElement("a");
      download.href = installer.url;
      download.download = "";
      document.body.appendChild(download);
      download.click();
      download.remove();
      setDownloadHelp(installer.help);
      setShowInstructions(true);
      return;
    }

    if (!installEvent) {
      setDownloadHelp("");
      setShowInstructions(true);
      return;
    }

    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    setInstallEvent(null);
    if (choice.outcome === "accepted") setVisible(false);
  };

  const instructions = downloadHelp || (isIos()
    ? "Safari menyusidagi Ulashish (Share) tugmasini bosing, keyin “Bosh ekranga qo‘shish”ni tanlang."
    : "Brauzer menyusini ochib, “Ilovani o‘rnatish” yoki “Install app” bandini tanlang.");

  return (
    <>
      <div className="install-prompt" aria-label="Ilovani o'rnatish">
        <img
          className="install-prompt-icon"
          src="/icons/icon-192.png"
          alt=""
          aria-hidden="true"
        />
        <div>
          <strong>Ilova sifatida ishlating</strong>
          <span>Telefon yoki kompyuteringizga o‘rnating</span>
        </div>
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

      {showInstructions && (
        <div className="install-help-backdrop" role="presentation">
          <div
            className="install-help"
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-help-title"
          >
            <h2 id="install-help-title">Ilovani o‘rnatish</h2>
            <p>{instructions}</p>
            <button type="button" onClick={() => setShowInstructions(false)}>
              Tushunarli
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default InstallPrompt;
