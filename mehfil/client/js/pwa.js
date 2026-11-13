/* =========================================================
   MEHFIL — PWA install & offline status helper
   ========================================================= */
(function () {
    "use strict";

    const installButtons = Array.from(document.querySelectorAll("[data-pwa-install]"));
    const setInstallButtonsVisible = visible => {
        installButtons.forEach(button => { button.hidden = !visible; });
    };
    const mobileMenu = document.getElementById("mobileMenu");
    const menuButton = document.getElementById("menuButton");
    let deferredInstallPrompt = null;

    const isStandalone = () =>
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;

    const isIOS = () =>
        /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
        (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);

    const toast = message => {
        if (typeof window.showMehfilToast === "function") {
            window.showMehfilToast(message);
        } else {
            console.info("[MEHFIL PWA]", message);
        }
    };

    const closeMobileMenu = () => {
        if (mobileMenu) mobileMenu.classList.remove("open", "active");
        if (menuButton) menuButton.setAttribute("aria-expanded", "false");
    };

    if (isIOS() && !isStandalone()) {
        // iOS does not expose beforeinstallprompt; guide users to Safari's Share menu.
        setInstallButtonsVisible(true);
    }

    installButtons.forEach(installButton => {
        installButton.addEventListener("click", async () => {
            closeMobileMenu();

            if (deferredInstallPrompt) {
                const promptEvent = deferredInstallPrompt;
                deferredInstallPrompt = null;
                try {
                    await promptEvent.prompt();
                    const choice = await promptEvent.userChoice;
                    if (choice && choice.outcome === "accepted") {
                        setInstallButtonsVisible(false);
                    }
                } catch (error) {
                    console.warn("[MEHFIL PWA] Install prompt failed:", error);
                    toast("Open your browser menu and choose Install app.");
                }
                return;
            }

            if (isIOS()) {
                toast("In Safari, tap Share (↑), then choose Add to Home Screen.");
            } else {
                toast("Open your browser menu and choose Install MEHFIL or Add to Home Screen.");
            }
        });
    });

    window.addEventListener("beforeinstallprompt", event => {
        event.preventDefault();
        deferredInstallPrompt = event;
        if (!isStandalone()) setInstallButtonsVisible(true);
    });

    window.addEventListener("appinstalled", () => {
        deferredInstallPrompt = null;
        setInstallButtonsVisible(false);
        toast("MEHFIL installed successfully. Welcome to your music lounge!");
    });

    window.addEventListener("offline", () => {
        toast("You're offline. The MEHFIL app shell is available; live music needs internet.");
    });

    window.addEventListener("online", () => {
        toast("You're back online. Reconnecting to MEHFIL...");
    });

    const registerServiceWorker = async () => {
        if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
        try {
            const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
            console.info("[MEHFIL PWA] Service worker ready:", registration.scope);
        } catch (error) {
            console.warn("[MEHFIL PWA] Service worker registration failed:", error);
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", registerServiceWorker, { once: true });
    } else {
        registerServiceWorker();
    }
})();
