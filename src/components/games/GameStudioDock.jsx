import React, { useEffect, useRef, useState } from 'react';
import {
  Copy,
  Check,
  Link2,
  TrendingUp,
  Compass,
  Share2,
  Trash2,
  Bookmark,
  Sparkles,
} from 'lucide-react';
import { SpotlightPanel } from '../../utils/motionPrimitives.jsx';
import {
  downloadStudioSpecPng,
  formatDiscordSummary,
} from '../../utils/shareCardEngine.js';
import { playSwitchTick } from '../../utils/soundHaptics.js';

export function NumericField({
  value,
  onCommit,
  min,
  max,
  fallback,
  emptyFallback,
  round = true,
  ...inputProps
}) {
  const [draft, setDraft] = useState(() => String(value ?? ''));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(String(value ?? ''));
    }
  }, [value]);

  const clampNum = (num) => {
    let next = round ? Math.round(num) : num;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    return next === 0 ? 0 : next;
  };

  const resolveEmptyVal = () => {
    if (emptyFallback !== undefined) return clampNum(emptyFallback);
    if (min !== undefined) return clampNum(Math.max(min, 0));
    return clampNum(0);
  };

  return (
    <input
      type="number"
      min={min}
      max={max}
      {...inputProps}
      value={draft}
      onFocus={(e) => {
        focusedRef.current = true;
        inputProps.onFocus?.(e);
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        if (raw.trim() === '' || raw === '-' || raw === '.' || raw === '-.') return;
        const parsed = Number(raw);
        if (Number.isFinite(parsed)) {
          onCommit(clampNum(parsed));
        }
      }}
      onBlur={(e) => {
        focusedRef.current = false;
        const trimmed = draft.trim();
        const isEmptyLike = trimmed === '' || trimmed === '-' || trimmed === '.' || trimmed === '-.';
        const parsed = Number(draft);
        const finalVal =
          !isEmptyLike && Number.isFinite(parsed)
            ? clampNum(parsed)
            : isEmptyLike
              ? resolveEmptyVal()
              : clampNum(fallback ?? resolveEmptyVal());
        onCommit(finalVal);
        setDraft(String(finalVal));
        inputProps.onBlur?.(e);
      }}
    />
  );
}

