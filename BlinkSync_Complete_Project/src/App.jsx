import React, { useEffect, useRef, useState } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";

const OS = (() => {
  const ua = navigator.userAgent || "";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac OS|Macintosh/i.test(ua)) return "macOS";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS / iPadOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Unknown OS";
})();

// Face Mesh eye landmarks: vertical pairs and horizontal eye corners.
const LEFT = [33, 160, 158, 133, 153, 144];
const RIGHT = [362, 385, 387, 263, 373, 380];
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function ear(points, ids) {
  const p = ids.map(i => points[i]);
  return (distance(p[1], p[5]) + distance(p[2], p[4])) / (2 * distance(p[0], p[3]));
}

export default function App() {
  const videoRef = useRef(null), canvasRef = useRef(null), meshRef = useRef(null);
  const streamRef = useRef(null), lastClosedRef = useRef(false), lastBlinkRef = useRef(0);
  const blinkTimesRef = useRef([]);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("Camera is off");
  const [blinks, setBlinks] = useState(0);
  const [bpm, setBpm] = useState(0);
  const [earValue, setEarValue] = useState("--");
  const [reminder, setReminder] = useState(false);
  const [lowBlink, setLowBlink] = useState(false);
  const [lookAway, setLookAway] = useState(false);
  const [message, setMessage] = useState("Ready when you are.");
  const [warmScreen, setWarmScreen] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [privacy, setPrivacy] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      if (running) {
        setSessionSeconds(s => s + 1);
        const now = Date.now();
        blinkTimesRef.current = blinkTimesRef.current.filter(t => now - t < 60000);
        setBpm(blinkTimesRef.current.length);
        if (blinkTimesRef.current.length < 10 && sessionSeconds > 60) {
          setLowBlink(true);
          setMessage("Blink gently a few times. Your blink rate is running low.");
        } else {
          setLowBlink(false);
          setMessage("Your blink activity looks steady.");
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [running, sessionSeconds]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (running && sessionSeconds > 0 && sessionSeconds % 1200 === 0) {
        setReminder(true);
        setMessage("20-20-20 break: look at something about 20 feet away for 20 seconds.");
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [running, sessionSeconds]);

  async function startCamera() {
    try {
      setStatus("Requesting webcam permission…");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      const mesh = new FaceMesh({ locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
      mesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
      mesh.onResults(onResults);
      meshRef.current = mesh;
      setRunning(true);
      setStatus("Camera active — processing stays in this browser");
      setMessage("Look naturally at your screen. Blink normally.");
      processFrame();
    } catch (e) {
      setStatus(`Could not start camera: ${e.message || e}`);
      setMessage("Allow camera access in your browser settings, then try again.");
    }
  }

  async function processFrame() {
    if (!streamRef.current || !videoRef.current || videoRef.current.readyState < 2) {
      if (streamRef.current) requestAnimationFrame(processFrame);
      return;
    }
    if (meshRef.current) await meshRef.current.send({ image: videoRef.current });
    if (streamRef.current) requestAnimationFrame(processFrame);
  }

  function onResults(results) {
    const canvas = canvasRef.current, video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.scale(-1, 1); ctx.drawImage(results.image, -canvas.width, 0, canvas.width, canvas.height); ctx.restore();
    const face = results.multiFaceLandmarks?.[0];
    if (!face) { setStatus("Face not detected — adjust lighting or camera position"); return; }
    const value = (ear(face, LEFT) + ear(face, RIGHT)) / 2;
    setEarValue(value.toFixed(3));
    // Practical starter threshold. User-specific calibration may be needed.
    const closed = value < 0.20;
    const now = Date.now();
    if (closed && !lastClosedRef.current && now - lastBlinkRef.current > 120) {
      lastBlinkRef.current = now;
    }
    if (!closed && lastClosedRef.current && now - lastBlinkRef.current > 80) {
      blinkTimesRef.current.push(now);
      setBlinks(n => n + 1);
      setBpm(blinkTimesRef.current.filter(t => now - t < 60000).length);
    }
    lastClosedRef.current = closed;
    setStatus("Face detected — blink tracking active");
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    meshRef.current?.close?.();
    meshRef.current = null;
    setRunning(false); setStatus("Camera is off"); setMessage("Session paused.");
  }

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    meshRef.current?.close?.();
  }, []);

  const minutes = Math.floor(sessionSeconds / 60).toString().padStart(2, "0");
  const seconds = (sessionSeconds % 60).toString().padStart(2, "0");

  return <main className={warmScreen ? "app warm" : "app"}>
    <header>
      <div className="brand"><div className="logo">◉</div><div><h1>BlinkSync</h1><p>Gentle eye-care for screen time</p></div></div>
      <span className="os-pill">OS detected: {OS}</span>
    </header>
    <section className="hero">
      <div><p className="eyebrow">LOCAL-FIRST WELLNESS COMPANION</p><h2>Give your eyes<br/><em>a little breathing room.</em></h2>
      <p className="intro">BlinkSync estimates your blink activity using your webcam and offers subtle reminders. Your video is analyzed in your browser and is not uploaded by this app.</p>
      <div className="actions">{!running ? <button onClick={startCamera}>Start eye monitor ↗</button> : <button className="secondary" onClick={stopCamera}>Pause monitor</button>}
      <button className="ghost" onClick={() => setWarmScreen(v => !v)}>{warmScreen ? "Disable warm tint" : "Enable warm tint"}</button></div>
      <p className="status"><span className={running ? "dot live" : "dot"}></span>{status}</p></div>
      <div className="camera-card"><div className="camera-top"><span>LIVE CAMERA PREVIEW</span><span className="live-label">{running ? "● LIVE" : "● STANDBY"}</span></div>
        <div className="video-wrap"><video ref={videoRef} playsInline muted/><canvas ref={canvasRef}/>{!running && <div className="camera-placeholder"><span>◎</span><p>Your camera preview appears here</p></div>}</div>
        <div className="camera-bottom"><span>🔒 Local browser processing</span><span>Face Mesh</span></div>
      </div>
    </section>
    <section className="stats">
      <article><span className="stat-label">BLINKS THIS SESSION</span><strong>{blinks}</strong><small>Total detected blinks</small></article>
      <article><span className="stat-label">BLINK RATE</span><strong>{bpm}<i> /min</i></strong><small>{bpm < 10 && running ? "Below the app's reminder threshold" : "Recent 60-second estimate"}</small></article>
      <article><span className="stat-label">SESSION TIME</span><strong>{minutes}:{seconds}</strong><small>Time monitoring is active</small></article>
      <article><span className="stat-label">EYE OPENNESS</span><strong>{earValue}</strong><small>Estimated eye aspect ratio</small></article>
    </section>
    <section className="bottom-grid">
      <div className="reminder-card"><div className="card-heading"><div><p className="eyebrow">YOUR GENTLE NUDGE</p><h3>Small pauses, clearer focus.</h3></div><span className="spark">✦</span></div>
        <p>{message}</p>
        {lowBlink && running && <div className="notice">Try a few slow, complete blinks. Avoid forcing your eyes shut.</div>}
        {reminder && <div className="notice">20-20-20 reminder: look 20 feet away for 20 seconds.</div>}
        <div className="reminder-actions"><button className="secondary" onClick={() => {setLookAway(true);setReminder(false);setMessage("Break started. Look into the distance for 20 seconds.");setTimeout(()=>{setLookAway(false);setMessage("Break complete — welcome back.");},20000)}}>Start 20-second break</button>
        <button className="text-button" onClick={() => {setReminder(false);setLowBlink(false);setMessage("Reminder dismissed. Keep blinking naturally.")}}>Dismiss</button></div>
      </div>
      <div className="settings-card"><p className="eyebrow">PREFERENCES</p><h3>Make it feel right.</h3>
        <label className="toggle-row"><span><b>Ambient warm tint</b><small>Subtle screen warmth while working</small></span><input type="checkbox" checked={warmScreen} onChange={e=>setWarmScreen(e.target.checked)}/></label>
        <label className="toggle-row"><span><b>20-20-20 reminder</b><small>Prompt every 20 minutes</small></span><input type="checkbox" checked={reminder} onChange={e=>setReminder(e.target.checked)}/></label>
        <label className="toggle-row"><span><b>Privacy-first mode</b><small>Video stays local in this browser</small></span><input type="checkbox" checked={privacy} onChange={e=>setPrivacy(e.target.checked)}/></label>
      </div>
    </section>
    <footer><span>BlinkSync · A student wellness prototype</span><span>Not a medical device. Blink estimates can be affected by lighting, glasses, camera angle, and individual eye shape.</span></footer>
  </main>;
}