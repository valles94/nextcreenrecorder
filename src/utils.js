export const checkBrowserCompatibility = () => {
    // 🚫 Comprobar si la API de grabación está disponible
    if (!navigator.mediaDevices?.getDisplayMedia) {
        return {
            compatible: false,
            reason: [
                "Tu navegador no soporta la grabación de pantalla mediante getDisplayMedia. Prueba con:",
                "Sistemas operativos: Windows, macOS y Linux",
                "Navegadores: Chrome (v72+), Edge (v79+), Firefox (v66+), Opera (v60+)"
            ]
        };
    }

    // 🚫 Bloquear iOS (no soporta grabación en navegador)
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
        return {
            compatible: false,
            reason: [
                "iOS no permite la grabación de pantalla desde el navegador.",
                "Prueba en un ordenador con Chrome, Edge, Firefox o Opera."
            ]
        };
    }

    return { compatible: true, reason: [] };
};
