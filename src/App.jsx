import React, { useState, useRef, useEffect } from "react";

function App() {
    const [recording, setRecording] = useState(false);
    const [videoUrl, setVideoUrl] = useState(null);
    const [startTime, setStartTime] = useState(null);
    const [endTime, setEndTime] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [totalDuration, setTotalDuration] = useState(null);
    const [processing, setProcessing] = useState(false);
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const timerRef = useRef(null);

    // Función para formatear la hora en HH:MM:SS
    const getFormattedTime = () => {
        const now = new Date();
        return now.toLocaleTimeString(); // HH:MM:SS
    };

    // Formatea el tiempo transcurrido en MM:SS
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    // Efecto para manejar el temporizador
    useEffect(() => {
        if (recording) {
            timerRef.current = setInterval(() => {
                setElapsedTime((prev) => prev + 1);
            }, 1000);
        } else {
            clearInterval(timerRef.current);
        }

        return () => clearInterval(timerRef.current);
    }, [recording]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });

            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: "video/webm" });
            recordedChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) recordedChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                setProcessing(true); // Mostrar mensaje de "Procesando..."
                const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
                const videoURL = URL.createObjectURL(blob);
                setVideoUrl(videoURL); // Guardar URL del video
                recordedChunksRef.current = [];
                setTotalDuration(elapsedTime); // Guardar duración total
                setEndTime(getFormattedTime()); // Guardar la hora de fin
                setProcessing(false); // Ocultar mensaje de "Procesando..."
            };

            // Guardar la hora de inicio y reiniciar el contador
            setStartTime(getFormattedTime()); // Guardar la hora actual
            setEndTime(null); // Reiniciar la hora de fin
            setElapsedTime(0);
            setTotalDuration(null);
            setVideoUrl(null); // Limpiar video previo

            mediaRecorderRef.current.start();
            setRecording(true);
        } catch (error) {
            console.error("Error al acceder a la pantalla:", error);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setRecording(false);
        }
    };

    const saveLocal = () => {
        if (!videoUrl) return;

        // Obtener fecha y hora actual en formato YYYYMMDD_HHMMSS
        const now = new Date();
        const timestamp = now.toISOString().replace(/[-T:.Z]/g, "").slice(0, 15);
        const fileName = `screenRecording_${timestamp}.webm`;

        const a = document.createElement("a");
        a.href = videoUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div style={{ textAlign: "center", padding: "20px" }}>
            <h1>🎥 Grabador de Pantalla</h1>

            {!recording ? (
                <button onClick={startRecording}>Iniciar Grabación</button>
            ) : (
                <button onClick={stopRecording}>Detener Grabación</button>
            )}

            {recording && (
                <div style={{ marginTop: "10px", fontSize: "18px", fontWeight: "bold" }}>
                    🕒 <b>Hora de inicio:</b> {startTime}
                    <br />
                    ⏳ <b>Tiempo transcurrido:</b> {formatTime(elapsedTime)}
                </div>
            )}

            {!recording && totalDuration !== null && (
                <div style={{ marginTop: "10px", fontSize: "18px", fontWeight: "bold", color: "green" }}>
                    ✅ <b>Tiempo total grabado:</b> {formatTime(totalDuration)}
                    <br />
                    ⏰ <b>Hora de inicio:</b> {startTime}
                    <br />
                    ⏹ <b>Hora de fin:</b> {endTime}
                </div>
            )}

            {/* Mostrar mensaje de "Procesando..." mientras se genera el video */}
            {processing && <p style={{ color: "orange", fontSize: "16px" }}>Procesando video... ⏳</p>}

            {/* Vista previa del video antes de descargar */}
            {videoUrl && !processing && (
                <div>
                    <h3>🎬 Vista Previa</h3>
                    <video src={videoUrl} controls style={{ width: "500px", marginTop: "10px" }} />
                    <div style={{ marginTop: "10px" }}>
                        <button onClick={saveLocal}>Guardar en Local</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
