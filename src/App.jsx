import React, { useState, useRef, useEffect } from "react";
import logo from "../src/assets/NegativoNEXTdigital-ai.svg";
import logo2 from "./assets/SirviendoCodigo-WT-name.svg";
import { checkBrowserCompatibility } from "./utils";
import "./App.css";

function App() {
    const [compatibility, setCompatibility] = useState({ compatible: true, reason: "" });
    const [recording, setRecording] = useState(false);
    const [videoUrl, setVideoUrl] = useState(null);
    const [startTime, setStartTime] = useState(null);
    const [endTime, setEndTime] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [totalDuration, setTotalDuration] = useState(null);
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const timerRef = useRef(null);

    const getFormattedTime = () => {
        const now = new Date();
        return now.toLocaleTimeString();
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    useEffect(() => {
        const result = checkBrowserCompatibility();
        setCompatibility(result);

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
                const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
                const videoURL = URL.createObjectURL(blob);
                setVideoUrl(videoURL);
                recordedChunksRef.current = [];
                setTotalDuration(elapsedTime);
                setEndTime(getFormattedTime());
            };

            setStartTime(getFormattedTime());
            setEndTime(null);
            setElapsedTime(0);
            setTotalDuration(null);
            setVideoUrl(null);

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
        <div className="container">
            <main>
                <img src={logo2} alt="Siviendo Código Logo" className="logo2" />
                <br/><br/>
                <h1>Nextcreen Recorder</h1>
                <p>Captura la pantalla de tu ordenador sin necesidad de instalar nada en tu equipo.</p>
                {/* 🔹 Mostrar alerta solo si el navegador no es compatible */}
                {!compatibility.compatible && (
                    <div className="alert">
                        <ul>
                            {compatibility.reason.map((item, index) => (
                                <li key={index}>{item}</li>
                            ))}
                        </ul>
                    </div>
                )}
                <p>
                    Al finalizar la grabación podrás elegir <strong>GUARDAR GRABACIÓN</strong> la grabación (no comparte
                    nada fuera del ordenador en que se graba).
                </p>

                {!recording && !videoUrl && (
                    <button onClick={startRecording}>NUEVA GRABACIÓN</button>
                )}

                {recording && (
                    <div>
                        <button onClick={stopRecording} className="stop-btn">PARAR GRABACIÓN</button>
                        <div className="timer-info">
                            ⏳ <b>Elapsed time:</b> {formatTime(elapsedTime)}
                            <br />
                            🕒 <b>Start time:</b> {startTime}
                        </div>
                    </div>
                )}

                {!recording && videoUrl && (
                    <div>
                        <button onClick={startRecording}>NUEVA GRABACIÓN</button>
                        <div className="timer-info">
                            ⏳ <b>Elapsed time:</b> {formatTime(totalDuration)}
                            <br />
                            🕒 <b>Start time:</b> {startTime}
                            <br />
                            ⏹ <b>Stop time:</b> {endTime}
                        </div>

                        {/* 📌 Video con botón de guardar */}
                        <div className="video-container">
                            <video src={videoUrl} controls className="video-preview" />
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
