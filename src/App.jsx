import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import {
  HardDrive,
  KeyRound,
  Users,
  Clock,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight,
  QrCode,
  Check,
  Copy,
  X,
  Sparkles,
  Megaphone,
  ExternalLink,
  RefreshCw,
  Code2,
} from 'lucide-react';
import { GAME_PACKS } from './data/games/index.js';
import {
  CANONICAL_ORIGIN,
  GAME_TO_CANONICAL_PATH,
  TAB_TO_CANONICAL_PATH,
  LEGAL_META,
  resolveSeoRequest,
  parseSafeStatefulQuery,
  getRelatedRoutesFor,
  getGroupedDirectoryLinks,
} from './data/seoRoutes.js';
import { formatCountdownMs } from './utils/shareUrlHelpers.js';
import { playSwitchTick, playUnlockChime } from './utils/soundHaptics.js';
import { copyTextReliably } from './utils/clipboard.js';
import { useModalFocusTrap } from './utils/useModalFocusTrap.js';

const loadStorageUnlockDeck = () => import('./components/StorageUnlockDeck.jsx');
const loadSafeKeypadVault = () => import('./components/SafeKeypadVault.jsx');
const loadSquadHeistMarketDeck = () => import('./components/SquadHeistMarketDeck.jsx');
const loadNightRunProDeck = () => import('./components/NightRunProDeck.jsx');
const loadMultiGameToolDeck = () => import('./components/MultiGameToolDeck.jsx');
const loadGameSelectorModal = () => import('./components/GameSelectorModal.jsx');
const loadLegalComplianceModal = () => import('./components/LegalComplianceModal.jsx');
const loadEmbedWidgetModal = () => import('./components/EmbedWidgetModal.jsx');

const StorageUnlockDeck = lazy(loadStorageUnlockDeck);
const SafeKeypadVault = lazy(loadSafeKeypadVault);
const SquadHeistMarketDeck = lazy(loadSquadHeistMarketDeck);
const NightRunProDeck = lazy(loadNightRunProDeck);
const MultiGameToolDeck = lazy(loadMultiGameToolDeck);
const GameSelectorModal = lazy(loadGameSelectorModal);
const LegalComplianceModal = lazy(loadLegalComplianceModal);
const EmbedWidgetModal = lazy(loadEmbedWidgetModal);

const STORAGE_KEY = 'unpause_deck_state_v5';
const LEGACY_KEYS = [
  'unpause_deck_state_v4',
  'unpause_deck_state_v3',
  'unpause_deck_state_v2',
  'unpause_deck_state_v1',
];

const GTA_MODES = [
  { id: 'storage', label: 'Preload & SSD', mobileLabel: 'SSD', icon: HardDrive },
  { id: 'safes', label: 'Safe Keypads', mobileLabel: 'Safes', icon: KeyRound },
  { id: 'squad', label: 'Squad & Cut', mobileLabel: 'Heist', icon: Users },
  { id: 'nightrun', label: 'Weeknight Route', mobileLabel: 'Route', icon: Clock },
];

export function sanitizeHttpsUrl(rawUrl, fallback = null) {
  if (!rawUrl || typeof rawUrl !== 'string') return fallback;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
      return fallback;
    }
    const host = parsed.hostname.toLowerCase();
    if (!host || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
      return fallback;
    }
    return parsed.toString();
  } catch {
    return fallback;
  }
}

const DEFAULT_RUNTIME = {
  passPriceUsd: 6.99,
  sponsorPriceUsd: 149,
  demoUnlockEnabled: false,
  passCheckoutUrl: 'https://whop.com/playunpause/unpause-one-time-all-access-pass/',
  sponsorCheckoutUrl: 'https://whop.com/playunpause/unpause-24-hour-featured-header-sponsor/',
  supportEmail: 'hello@playunpause.com',
  sponsorEmail: 'sponsors@playunpause.com',
  legalOperatorName: '',
  legalServiceAddress: '',
  legalContactPhone: '',
  affiliates: {
    ps5SsdUrl: 'https://www.amazon.com/s?k=PS5+NVMe+SSD+2TB+with+Heatsink',
    xboxCardUrl: 'https://www.amazon.com/s?k=WD+Black+C50+Xbox+Expansion+Card',
    topupsUrl: 'https://www.amazon.com/s?k=PlayStation+Store+Gift+Card',
  },
  activeSponsor: null,
};

