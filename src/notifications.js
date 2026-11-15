// Notificaciones del sistema (las que salen en la esquina de la pantalla aunque
// el navegador esté detrás). Si el usuario no da permiso, simplemente no se muestran.

export function requestNotificationPermission() {
    if (!("Notification" in window) || Notification.permission !== "default") return;
    Notification.requestPermission().catch(() => {});
}

export function notify(title, body) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    try {
        const notification = new Notification(title, {
            body,
            icon: "/nextcreen.svg",
            tag: "nextcreen-pantalla", // una nueva sustituye a la anterior
            requireInteraction: true, // se queda visible hasta que se cierra
        });
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    } catch (error) {
        console.warn("No se pudo mostrar la notificación:", error);
    }
}
