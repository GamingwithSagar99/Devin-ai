import { useMemo, useState } from "react";
import { ChatView } from "./components/ChatView";
import { PartnerCard } from "./components/PartnerCard";
import { ProfileModal } from "./components/ProfileModal";
import { VoiceView } from "./components/VoiceView";
import { useRandomChat } from "./hooks/useRandomChat";
import { loadProfile, profileLabel, saveProfile } from "./lib/profile";
import type { ChatMode, Profile } from "./types";

export default function App() {
  const [profile, setProfile] = useState<Profile>(() => loadProfile());
  const [profileOpen, setProfileOpen] = useState(false);
  const chat = useRandomChat();

  const handleSaveProfile = (next: Profile) => {
    setProfile(next);
    saveProfile(next);
    setProfileOpen(false);
  };

  const handleStart = (mode: ChatMode) => {
    chat.start(mode, profile);
  };

  const inSession =
    chat.status === "matched" ||
    chat.status === "searching" ||
    chat.status === "partner-left";

  const statusLabel = useMemo(() => {
    switch (chat.status) {
      case "searching":
        return "Looking for someone to talk to…";
      case "matched":
        return chat.mode === "voice" ? "Voice call" : "Chatting";
      case "partner-left":
        return "Partner left";
      default:
        return "";
    }
  }, [chat.status, chat.mode]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">◐</span>
          <span>Random Chat</span>
        </div>
        <div className="topbar-right">
          <span className="online">
            <span className="dot" /> {chat.onlineCount} online
          </span>
          <button className="btn ghost" onClick={() => setProfileOpen(true)}>
            <span className="profile-name">{profileLabel(profile)}</span>
            <span className="profile-edit">Edit profile</span>
          </button>
        </div>
      </header>

      <main className="content">
        {!inSession ? (
          <section className="landing">
            <h1>Talk to someone new</h1>
            <p className="muted">
              Get instantly matched with a random person. Pick how you'd like to
              connect.
            </p>
            <div className="mode-grid">
              <button
                className="mode-card"
                onClick={() => handleStart("chat")}
                disabled={!chat.connected}
              >
                <span className="mode-emoji" aria-hidden>
                  💬
                </span>
                <strong>Text chat</strong>
                <span className="muted">Type with a stranger</span>
              </button>
              <button
                className="mode-card"
                onClick={() => handleStart("voice")}
                disabled={!chat.connected}
              >
                <span className="mode-emoji" aria-hidden>
                  📞
                </span>
                <strong>Voice call</strong>
                <span className="muted">Talk out loud</span>
              </button>
            </div>
            {!chat.connected && (
              <p className="muted">Connecting to server…</p>
            )}
          </section>
        ) : (
          <section className="session">
            <div className="session-header">
              <div>
                <span className="status-label">{statusLabel}</span>
                {chat.partner && <PartnerCard partner={chat.partner} />}
              </div>
              <div className="session-actions">
                <button className="btn ghost" onClick={chat.next}>
                  Next
                </button>
                <button className="btn danger" onClick={chat.stop}>
                  Stop
                </button>
              </div>
            </div>

            {chat.status === "searching" && (
              <div className="searching">
                <div className="spinner" />
                <p>Finding a {chat.mode === "voice" ? "voice" : "chat"} partner…</p>
              </div>
            )}

            {chat.mode === "voice" && chat.status !== "searching" ? (
              <VoiceView
                voiceConnected={chat.voiceConnected}
                micEnabled={chat.micEnabled}
                micError={chat.micError}
                partnerName={chat.partner?.name ?? "your partner"}
                onToggleMic={chat.toggleMic}
              />
            ) : chat.status !== "searching" ? (
              <ChatView
                lines={chat.lines}
                partnerTyping={chat.partnerTyping}
                disabled={chat.status !== "matched"}
                onSend={chat.sendMessage}
                onTyping={chat.setTyping}
              />
            ) : null}
          </section>
        )}
      </main>

      <audio ref={chat.remoteAudioRef} autoPlay />

      {profileOpen && (
        <ProfileModal
          initial={profile}
          onSave={handleSaveProfile}
          onClose={() => setProfileOpen(false)}
        />
      )}
    </div>
  );
}
