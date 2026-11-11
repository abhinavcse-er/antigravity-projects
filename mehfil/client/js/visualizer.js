/* =========================================================
   MEHFIL — visualizer.js
   Adaptive Particle Effects & Ambient Mood Aura
   ========================================================= */

const MehfilVisualizer = (function () {
    "use strict";

    let container = null;
    let currentCount = -1;
    let resizeFrame = null;

    function getParticleCount() {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return 0;
        if (window.matchMedia("(max-width: 600px)").matches) return 10;
        if (window.matchMedia("(max-width: 900px)").matches) return 18;
        return 32;
    }

    function renderParticles() {
        if (!container) return;
        const count = getParticleCount();
        if (count === currentCount) return;
        currentCount = count;

        const fragment = document.createDocumentFragment();
        for (let i = 0; i < count; i++) {
            const particle = document.createElement("div");
            particle.className = "particle";

            const size = Math.random() * 3 + 1.5;
            const left = Math.random() * 100;
            const top = Math.random() * 100;
            const duration = Math.random() * 14 + 10;
            const delay = Math.random() * 8;
            const opacity = Math.random() * 0.45 + 0.15;

            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${left}%`;
            particle.style.top = `${top}%`;
            particle.style.opacity = opacity;
            particle.style.animationDuration = `${duration}s`;
            particle.style.animationDelay = `${delay}s`;
            particle.style.setProperty("--duration", `${duration}s`);
            particle.style.setProperty("--delay", `${delay}s`);
            fragment.appendChild(particle);
        }

        container.replaceChildren(fragment);
        container.classList.toggle("is-paused", document.hidden || count === 0);
    }

    function scheduleRender() {
        if (resizeFrame !== null) return;
        resizeFrame = window.requestAnimationFrame(() => {
            resizeFrame = null;
            renderParticles();
        });
    }

    function initParticles() {
        container = document.getElementById("particles");
        if (!container) return;

        renderParticles();
        window.addEventListener("resize", scheduleRender, { passive: true });
        document.addEventListener("visibilitychange", () => {
            if (container) container.classList.toggle("is-paused", document.hidden || currentCount === 0);
        });
    }

    return { init: initParticles };
})();
