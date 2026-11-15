import { useState, useRef, useEffect } from "react";
import logo from "./assets/NegativoNEXTdigital-ai.svg";
import logoSC from "./assets/SirviendoCodigo-logo.svg";
import { checkBrowserCompatibility } from "./utils";
import { createCompositor } from "./compositor";
import fixWebmDuration from "fix-webm-duration";
import "./App.css";

function App() {
    const [compatibility, setCompatibility] = useState({ compatible: true, reason: "" });
    const [recording, setRecording] = useState(false);
    const [videoUrl, setVideoUrl] = useState(null);
    const [startTime, setStartTime] = useState(null);
    const [endTime, setEndTime] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [totalDuration, setTotalDuration] = useState(null);
    const [hasBeenSaved, setHasBeenSaved] = useState(false);
    const [sourceLost, setSourceLost] = useState(false);
    const [newScreenDetected, setNewScreenDetected] = useState(false);

    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const timerRef = useRef(null);
    const audioTracksRef = useRef([]);
    const startMsRef = useRef(0);
    const elapsedRef = useRef(0);
    const liveVideoRef = useRef(null);
    const compositorRef = useRef(null);

    const getFormattedTime = () => new Date().toLocaleTimeString();

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const getFileName = () => {
        const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 15);
        return `screenRecording_${timestamp}.webm`;
    };

    // Comprobación de compatibilidad (solo al montar)
    useEffect(() => {
        setCompatibility(checkBrowserCompatibility());
    }, []);

    // Temporizador de grabación (calculado con la hora real, así nunca se desfasa
    // aunque el navegador ralentice la pestaña en segundo plano)
    useEffect(() => {
        if (recording) {
            const update = () => {
                elapsedRef.current = Math.floor((Date.now() - startMsRef.current) / 1000);
                setElapsedTime(elapsedRef.current);
            };
            update();
            timerRef.current = setInterval(update, 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [recording]);

    // Aviso antes de cerrar la pestaña
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (recording || (videoUrl && !hasBeenSaved)) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [recording, videoUrl, hasBeenSaved]);

    // Visor en directo: muestra exactamente lo que se está grabando (incluido el negro)
    useEffect(() => {
        if (recording && liveVideoRef.current && compositorRef.current) {
            liveVideoRef.current.srcObject = compositorRef.current.stream;
        }
    }, [recording]);

    // Detectar cuando se conecta una pantalla nueva (p. ej. vuelve el proyector).
    // Disponible en Chrome / Edge mediante screen.isExtended.
    useEffect(() => {
        if (!recording || !("isExtended" in window.screen)) return;
        let prev = window.screen.isExtended;
        const check = () => {
            const now = window.screen.isExtended;
            if (now && !prev) setNewScreenDetected(true);
            if (!now) setNewScreenDetected(false);
            prev = now;
        };
        window.screen.addEventListener("change", check);
        const id = setInterval(check, 2000);
        return () => {
            window.screen.removeEventListener("change", check);
            clearInterval(id);
        };
    }, [recording]);

    // Liberar URL de objeto al cambiar o desmontar
    useEffect(() => {
        return () => {
            if (videoUrl) URL.revokeObjectURL(videoUrl);
        };
    }, [videoUrl]);

    const startRecording = async () => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });

            let audioStream = null;
            try {
                audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch {
                console.warn("No se pudo acceder al micrófono. Se grabará solo la pantalla.");
            }

            // Grabamos el lienzo intermedio, no la pantalla: si la pantalla se pierde, sigue en negro
            const compositor = createCompositor(screenStream, {
                onSourceLost: () => setSourceLost(true),
            });
            compositorRef.current = compositor;
            audioTracksRef.current = audioStream ? audioStream.getAudioTracks() : [];

            const combinedStream = new MediaStream([
                ...compositor.stream.getVideoTracks(),
                ...audioTracksRef.current,
            ]);
            mediaRecorderRef.current = new MediaRecorder(combinedStream, { mimeType: "video/webm" });
            recordedChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) recordedChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const durationMs = Date.now() - startMsRef.current;
                const rawBlob = new Blob(recordedChunksRef.current, { type: "video/webm" });
                recordedChunksRef.current = [];
                // El navegador no guarda la duración en el .webm: la escribimos nosotros
                let blob = rawBlob;
                try {
                    blob = await fixWebmDuration(rawBlob, durationMs, { logger: false });
                } catch (error) {
                    console.warn("No se pudo escribir la duración en el archivo:", error);
                }
                setVideoUrl(URL.createObjectURL(blob));
                setTotalDuration(Math.floor(durationMs / 1000));
                setEndTime(getFormattedTime());
                // Liberar pantalla, micrófono y lienzo
                compositorRef.current?.stop();
                compositorRef.current = null;
                audioTracksRef.current.forEach((track) => track.stop());
                audioTracksRef.current = [];
                if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
            };

            setStartTime(getFormattedTime());
            setEndTime(null);
            setElapsedTime(0);
            elapsedRef.current = 0;
            setTotalDuration(null);
            setVideoUrl(null);
            setHasBeenSaved(false);
            setSourceLost(false);
            setNewScreenDetected(false);

            // Esperamos al primer fotograma real (máx. 3 s) para que el vídeo no empiece en negro
            await Promise.race([compositor.ready, new Promise((r) => setTimeout(r, 3000))]);

            // Entregamos los datos cada segundo para no acumular todo al final
            startMsRef.current = Date.now();
            mediaRecorderRef.current.start(1000);
            setRecording(true);
        } catch (error) {
            console.error("Error al acceder a la pantalla:", error);
        }
    };

    // Cambiar la pantalla que se graba sin cortar la grabación
    const changeScreen = async () => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            compositorRef.current?.setSource(screenStream);
            setSourceLost(false);
            setNewScreenDetected(false);
        } catch (error) {
            // El usuario ha cancelado: seguimos grabando lo que hubiera (o negro)
            console.warn("Cambio de pantalla cancelado:", error);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setRecording(false);
            setSourceLost(false);
            setNewScreenDetected(false);
        }
    };

    // Chrome no calcula la duración ni pinta el primer fotograma de los vídeos de MediaRecorder:
    // saltamos al final para que calcule la duración y volvemos al inicio para mostrar la imagen.
    const fixPreview = (e) => {
        const video = e.currentTarget;
        if (!Number.isFinite(video.duration)) {
            video.addEventListener("seeked", () => (video.currentTime = 0.001), { once: true });
            video.currentTime = 1e101;
        } else {
            video.currentTime = 0.001;
        }
    };

    const saveLocal = () => {
        if (!videoUrl) return;
        const a = document.createElement("a");
        a.href = videoUrl;
        a.download = getFileName();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setHasBeenSaved(true);
    };

    return (
        <div className="container">
            <main>
                <img src={logoSC} alt="Sirviendo Código" className="logo2" />
                <br /><br />

                <h1>Nextcreen Recorder</h1>
                <p>Captura la pantalla de tu ordenador sin necesidad de instalar software.</p>

                {!compatibility.compatible && (
                    <div className="alert">
                        Tu navegador no soporta la grabación de pantalla. Prueba con Chrome, Edge, Firefox u Opera.
                    </div>
                )}

                <p>
                    Al finalizar podrás <b>GUARDAR LA GRABACIÓN</b> en tu ordenador (no se comparte nada fuera
                    del ordenador en el que se graba).
                </p>

                {!recording && !videoUrl && (
                    <button onClick={startRecording}>NUEVA GRABACIÓN</button>
                )}

                {recording && (
                    <div>
                        <button onClick={stopRecording} className="stop-btn">PARAR GRABACIÓN</button>
                        <div className="timer-info">
                            ⏳ <b>Duración:</b> {formatTime(elapsedTime)}
                            <br />
                            🕒 <b>Inicio:</b> {startTime}
                        </div>

                        {sourceLost && !newScreenDetected && (
                            <div className="screen-alert">
                                ⚠️ Se ha perdido la pantalla que estabas grabando.
                                <br />
                                <b>La grabación sigue</b> (en negro). Puedes elegir otra pantalla:
                                <button onClick={changeScreen}>ELEGIR PANTALLA</button>
                            </div>
                        )}

                        {newScreenDetected && (
                            <div className="screen-alert screen-alert--ok">
                                🖥️ Se ha detectado una pantalla nueva (¿ha vuelto el proyector?).
                                <button onClick={changeScreen}>VOLVER A GRABARLA</button>
                            </div>
                        )}

                        <div className="video-container">
                            <span className="live-badge">● GRABANDO</span>
                            <video ref={liveVideoRef} autoPlay muted playsInline className="video-preview" />
                            {!sourceLost && !newScreenDetected && (
                                <button onClick={changeScreen} className="change-btn">CAMBIAR PANTALLA</button>
                            )}
                        </div>
                    </div>
                )}

                {!recording && videoUrl && (
                    <div>
                        <button onClick={startRecording}>NUEVA GRABACIÓN</button>
                        <div className="timer-info">
                            ⏳ <b>Duración:</b> {formatTime(totalDuration)}
                            <br />
                            🕒 <b>Inicio:</b> {startTime}
                            <br />
                            🏁 <b>Fin:</b> {endTime}
                        </div>
                        <div className="video-container">
                            <video src={videoUrl} controls onLoadedMetadata={fixPreview} className="video-preview" />

                            <button onClick={saveLocal} className="save-btn">GUARDAR GRABACIÓN</button>
                        </div>
                    </div>
                )}
            </main>

            <footer>
                <span>Powered by</span>
                <img src={logo} alt="Next Digital Logo" className="logo" />
            </footer>
        </div>
    );
}

export default App;