function hexToRgba(hex, alpha) {
  const clean = String(hex || '#FF5964').replace('#', '');
  if (clean.length !== 6) return `rgba(255, 89, 100, ${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return `rgba(255, 89, 100, ${alpha})`;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

class ChunkErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unable to load this calculator module.',
    };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, errorMessage: '' });
    }
  }

  render() {
    if (this.state.hasError) {
      const card = (
        <section
          className={this.props.isModal ? 'modal-card chunk-error-card' : 'deck-panel chunk-error-card'}
          role="alert"
          onClick={this.props.isModal ? (e) => e.stopPropagation() : undefined}
        >
          <div className={this.props.isModal ? '' : 'deck-body-pad'}>
            <h2 className="legal-heading">Calculator module unavailable offline</h2>
            <p className="legal-copy compact-bottom">
              This tool chunk has not been cached in your browser yet ({this.state.errorMessage}).
              Reconnect to the network and retry, or return to the active calculator.
            </p>
            <div className="chunk-error-actions">
              <button
                type="button"
                className="primary-coral-btn"
                onClick={() => {
                  this.setState({ hasError: false, errorMessage: '' });
                  if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
                    window.location.reload();
                  }
                }}
              >
                Reload Module
              </button>
              {typeof this.props.onRecover === 'function' && (
                <button
                  type="button"
                  className="secondary-key-btn"
                  onClick={() => {
                    this.setState({ hasError: false, errorMessage: '' });
                    this.props.onRecover();
                  }}
                >
                  {this.props.recoverLabel || 'Back to Active Tool'}
                </button>
              )}
            </div>
          </div>
        </section>
      );

      if (this.props.isModal) {
        return (
          <div
            className="modal-backdrop"
            role="dialog"
            aria-modal="true"
            onClick={() => {
              this.setState({ hasError: false, errorMessage: '' });
              this.props.onRecover?.();
            }}
          >
            {card}
          </div>
        );
      }

      return card;
    }
    return this.props.children;
  }
}

const DEFAULT_DECK_STATE = {
  theme: 'obsidian',
  soundEnabled: true,
  isPro: false,
  deckCode: null,
  crackedSafeIds: [],
  checkedRouteIds: [],
  savedPins: [],
};

function sanitizeDeckCode(val) {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim().toUpperCase();
  return /^UP-[A-Z0-9]{6,12}$/.test(trimmed) ? trimmed : null;
}

function sanitizeStringIdArray(val, maxLen = 200) {
  if (!Array.isArray(val)) return [];
  const out = [];
  for (const item of val) {
    if (typeof item !== 'string') continue;
    const clean = item.trim().slice(0, 80);
    if (clean) out.push(clean);
    if (out.length >= maxLen) break;
  }
  return out;
}

function sanitizeSavedPins(val) {
  if (!Array.isArray(val)) return [];
  const out = [];
  for (const item of val) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    if (typeof item.id !== 'string' || typeof item.gameId !== 'string') continue;
    const id = item.id.trim().slice(0, 80);
    const gameId = item.gameId.trim().slice(0, 40);
    if (!id || !gameId) continue;
    const label =
      typeof item.label === 'string' && item.label.trim()
        ? item.label.trim().slice(0, 120)
        : 'Pinned calculation';
    const value =
      typeof item.value === 'string' || (typeof item.value === 'number' && Number.isFinite(item.value))
        ? String(item.value).slice(0, 140)
        : '';
    out.push({ id, gameId, label, value });
    if (out.length >= 60) break;
  }
  return out;
}

function sanitizeDeckState(raw, baseFallback = DEFAULT_DECK_STATE, { legacyMode = false } = {}) {
  const safeBase = {
    theme: baseFallback.theme === 'paper' ? 'paper' : 'obsidian',
    soundEnabled: typeof baseFallback.soundEnabled === 'boolean' ? baseFallback.soundEnabled : true,
    isPro: baseFallback.isPro === true && Boolean(sanitizeDeckCode(baseFallback.deckCode)),
    deckCode: sanitizeDeckCode(baseFallback.deckCode),
    crackedSafeIds: sanitizeStringIdArray(baseFallback.crackedSafeIds),
    checkedRouteIds: sanitizeStringIdArray(baseFallback.checkedRouteIds),
    savedPins: sanitizeSavedPins(baseFallback.savedPins),
  };

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return safeBase;
  }

  const cleanDeckCode = sanitizeDeckCode(raw.deckCode);
  const rawIsPro = legacyMode ? raw.isPro === true : raw.isPro === true;
  const rawSafes = Array.isArray(raw.crackedSafeIds)
    ? raw.crackedSafeIds
    : legacyMode && Array.isArray(raw.crackedSafes)
      ? raw.crackedSafes
      : null;

  return {
    theme: raw.theme === 'paper' ? 'paper' : raw.theme === 'obsidian' ? 'obsidian' : safeBase.theme,
    soundEnabled: typeof raw.soundEnabled === 'boolean' ? raw.soundEnabled : safeBase.soundEnabled,
    isPro: rawIsPro && Boolean(cleanDeckCode),
    deckCode: cleanDeckCode,
    crackedSafeIds: rawSafes !== null ? sanitizeStringIdArray(rawSafes) : safeBase.crackedSafeIds,
    checkedRouteIds: Array.isArray(raw.checkedRouteIds)
      ? sanitizeStringIdArray(raw.checkedRouteIds)
      : safeBase.checkedRouteIds,
    savedPins: Array.isArray(raw.savedPins) ? sanitizeSavedPins(raw.savedPins) : safeBase.savedPins,
  };
}

function parseStoredDeckObject(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  try {
    const parsed = JSON.parse(rawText);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Ignore malformed JSON entries
  }
  return null;
}

function loadInitialDeckState() {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_DECK_STATE };
  }
  try {
    const rawV5 = window.localStorage.getItem(STORAGE_KEY);
    const parsedV5 = parseStoredDeckObject(rawV5);
    if (parsedV5) {
      return sanitizeDeckState(parsedV5, DEFAULT_DECK_STATE);
    }
  } catch {
    // Ignore storage read errors in restricted browsers
  }

  for (const oldKey of LEGACY_KEYS) {
    try {
      const legacyRaw = window.localStorage.getItem(oldKey);
      const parsedLegacy = parseStoredDeckObject(legacyRaw);
      if (parsedLegacy) {
        return sanitizeDeckState(parsedLegacy, DEFAULT_DECK_STATE, { legacyMode: true });
      }
    } catch {
      // Continue scanning older keys if one legacy entry is unreadable
    }
  }
  return { ...DEFAULT_DECK_STATE };
}

function readRouteFromLocation() {
  if (typeof window === 'undefined') {
    return {
      route: resolveSeoRequest('/').route,
      isEmbed: false,
      notFound: false,
      gameId: 'gta-6',
      tab: 'storage',
      legal: null,
      preset: {},
      presetKey: '/',
      normalizeToPath: null,
      syncCode: null,
    };
  }

  let syncCode = null;
  const hash = window.location.hash || '';
  const syncMatch = hash.match(/#sync=(UP-[A-Z0-9]{6,12})/i);
  if (syncMatch) {
    syncCode = syncMatch[1].toUpperCase();
  }

  const rawPath = window.location.pathname || '/';
  const rawSearch = window.location.search || '';
  let seoRes = resolveSeoRequest(rawPath, rawSearch);
  let normalizeToPath = null;
  let effectivePath = rawPath;
  let effectiveParams = new URLSearchParams(rawSearch);

  if (seoRes.status === 301 && seoRes.redirectTo) {
    const parsedTarget = new URL(seoRes.redirectTo);
    normalizeToPath = `${parsedTarget.pathname}${parsedTarget.search}`;
    effectivePath = parsedTarget.pathname;
    effectiveParams = parsedTarget.searchParams;
    seoRes = resolveSeoRequest(effectivePath, effectiveParams);
  }

  const route = seoRes.route || null;
  const preset = parseSafeStatefulQuery(effectiveParams, route?.preset || {});
  const qs = effectiveParams.toString();

  return {
    route,
    isEmbed: Boolean(seoRes.isEmbed),
    notFound: Boolean(seoRes.notFound),
    gameId: route?.gameId || 'gta-6',
    tab: route?.tab || 'storage',
    legal: route?.legal || null,
    preset,
    presetKey: `${effectivePath}${qs ? `?${qs}` : ''}`,
    normalizeToPath,
    syncCode,
  };
}

export default function App() {
  const [routeState, setRouteState] = useState(() => readRouteFromLocation());
  const initialSyncCodeRef = useRef(routeState.syncCode);
  const [deckState, setDeckState] = useState(loadInitialDeckState);
  const [runtimeConfig, setRuntimeConfig] = useState(DEFAULT_RUNTIME);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const activeRoute = routeState.route;
  const isEmbed = routeState.isEmbed;
  const isNotFound = routeState.notFound;
  const activeGameId = routeState.gameId;
  const activeTab = routeState.tab;
  const legalSection = routeState.legal;

  const [showGameModal, setShowGameModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);

  const [claimInput, setClaimInput] = useState('');
  const [claimReceiptInput, setClaimReceiptInput] = useState('');
  const [claimStatus, setClaimStatus] = useState('');
  const [claimError, setClaimError] = useState('');
  const [localDataCleared, setLocalDataCleared] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [copiedSyncLink, setCopiedSyncLink] = useState('');
  const [qrMatrix, setQrMatrix] = useState(null);
  const [qrError, setQrError] = useState('');
  const [syncToast, setSyncToast] = useState(null);
  const [storageError, setStorageError] = useState('');
  const [pendingSyncCode, setPendingSyncCode] = useState(() => routeState.syncCode || null);

  const gameModalRef = useRef(null);
  const proModalRef = useRef(null);
  const sponsorModalRef = useRef(null);
  const legalModalRef = useRef(null);
  const syncTimerRef = useRef(null);
  const uiTimerRef = useRef(null);
  const skipNextPersistRef = useRef(false);
  const lastToolPathRef = useRef('/');

  useEffect(
    () => () => {
      if (uiTimerRef.current) clearTimeout(uiTimerRef.current);
    },
    []
  );

  useModalFocusTrap(showProModal, proModalRef, () => setShowProModal(false));
  useModalFocusTrap(showSponsorModal, sponsorModalRef, () => setShowSponsorModal(false));

  useEffect(() => {
    if (!legalSection && !isNotFound && activeRoute?.path && !isEmbed) {
      lastToolPathRef.current = routeState.presetKey || activeRoute.path;
    }
  }, [legalSection, isNotFound, activeRoute?.path, isEmbed, routeState.presetKey]);

  const navigateToPath = (rawPath, { replace = false, scrollToTop = false } = {}) => {
    if (typeof window === 'undefined') return;
    try {
      const targetUrl = new URL(rawPath, window.location.origin);
      const nextUrl = `${targetUrl.pathname}${targetUrl.search}`;
      if (replace) {
        window.history.replaceState({}, '', nextUrl);
      } else {
        window.history.pushState({}, '', nextUrl);
      }
      setRouteState(readRouteFromLocation());
      if (scrollToTop) {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    } catch {
      // Ignore history edge cases
    }
  };

  const setLegalSection = (nextSection) => {
    if (nextSection && LEGAL_META[nextSection]?.path) {
      navigateToPath(LEGAL_META[nextSection].path);
    } else {
      navigateToPath(lastToolPathRef.current || '/');
    }
  };

  const activeGamePack = useMemo(
    () => GAME_PACKS.find((g) => g.id === activeGameId) || GAME_PACKS[0],
    [activeGameId]
  );

  const isPreLaunch = nowMs < Date.parse(GAME_PACKS[0].nzUnlockIsoUtc || '2026-11-18T11:00:00Z');
  const daysUntilLaunch = useMemo(
    () => Math.max(0, Math.ceil((Date.parse('2026-11-19T00:00:00Z') - nowMs) / 86400000)),
    [nowMs]
  );
  const headerNzClock = useMemo(
    () => formatCountdownMs(Date.parse(GAME_PACKS[0].nzUnlockIsoUtc) - nowMs),
    [nowMs]
  );

  // Sync theme attribute and browser address-bar color cleanly
  useEffect(() => {
    const theme = deckState.theme === 'paper' ? 'paper' : 'obsidian';
    document.documentElement.setAttribute('data-theme', theme);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'paper' ? '#F4F3EF' : '#0B0E14');
    }
  }, [deckState.theme]);

  // Persist user companion state (unless explicitly cleared via Clear Local Data)
  useEffect(() => {
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      setStorageError('');
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(deckState));
      setStorageError('');
    } catch (err) {
      const msg =
        err?.name === 'QuotaExceededError'
          ? 'Browser storage is full — recent changes cannot be saved locally. Clear saved pins or local data to free space.'
          : 'Browser storage is blocked or unavailable — recent changes will not persist after reload.';
      setStorageError(msg);
    }
  }, [deckState]);

  // Idle warm-preloading of lazy calculator & modal chunks so visited sessions switch cleanly offline
  useEffect(() => {
    if (isEmbed || typeof window === 'undefined') return undefined;
    if (navigator?.connection?.saveData) return undefined;

    let cancelled = false;
    const warmChunks = () => {
      if (cancelled) return;
      Promise.allSettled([
        loadStorageUnlockDeck(),
        loadSafeKeypadVault(),
        loadSquadHeistMarketDeck(),
        loadNightRunProDeck(),
        loadMultiGameToolDeck(),
        loadGameSelectorModal(),
        loadLegalComplianceModal(),
        loadEmbedWidgetModal(),
        import('./utils/qrCode.js'),
      ]);
    };

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(warmChunks, { timeout: 2200 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback?.(idleId);
      };
    }

    const timerId = window.setTimeout(warmChunks, 900);
    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [isEmbed]);

  // Tick minute countdown clock
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Load runtime checkout/sponsor telemetry config from Worker/API
  useEffect(() => {
    let cancelled = false;
    fetch('/api/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((cfg) => {
        if (!cancelled && cfg && typeof cfg === 'object') {
          const safeSponsorUrl = cfg.activeSponsor?.targetUrl
            ? sanitizeHttpsUrl(cfg.activeSponsor.targetUrl, null)
            : null;
          setRuntimeConfig((prev) => ({
            ...prev,
            ...cfg,
            passCheckoutUrl: sanitizeHttpsUrl(cfg.passCheckoutUrl, prev.passCheckoutUrl),
            sponsorCheckoutUrl: sanitizeHttpsUrl(cfg.sponsorCheckoutUrl, prev.sponsorCheckoutUrl),
            affiliates: {
              ...prev.affiliates,
              ps5SsdUrl: sanitizeHttpsUrl(cfg.affiliates?.ps5SsdUrl, prev.affiliates.ps5SsdUrl),
              xboxCardUrl: sanitizeHttpsUrl(cfg.affiliates?.xboxCardUrl, prev.affiliates.xboxCardUrl),
              topupsUrl: sanitizeHttpsUrl(cfg.affiliates?.topupsUrl, prev.affiliates.topupsUrl),
            },
            activeSponsor:
              cfg.activeSponsor && safeSponsorUrl
                ? { ...cfg.activeSponsor, targetUrl: safeSponsorUrl }
                : null,
          }));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Sync dynamic document title, canonical & robots meta tag during client-side navigation
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const titleText = isNotFound
      ? 'Page Not Found — Unpause'
      : activeRoute?.title || 'Unpause — Instant Console Storage & Game Math Tools';
    document.title = titleText;

    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (isNotFound) {
      if (canonicalEl) canonicalEl.remove();
    } else {
      const canonicalPath =
        isEmbed && activeRoute?.parentCanonicalPath
          ? activeRoute.parentCanonicalPath
          : activeRoute?.path || '/';
      if (!canonicalEl) {
        canonicalEl = document.createElement('link');
        canonicalEl.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalEl);
      }
      canonicalEl.setAttribute('href', `${CANONICAL_ORIGIN}${canonicalPath}`);
    }

    let robotsEl = document.querySelector('meta[name="robots"]');
    if (isNotFound || isEmbed) {
      if (!robotsEl) {
        robotsEl = document.createElement('meta');
        robotsEl.setAttribute('name', 'robots');
        document.head.appendChild(robotsEl);
      }
      robotsEl.setAttribute('content', isNotFound ? 'noindex, nofollow' : 'noindex, follow');
    } else if (robotsEl) {
      robotsEl.remove();
    }
  }, [activeRoute, isEmbed, isNotFound]);

  // Normalize legacy client URLs when running under standalone Vite dev server
  useEffect(() => {
    if (routeState.normalizeToPath && typeof window !== 'undefined') {
      const keepHash =
        window.location.hash && !window.location.hash.toLowerCase().startsWith('#sync=')
          ? window.location.hash
          : '';
      try {
        window.history.replaceState({}, '', `${routeState.normalizeToPath}${keepHash}`);
      } catch {
        // Ignore history restrictions
      }
    }
  }, [routeState.normalizeToPath]);

  const restoreSyncPassByCode = async (rawCode) => {
    const syncCode = sanitizeDeckCode(rawCode);
    if (!syncCode) return;
    let shouldScrubHash = false;
    try {
      const res = await fetch(`/api/sync/${encodeURIComponent(syncCode)}`);
      const data = await res.json().catch(() => null);
      if (res.status === 403) {
        shouldScrubHash = true;
        setPendingSyncCode(null);
        setDeckState((prev) =>
          prev.deckCode === syncCode
            ? { ...prev, isPro: false, deckCode: null }
            : prev
        );
        const errText = data?.error || 'This Sync Pass was refunded or deactivated.';
        setClaimError(errText);
        setSyncToast({ tone: 'err', text: errText });
        return;
      }
      if (res.ok && data?.ok && data?.state) {
        shouldScrubHash = true;
        setPendingSyncCode(null);
        const nextCode = sanitizeDeckCode(data.deckCode) || syncCode;
        setDeckState((prev) => ({
          ...prev,
          isPro: true,
          deckCode: nextCode,
          crackedSafeIds: Array.isArray(data.state.crackedSafeIds)
            ? sanitizeStringIdArray(data.state.crackedSafeIds)
            : prev.crackedSafeIds,
          checkedRouteIds: Array.isArray(data.state.checkedRouteIds)
            ? sanitizeStringIdArray(data.state.checkedRouteIds)
            : prev.checkedRouteIds,
          savedPins: Array.isArray(data.state.savedPins)
            ? sanitizeSavedPins(data.state.savedPins)
            : prev.savedPins,
        }));
        setClaimError('');
        setClaimStatus(`Synced to ${nextCode}`);
        setSyncToast({ tone: 'ok', text: `Sync Pass ${nextCode} restored to this device.` });
        return;
      }
      const errText =
        (data && typeof data.error === 'string' && data.error) ||
        `Could not restore Sync Pass (HTTP ${res.status}). Your sync link is preserved — retry shortly.`;
      setPendingSyncCode(syncCode);
      setClaimError(errText);
      setSyncToast({ tone: 'err', text: errText });
    } catch {
      setPendingSyncCode(syncCode);
      const errText =
        'Network error while restoring Sync Pass. Reconnect and click Retry Sync or reload.';
      setClaimError(errText);
      setSyncToast({ tone: 'err', text: errText });
    } finally {
      if (shouldScrubHash) {
        try {
          if (window.location.hash && window.location.hash.toLowerCase().startsWith('#sync=')) {
            window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`);
          }
        } catch {
          // Ignore history restrictions
        }
      }
    }
  };

  // Auto-hydrating #sync=UP-XXXXXXXX hash links (Cross-device QR flow) & scrubbing fragment only when settled
  useEffect(() => {
    const syncCode = initialSyncCodeRef.current;
    if (!syncCode) return;
    restoreSyncPassByCode(syncCode);
  }, []);

  // Debounced cloud state push when Sync Pass active
  useEffect(() => {
    if (!deckState.isPro || !deckState.deckCode) return undefined;
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      fetch(`/api/sync/${encodeURIComponent(deckState.deckCode)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: {
            crackedSafeIds: deckState.crackedSafeIds,
            checkedRouteIds: deckState.checkedRouteIds,
            savedPins: deckState.savedPins,
          },
        }),
      })
        .then((res) => {
          if (res.status === 403) {
            setDeckState((prev) => ({ ...prev, isPro: false, deckCode: null }));
            setClaimError('Sync Pass inactive or refunded.');
          }
        })
        .catch(() => {});
    }, 600);
    return () => clearTimeout(syncTimerRef.current);
  }, [deckState.isPro, deckState.deckCode, deckState.crackedSafeIds, deckState.checkedRouteIds, deckState.savedPins]);

  // Keyboard shortcuts: Ctrl/Cmd + K opens Game Selector (unless another modal is active), Escape closes active modal
  useEffect(() => {
    const onKeyDown = (e) => {
      if (isEmbed) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        if (showProModal || showSponsorModal || showEmbedModal || legalSection) return;
        e.preventDefault();
        setShowGameModal((open) => !open);
      } else if (e.key === 'Escape') {
        setShowGameModal(false);
        setShowProModal(false);
        setShowSponsorModal(false);
        setShowEmbedModal(false);
        if (legalSection) setLegalSection(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isEmbed, legalSection, showProModal, showSponsorModal, showEmbedModal]);

  // Browser back/forward URL navigation support
  useEffect(() => {
    const onPopState = () => {
      setRouteState(readRouteFromLocation());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleSelectGame = (nextGameId) => {
    playSwitchTick(deckState.soundEnabled, 700);
    navigateToPath(GAME_TO_CANONICAL_PATH[nextGameId] || '/');
  };

  const handleSelectTab = (tabId) => {
    playSwitchTick(deckState.soundEnabled, 660);
    navigateToPath(TAB_TO_CANONICAL_PATH[tabId] || '/gta-6/storage');
  };

  const toggleTheme = () => {
    playSwitchTick(deckState.soundEnabled, 720);
    setDeckState((prev) => ({
      ...prev,
      theme: prev.theme === 'paper' ? 'obsidian' : 'paper',
    }));
  };

  const toggleSound = () => {
    setDeckState((prev) => {
      const next = !prev.soundEnabled;
      if (next) playSwitchTick(true, 760);
      return { ...prev, soundEnabled: next };
    });
  };

  const handleToggleSafe = (safeId) => {
    playSwitchTick(deckState.soundEnabled, 740);
    setDeckState((prev) => {
      const exists = prev.crackedSafeIds.includes(safeId);
      const nextSafes = exists
        ? prev.crackedSafeIds.filter((id) => id !== safeId)
        : [...prev.crackedSafeIds, safeId];
      return { ...prev, crackedSafeIds: nextSafes };
    });
  };

  const handleToggleRouteStop = (stopId) => {
    playSwitchTick(deckState.soundEnabled, 740);
    setDeckState((prev) => {
      const exists = prev.checkedRouteIds.includes(stopId);
      const nextStops = exists
        ? prev.checkedRouteIds.filter((id) => id !== stopId)
        : [...prev.checkedRouteIds, stopId];
      return { ...prev, checkedRouteIds: nextStops };
    });
  };

  const handleSavePin = (pinObj) => {
    setDeckState((prev) => ({
      ...prev,
      savedPins: sanitizeSavedPins([pinObj, ...(Array.isArray(prev.savedPins) ? prev.savedPins : [])]),
    }));
  };

  const handleRemovePin = (pinId) => {
    playSwitchTick(deckState.soundEnabled, 580);
    setDeckState((prev) => ({
      ...prev,
      savedPins: Array.isArray(prev.savedPins)
        ? prev.savedPins.filter((p) => p && p.id !== pinId)
        : [],
    }));
  };

  const handleActivatePass = async (e) => {
    e.preventDefault();
    const raw = claimInput.trim();
    const rawReceipt = claimReceiptInput.trim();
    if (!raw) {
      setClaimError('Enter your UP-XXXXXXXX sync code, purchase email + receipt ID, or Whop mem_ / pay_ ID.');
      return;
    }
    if (raw.includes('@') && !rawReceipt) {
      setClaimError('For account security, enter your Whop receipt ID (mem_... or pay_...) alongside your checkout email.');
      return;
    }
    setClaimError('');
    setClaimStatus('');
    setIsActivating(true);

    try {
      const resp = await fetch('/api/pass/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codeOrEmail: raw,
          ...(rawReceipt ? { receiptRef: rawReceipt } : {}),
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data.ok) {
        setClaimError(
          data?.error ||
            (resp.status >= 500
              ? `Sync server returned HTTP ${resp.status}. Please try again shortly.`
              : 'Could not verify code or receipt.')
        );
      } else {
        const nextCode = sanitizeDeckCode(data.deckCode);
        if (!nextCode) {
          setClaimError('Server returned an unrecognized Sync Pass code format.');
          return;
        }
        playUnlockChime(deckState.soundEnabled);
        const safeSafes = sanitizeStringIdArray(data.state?.crackedSafeIds);
        const safeRoutes = sanitizeStringIdArray(data.state?.checkedRouteIds);
        const safePins = sanitizeSavedPins(data.state?.savedPins);
        setDeckState((prev) => ({
          ...prev,
          isPro: true,
          deckCode: nextCode,
          crackedSafeIds: safeSafes.length ? safeSafes : prev.crackedSafeIds,
          checkedRouteIds: safeRoutes.length ? safeRoutes : prev.checkedRouteIds,
          savedPins: safePins.length ? safePins : prev.savedPins,
        }));
        setClaimStatus(`Synced to ${nextCode}`);
        setClaimInput('');
        setClaimReceiptInput('');
      }
    } catch {
      setClaimError('Network error while checking pass activation. Try again.');
    } finally {
      setIsActivating(false);
    }
  };

  const handlePullCloudNow = async () => {
    if (!deckState.deckCode) return;
    setClaimError('');
    setClaimStatus('');
    try {
      const res = await fetch(`/api/sync/${encodeURIComponent(deckState.deckCode)}`);
      const data = await res.json().catch(() => null);
      if (res.status === 403) {
        const errText = data?.error || 'Sync Pass inactive or refunded.';
        setDeckState((prev) => ({ ...prev, isPro: false, deckCode: null }));
        setClaimError(errText);
        setSyncToast({ tone: 'err', text: errText });
        return;
      }
      if (res.ok && data?.ok && data?.state) {
        playSwitchTick(deckState.soundEnabled, 820);
        setDeckState((prev) => ({
          ...prev,
          crackedSafeIds: sanitizeStringIdArray(data.state.crackedSafeIds),
          checkedRouteIds: sanitizeStringIdArray(data.state.checkedRouteIds),
          savedPins: sanitizeSavedPins(data.state.savedPins),
        }));
        setClaimStatus('Synced latest state from cloud.');
        if (uiTimerRef.current) clearTimeout(uiTimerRef.current);
        uiTimerRef.current = setTimeout(() => setClaimStatus(''), 2000);
        return;
      }
      const errText =
        (data && typeof data.error === 'string' && data.error) ||
        `Cloud sync unavailable (HTTP ${res.status}). Try again shortly.`;
      setClaimError(errText);
      setSyncToast({ tone: 'err', text: errText });
    } catch {
      const errText = 'Network error while pulling cloud state. Check connection and try again.';
      setClaimError(errText);
      setSyncToast({ tone: 'err', text: errText });
    }
  };

  const handleClearLocalData = () => {
    playSwitchTick(deckState.soundEnabled, 520);
    skipNextPersistRef.current = true;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      for (const oldKey of LEGACY_KEYS) {
        window.localStorage.removeItem(oldKey);
      }
      if (window.location.hash && window.location.hash.toLowerCase().startsWith('#sync=')) {
        window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`);
      }
    } catch {
      // Ignore storage access restrictions
    }
    setDeckState({
      theme: deckState.theme,
      soundEnabled: deckState.soundEnabled,
      isPro: false,
      deckCode: null,
      crackedSafeIds: [],
      checkedRouteIds: [],
      savedPins: [],
    });
    setClaimInput('');
    setClaimReceiptInput('');
    setClaimError('');
    setClaimStatus('');
    setSyncToast(null);
    setLocalDataCleared(true);
    if (uiTimerRef.current) clearTimeout(uiTimerRef.current);
    uiTimerRef.current = setTimeout(() => setLocalDataCleared(false), 3000);
  };

  const syncShareUrl = useMemo(() => {
    if (!deckState.deckCode) return '';
    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://playunpause.com';
    return `${origin}/#sync=${deckState.deckCode}`;
  }, [deckState.deckCode]);

  useEffect(() => {
    let cancelled = false;
    if (!showProModal || !deckState.isPro || !syncShareUrl) {
      setQrMatrix(null);
      setQrError('');
      return () => {
        cancelled = true;
      };
    }

    import('./utils/qrCode.js')
      .then(({ generateQrMatrix }) => {
        if (cancelled) return;
        const matrix = generateQrMatrix(syncShareUrl);
        setQrMatrix(matrix);
        setQrError('');
      })
      .catch((err) => {
        if (cancelled) return;
        setQrMatrix(null);
        setQrError(
          err?.message || 'Sync link exceeds QR capacity — copy the sync link or UP- code instead.',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [showProModal, deckState.isPro, syncShareUrl]);

  const handleGtaTabKeyDown = (event, currentIndex) => {
    let nextIndex = null;
    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % GTA_MODES.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + GTA_MODES.length) % GTA_MODES.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = GTA_MODES.length - 1;
    }
    if (nextIndex === null) return;
    event.preventDefault();
    const nextMode = GTA_MODES[nextIndex];
    handleSelectTab(nextMode.id);
    if (typeof document !== 'undefined') {
      document.getElementById(`gta-tab-${nextMode.id}`)?.focus();
    }
  };

  const accentStyle = useMemo(
    () => ({
      '--game-accent': activeGamePack.accentColor,
      '--game-accent-soft': activeGamePack.accentSoft || hexToRgba(activeGamePack.accentColor, 0.14),
      '--game-accent-ring': hexToRgba(activeGamePack.accentColor, 0.38),
    }),
    [activeGamePack.accentColor, activeGamePack.accentSoft]
  );

  const faqCards = useMemo(() => {
    const routeFaqs =
      Array.isArray(activeRoute?.faqs) && activeRoute.faqs.length > 0
        ? activeRoute.faqs
        : activeGamePack.faqs || [];
    return [
      ...routeFaqs,
      {
        q: `What does the one-time $${runtimeConfig.passPriceUsd} Sync Pass unlock?`,
        a: `All calculators stay free forever with zero ads. One-time $${runtimeConfig.passPriceUsd} Sync Pass via Whop unlocks instant Phone ↔ PC QR sync (UP-XXXXXXXX code), 90m/120m extended weeknight chains, unlimited pinned calcs, and 14-day hassle-free refunds.`,
      },
    ];
  }, [activeRoute?.faqs, activeGamePack.faqs, runtimeConfig.passPriceUsd]);

  const currentEmbedPath = useMemo(() => {
    if (activeGameId === 'gta-6') {
      const map = {
        storage: '/embed/gta-6/storage',
        safes: '/embed/gta-6/safe-codes',
        squad: '/embed/gta-6/heist-split',
        nightrun: '/embed/gta-6/night-run',
      };
      return map[activeTab] || '/embed/gta-6/storage';
    }
    const slug = activeGameId === 'gta-v' ? 'gta-online' : activeGameId;
    return `/embed/${slug}`;
  }, [activeGameId, activeTab]);

  const isSubpageScenario = useMemo(
    () =>
      Boolean(
        activeRoute &&
          !activeRoute.legal &&
          !isEmbed &&
          !isNotFound &&
          activeRoute.path !== '/' &&
          !Object.values(GAME_TO_CANONICAL_PATH).includes(activeRoute.path) &&
          !Object.values(TAB_TO_CANONICAL_PATH).includes(activeRoute.path)
      ),
    [activeRoute, isEmbed, isNotFound]
  );

  const relatedLinks = useMemo(
    () => (activeRoute && !activeRoute.legal ? getRelatedRoutesFor(activeRoute, 6) : []),
    [activeRoute]
  );

  const directoryGroups = useMemo(() => getGroupedDirectoryLinks(), []);

  const handleOpenProTarget = isEmbed
    ? () => {
        const dest = `${CANONICAL_ORIGIN}${activeRoute?.parentCanonicalPath || '/'}`;
        window.open(dest, '_blank', 'noopener');
      }
    : () => setShowProModal(true);

  const activeSponsorHref = sanitizeHttpsUrl(runtimeConfig.activeSponsor?.targetUrl, null);
  const passCheckoutHref = sanitizeHttpsUrl(
    runtimeConfig.passCheckoutUrl,
    DEFAULT_RUNTIME.passCheckoutUrl
  );
  const sponsorCheckoutHref = sanitizeHttpsUrl(
    runtimeConfig.sponsorCheckoutUrl,
    DEFAULT_RUNTIME.sponsorCheckoutUrl
  );

  if (isEmbed) {
    return (
      <div style={accentStyle} className="embed-root-wrap">
        <main className="app-shell embed-app-shell">
          <ChunkErrorBoundary resetKey={`embed:${activeGamePack.id}:${activeTab}`}>
            <Suspense
              fallback={
                <div className="deck-panel embed-loading-card">
                  Loading calculator module…
                </div>
              }
            >
            {activeGamePack.isGta6Suite ? (
              <div className="deck-stage-transition" key={`embed-gta-${activeTab}`}>
                {activeTab === 'storage' && (
                  <StorageUnlockDeck
                    gamePack={activeGamePack}
                    runtimeConfig={runtimeConfig}
                    soundEnabled={deckState.soundEnabled}
                    nowMs={nowMs}
                    isEmbed
                    onOpenProModal={handleOpenProTarget}
                    initialPreset={routeState.preset}
                    presetKey={routeState.presetKey}
                  />
                )}
                {activeTab === 'safes' && (
                  <SafeKeypadVault
                    gamePack={activeGamePack}
                    crackedSafeIds={deckState.crackedSafeIds}
                    onToggleSafe={handleToggleSafe}
                    soundEnabled={deckState.soundEnabled}
                    isPro={deckState.isPro}
                    isPreLaunch={isPreLaunch}
                    isEmbed
                    initialQuery={routeState.preset?.query ?? ''}
                    initialPreset={routeState.preset}
                    presetKey={routeState.presetKey}
                    onOpenProModal={handleOpenProTarget}
                  />
                )}
                {activeTab === 'squad' && (
                  <SquadHeistMarketDeck
                    gamePack={activeGamePack}
                    soundEnabled={deckState.soundEnabled}
                    isPreLaunch={isPreLaunch}
                    isEmbed
                    initialPreset={routeState.preset}
                    presetKey={routeState.presetKey}
                  />
                )}
                {activeTab === 'nightrun' && (
                  <NightRunProDeck
                    gamePack={activeGamePack}
                    isPro={deckState.isPro}
                    isPreLaunch={isPreLaunch}
                    isEmbed
                    deckCode={deckState.deckCode}
                    checkedRouteIds={deckState.checkedRouteIds}
                    onToggleRouteStop={handleToggleRouteStop}
                    onOpenProModal={handleOpenProTarget}
                    runtimeConfig={runtimeConfig}
                    soundEnabled={deckState.soundEnabled}
                    initialPreset={routeState.preset}
                    presetKey={routeState.presetKey}
                  />
                )}
              </div>
            ) : (
              <div className="deck-stage-transition" key={`embed-mg-${activeGamePack.id}`}>
                <MultiGameToolDeck
                  game={activeGamePack}
                  isPro={deckState.isPro}
                  isEmbed
                  onOpenProModal={handleOpenProTarget}
                  soundEnabled={deckState.soundEnabled}
                  savedPins={deckState.savedPins}
                  onSavePin={handleSavePin}
                  onRemovePin={handleRemovePin}
                  initialPreset={routeState.preset}
                  presetKey={routeState.presetKey}
                />
              </div>
            )}
            </Suspense>
          </ChunkErrorBoundary>

          <footer className="embed-attribution-bar">
            <div className="embed-attribution-copy">
              <span>Powered by</span>
              <a
                href={`${CANONICAL_ORIGIN}${activeRoute?.parentCanonicalPath || '/'}`}
                target="_blank"
                rel="noopener"
              >
                Unpause ({activeRoute?.shortLabel || 'playunpause.com'}) ↗
              </a>
            </div>
            <button
              type="button"
              className="subtle-pill-btn"
              onClick={toggleTheme}
              aria-label={
                deckState.theme === 'paper'
                  ? 'Switch to Obsidian dark studio theme'
                  : 'Switch to Paper daylight theme'
              }
            >
              {deckState.theme === 'paper' ? <Moon size={14} /> : <Sun size={14} />}
              <span>{deckState.theme === 'paper' ? 'Dark' : 'Light'}</span>
            </button>
          </footer>
        </main>
      </div>
    );
  }

  const showMobileBottomRail =
    !isNotFound && !isEmbed && !legalSection && activeGamePack.isGta6Suite;

  return (
    <div style={accentStyle}>
      {/* OPTIONAL SPONSOR BAR (HIDDEN WHEN SYNC PASS ACTIVE) */}
      {!deckState.isPro && runtimeConfig.activeSponsor && activeSponsorHref && (
        <div className="sponsor-strip">
          <div className="sponsor-strip-inner">
            <a
              href={activeSponsorHref}
              target="_blank"
              rel="sponsored nofollow noopener noreferrer"
              className="sponsor-tag"
            >
              <span className="sponsor-dot" />
              <span>Sponsored: {runtimeConfig.activeSponsor.badgeText}</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}

      {/* STICKY COMMAND HEADER + SLIM TOP-10 UNDERLINE GAME RAIL */}
      <header className="hud-header-wrap">
        <div className="hud-command-bar">
          <div className="brand-left-group">
            <a
              href="/"
              className="brand-cluster"
              onClick={(e) => {
                e.preventDefault();
                navigateToPath('/');
              }}
            >
              <div className="brand-mark" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="5" width="4" height="14" rx="1.2" fill="#38BDF8" />
                  <path d="M11 5.5L20 12L11 18.5V5.5Z" fill="#F5F7FB" />
                </svg>
              </div>
              <span className="brand-name">Unpause</span>
            </a>

            <button
              type="button"
              className="game-switch-btn"
              onClick={() => {
                playSwitchTick(deckState.soundEnabled, 660);
                setShowGameModal(true);
              }}
              aria-haspopup="dialog"
              aria-expanded={showGameModal}
            >
              <span>{activeGamePack.shortTitle}</span>
              <ChevronDown size={14} />
              <span className="kbd-hint">Ctrl+K</span>
            </button>
          </div>

          <div className="topbar-controls">
            <div
              className="nz-hud-pill"
              title={`Global launch Nov 19, 2026 · Xbox NZ earliest midnight: Nov 18 @ 11:00 UTC (${headerNzClock})`}
            >
              <span className="nz-live-dot" />
              <span className="nz-full-text">GTA VI · Nov 19 ({daysUntilLaunch}d)</span>
              <span className="nz-compact-text">Nov 19 ({daysUntilLaunch}d)</span>
            </div>

            <button
              type="button"
              className="tactile-icon-btn header-sound-btn"
              onClick={toggleSound}
              aria-label={deckState.soundEnabled ? 'Mute tactile sound' : 'Enable tactile sound'}
              title={deckState.soundEnabled ? 'Mute clicks' : 'Enable clicks'}
            >
              {deckState.soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>

            <button
              type="button"
              className="tactile-icon-btn"
              onClick={toggleTheme}
              aria-label={
                deckState.theme === 'paper'
                  ? 'Switch to Obsidian dark studio theme'
                  : 'Switch to Paper daylight theme'
              }
              title={deckState.theme === 'paper' ? 'Obsidian Dark Mode' : 'Paper Light Mode'}
            >
              {deckState.theme === 'paper' ? (
                <Moon size={15} aria-hidden="true" />
              ) : (
                <Sun size={15} aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              className="tactile-icon-btn embed-header-btn"
              onClick={() => {
                playSwitchTick(deckState.soundEnabled, 680);
                setShowEmbedModal(true);
              }}
              aria-label="Embed free calculator widget"
              title="Embed calculator widget"
            >
              <Code2 size={15} aria-hidden="true" />
              <span className="embed-btn-label">Embed</span>
            </button>

            <button
              type="button"
              className={`tactile-icon-btn pass-header-btn ${deckState.isPro ? 'sync-pill-pro' : ''}`}
              onClick={() => {
                playSwitchTick(deckState.soundEnabled, 700);
                setShowProModal(true);
              }}
            >
              <QrCode size={14} aria-hidden="true" />
              <span className="pass-full-label">
                {deckState.isPro ? `Synced · ${deckState.deckCode}` : 'Phone ↔ PC Sync'}
              </span>
              <span className="pass-short-label">
                {deckState.isPro ? 'Synced' : 'Sync'}
              </span>
            </button>
          </div>
        </div>

        {/* SLIM TOP-10 GAME DOCK */}
        <nav className="quick-game-dock-wrap" aria-label="Quick Top 10 Games">
          <div className="quick-game-dock">
            {GAME_PACKS.map((g) => {
              const isActive = !isNotFound && g.id === activeGameId;
              const href = GAME_TO_CANONICAL_PATH[g.id] || '/';
              return (
                <a
                  key={g.id}
                  href={href}
                  className={`quick-game-pill ${isActive ? 'active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    handleSelectGame(g.id);
                  }}
                >
                  <span
                    className="quick-game-dot"
                    style={{ background: g.accentColor }}
                    aria-hidden="true"
                  />
                  <span>{g.shortTitle}</span>
                </a>
              );
            })}
          </div>
        </nav>
      </header>

      {/* MAIN STUDIO WORKBENCH */}
      <main className={`app-shell ${showMobileBottomRail ? 'has-mobile-bottom-rail' : ''}`}>
        {storageError && (
          <div className="sync-toast-banner err storage-warn-banner" role="alert">
            <span>{storageError}</span>
            <div className="sync-toast-actions">
              <button
                type="button"
                className="subtle-pill-btn"
                onClick={handleClearLocalData}
              >
                Clear Local Data
              </button>
              <button
                type="button"
                className="subtle-pill-btn"
                aria-label="Dismiss storage warning"
                onClick={() => setStorageError('')}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        {syncToast && (
          <div
            className={`sync-toast-banner ${syncToast.tone === 'err' ? 'err' : 'ok'}`}
            role={syncToast.tone === 'err' ? 'alert' : 'status'}
            aria-live={syncToast.tone === 'err' ? 'assertive' : 'polite'}
          >
            <span>{syncToast.text}</span>
            <div className="sync-toast-actions">
              {syncToast.tone === 'err' && pendingSyncCode && (
                <button
                  type="button"
                  className="subtle-pill-btn"
                  onClick={() => restoreSyncPassByCode(pendingSyncCode)}
                >
                  Retry Sync
                </button>
              )}
              <button
                type="button"
                className="subtle-pill-btn"
                onClick={() => {
                  setSyncToast(null);
                  setShowProModal(true);
                }}
              >
                View Sync Pass
              </button>
              <button
                type="button"
                className="subtle-pill-btn"
                aria-label="Dismiss sync notification"
                onClick={() => setSyncToast(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        {isNotFound ? (
          <section className="deck-panel notfound-card" aria-label="Page not found">
            <div className="deck-body-pad">
              <div className="panel-eyebrow">
                <span>HTTP 404 · UNKNOWN CALCULATOR PATH</span>
              </div>
              <h1 className="consumer-h1">404 — Calculator Route Not Found</h1>
              <p className="consumer-sub">
                That path does not match an active calculator or guide. Jump directly into any free deck below:
              </p>
              <div className="seo-scenario-chips">
                {GAME_PACKS.map((g) => {
                  const target = GAME_TO_CANONICAL_PATH[g.id] || '/';
                  return (
                    <a
                      key={g.id}
                      href={target}
                      className="subtle-pill-btn seo-scenario-chip"
                      onClick={(e) => {
                        e.preventDefault();
                        navigateToPath(target, { scrollToTop: true });
                      }}
                    >
                      {g.shortTitle}
                    </a>
                  );
                })}
              </div>
            </div>
          </section>
        ) : (
        <>
        <section className="consumer-masthead" aria-label="Tool overview">
          {Array.isArray(activeRoute?.breadcrumbs) && activeRoute.breadcrumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="seo-breadcrumb">
              <ol>
                {activeRoute.breadcrumbs.map((crumb, idx) => {
                  const isLast = idx === activeRoute.breadcrumbs.length - 1;
                  return (
                    <li key={crumb.path}>
                      {isLast ? (
                        <span aria-current="page">{crumb.name}</span>
                      ) : (
                        <>
                          <a
                            href={crumb.path}
                            onClick={(e) => {
                              e.preventDefault();
                              navigateToPath(crumb.path, { scrollToTop: true });
                            }}
                          >
                            {crumb.name}
                          </a>
                          <ChevronRight size={13} aria-hidden="true" />
                        </>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          )}
          <div className="consumer-masthead-top">
            <div>
              <h1 className="consumer-h1">
                {activeRoute?.h1 ||
                  ({
                    'gta-6': 'Will GTA VI fit on your console?',
                    'cod-warzone': 'Which Warzone gun wins 3-plate TTK?',
                    fortnite: 'Will you hit Level 200 before season end?',
                    minecraft: 'Link Overworld & Nether portals to the block',
                    'ea-fc-27': 'How much do you lose to the 5% EA tax?',
                    roblox: 'What do you actually keep from DevEx cashouts?',
                    cs2: 'Can your CS2 squad afford a full buy next round?',
                    valorant: 'Force buy or save on this Valorant round?',
                    'apex-legends': 'How close are you to 500-pack Heirloom pity?',
                    'gta-v': 'Exact Cayo Perico bag fills & heist payouts',
                  }[activeGamePack.id]) ||
                  activeGamePack.fullTitle}
              </h1>
              <p className="consumer-sub">
                {activeRoute?.answerSummary ||
                  (activeGamePack.isGta6Suite
                    ? 'Check exact PS5 & Xbox SSD headroom, download time, safe codes, and heist splits in seconds — free, zero popups, no account.'
                    : `${activeGamePack.tagline} · Free, instant browser math with zero ads.`)}
              </p>
            </div>
          </div>
          {!activeRoute?.legal && activeRoute?.path !== '/' && relatedLinks.length > 0 && (
            <div className="seo-scenario-strip">
              <span className="seo-strip-label">{isSubpageScenario ? 'Related presets:' : 'Popular presets:'}</span>
              <div className="seo-scenario-chips">
                {relatedLinks.map((rel) => (
                  <a
                    key={rel.path}
                    href={rel.path}
                    className="subtle-pill-btn seo-scenario-chip"
                    onClick={(e) => {
                      e.preventDefault();
                      navigateToPath(rel.path);
                    }}
                  >
                    {rel.shortLabel}
                  </a>
                ))}
              </div>
            </div>
          )}
          {activeGamePack.sourceNote && (
            <div className="source-verified-bar">
              <span className="source-verified-pill">
                <Check size={14} color="var(--teal-dark)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{activeGamePack.sourceNote}</span>
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                100% Free Core Tools · Runs Locally Once Loaded
              </span>
            </div>
          )}
        </section>

        <ChunkErrorBoundary
          resetKey={`${activeGamePack.id}:${activeTab}`}
          onRecover={() => navigateToPath('/')}
          recoverLabel="Back to Preload Calculator"
        >
          <Suspense
            fallback={
              <div className="deck-panel" style={{ padding: '24px', color: 'var(--ink-secondary)' }}>
                Loading calculator module…
              </div>
            }
          >
        {activeGamePack.isGta6Suite ? (
          <div>
            <div className="gta-workspace-nav" role="tablist" aria-label="GTA VI Tools">
              {GTA_MODES.map((m, idx) => {
                const IconM = m.icon;
                const active = activeTab === m.id;
                return (
                  <button
                    key={m.id}
                    id={`gta-tab-${m.id}`}
                    type="button"
                    role="tab"
                    tabIndex={active ? 0 : -1}
                    aria-selected={active}
                    aria-controls="gta-tabpanel"
                    className={`mode-tab ${active ? 'active' : ''}`}
                    onClick={() => handleSelectTab(m.id)}
                    onKeyDown={(e) => handleGtaTabKeyDown(e, idx)}
                  >
                    <IconM size={15} className="mode-tab-icon" aria-hidden="true" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            <div
              id="gta-tabpanel"
              role="tabpanel"
              aria-labelledby={`gta-tab-${activeTab}`}
              className="deck-stage-transition"
              key={`gta-${activeTab}`}
            >
              {activeTab === 'storage' && (
                <StorageUnlockDeck
                  gamePack={activeGamePack}
                  runtimeConfig={runtimeConfig}
                  soundEnabled={deckState.soundEnabled}
                  nowMs={nowMs}
                  onOpenProModal={() => setShowProModal(true)}
                  initialPreset={routeState.preset}
                  presetKey={routeState.presetKey}
                />
              )}

              {activeTab === 'safes' && (
                <SafeKeypadVault
                  gamePack={activeGamePack}
                  crackedSafeIds={deckState.crackedSafeIds}
                  onToggleSafe={handleToggleSafe}
                  soundEnabled={deckState.soundEnabled}
                  isPro={deckState.isPro}
                  isPreLaunch={isPreLaunch}
                  initialQuery={routeState.preset?.query ?? ''}
                  initialPreset={routeState.preset}
                  presetKey={routeState.presetKey}
                  onOpenProModal={() => setShowProModal(true)}
                />
              )}

              {activeTab === 'squad' && (
                <SquadHeistMarketDeck
                  gamePack={activeGamePack}
                  soundEnabled={deckState.soundEnabled}
                  isPreLaunch={isPreLaunch}
                  initialPreset={routeState.preset}
                  presetKey={routeState.presetKey}
                />
              )}

              {activeTab === 'nightrun' && (
                <NightRunProDeck
                  gamePack={activeGamePack}
                  isPro={deckState.isPro}
                  isPreLaunch={isPreLaunch}
                  deckCode={deckState.deckCode}
                  checkedRouteIds={deckState.checkedRouteIds}
                  onToggleRouteStop={handleToggleRouteStop}
                  onOpenProModal={() => setShowProModal(true)}
                  runtimeConfig={runtimeConfig}
                  soundEnabled={deckState.soundEnabled}
                  initialPreset={routeState.preset}
                  presetKey={routeState.presetKey}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="deck-stage-transition" key={`mg-${activeGamePack.id}`}>
            <MultiGameToolDeck
              game={activeGamePack}
              isPro={deckState.isPro}
              onOpenProModal={() => setShowProModal(true)}
              soundEnabled={deckState.soundEnabled}
              savedPins={deckState.savedPins}
              onSavePin={handleSavePin}
              onRemovePin={handleRemovePin}
              initialPreset={routeState.preset}
              presetKey={routeState.presetKey}
            />
          </div>
        )}
          </Suspense>
        </ChunkErrorBoundary>

        {/* TRUST / GAME DOMAIN FAQ GRID */}
        <section className="trust-faq-grid" aria-label="Quick Reference FAQs">
          {faqCards.map((faq) => (
            <article key={faq.q} className="trust-card">
              <h2>{faq.q}</h2>
              <p>{faq.a}</p>
            </article>
          ))}
        </section>
        </>
        )}

        {/* SEO INTERNAL LINK DIRECTORY HUB */}
        <section className="seo-directory-hub" aria-label="Complete Unpause Calculator Directory">
          <div className="seo-directory-head">
            <div>
              <h2>Popular Unpause Calculators &amp; Scenario Pages</h2>
              <p>Instant zero-ad companion pages indexed across GTA VI and Top 9 live games.</p>
            </div>
            <button
              type="button"
              className="subtle-pill-btn"
              onClick={() => {
                playSwitchTick(deckState.soundEnabled, 680);
                setShowEmbedModal(true);
              }}
            >
              <Code2 size={14} />
              <span>Embed Free Calculator Widget</span>
            </button>
          </div>
          <div className="seo-directory-grid">
            {directoryGroups.map((group) => (
              <div key={group.cluster} className="seo-directory-card">
                <h3>{group.cluster}</h3>
                <div className="seo-directory-links">
                  {group.links.map((link) => (
                    <a
                      key={link.path}
                      href={link.path}
                      className={`seo-dir-link ${activeRoute?.path === link.path ? 'active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        navigateToPath(link.path, { scrollToTop: true });
                      }}
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* TRANSPARENT STUDIO FOOTER */}
        <footer className="studio-footer">
          <div className="footer-main-row">
            <div className="footer-brand-row">
              <span>Unpause (playunpause.com) · Independent Player Companion</span>
              <a
                href={`mailto:${runtimeConfig.supportEmail}`}
                className="footer-support-link"
              >
                {runtimeConfig.supportEmail}
              </a>
            </div>

            <div className="footer-actions-row">
              <button
                type="button"
                className="subtle-pill-btn footer-sound-btn"
                aria-pressed={!deckState.soundEnabled}
                aria-label={deckState.soundEnabled ? 'Mute tactile sound' : 'Enable tactile sound'}
                onClick={toggleSound}
              >
                {deckState.soundEnabled ? (
                  <Volume2 size={13} aria-hidden="true" />
                ) : (
                  <VolumeX size={13} aria-hidden="true" />
                )}
                <span>{deckState.soundEnabled ? 'Sound: On' : 'Sound: Muted'}</span>
              </button>
              <button
                type="button"
                className="subtle-pill-btn"
                onClick={() => {
                  playSwitchTick(deckState.soundEnabled, 680);
                  setShowEmbedModal(true);
                }}
              >
                <Code2 size={13} aria-hidden="true" />
                <span>Embed Widget</span>
              </button>
              <a
                href={LEGAL_META.terms.path}
                className="subtle-pill-btn"
                onClick={(e) => {
                  e.preventDefault();
                  setLegalSection('terms');
                }}
              >
                Terms
              </a>
              <a
                href={LEGAL_META.privacy.path}
                className="subtle-pill-btn"
                onClick={(e) => {
                  e.preventDefault();
                  setLegalSection('privacy');
                }}
              >
                Privacy
              </a>
              <a
                href={LEGAL_META.refunds.path}
                className="subtle-pill-btn"
                onClick={(e) => {
                  e.preventDefault();
                  setLegalSection('refunds');
                }}
              >
                Refund Policy
              </a>
              <a
                href={LEGAL_META.ip.path}
                className="subtle-pill-btn"
                onClick={(e) => {
                  e.preventDefault();
                  setLegalSection('ip');
                }}
              >
                IP &amp; DMCA
              </a>
              <button
                type="button"
                className="subtle-pill-btn"
                onClick={handleClearLocalData}
              >
                {localDataCleared ? 'Local Data Cleared' : 'Clear Local Data'}
              </button>
              <button
                type="button"
                className="subtle-pill-btn"
                onClick={() => setShowSponsorModal(true)}
              >
                <Megaphone size={13} aria-hidden="true" />
                <span>Sponsor Slot</span>
              </button>
            </div>
          </div>

          <div role="status" aria-live="polite">
            {localDataCleared && (
              <div className="inline-status-note ok">
                Saved progress and sync pass data cleared from this browser.
              </div>
            )}
          </div>

          <p className="footer-disclaimer">
            Unofficial Player Companion &amp; Non-Affiliation Notice: Unpause is an independent utility
            built cleanly for second-screen speed. Not affiliated with, endorsed by, or sponsored by
            Rockstar Games, Take-Two Interactive, Activision, Epic Games, Mojang AB, Microsoft,
            Electronic Arts, CD PROJEKT S.A., Respawn Entertainment, Valve Corp., Riot Games,
            Roblox Corp., or Sony Interactive Entertainment. NOT AN OFFICIAL MINECRAFT PRODUCT. NOT
            APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.
          </p>
        </footer>
      </main>

      {/* MOBILE BOTTOM NAVIGATION RAIL FOR GTA VI MODES */}
      {showMobileBottomRail && (
        <nav className="mobile-bottom-rail" aria-label="Mobile GTA VI Modes">
          {GTA_MODES.map((m) => {
            const IconM = m.icon;
            const active = activeTab === m.id;
            return (
              <button
                key={m.id}
                type="button"
                className={`mode-tab ${active ? 'active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => handleSelectTab(m.id)}
              >
                <IconM size={16} className="mode-tab-icon" aria-hidden="true" />
                <span>{m.mobileLabel}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* MODAL 1: GAME SWITCHER */}
      {showGameModal && (
        <ChunkErrorBoundary
          isModal
          resetKey={`modal-game-${activeGameId}`}
          onRecover={() => setShowGameModal(false)}
          recoverLabel="Close"
        >
          <Suspense fallback={null}>
            <GameSelectorModal
              isOpen={showGameModal}
              onClose={() => setShowGameModal(false)}
              activeGameId={activeGameId}
              onSelectGame={handleSelectGame}
              soundEnabled={deckState.soundEnabled}
              modalRef={gameModalRef}
            />
          </Suspense>
        </ChunkErrorBoundary>
      )}

      {/* MODAL 2: UNPAUSE SYNC PASS & QR CROSS-DEVICE LINK */}
      {showProModal && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pro-modal-title"
          onClick={() => setShowProModal(false)}
        >
          <div
            ref={proModalRef}
            className="modal-card"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="selector-modal-header">
              <div>
                <h2 id="pro-modal-title" className="selector-modal-title">
                  {deckState.isPro
                    ? `Cloud Sync Active · ${deckState.deckCode}`
                    : `Unpause Sync Pass · $${runtimeConfig.passPriceUsd} Once`}
                </h2>
                <p className="selector-modal-sub">
                  Zero subscriptions. Instant Phone ↔ PC QR sync, extended GTA VI weeknight chains, and
                  unlimited multi-game saved pins across CoD: MW4, EA FC 27, Minecraft &amp; Valorant.
                </p>
              </div>
              <button
                type="button"
                className="tactile-icon-btn"
                aria-label="Close Sync Pass modal"
                onClick={() => setShowProModal(false)}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            {deckState.isPro && deckState.deckCode ? (
              <div className="mg-subcard">
                {qrMatrix && (
                  <div className="sync-qr-frame">
                    <svg
                      width="148"
                      height="148"
                      viewBox={`-4 -4 ${qrMatrix.length + 8} ${qrMatrix.length + 8}`}
                      role="img"
                      aria-label={`QR sync code for ${deckState.deckCode}`}
                      shapeRendering="crispEdges"
                    >
                      <rect
                        x={-4}
                        y={-4}
                        width={qrMatrix.length + 8}
                        height={qrMatrix.length + 8}
                        fill="#FFFFFF"
                      />
                      {qrMatrix.map((row, y) =>
                        row.map((cell, x) =>
                          cell ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#0B0E14" /> : null
                        )
                      )}
                    </svg>
                  </div>
                )}

                {qrError && (
                  <div className="inline-status-note err" role="alert">
                    {qrError}
                  </div>
                )}

                <div className="mono sync-code-readout">
                  {deckState.deckCode}
                </div>
                <p className="sync-sub-copy">
                  Scan on your phone while playing on console or PC — safes, routes &amp; pinned calcs sync automatically.
                </p>
                <p className="sync-bearer-note">
                  Security notice: Your <code>UP-</code> code and QR link act as a bearer sync key. Keep screenshots private.
                </p>

                <div className="sync-actions-row">
                  <button
                    type="button"
                    className="secondary-key-btn"
                    onClick={async () => {
                      if (!syncShareUrl) return;
                      const ok = await copyTextReliably(syncShareUrl);
                      setCopiedSyncLink(ok ? 'ok' : 'blocked');
                      if (uiTimerRef.current) clearTimeout(uiTimerRef.current);
                      uiTimerRef.current = setTimeout(() => setCopiedSyncLink(''), 4000);
                    }}
                  >
                    {copiedSyncLink === 'ok' ? (
                      <Check size={14} aria-hidden="true" />
                    ) : (
                      <Copy size={14} aria-hidden="true" />
                    )}
                    <span>{copiedSyncLink === 'ok' ? 'Sync Link Copied' : 'Copy Sync Link'}</span>
                  </button>
                  <button type="button" className="subtle-pill-btn" onClick={handlePullCloudNow}>
                    <RefreshCw size={13} aria-hidden="true" /> Refresh Cloud
                  </button>
                </div>

                {copiedSyncLink === 'blocked' && syncShareUrl && (
                  <div className="share-fallback-box">
                    <label htmlFor="sync-share-fallback-input" className="share-fallback-label">
                      Clipboard blocked — select and copy your sync link below:
                    </label>
                    <input
                      id="sync-share-fallback-input"
                      type="text"
                      readOnly
                      className="deck-input no-icon mono"
                      value={syncShareUrl}
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                )}

                <div role="status" aria-live="polite">
                  {copiedSyncLink === 'ok' ? (
                    <div className="inline-status-note ok">Sync link copied to clipboard.</div>
                  ) : copiedSyncLink === 'blocked' ? (
                    <div className="inline-status-note err">
                      Clipboard blocked — select and copy your sync link above.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="pass-value-bento">
                <div className="pass-feature-grid">
                  <div className="pass-feature-item">
                    <QrCode size={14} color="var(--ocean)" aria-hidden="true" />
                    <span>Phone ↔ PC QR Sync</span>
                  </div>
                  <div className="pass-feature-item">
                    <Clock size={14} color="var(--teal-dark)" aria-hidden="true" />
                    <span>90m &amp; 120m Weeknight Routes</span>
                  </div>
                  <div className="pass-feature-item">
                    <Sparkles size={14} color="var(--gold)" aria-hidden="true" />
                    <span>Acts II–III Missables Shield</span>
                  </div>
                  <div className="pass-feature-item">
                    <Check size={14} color="var(--game-accent)" aria-hidden="true" />
                    <span>Unlimited Pins &amp; No Sponsor Bar</span>
                  </div>
                </div>

                <div className="sync-actions-row">
                  <a
                    href={passCheckoutHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="primary-coral-btn full-width-btn"
                  >
                    <span>Unlock Sync Pass · ${runtimeConfig.passPriceUsd} One-Time</span>
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                </div>
                <p className="sync-legal-fineprint">
                  18+ (or parental/guardian consent). Merchant of Record: Whop (applicable VAT/sales tax shown before payment; statement reads <strong>WHOP*PLAYUNPAUSE</strong>). Instant digital delivery; GTA VI modules remain pre-launch previews until Nov 19, 2026. Includes 14-day hassle-free refunds.
                </p>
                <div className="sync-legal-links-row">
                  <button
                    type="button"
                    className="inline-legal-link-btn"
                    onClick={() => {
                      setShowProModal(false);
                      setLegalSection('terms');
                    }}
                  >
                    Terms
                  </button>
                  <button
                    type="button"
                    className="inline-legal-link-btn"
                    onClick={() => {
                      setShowProModal(false);
                      setLegalSection('privacy');
                    }}
                  >
                    Privacy
                  </button>
                  <button
                    type="button"
                    className="inline-legal-link-btn"
                    onClick={() => {
                      setShowProModal(false);
                      setLegalSection('refunds');
                    }}
                  >
                    Refund Policy
                  </button>
                  <a
                    href={`mailto:${runtimeConfig.supportEmail}`}
                    className="legal-contact-link"
                  >
                    {runtimeConfig.supportEmail}
                  </a>
                </div>
              </div>
            )}

            <form onSubmit={handleActivatePass}>
              <label htmlFor="claim-code-input" className="section-label">
                Already purchased? Restore via Sync Code, Whop ID, or Email + Receipt
              </label>
              <div className="sync-restore-row">
                <input
                  id="claim-code-input"
                  type="text"
                  className="deck-input no-icon mono"
                  placeholder="UP-XXXXXXXX, mem_..., or buyer@email.com"
                  value={claimInput}
                  onChange={(e) => setClaimInput(e.target.value)}
                />
                <button type="submit" className="secondary-key-btn" disabled={isActivating}>
                  {isActivating ? 'Checking…' : 'Restore'}
                </button>
              </div>
              {claimInput.includes('@') && (
                <div>
                  <label htmlFor="claim-receipt-input" className="section-label">
                    Whop Receipt ID (required with email for account security)
                  </label>
                  <div className="sync-restore-row">
                    <input
                      id="claim-receipt-input"
                      type="text"
                      className="deck-input no-icon mono"
                      placeholder="mem_... or pay_..."
                      value={claimReceiptInput}
                      onChange={(e) => setClaimReceiptInput(e.target.value)}
                    />
                  </div>
                </div>
              )}
              {claimError && (
                <div className="inline-status-note err" role="alert">
                  {claimError}
                </div>
              )}
              <div role="status" aria-live="polite">
                {claimStatus && (
                  <div className="inline-status-note ok">
                    {claimStatus}
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: 24H HEADER SPONSOR SLOT */}
      {showSponsorModal && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sponsor-modal-title"
          onClick={() => setShowSponsorModal(false)}
        >
          <div
            ref={sponsorModalRef}
            className="modal-card"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="selector-modal-header">
              <div>
                <h2 id="sponsor-modal-title" className="selector-modal-title">
                  Book 24h Header Sponsor Slot (${runtimeConfig.sponsorPriceUsd}/day)
                </h2>
                <p className="selector-modal-sub">
                  Single clean text-pill above free calculator views across GTA VI, CoD: MW4, Minecraft &amp; EA Sports FC 27. Zero pop-ups or malware banners.
                </p>
              </div>
              <button
                type="button"
                className="tactile-icon-btn"
                aria-label="Close sponsor modal"
                onClick={() => setShowSponsorModal(false)}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="mg-subcard">
              <p className="sync-sub-copy">
                Reserve a clean 24-hour hardware, peripheral, or creator header pill labeled{' '}
                <strong>Sponsored:</strong>. Strictly HTTPS-verified destinations only. Questions?
                Email <strong>{runtimeConfig.sponsorEmail}</strong>.
              </p>
              <p className="sync-bearer-note">
                <strong>Pre-Checkout Ad Rules:</strong> 18+ / business buyers only; no gambling, real-money
                trading (RMT), malware, NSFW, deceptive urgency, or Punycode domains. Subject to
                moderation review before publishing; tax calculated by Whop. See{' '}
                <button
                  type="button"
                  className="inline-legal-link-btn"
                  onClick={() => {
                    setShowSponsorModal(false);
                    setLegalSection('refunds');
                  }}
                >
                  Refund &amp; Ad Disclosure Policy
                </button>
                .
              </p>
            </div>

            <a
              href={sponsorCheckoutHref}
              target="_blank"
              rel="noopener noreferrer"
              className="primary-coral-btn full-width-btn"
            >
              <span>Reserve 24h Slot via Whop · ${runtimeConfig.sponsorPriceUsd}</span>
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          </div>
        </div>
      )}

      {/* MODAL 4: COMPLIANCE & LEGAL */}
      {Boolean(legalSection) && (
        <ChunkErrorBoundary
          isModal
          resetKey={`modal-legal-${legalSection}`}
          onRecover={() => setLegalSection(null)}
          recoverLabel="Close"
        >
          <Suspense fallback={null}>
            <LegalComplianceModal
              isOpen={Boolean(legalSection)}
              activeSection={legalSection || 'terms'}
              onSelectSection={setLegalSection}
              onClose={() => setLegalSection(null)}
              modalRef={legalModalRef}
              runtimeConfig={runtimeConfig}
              soundEnabled={deckState.soundEnabled}
            />
          </Suspense>
        </ChunkErrorBoundary>
      )}

      {/* MODAL 5: EMBED CALCULATOR WIDGET */}
      {showEmbedModal && (
        <ChunkErrorBoundary
          isModal
          resetKey={`modal-embed-${currentEmbedPath}`}
          onRecover={() => setShowEmbedModal(false)}
          recoverLabel="Close"
        >
          <Suspense fallback={null}>
            <EmbedWidgetModal
              isOpen={showEmbedModal}
              onClose={() => setShowEmbedModal(false)}
              initialEmbedPath={currentEmbedPath}
              soundEnabled={deckState.soundEnabled}
            />
          </Suspense>
        </ChunkErrorBoundary>
      )}
    </div>
  );
}
