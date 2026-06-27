import { useEffect, useRef, useState } from "react";
import type { ChatLine } from "../types";

interface ChatViewProps {
  lines: ChatLine[];
  partnerTyping: boolean;
  disabled: boolean;
  onSend: (text: string) => void;
  onTyping: (typing: boolean) => void;
}

export function ChatView({
  lines,
  partnerTyping,
  disabled,
  onSend,
  onTyping,
}: ChatViewProps) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, partnerTyping]);

  const submit = () => {
    if (!draft.trim()) return;
    onSend(draft);
    setDraft("");
    onTyping(false);
  };

  const handleChange = (value: string) => {
    setDraft(value);
    onTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => onTyping(false), 1200);
  };

  return (
    <div className="chat-view">
      <div className="messages">
        {lines.map((line) => (
          <div key={line.id} className={`message ${line.author}`}>
            {line.author === "system" ? (
              <span className="system-text">{line.text}</span>
            ) : (
              <div className="bubble">{line.text}</div>
            )}
          </div>
        ))}
        {partnerTyping && (
          <div className="message them">
            <div className="bubble typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="composer">
        <input
          type="text"
          value={draft}
          disabled={disabled}
          placeholder={disabled ? "Waiting for a partner…" : "Type a message…"}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        <button
          className="btn primary"
          disabled={disabled || !draft.trim()}
          onClick={submit}
        >
          Send
        </button>
      </div>
    </div>
  );
}
