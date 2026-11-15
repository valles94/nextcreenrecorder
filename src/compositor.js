// "Lienzo intermedio" de grabación.
//
// En vez de grabar la pantalla directamente, grabamos un <canvas> en el que copiamos
// la pantalla 25 veces por segundo. Si la pantalla desaparece (p. ej. se desconecta el
// HDMI del proyector), pintamos negro y la grabación sigue sin cortarse. Cuando se
// elige otra pantalla, se vuelve a copiar esa en el mismo lienzo.
//
// El reloj que marca los fotogramas vive en un Web Worker: Chrome ralentiza los
// temporizadores de las pestañas en segundo plano, pero no los de los workers, así
// que la grabación no se congela aunque la pestaña no esté a la vista.

const FPS = 25;
const MAX_WIDTH = 1920;

function createTicker(fps, onTick) {
    const code = "let id; onmessage = (e) => { clearInterval(id); if (e.data > 0) id = setInterval(() => postMessage(0), e.data); };";
    const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
    const worker = new Worker(url);
    worker.onmessage = onTick;
    worker.postMessage(1000 / fps);
    return () => {
        worker.postMessage(0);
        worker.terminate();
        URL.revokeObjectURL(url);
    };
}

function getOutputSize(track) {
    const { width = 1920, height = 1080 } = track.getSettings();
    const scale = Math.min(1, MAX_WIDTH / width);
    // Dimensiones pares: algunos códecs de vídeo lo exigen
    const even = (n) => Math.max(2, Math.round(n / 2) * 2);
    return { width: even(width * scale), height: even(height * scale) };
}

export function createCompositor(firstStream, { onSourceLost } = {}) {
    const { width, height } = getOutputSize(firstStream.getVideoTracks()[0]);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });

    let source = null;

    // Se resuelve cuando se ha pintado el primer fotograma real de la pantalla.
    // Así la grabación no empieza con fotogramas negros.
    let markReady;
    const ready = new Promise((resolve) => (markReady = resolve));

    const clear = () => {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, width, height);
    };

    const drawFit = (image, w, h) => {
        clear();
        if (!w || !h) return;
        const s = Math.min(width / w, height / h);
        const dw = w * s;
        const dh = h * s;
        ctx.drawImage(image, (width - dw) / 2, (height - dh) / 2, dw, dh);
    };

    const tick = () => {
        try {
            if (source?.frame) {
                drawFit(source.frame, source.frame.displayWidth, source.frame.displayHeight);
                markReady();
            } else if (source?.video && source.video.readyState >= 2) {
                drawFit(source.video, source.video.videoWidth, source.video.videoHeight);
                markReady();
            } else if (!source) {
                clear(); // Sin pantalla: negro
                markReady();
            }
            // Si hay pantalla pero aún no ha llegado su primer fotograma, mantenemos el último dibujado
        } catch (error) {
            console.warn("Fotograma omitido:", error);
        }
    };

    const releaseSource = () => {
        if (!source) return;
        const s = source;
        source = null;
        s.reader?.cancel().catch(() => {});
        s.frame?.close();
        if (s.video) s.video.srcObject = null;
        s.track.stop();
    };

    const setSource = (stream) => {
        releaseSource();
        const track = stream.getVideoTracks()[0];
        const src = { track, frame: null, video: null, reader: null };

        if ("MediaStreamTrackProcessor" in window) {
            // Chrome / Edge: leemos los fotogramas directamente, también en segundo plano
            const processor = new MediaStreamTrackProcessor({ track });
            src.reader = processor.readable.getReader();
            (async () => {
                try {
                    for (;;) {
                        const { value, done } = await src.reader.read();
                        if (done) break;
                        if (source !== src) {
                            value.close();
                            break;
                        }
                        src.frame?.close();
                        src.frame = value;
                    }
                } catch {
                    /* la pantalla se ha cerrado */
                }
            })();
        } else {
            // Firefox y otros: usamos un <video> oculto
            const video = document.createElement("video");
            video.muted = true;
            video.playsInline = true;
            video.srcObject = stream;
            video.play().catch(() => {});
            src.video = video;
        }

        track.addEventListener("ended", () => {
            if (source !== src) return;
            releaseSource();
            onSourceLost?.();
        });

        source = src;
    };

    setSource(firstStream);
    const stopTicker = createTicker(FPS, tick);
    const stream = canvas.captureStream(FPS);

    return {
        stream,
        ready,
        setSource,
        stop() {
            stopTicker();
            releaseSource();
            stream.getTracks().forEach((t) => t.stop());
        },
    };
}