export function GameStudioSideDock({
  game,
  isPro,
  onOpenProModal,
  soundEnabled,
  gamePins,
  pinNotice,
  pinLimitAlert,
  EMPTY_PIN_HINTS,
  onRemovePin,
  currentShareSpec,
  currentShareUrl,
  copiedKey,
  shareFallbackUrl,
  copyText,
  extraMetaWidget = null,
}) {
  return (
    <aside className="gs-side-dock" aria-label={`${game.shortTitle} telemetry & pins`}>
      {extraMetaWidget}

      <SpotlightPanel className="gs-meta-card">
        <div className="gs-meta-head">
          <TrendingUp size={15} color={game.accentColor} aria-hidden="true" />
          <h3>{game.proMetaTitle}</h3>
        </div>

        <div className="gs-meta-rows">
          {(game.proMetaRows || []).map((row) => (
            <div key={row.label} className="mg-meta-row">
              <strong>{row.label}</strong>
              <span>{row.val}</span>
            </div>
          ))}
        </div>

        <div className="gs-export-grid">
          <button
            type="button"
            className="subtle-pill-btn gs-export-btn"
            onClick={() =>
              copyText(
                formatDiscordSummary({
                  gameTitle: currentShareSpec.gameTitle,
                  headline: currentShareSpec.toolTitle,
                  heroLabel: currentShareSpec.heroLabel,
                  heroValue: currentShareSpec.heroValue,
                  rows: currentShareSpec.rows,
                }),
                'discord-spec',
                currentShareUrl
              )
            }
          >
            {copiedKey === 'discord-spec' ? (
              <Check size={14} aria-hidden="true" />
            ) : (
              <Copy size={14} aria-hidden="true" />
            )}
            <span>
              {copiedKey === 'discord-spec'
                ? 'Copied'
                : copiedKey === 'blocked:discord-spec'
                  ? 'Copy Below'
                  : 'Copy Discord'}
            </span>
          </button>

          <button
            type="button"
            className="stage-dark-btn gs-export-btn"
            onClick={() => {
              playSwitchTick(soundEnabled, 840);
              downloadStudioSpecPng(currentShareSpec);
            }}
          >
            <Share2 size={14} aria-hidden="true" />
            <span>Save PNG</span>
          </button>

          <button
            type="button"
            className="subtle-pill-btn share-link-wide-btn"
            data-share-url={currentShareUrl}
            onClick={() => copyText(currentShareUrl, 'share-url', currentShareUrl)}
          >
            {copiedKey === 'share-url' ? (
              <Check size={14} aria-hidden="true" />
            ) : (
              <Link2 size={14} aria-hidden="true" />
            )}
            <span>
              {copiedKey === 'share-url'
                ? 'Share Link Copied'
                : shareFallbackUrl
                  ? 'Copy Below'
                  : 'Copy Shareable Link'}
            </span>
          </button>
        </div>

        {shareFallbackUrl && (
          <div className="share-fallback-box">
            <label className="share-fallback-label" htmlFor="mg-share-fallback-input">
              Clipboard access blocked — copy your preset URL:
            </label>
            <input
              id="mg-share-fallback-input"
              type="text"
              readOnly
              className="deck-input mono"
              value={shareFallbackUrl}
              onFocus={(e) => e.target.select()}
              onClick={(e) => e.target.select()}
            />
          </div>
        )}

        <div role="status" aria-live="polite">
          {copiedKey && (
            <div
              className={`inline-status-note mono ${
                String(copiedKey).startsWith('blocked:') ? 'err' : 'ok'
              }`}
            >
              {copiedKey === 'share-url'
                ? 'Shareable preset URL copied.'
                : copiedKey === 'discord-spec'
                  ? 'Discord summary copied.'
                  : String(copiedKey).startsWith('blocked:')
                    ? 'Clipboard blocked — use the URL box above or Save PNG.'
                    : 'Pinned value copied.'}
            </div>
          )}
        </div>
      </SpotlightPanel>

      <SpotlightPanel className="gs-pin-card">
        <div className="gs-pin-head">
          <div className="gs-pin-title">
            <Compass size={15} color={game.accentColor} aria-hidden="true" />
            <span>
              Saved {game.shortTitle} Pins ({gamePins.length}
              {isPro ? ' · Cloud Synced' : ' / 5 Free'})
            </span>
          </div>
          {!isPro && (
            <button type="button" className="subtle-pill-btn" onClick={onOpenProModal}>
              Sync Cloud
            </button>
          )}
        </div>

        <div role="status" aria-live="polite">
          {pinLimitAlert && !isPro ? (
            <div className="pin-limit-alert">
              <span>{pinNotice || 'Free tier saves up to 5 pins per game.'}</span>
              <button type="button" className="subtle-pill-btn" onClick={onOpenProModal}>
                Unlock Pass
              </button>
            </div>
          ) : (
            pinNotice && <div className="inline-status-note ok mono">{pinNotice}</div>
          )}
        </div>

        {gamePins.length === 0 ? (
          <p className="gs-empty-pins">
            {EMPTY_PIN_HINTS[game.id] ||
              'Pin any calculated target above for instant second-screen access.'}
          </p>
        ) : (
          <div className="gs-pin-list">
            {gamePins.map((pin) => {
              const pinLabel =
                typeof pin.label === 'string' && pin.label ? pin.label : 'Pinned calculation';
              const pinValue = pin.value != null ? String(pin.value) : '';
              return (
                <div key={pin.id} className="mg-pin-item gs-pin-item-anim">
                  <div className="gs-pin-copy">
                    <div className="gs-pin-label">{pinLabel}</div>
                    <div className="mono gs-pin-value">{pinValue}</div>
                  </div>
                  <div className="gs-pin-actions">
                    <button
                      type="button"
                      className="subtle-pill-btn"
                      aria-label={`Copy pinned ${pinLabel}`}
                      onClick={() => copyText(pinValue, pin.id)}
                    >
                      {copiedKey === pin.id ? (
                        <Check size={13} aria-hidden="true" />
                      ) : (
                        <Copy size={13} aria-hidden="true" />
                      )}
                    </button>
                    <button
                      type="button"
                      className="subtle-pill-btn"
                      aria-label={`Remove pinned ${pinLabel}`}
                      onClick={() => onRemovePin(pin.id)}
                    >
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SpotlightPanel>
    </aside>
  );
}

export function GameStudioHeaderEmbed({ game, icon: IconComp = Sparkles }) {
  return (
    <section className="deck-panel gs-embed-hero" aria-label="Calculator overview">
      <div className="studio-hero-band">
        <div>
          <div className="panel-eyebrow">
            <IconComp size={13} aria-hidden="true" />
            <span>{game.shortTitle} · UNPAUSE EMBED CALCULATOR</span>
          </div>
          <h1 className="panel-title">{game.fullTitle || game.shortTitle}</h1>
          {game.tagline && <p className="panel-subtitle">{game.tagline}</p>}
        </div>
      </div>
    </section>
  );
}

export function PinButton({ onClick, label = 'Pin' }) {
  return (
    <button type="button" className="subtle-pill-btn gs-pin-trigger" onClick={onClick}>
      <Bookmark size={13} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
