 export const checkBrowserCompatibility = () => {
        if (!navigator.mediaDevices?.getDisplayMedia) {
            return {
                compatible: false,
                reason: "Tu navegador no soporta la grabación de pantalla. Prueba usando Chrome, Edge, Firefox u Opera en Windows, macOS y Linux."
            };
        }
        return { compatible: true, reason: "esto" };
    };
