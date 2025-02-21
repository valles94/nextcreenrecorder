export const checkBrowserCompatibility = () => {
    // ✅ Lista de navegadores y SO compatibles
    const supportedSystems = "Windows, macOS, Linux y Android (Chrome y Edge)";
    const supportedBrowsers = "Google Chrome (v72+), Microsoft Edge (v79+), Firefox (v66+ en escritorio), y Opera (v60+)";

    // 🚫 Comprobar si la API de grabación está disponible
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        return {
            compatible: false,
            reason: `Tu navegador no soporta la grabación de pantalla. Prueba con: ${supportedBrowsers} en ${supportedSystems}.`
        };
    }

    // 🔍 Detectar navegador
    const userAgent = navigator.userAgent.toLowerCase();
    const isChrome = userAgent.includes("chrome") && !userAgent.includes("edg") && !userAgent.includes("opr");
    const isEdge = userAgent.includes("edg");
    const isFirefox = userAgent.includes("firefox");
    const isOpera = userAgent.includes("opr");
    const isSafari = userAgent.includes("safari") && !isChrome && !isEdge;

    // 🔍 Detectar sistema operativo
    const platform = navigator.platform.toLowerCase();
    const isWindows = platform.includes("win");
    const isMac = platform.includes("mac");
    const isLinux = platform.includes("linux");
    const isAndroid = userAgent.includes("android");
    const isIOS = /iphone|ipad|ipod/.test(userAgent);

    // 🚫 Bloquear iOS porque no soporta grabación de pantalla
    if (isIOS) {
        return {
            compatible: false,
            reason: `Lo sentimos, pero iOS (iPhone/iPad) no permite grabación de pantalla desde el navegador. 
            Prueba en un ordenador con ${supportedSystems}.`
        };
    }

    // 🚫 Bloquear Firefox en Android porque no soporta `getDisplayMedia`
    if (isAndroid && isFirefox) {
        return {
            compatible: false,
            reason: `Firefox en Android no soporta grabación de pantalla. Usa Chrome o Edge en ${supportedSystems}.`
        };
    }

    // ✅ Si pasa todas las comprobaciones, es compatible
    return { compatible: true, reason: "" };
};
