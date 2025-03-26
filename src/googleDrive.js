export const uploadToGoogleDrive = async (folderId, videoUrl) => {
    try {
        const response = await fetch(videoUrl);
        const blob = await response.blob();

        const metadata = {
            name: `grabacion_${new Date().toISOString()}.webm`,
            parents: [folderId],
            mimeType: "video/webm"
        };

        const formData = new FormData();
        formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
        formData.append("file", blob);

        const accessToken = await getGoogleAccessToken(); // Función para obtener el token de OAuth

        const uploadResponse = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`
            },
            body: formData
        });

        if (uploadResponse.ok) {
            alert("✅ Grabación enviada con éxito!");
        } else {
            throw new Error("Error al enviar la grabación");
        }
    } catch (error) {
        console.error("❌ Error enviando la grabación:", error);
        alert("❌ Hubo un problema al enviar la grabación");
    }
};
