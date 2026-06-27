interface VoiceViewProps {
  voiceConnected: boolean;
  micEnabled: boolean;
  micError: string | null;
  partnerName: string;
  onToggleMic: () => void;
}

export function VoiceView({
  voiceConnected,
  micEnabled,
  micError,
  partnerName,
  onToggleMic,
}: VoiceViewProps) {
  return (
    <div className="voice-view">
      <div className={`voice-orb ${voiceConnected ? "live" : ""}`}>
        <span className="voice-icon" aria-hidden>
          🎙️
        </span>
      </div>
      <p className="voice-status">
        {micError
          ? "Microphone unavailable"
          : voiceConnected
            ? `Connected with ${partnerName}`
            : "Connecting audio…"}
      </p>
      {micError && <p className="error-text">{micError}</p>}
      <button
        className={`btn ${micEnabled ? "ghost" : "danger"}`}
        onClick={onToggleMic}
        disabled={Boolean(micError)}
      >
        {micEnabled ? "Mute mic" : "Unmute mic"}
      </button>
    </div>
  );
}
