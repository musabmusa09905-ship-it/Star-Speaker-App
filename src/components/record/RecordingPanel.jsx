import { useEffect, useRef, useState } from "react";
import { MicIcon } from "../icons.jsx";

const waveformBars = [18, 30, 24, 46, 62, 38, 22, 34, 56, 42, 28, 52, 70, 44, 24, 34, 48, 30, 58, 40, 22, 32, 50, 36];
const targetSeconds = 90;

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getSupportedMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function getFriendlyRecordingError(error) {
  const name = error?.name || "";

  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Microphone access was blocked. Please allow microphone access and try again.";
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No microphone was found. Connect a microphone and try again.";
  }

  return "Recording failed. Please try again.";
}

export function RecordingPanel({ recording, disabled = false, onRecordingChange, onRecordingStarted }) {
  const [notice, setNotice] = useState("");
  const [phase, setPhase] = useState("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startedAtRef = useRef(null);
  const elapsedRef = useRef(0);
  const discardRef = useRef(false);

  useEffect(() => {
    elapsedRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  useEffect(() => {
    return () => {
      clearTimer();
      stopTracks();

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  function notifyRecordingChange(nextState) {
    onRecordingChange?.(nextState);
  }

  function clearTimer() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function clearAudioUrl() {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioUrl("");
  }

  function startTimer() {
    startedAtRef.current = Date.now();
    setElapsedSeconds(0);
    clearTimer();
    timerRef.current = window.setInterval(() => {
      const nextElapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      elapsedRef.current = nextElapsed;
      setElapsedSeconds(nextElapsed);
    }, 250);
  }

  async function startRecording() {
    if (disabled) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setPhase("error");
      setNotice("Your browser does not support recording. Try Chrome or Edge.");
      return;
    }

    try {
      discardRef.current = false;
      clearAudioUrl();
      notifyRecordingChange({ hasRecording: false, blob: null, audioUrl: "", durationSeconds: 0 });
      setNotice("Requesting microphone access...");
      setPhase("requesting");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = getSupportedMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        clearTimer();
        stopTracks();
        setPhase("error");
        setNotice("Recording failed. Please try again.");
      };

      recorder.onstop = () => {
        clearTimer();
        stopTracks();

        if (discardRef.current) {
          chunksRef.current = [];
          discardRef.current = false;
          return;
        }

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm"
        });

        if (!blob.size) {
          setPhase("error");
          setNotice("Recording failed. Please try again.");
          return;
        }

        const nextAudioUrl = URL.createObjectURL(blob);
        setAudioUrl(nextAudioUrl);
        setPhase("recorded");
        setNotice("Recording ready. Listen once before submitting.");
        notifyRecordingChange({
          hasRecording: true,
          blob,
          audioUrl: nextAudioUrl,
          durationSeconds: elapsedRef.current
        });
      };

      recorder.start();
      setPhase("recording");
      setNotice("");
      startTimer();
      try {
        onRecordingStarted?.();
      } catch {
        // Analytics hooks should never interrupt recording.
      }
    } catch (error) {
      clearTimer();
      stopTracks();
      setPhase("error");
      setNotice(getFriendlyRecordingError(error));
    }
  }

  function stopRecording() {
    if (disabled) {
      return;
    }

    const recorder = mediaRecorderRef.current;

    if (recorder?.state === "recording") {
      recorder.stop();
      setNotice("Preparing your preview...");
    }
  }

  function resetRecording() {
    if (disabled) {
      return;
    }

    discardRef.current = phase === "recording" || phase === "requesting";
    const recorder = mediaRecorderRef.current;

    if (recorder?.state === "recording") {
      recorder.stop();
    }

    clearTimer();
    stopTracks();
    clearAudioUrl();
    chunksRef.current = [];
    mediaRecorderRef.current = null;
    elapsedRef.current = 0;
    setElapsedSeconds(0);
    setPhase("idle");
    setNotice("");
    notifyRecordingChange({ hasRecording: false, blob: null, audioUrl: "", durationSeconds: 0 });
  }

  function previewRecording() {
    if (!audioUrl) {
      setNotice("Record your answer first.");
      return;
    }

    audioRef.current?.focus();
    audioRef.current?.play().catch(() => {
      setNotice("Use the audio player to preview your recording.");
    });
  }

  function handleSaveDraft() {
    if (disabled) {
      return;
    }

      setNotice("Draft saving is not available yet. You can preview or reset this recording.");
  }

  function handleMicClick() {
    if (disabled) {
      return;
    }

    if (phase === "recording") {
      stopRecording();
      return;
    }

    if (phase === "recorded") {
      previewRecording();
      return;
    }

    startRecording();
  }

  function handleAction(action) {
    if (action === "Reset") {
      resetRecording();
      return;
    }

    if (action === "Preview") {
      previewRecording();
      return;
    }

    if (action === "Save draft") {
      handleSaveDraft();
    }
  }

  const statusByPhase = {
    idle: "Ready to record",
    requesting: "Requesting microphone permission",
    recording: "Recording...",
    recorded: "Ready to preview",
    error: "Recording issue"
  };

  const helperByPhase = {
    idle: "Tap to start. One clear attempt is enough.",
    requesting: "Allow microphone access to begin.",
    recording: "Speak clearly. Tap again to stop.",
    recorded: "Preview, submit, or reset and try again.",
    error: "Check microphone access and try again"
  };

  const status = statusByPhase[phase] || recording.status;
  const helper = helperByPhase[phase] || recording.helper;
  const timer = `${formatTime(elapsedSeconds)} / ${formatTime(targetSeconds)}`;

  return (
    <section className="card recording-panel" aria-labelledby="recording-panel-title">
      <div className="recording-panel__top">
        <div>
          <span
            className={`recording-status-dot recording-status-dot--${phase}`}
            aria-hidden="true"
          />
          <h2 id="recording-panel-title">{status}</h2>
        </div>
        <p>{timer}</p>
      </div>

      <div className="waveform-placeholder" aria-label="Waveform preview placeholder">
        {waveformBars.map((height, index) => (
          <span key={`${height}-${index}`} style={{ height: `${height}px` }} />
        ))}
      </div>

      <button
        className={`record-mic-button record-mic-button--${phase}`}
        type="button"
        onClick={handleMicClick}
        disabled={disabled}
        aria-describedby="record-helper"
        aria-label={phase === "recording" ? "Stop recording" : "Start or preview recording"}
      >
        <MicIcon />
      </button>
      <p id="record-helper" className="recording-helper">
        {helper}
      </p>
      {notice && <p className="recording-inline-note">{notice}</p>}

      {audioUrl && (
        <div className="audio-preview">
          <p>Local preview</p>
          <audio ref={audioRef} controls src={audioUrl}>
            Your browser does not support audio playback.
          </audio>
        </div>
      )}

      <div className="recording-actions" aria-label="Recording actions">
        {recording.actions.map((action) => (
          <button
            type="button"
            className="secondary-button"
            onClick={() => handleAction(action)}
            disabled={disabled}
            key={action}
          >
            {action}
          </button>
        ))}
      </div>
    </section>
  );
}
