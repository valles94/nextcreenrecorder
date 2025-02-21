 export const checkBrowserCompatibility = () => {
        if (!navigator.mediaDevices?.getDisplayMedia) {
            return {
                compatible: false,
                reason: "Tu navegador no soporta la grabación de pantalla. Prueba usando Chrome, Edge, Firefox o Opera en Windows, macOS y Linux."
            };
        }

        // ✅ Si pasa la validación, el navegador es compatible
        return { compatible: true, reason: "esto" };
    };
