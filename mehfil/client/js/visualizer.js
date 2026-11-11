/* =========================================================
   MEHFIL — visualizer.js
   Particle Effects & Ambient Mood Aura
   ========================================================= */

const MehfilVisualizer = (function () {
    "use strict";

    function initParticles() {
        const container = document.getElementById("particles");
        if (!container) return;

        container.innerHTML = "";
        const count = 38;

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

            container.appendChild(particle);
        }
    }

    return {
        init: initParticles
    };
})();
