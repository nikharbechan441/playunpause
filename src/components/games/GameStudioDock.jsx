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
  Code2,
  ExternalLink,
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

const YOUTH_FIREWALL_GAMES = new Set(['minecraft', 'roblox', 'fortnite']);

export function GameStudioSideDock({
  game,
  isPro,
  isEmbed = false,
  onOpenProModal,
  onOpenEmbedModal = null,
  runtimeConfig = null,
  clanTag = '',
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
  const [sharedPngToast, setSharedPngToast] = useState(false);
  const pngToastTimerRef = useRef(null);

  useEffect(() => {
    setSharedPngToast(false);
  }, [game?.id]);

  useEffect(() => () => {
    if (pngToastTimerRef.current) clearTimeout(pngToastTimerRef.current);
  }, []);

  const triggerPngToast = () => {
    setSharedPngToast(true);
    if (pngToastTimerRef.current) clearTimeout(pngToastTimerRef.current);
    pngToastTimerRef.current = setTimeout(() => setSharedPngToast(false), 6000);
  };

  const patchLabel = [game?.patchMeta?.patchVersion, game?.patchMeta?.seasonLabel]
    .filter(Boolean)
    .join(' · ');

  const gearOffer = game?.gearOffer;
  const showGearBar =
    !isEmbed &&
    !YOUTH_FIREWALL_GAMES.has(game?.id) &&
    Boolean(gearOffer && typeof gearOffer === 'object' && gearOffer.title);
  const rawGearHref = gearOffer?.urlKey ? runtimeConfig?.affiliates?.[gearOffer.urlKey] : '';
  const safeGearHref = /^https:\/\//i.test(String(rawGearHref || ''))
    ? rawGearHref
    : 'https://www.amazon.com/';

  const showPostShareProNudge =
    !isPro &&
    (sharedPngToast || copiedKey === 'discord-spec' || copiedKey === 'share-url');

  return (
    <aside className="gs-side-dock" aria-label={`${game.shortTitle} telemetry & pins`}>
      {extraMetaWidget}

      <SpotlightPanel className="gs-meta-card">
        <div className="gs-meta-head">
          <TrendingUp size={15} color={game.accentColor} aria-hidden="true" />
          <h3>{game.proMetaTitle}</h3>
        </div>

        {patchLabel && <div className="gw-patch-pill mono">{patchLabel}</div>}

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
                  shareUrl: currentShareUrl,
                  clanTag: isPro ? clanTag : '',
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
              downloadStudioSpecPng({
                ...currentShareSpec,
                canvasBgHex: game.canvasHexObsidian,
                themePersonaLabel: game.themePersonaLabel,
                shareUrl: currentShareUrl,
                clanTag: isPro ? clanTag : '',
              });
              triggerPngToast();
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

          {!isEmbed && typeof onOpenEmbedModal === 'function' && (
            <button
              type="button"
              className="subtle-pill-btn share-link-wide-btn"
              onClick={() => {
                playSwitchTick(soundEnabled, 740);
                onOpenEmbedModal();
              }}
            >
              <Code2 size={14} aria-hidden="true" />
              <span>Embed / OBS Overlay</span>
            </button>
          )}
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
          {(copiedKey || sharedPngToast) && (
            <div
              className={`inline-status-note mono ${
                String(copiedKey || '').startsWith('blocked:') ? 'err' : 'ok'
              }`}
            >
              {copiedKey === 'share-url'
                ? 'Shareable preset URL copied.'
                : copiedKey === 'discord-spec'
                  ? 'Discord summary + deep-link copied.'
                  : String(copiedKey || '').startsWith('blocked:')
                    ? 'Clipboard blocked — use the URL box above or Save PNG.'
                    : sharedPngToast
                      ? 'PNG card exported with preset QR.'
                      : 'Pinned value copied.'}
            </div>
          )}
        </div>

        {showPostShareProNudge && (
          <div className="pin-limit-alert" role="note">
            <span>Unlock [CLAN] PNG badges, synced checklists, and clean OBS embeds.</span>
            <button type="button" className="subtle-pill-btn" onClick={onOpenProModal}>
              Sync Pass
            </button>
          </div>
        )}
      </SpotlightPanel>

      {showGearBar && (
        <SpotlightPanel className="gs-gear-bar" aria-label={`${game.shortTitle} Pro-Gear hardware`}>
          <div className="gs-gear-copy">
            {gearOffer.label && <span className="gw-patch-pill mono">{gearOffer.label}</span>}
            <strong>{gearOffer.title}</strong>
            {gearOffer.sub && <p>{gearOffer.sub}</p>}
            <small className="source-legal-note">
              {gearOffer.disclosure || 'As an Amazon Associate I earn from qualifying purchases.'}
            </small>
          </div>
          <a
            href={safeGearHref}
            target="_blank"
            rel="sponsored nofollow noopener noreferrer"
            className="secondary-key-btn"
          >
            <span>Shop Gear</span>
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        </SpotlightPanel>
      )}

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
