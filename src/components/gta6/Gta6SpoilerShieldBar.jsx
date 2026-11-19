import React, { useState } from 'react';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { SPOILER_CHAPTERS } from '../../data/games/gta6LaunchTools.js';
import { playSwitchTick, triggerHaptic } from '../../utils/soundHaptics.js';

export function SpoilerGuard({
  currentChapter = 1,
  minChapter = 2,
  label = 'Late-Chapter Spoiler',
  soundEnabled = true,
  children,
}) {
  const [peeked, setPeeked] = useState(false);
  const isLocked = Number(currentChapter) < Number(minChapter) && !peeked;

  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="spoiler-guard-wrap">
      <div className="spoiler-blurred-body" aria-hidden="true">
        {children}
      </div>
      <div className="spoiler-overlay-scrim">
        <button
          type="button"
          className="spoiler-overlay-btn tactile-press"
          onClick={() => {
            playSwitchTick(soundEnabled, 740);
            triggerHaptic(25);
            setPeeked(true);
          }}
        >
          <Eye size={15} aria-hidden="true" />
          <span>Ch. {minChapter} Spoiler Shield · Tap to Reveal ({label})</span>
        </button>
      </div>
    </div>
  );
}

export default function Gta6SpoilerShieldBar({
  spoilerChapter = 1,
  onSelectChapter,
  soundEnabled = true,
}) {
  const activeEntry =
    SPOILER_CHAPTERS.find((c) => c.id === Number(spoilerChapter)) || SPOILER_CHAPTERS[0];

  return (
    <section
      className="spoiler-shield-bar"
      aria-label="GTA VI Global Chapter Spoiler Shield"
    >
      <div className="spoiler-shield-meta">
        <span className="spoiler-shield-badge">
          {Number(spoilerChapter) >= 6 ? (
            <Eye size={13} aria-hidden="true" />
          ) : (
            <Shield size={13} aria-hidden="true" />
          )}
          <span>Spoiler Shield: {activeEntry.label}</span>
        </span>
        <span className="spoiler-shield-hint">
          {Number(spoilerChapter) >= 6
            ? 'All story chapters unblurred'
            : `Frost-blurring Ch. ${Number(spoilerChapter) + 1}+ spoilers automatically`}
        </span>
      </div>

      <div className="spoiler-chapter-pills" role="group" aria-label="Select current GTA VI story chapter">
        {SPOILER_CHAPTERS.map((ch) => {
          const active = Number(spoilerChapter) === ch.id;
          return (
            <button
              key={ch.id}
              type="button"
              aria-pressed={active}
              title={ch.title}
              className={`spoiler-ch-pill tactile-press ${active ? 'active' : ''}`}
              onClick={() => {
                playSwitchTick(soundEnabled, 660 + ch.id * 35);
                triggerHaptic(25);
                onSelectChapter(ch.id);
              }}
            >
              {ch.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
