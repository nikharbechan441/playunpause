import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import {
  HardDrive,
  KeyRound,
  DollarSign,
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
  ExternalLink,
  RefreshCw,
  Code2,
  Download,
  Upload,
  FileSpreadsheet,
  Bookmark,
  Wrench,
  Radio,
} from 'lucide-react';
import {
  MAX_FREE_PINS_PER_GAME,
  MAX_FREE_PROFILES,
  MAX_SYNC_PINS_TOTAL,
  MAX_SYNC_PROFILES,
  buildDeckSpreadsheetCsv,
  createEmptySyncState,
  mergeSyncStates,
  sanitizeCrewPresets,
  sanitizeSavedPins,
  sanitizeStorageProfiles,
  sanitizeStringIdArray,
  sanitizeSyncState,
  stripDangerousKeys,
} from './utils/syncState.js';
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
import GameWorldHero, { GameWorldTopStrip } from './components/games/GameWorldHero.jsx';
import StorageUnlockDeck from './components/StorageUnlockDeck.jsx';
import MultiGameToolDeck from './components/MultiGameToolDeck.jsx';
import Gta6SpoilerShieldBar from './components/gta6/Gta6SpoilerShieldBar.jsx';
import { isChunkLoadError, tryAutoReloadForStaleChunk } from './utils/chunkRecovery.js';

const loadGta6CheatDeck = () => import('./components/gta6/Gta6CheatDeck.jsx');
const loadGta6MoneyRobberyDeck = () => import('./components/gta6/Gta6MoneyRobberyDeck.jsx');
const loadGta6SettingsTunerDeck = () => import('./components/gta6/Gta6SettingsTunerDeck.jsx');
const loadGta6PlatinumUltimateDeck = () => import('./components/gta6/Gta6PlatinumUltimateDeck.jsx');
const loadGta6FixesDeck = () => import('./components/gta6/Gta6FixesDeck.jsx');
const loadGta6RadioDeck = () => import('./components/gta6/Gta6RadioDeck.jsx');
const loadGameSelectorModal = () => import('./components/GameSelectorModal.jsx');
const loadLegalComplianceModal = () => import('./components/LegalComplianceModal.jsx');
const loadEmbedWidgetModal = () => import('./components/EmbedWidgetModal.jsx');

const Gta6CheatDeck = lazy(loadGta6CheatDeck);
const Gta6MoneyRobberyDeck = lazy(loadGta6MoneyRobberyDeck);
const Gta6SettingsTunerDeck = lazy(loadGta6SettingsTunerDeck);
const Gta6PlatinumUltimateDeck = lazy(loadGta6PlatinumUltimateDeck);
const Gta6FixesDeck = lazy(loadGta6FixesDeck);
const Gta6RadioDeck = lazy(loadGta6RadioDeck);
const GameSelectorModal = lazy(loadGameSelectorModal);
const LegalComplianceModal = lazy(loadLegalComplianceModal);
const EmbedWidgetModal = lazy(loadEmbedWidgetModal);

const STORAGE_KEY = 'unpause_deck_state_v5';
const SPOILER_STORAGE_KEY = 'unpause_gta6_spoiler_ch_v1';
const LEGACY_KEYS = [
  'unpause_deck_state_v4',
  'unpause_deck_state_v3',
  'unpause_deck_state_v2',
  'unpause_deck_state_v1',
];

const GTA_MODES = [
  { id: 'storage', label: 'SSD & Patch 1.002.001', mobileLabel: 'SSD', icon: HardDrive },
  { id: 'cheats', label: 'Cheats (61)', mobileLabel: 'Cheats', icon: KeyRound },
  { id: 'money', label: 'Money & Robberies', mobileLabel: 'Money', icon: DollarSign },
  { id: 'settings', label: '30fps Tuner & PNG', mobileLabel: '30fps', icon: Clock },
  { id: 'platinum', label: 'Platinum & Ult', mobileLabel: 'Plat', icon: Sparkles },
  { id: 'fixes', label: 'Crash & PSN Fixes', mobileLabel: 'Fixes', icon: Wrench },
  { id: 'radio', label: '6 Radio Stations', mobileLabel: 'Radio', icon: Radio },
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
  passPriceUsd: 0,
  sponsorPriceUsd: 149,
  demoUnlockEnabled: false,
  passCheckoutUrl: '',
  sponsorCheckoutUrl: '',
  supportEmail: 'hello@playunpause.com',
  sponsorEmail: 'sponsors@playunpause.com',
  legalOperatorName: '',
  legalServiceAddress: '',
  legalContactPhone: '',
  affiliates: {
    ps5SsdUrl: 'https://www.amazon.com/dp/B0C47ZX1WB?tag=playunpause-20',
    xboxCardUrl: 'https://www.amazon.com/dp/B0C44XVWCH?tag=playunpause-20',
    topupsUrl: 'https://www.amazon.com/dp/B00SW85KD4?tag=playunpause-20',
    fpsMouseUrl: 'https://www.amazon.com/dp/B09NBWL8J5?tag=playunpause-20',
    heKeyboardUrl: 'https://www.amazon.com/dp/B0CG7BWG7J?tag=playunpause-20',
    proControllerUrl: 'https://www.amazon.com/dp/B0BSYFB99D?tag=playunpause-20',
    monitor240Url: 'https://www.amazon.com/dp/B0CZWM44QP?tag=playunpause-20',
  },
  activeSponsor: null,
};

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

  componentDidCatch(error) {
    if (isChunkLoadError(error)) {
      tryAutoReloadForStaleChunk();
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, errorMessage: '' });
    }
  }

  render() {
    if (this.state.hasError) {
      const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
      const isStaleDeploy = !isOffline && isChunkLoadError({ message: this.state.errorMessage });
      const card = (
        <section
          className={this.props.isModal ? 'modal-card chunk-error-card' : 'deck-panel chunk-error-card'}
          role="alert"
          onClick={this.props.isModal ? (e) => e.stopPropagation() : undefined}
        >
          <div className={this.props.isModal ? '' : 'deck-body-pad'}>
            <h2 className="legal-heading">
              {isStaleDeploy
                ? 'New version live \u2014 reload to continue'
                : 'Calculator module unavailable offline'}
            </h2>
            <p className="legal-copy compact-bottom">
              {isStaleDeploy ? (
                'PlayUnpause shipped an update while this tab was open. Reload once to grab the latest calculator.'
              ) : (
                <>
                  This tool chunk has not been cached in your browser yet ({this.state.errorMessage}).
                  Reconnect to the network and retry, or return to the active calculator.
                </>
              )}
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
                {isStaleDeploy ? 'Reload Calculator' : 'Reload Module'}
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
  clanTag: '',
  ...createEmptySyncState(),
};

function sanitizeDeckCode(val) {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim().toUpperCase();
  return /^UP-[A-Z0-9]{6,12}$/.test(trimmed) ? trimmed : null;
}

function sanitizeClanTag(val) {
  if (typeof val !== 'string') return '';
  return val.replace(/[^a-zA-Z0-9 _\-.]/g, '').trim().slice(0, 16);
}

function sanitizeDeckState(raw, baseFallback = DEFAULT_DECK_STATE, { legacyMode = false } = {}) {
  const safeBase = {
    theme: baseFallback.theme === 'paper' ? 'paper' : 'obsidian',
    soundEnabled: typeof baseFallback.soundEnabled === 'boolean' ? baseFallback.soundEnabled : true,
    isPro: baseFallback.isPro === true && Boolean(sanitizeDeckCode(baseFallback.deckCode)),
    deckCode: sanitizeDeckCode(baseFallback.deckCode),
    clanTag: sanitizeClanTag(baseFallback.clanTag),
    crackedSafeIds: sanitizeStringIdArray(baseFallback.crackedSafeIds),
    checkedRouteIds: sanitizeStringIdArray(baseFallback.checkedRouteIds),
    savedPins: sanitizeSavedPins(baseFallback.savedPins),
    storageProfiles: sanitizeStorageProfiles(baseFallback.storageProfiles),
    crewPresets: sanitizeCrewPresets(baseFallback.crewPresets),
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
    clanTag: typeof raw.clanTag === 'string' ? sanitizeClanTag(raw.clanTag) : safeBase.clanTag,
    crackedSafeIds: rawSafes !== null ? sanitizeStringIdArray(rawSafes) : safeBase.crackedSafeIds,
    checkedRouteIds: Array.isArray(raw.checkedRouteIds)
      ? sanitizeStringIdArray(raw.checkedRouteIds)
      : safeBase.checkedRouteIds,
    savedPins: Array.isArray(raw.savedPins) ? sanitizeSavedPins(raw.savedPins) : safeBase.savedPins,
    storageProfiles: Array.isArray(raw.storageProfiles)
      ? sanitizeStorageProfiles(raw.storageProfiles)
      : safeBase.storageProfiles,
    crewPresets: Array.isArray(raw.crewPresets)
      ? sanitizeCrewPresets(raw.crewPresets)
      : safeBase.crewPresets,
  };
}

function maskSyncCode(code) {
  const clean = sanitizeDeckCode(code);
  if (!clean) return 'UP-••••••••';
  return `UP-••••${clean.slice(-4)}`;
}

function generateLocalSyncCodeFallback() {
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let out = 'UP-';
  const bytes = new Uint8Array(8);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  for (let i = 0; i < 8; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function parseStoredDeckObject(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  try {
    const parsed = JSON.parse(rawText);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return stripDangerousKeys(parsed);
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
      obsMode: false,
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
  const hash = (window.location.hash || '').trim();
  const syncMatch = hash.match(/^#sync=(UP-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8,12})$/i);
  if (syncMatch) {
    syncCode = sanitizeDeckCode(syncMatch[1]);
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
  const isEmbedReq = Boolean(seoRes.isEmbed);
  const obsMode = Boolean(isEmbedReq && effectiveParams.get('mode') === 'obs');

  return {
    route,
    isEmbed: isEmbedReq,
    obsMode,
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
  const [syncNudgeDismissed, setSyncNudgeDismissed] = useState(false);
  const [backupNotice, setBackupNotice] = useState(null);
  const [revealSyncSecret, setRevealSyncSecret] = useState(false);
  const [isCreatingSync, setIsCreatingSync] = useState(false);
  const [spoilerChapter, setSpoilerChapter] = useState(() => {
    if (typeof window === 'undefined') return 1;
    try {
      const saved = Number(window.localStorage.getItem(SPOILER_STORAGE_KEY));
      return saved >= 1 && saved <= 6 ? Math.round(saved) : 1;
    } catch {
      return 1;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(SPOILER_STORAGE_KEY, String(spoilerChapter));
    } catch {
      // Ignore storage errors
    }
  }, [spoilerChapter]);

  const gameModalRef = useRef(null);
  const proModalRef = useRef(null);
  const sponsorModalRef = useRef(null);
  const legalModalRef = useRef(null);
  const syncTimerRef = useRef(null);
  const uiTimerRef = useRef(null);
  const skipNextPersistRef = useRef(false);
  const lastToolPathRef = useRef('/');
  const backupInputRef = useRef(null);
  const lastSyncedPayloadRef = useRef('');

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

  const isObsOverlayActive = Boolean(isEmbed && routeState.obsMode);

  const isPreLaunch = nowMs < Date.parse(GAME_PACKS[0].nzUnlockIsoUtc || '2026-11-18T11:00:00Z');
  const daysUntilLaunch = useMemo(() => {
    const nowDate = new Date(nowMs);
    const utcMidnightToday = Date.UTC(
      nowDate.getUTCFullYear(),
      nowDate.getUTCMonth(),
      nowDate.getUTCDate()
    );
    const launchMidnightUtc = Date.UTC(2026, 10, 19);
    return Math.max(0, Math.round((launchMidnightUtc - utcMidnightToday) / 86400000));
  }, [nowMs]);
  const headerNzClock = useMemo(
    () => formatCountdownMs(Date.parse(GAME_PACKS[0].nzUnlockIsoUtc) - nowMs),
    [nowMs]
  );

  // Sync theme, active game world attribute, OBS mode flag, and browser address-bar color cleanly
  useEffect(() => {
    const theme = deckState.theme === 'paper' ? 'paper' : 'obsidian';
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-game', activeGamePack.id);
    if (isObsOverlayActive) {
      document.documentElement.setAttribute('data-obs-mode', 'true');
    } else {
      document.documentElement.removeAttribute('data-obs-mode');
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute(
        'content',
        theme === 'paper'
          ? activeGamePack.canvasHexPaper || '#F4F3EF'
          : activeGamePack.canvasHexObsidian || '#0B0E14'
      );
    }
  }, [
    deckState.theme,
    activeGamePack.id,
    activeGamePack.canvasHexPaper,
    activeGamePack.canvasHexObsidian,
    isObsOverlayActive,
  ]);

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
        loadGta6CheatDeck(),
        loadGta6MoneyRobberyDeck(),
        loadGta6SettingsTunerDeck(),
        loadGta6PlatinumUltimateDeck(),
        loadGta6FixesDeck(),
        loadGta6RadioDeck(),
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

  // Tick minute countdown clock cleanly on mount
  useEffect(() => {
    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Load runtime checkout/sponsor telemetry config from Worker/API (skip on embeds)
  useEffect(() => {
    if (isEmbed) return undefined;
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
              fpsMouseUrl: sanitizeHttpsUrl(cfg.affiliates?.fpsMouseUrl, prev.affiliates.fpsMouseUrl),
              heKeyboardUrl: sanitizeHttpsUrl(cfg.affiliates?.heKeyboardUrl, prev.affiliates.heKeyboardUrl),
              proControllerUrl: sanitizeHttpsUrl(
                cfg.affiliates?.proControllerUrl,
                prev.affiliates.proControllerUrl
              ),
              monitor240Url: sanitizeHttpsUrl(cfg.affiliates?.monitor240Url, prev.affiliates.monitor240Url),
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
  }, [isEmbed]);

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
        const cleanRemote = sanitizeSyncState(data.state);
        lastSyncedPayloadRef.current = JSON.stringify(cleanRemote);
        setDeckState((prev) => ({
          ...prev,
          isPro: true,
          deckCode: nextCode,
          ...mergeSyncStates(prev, cleanRemote),
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

  // Debounced cloud state push when a sync code is linked (skips unchanged payloads)
  useEffect(() => {
    if (!deckState.deckCode) return undefined;
    const payloadObj = sanitizeSyncState({
      crackedSafeIds: deckState.crackedSafeIds,
      checkedRouteIds: deckState.checkedRouteIds,
      savedPins: deckState.savedPins,
      storageProfiles: deckState.storageProfiles,
      crewPresets: deckState.crewPresets,
    });
    const serialized = JSON.stringify(payloadObj);
    if (serialized === lastSyncedPayloadRef.current) return undefined;

    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      fetch(`/api/sync/${encodeURIComponent(deckState.deckCode)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: payloadObj }),
      })
        .then((res) => {
          if (res.ok) {
            lastSyncedPayloadRef.current = serialized;
          } else if (res.status === 403) {
            setDeckState((prev) => ({ ...prev, isPro: false, deckCode: null }));
            setClaimError('Sync Pass inactive or refunded.');
          }
        })
        .catch(() => {});
    }, 1000);
    return () => clearTimeout(syncTimerRef.current);
  }, [
    deckState.isPro,
    deckState.deckCode,
    deckState.crackedSafeIds,
    deckState.checkedRouteIds,
    deckState.savedPins,
    deckState.storageProfiles,
    deckState.crewPresets,
  ]);

  // Keyboard shortcuts: Ctrl/Cmd + K opens Game/Tool Switcher cleanly from anywhere, Escape closes active modal
  useEffect(() => {
    const onKeyDown = (e) => {
      if (isEmbed) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowProModal(false);
        setShowSponsorModal(false);
        setShowEmbedModal(false);
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
  }, [isEmbed, legalSection]);

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

  const handleSaveStorageProfile = (profileObj) => {
    setDeckState((prev) => {
      const existing = Array.isArray(prev.storageProfiles) ? prev.storageProfiles : [];
      const filtered = existing.filter((p) => p && p.id !== profileObj?.id);
      return {
        ...prev,
        storageProfiles: sanitizeStorageProfiles([profileObj, ...filtered], MAX_SYNC_PROFILES),
      };
    });
  };

  const handleDeleteStorageProfile = (profileId) => {
    setDeckState((prev) => ({
      ...prev,
      storageProfiles: Array.isArray(prev.storageProfiles)
        ? prev.storageProfiles.filter((p) => p && p.id !== profileId)
        : [],
    }));
  };

  const handleSaveCrewPreset = (presetObj) => {
    setDeckState((prev) => {
      const existing = Array.isArray(prev.crewPresets) ? prev.crewPresets : [];
      const filtered = existing.filter((p) => p && p.id !== presetObj?.id);
      return {
        ...prev,
        crewPresets: sanitizeCrewPresets([presetObj, ...filtered], MAX_SYNC_PROFILES),
      };
    });
  };

  const handleDeleteCrewPreset = (presetId) => {
    setDeckState((prev) => ({
      ...prev,
      crewPresets: Array.isArray(prev.crewPresets)
        ? prev.crewPresets.filter((p) => p && p.id !== presetId)
        : [],
    }));
  };

  const triggerDownloadBlob = (filename, content, mimeType) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExportJson = () => {
    playSwitchTick(deckState.soundEnabled, 780);
    const snapshot = sanitizeSyncState(deckState);
    const exportPayload = {
      app: 'Unpause',
      version: 2,
      exportedAt: new Date().toISOString(),
      ...snapshot,
    };
    triggerDownloadBlob(
      `unpause-deck-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(exportPayload, null, 2),
      'application/json;charset=utf-8'
    );
    setBackupNotice({ tone: 'ok', text: 'JSON backup downloaded (zero tracking, 100% portable).' });
  };

  const handleExportCsv = () => {
    playSwitchTick(deckState.soundEnabled, 820);
    const csv = buildDeckSpreadsheetCsv(deckState);
    triggerDownloadBlob(
      `unpause-deck-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
      'text/csv;charset=utf-8'
    );
    setBackupNotice({ tone: 'ok', text: 'Formula-safe CSV exported for Excel & Google Sheets.' });
  };

  const handleImportBackupFile = async (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    if (file.size > 512 * 1024) {
      setBackupNotice({ tone: 'err', text: 'Backup file exceeds 512 KB safety cap.' });
      return;
    }
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setBackupNotice({ tone: 'err', text: 'Unrecognized JSON backup structure.' });
        return;
      }
      const cleanParsed = stripDangerousKeys(parsed);
      const sanitizedImport = sanitizeSyncState(cleanParsed);
      if (!sanitizedImport) {
        setBackupNotice({ tone: 'err', text: 'Unrecognized JSON backup structure.' });
        return;
      }
      playUnlockChime(deckState.soundEnabled);
      setDeckState((prev) => {
        const merged = mergeSyncStates(prev, sanitizedImport);
        return { ...prev, ...merged };
      });
      setBackupNotice({
        tone: 'ok',
        text: 'Backup merged into this device (consoles, checklists, timers & game pins).',
      });
    } catch {
      setBackupNotice({ tone: 'err', text: 'Could not parse JSON backup file.' });
    }
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
        const cleanRemote = sanitizeSyncState(data.state);
        lastSyncedPayloadRef.current = JSON.stringify(cleanRemote);
        setDeckState((prev) => ({
          ...prev,
          isPro: true,
          deckCode: nextCode,
          ...mergeSyncStates(prev, cleanRemote),
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
        const cleanRemote = sanitizeSyncState(data.state);
        lastSyncedPayloadRef.current = JSON.stringify(cleanRemote);
        setDeckState((prev) => ({
          ...prev,
          ...cleanRemote,
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
    lastSyncedPayloadRef.current = '';
    setDeckState({
      theme: deckState.theme,
      soundEnabled: deckState.soundEnabled,
      isPro: false,
      deckCode: null,
      clanTag: '',
      ...createEmptySyncState(),
    });
    setClaimInput('');
    setClaimReceiptInput('');
    setClaimError('');
    setClaimStatus('');
    setSyncToast(null);
    setBackupNotice(null);
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

  const syncInventory = useMemo(() => {
    const safesCount = Array.isArray(deckState.crackedSafeIds) ? deckState.crackedSafeIds.length : 0;
    const routesCount = Array.isArray(deckState.checkedRouteIds) ? deckState.checkedRouteIds.length : 0;
    const pinsCount = Array.isArray(deckState.savedPins) ? deckState.savedPins.length : 0;
    const consolesCount = Array.isArray(deckState.storageProfiles)
      ? deckState.storageProfiles.length
      : 0;
    const rostersCount = Array.isArray(deckState.crewPresets) ? deckState.crewPresets.length : 0;
    return {
      safesCount,
      routesCount,
      pinsCount,
      consolesCount,
      rostersCount,
      totalSavedCount: safesCount + routesCount + pinsCount + consolesCount + rostersCount,
    };
  }, [
    deckState.crackedSafeIds,
    deckState.checkedRouteIds,
    deckState.savedPins,
    deckState.storageProfiles,
    deckState.crewPresets,
  ]);

  const handleCreateFreeSyncCode = async () => {
    setClaimError('');
    setClaimStatus('');
    setIsCreatingSync(true);
    try {
      const payloadObj = sanitizeSyncState(deckState);
      const resp = await fetch('/api/sync/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: payloadObj }),
      });
      const data = await resp.json().catch(() => ({}));
      const serverCode = sanitizeDeckCode(data?.deckCode);
      if (resp.ok && data?.ok && serverCode) {
        playUnlockChime(deckState.soundEnabled);
        lastSyncedPayloadRef.current = JSON.stringify(payloadObj);
        setDeckState((prev) => ({
          ...prev,
          isPro: true,
          deckCode: serverCode,
        }));
        setRevealSyncSecret(false);
        setClaimStatus(`Free QR sync key ready (${maskSyncCode(serverCode)})`);
        return;
      }
      setClaimError(data?.error || 'Cloud sync endpoint unavailable right now.');
    } catch {
      const fallbackCode = generateLocalSyncCodeFallback();
      setDeckState((prev) => ({
        ...prev,
        isPro: true,
        deckCode: fallbackCode,
      }));
      setRevealSyncSecret(false);
      setClaimStatus(`Generated local QR sync preview (${maskSyncCode(fallbackCode)})`);
    } finally {
      setIsCreatingSync(false);
    }
  };

  useEffect(() => {
    if (!showProModal) {
      setRevealSyncSecret(false);
    }
  }, [showProModal]);

  useEffect(() => {
    let cancelled = false;
    if (!showProModal || !syncShareUrl) {
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
  }, [showProModal, syncShareUrl]);

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

  const faqCards = useMemo(() => {
    const routeFaqs =
      Array.isArray(activeRoute?.faqs) && activeRoute.faqs.length > 0
        ? activeRoute.faqs
        : activeGamePack.faqs || [];
    return [...routeFaqs];
  }, [activeRoute?.faqs, activeGamePack.faqs]);

  const currentEmbedPath = useMemo(() => {
    if (activeGameId === 'gta-6') {
      const map = {
        storage: '/embed/gta-6/storage',
        cheats: '/embed/gta-6/cheats',
        money: '/embed/gta-6/money',
        settings: '/embed/gta-6/settings',
        platinum: '/embed/gta-6/platinum',
        fixes: '/embed/gta-6/fixes',
        radio: '/embed/gta-6/radio',
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

  const sameGamePresetLinks = useMemo(
    () => relatedLinks.filter((r) => r.gameId === activeGameId),
    [relatedLinks, activeGameId]
  );

  const directoryGroups = useMemo(() => getGroupedDirectoryLinks(), []);
  const activeGameGroups = useMemo(
    () =>
      directoryGroups.filter((group) =>
        group.links.some((link) => link.gameId === activeGameId)
      ),
    [directoryGroups, activeGameId]
  );
  const otherGameGroups = useMemo(
    () =>
      directoryGroups.filter(
        (group) => !group.links.some((link) => link.gameId === activeGameId)
      ),
    [directoryGroups, activeGameId]
  );
  const isDedicatedGamePage = !isNotFound && activeRoute?.path !== '/' && !legalSection;
  const activeHubPath = GAME_TO_CANONICAL_PATH[activeGamePack.id] || '/';

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
    const embedBackUrl = `${CANONICAL_ORIGIN}${activeRoute?.parentCanonicalPath || '/'}`;
    return (
      <div
        data-game={activeGamePack.id}
        className={`embed-root-wrap game-theme-shell ${isObsOverlayActive ? 'obs-overlay-mode' : ''}`}
      >
        <main className="app-shell embed-app-shell">
          <ChunkErrorBoundary resetKey={`embed:${activeGamePack.id}:${activeTab}`}>
            <Suspense fallback={<div className="deck-panel gs-studio-skeleton" aria-busy="true" />}>
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
                {activeTab === 'cheats' && (
                  <Gta6CheatDeck
                    soundEnabled={deckState.soundEnabled}
                    spoilerChapter={spoilerChapter}
                    initialPreset={routeState.preset}
                    presetKey={routeState.presetKey}
                  />
                )}
                {activeTab === 'money' && (
                  <Gta6MoneyRobberyDeck
                    soundEnabled={deckState.soundEnabled}
                    spoilerChapter={spoilerChapter}
                    initialPreset={routeState.preset}
                    presetKey={routeState.presetKey}
                  />
                )}
                {activeTab === 'settings' && (
                  <Gta6SettingsTunerDeck
                    soundEnabled={deckState.soundEnabled}
                    runtimeConfig={runtimeConfig}
                  />
                )}
                {activeTab === 'platinum' && (
                  <Gta6PlatinumUltimateDeck
                    soundEnabled={deckState.soundEnabled}
                    spoilerChapter={spoilerChapter}
                    initialPreset={routeState.preset}
                    presetKey={routeState.presetKey}
                  />
                )}
                {activeTab === 'fixes' && (
                  <Gta6FixesDeck
                    soundEnabled={deckState.soundEnabled}
                    initialPreset={routeState.preset}
                    presetKey={routeState.presetKey}
                    onSelectTab={handleSelectTab}
                  />
                )}
                {activeTab === 'radio' && (
                  <Gta6RadioDeck soundEnabled={deckState.soundEnabled} />
                )}
              </div>
            ) : (
              <div className="deck-stage-transition" key={`embed-mg-${activeGamePack.id}`}>
                <MultiGameToolDeck
                  game={activeGamePack}
                  isPro={deckState.isPro}
                  isEmbed
                  onOpenProModal={handleOpenProTarget}
                  runtimeConfig={runtimeConfig}
                  clanTag={deckState.isPro ? deckState.clanTag : ''}
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

          {!isObsOverlayActive && (
            <footer className="embed-attribution-bar embed-backlink-bar">
              <div className="embed-attribution-copy">
                <span>Powered by</span>
                <a href={embedBackUrl} target="_blank" rel="noopener">
                  Unpause ({activeRoute?.shortLabel || 'playunpause.com'}) ↗
                </a>
              </div>
              <div className="embed-attribution-actions">
                <a
                  href={embedBackUrl}
                  target="_blank"
                  rel="noopener"
                  className="subtle-pill-btn embed-open-tool-link"
                >
                  <span>Open Full Tool ↗</span>
                </a>
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
              </div>
            </footer>
          )}
        </main>
      </div>
    );
  }

  const showMobileBottomRail =
    !isNotFound && !isEmbed && !legalSection && activeGamePack.isGta6Suite;

  return (
    <div data-game={activeGamePack.id} className="game-theme-shell">
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
            {activeGamePack.isGta6Suite ? (
              <div
                className="nz-hud-pill"
                title="Grand Theft Auto VI is OUT NOW (Nov 19, 2026) · Patch 1.002.001 Live"
              >
                <span className="nz-live-dot" aria-hidden="true" />
                <span className="nz-full-text">GTA VI · OUT NOW</span>
                <span className="nz-compact-text" aria-hidden="true">
                  OUT NOW
                </span>
              </div>
            ) : (
              <div
                className="nz-hud-pill game-context-pill"
                title={`${activeGamePack.fullTitle} · ${activeGamePack.audienceBadge}`}
              >
                <span className="nz-live-dot game-context-dot" aria-hidden="true" />
                <span className="nz-full-text">
                  {activeGamePack.shortTitle} · {activeGamePack.audienceBadge}
                </span>
                <span className="nz-compact-text" aria-hidden="true">
                  {activeGamePack.shortTitle}
                </span>
              </div>
            )}

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
              className={`tactile-icon-btn pass-header-btn ${deckState.deckCode ? 'sync-pill-pro' : ''}`}
              onClick={() => {
                playSwitchTick(deckState.soundEnabled, 700);
                setShowProModal(true);
              }}
            >
              <QrCode size={14} aria-hidden="true" />
              <span className="pass-full-label">
                {deckState.deckCode ? 'Phone ↔ PC Synced' : 'Phone ↔ PC Sync'}
              </span>
              <span className="pass-short-label" aria-hidden="true">
                {deckState.deckCode ? 'Synced' : 'Sync'}
              </span>
            </button>
          </div>
        </div>

        {/* SLIM TOP-10 GAME DOCK ON ROOT HUB */}
        {!isDedicatedGamePage && (
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
        )}
      </header>

      {/* GAME-ISOLATED STUDIO SUBBAR (OUTSIDE STICKY HEADER SO MOBILE VIEWPORT STAYS FREE) */}
      {isDedicatedGamePage && (
        <nav className="quick-game-dock-wrap game-studio-subbar-wrap" aria-label={`${activeGamePack.shortTitle} Studio Navigation`}>
          <div className="game-studio-subbar">
            <div className="game-studio-subbar-left">
              <a
                href={activeHubPath}
                className="game-studio-active-badge"
                aria-current={activeRoute?.path === activeHubPath ? 'page' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  navigateToPath(activeHubPath, { scrollToTop: true });
                }}
              >
                <span className="quick-game-dot game-context-dot" aria-hidden="true" />
                <span>{activeGamePack.fullTitle}</span>
              </a>
              {sameGamePresetLinks.slice(0, 5).map((rel) => (
                <a
                  key={rel.path}
                  href={rel.path}
                  className={`quick-game-pill ${activeRoute?.path === rel.path ? 'active' : ''}`}
                  aria-current={activeRoute?.path === rel.path ? 'page' : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    navigateToPath(rel.path, { scrollToTop: true });
                  }}
                >
                  {rel.shortLabel}
                </a>
              ))}
            </div>
            <button
              type="button"
              className="subtle-pill-btn game-studio-all-btn"
              onClick={() => {
                playSwitchTick(deckState.soundEnabled, 660);
                setShowGameModal(true);
              }}
            >
              <Sparkles size={13} aria-hidden="true" />
              <span>All 10 Games · Ctrl+K</span>
            </button>
          </div>
        </nav>
      )}

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
        <section
          className="consumer-masthead gw-world-masthead"
          data-world-hero={activeGamePack.id}
          aria-label="Tool overview"
        >
          <GameWorldTopStrip gameId={activeGamePack.id} />
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
          <div className="consumer-masthead-top gw-masthead-split">
            <div className="consumer-masthead-copy">
              {activeGamePack.themePersonaLabel && (
                <span className="game-world-kicker">{activeGamePack.themePersonaLabel}</span>
              )}
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
                    ? 'GTA VI is OUT NOW. Check 212 GB SSD + Patch 1.002.001 headroom, 61 haptic cheats, story money/robberies, 30fps DF tuning & Platinum tracking — free.'
                    : `${activeGamePack.tagline} · Free, instant browser math with zero ads.`)}
              </p>
            </div>
            <GameWorldHero game={activeGamePack} theme={deckState.theme} />
          </div>
          {!isDedicatedGamePage && !activeRoute?.legal && activeRoute?.path !== '/' && sameGamePresetLinks.length > 0 && (
            <div className="seo-scenario-strip">
              <span className="seo-strip-label">
                {isSubpageScenario ? `More ${activeGamePack.shortTitle} presets:` : `Popular ${activeGamePack.shortTitle} presets:`}
              </span>
              <div className="seo-scenario-chips">
                {sameGamePresetLinks.map((rel) => (
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
          {(activeGamePack.sourceNote || activeGamePack.legalNotice) && (
            <div className="source-verified-bar">
              {activeGamePack.sourceNote && (
                <span className="source-verified-pill">
                  <Check size={14} color="var(--teal-dark)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{activeGamePack.sourceNote}</span>
                </span>
              )}
              <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                100% Free Core Tools · Runs Locally Once Loaded
              </span>
              {activeGamePack.legalNotice && (
                <span className="source-legal-note">{activeGamePack.legalNotice}</span>
              )}
            </div>
          )}
        </section>

        <ChunkErrorBoundary
          resetKey={`${activeGamePack.id}:${activeTab}`}
          onRecover={() => navigateToPath(activeHubPath)}
          recoverLabel={activeGamePack.isGta6Suite ? 'Back to SSD & Patch Calculator' : `Reload ${activeGamePack.shortTitle} Studio`}
        >
          <Suspense fallback={<div className="deck-panel gs-studio-skeleton" aria-busy="true" />}>
        {activeGamePack.isGta6Suite ? (
          <div>
            <Gta6SpoilerShieldBar
              spoilerChapter={spoilerChapter}
              onSelectChapter={setSpoilerChapter}
              soundEnabled={deckState.soundEnabled}
            />

            <div className="gta-workspace-nav" role="tablist" aria-label="GTA VI Launch Tools">
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
                  isPro={deckState.isPro}
                  storageProfiles={deckState.storageProfiles}
                  onSaveStorageProfile={handleSaveStorageProfile}
                  onDeleteStorageProfile={handleDeleteStorageProfile}
                  onOpenProModal={() => setShowProModal(true)}
                  initialPreset={routeState.preset}
                  presetKey={routeState.presetKey}
                />
              )}

              {activeTab === 'cheats' && (
                <Gta6CheatDeck
                  soundEnabled={deckState.soundEnabled}
                  spoilerChapter={spoilerChapter}
                  initialPreset={routeState.preset}
                  presetKey={routeState.presetKey}
                />
              )}

              {activeTab === 'money' && (
                <Gta6MoneyRobberyDeck
                  soundEnabled={deckState.soundEnabled}
                  spoilerChapter={spoilerChapter}
                  initialPreset={routeState.preset}
                  presetKey={routeState.presetKey}
                />
              )}

              {activeTab === 'settings' && (
                <Gta6SettingsTunerDeck
                  soundEnabled={deckState.soundEnabled}
                  runtimeConfig={runtimeConfig}
                />
              )}

              {activeTab === 'platinum' && (
                <Gta6PlatinumUltimateDeck
                  soundEnabled={deckState.soundEnabled}
                  spoilerChapter={spoilerChapter}
                  initialPreset={routeState.preset}
                  presetKey={routeState.presetKey}
                />
              )}

              {activeTab === 'fixes' && (
                <Gta6FixesDeck
                  soundEnabled={deckState.soundEnabled}
                  initialPreset={routeState.preset}
                  presetKey={routeState.presetKey}
                  onSelectTab={handleSelectTab}
                />
              )}

              {activeTab === 'radio' && (
                <Gta6RadioDeck soundEnabled={deckState.soundEnabled} />
              )}
            </div>
          </div>
        ) : (
          <div className="deck-stage-transition" key={`mg-${activeGamePack.id}`}>
            <MultiGameToolDeck
              game={activeGamePack}
              isPro={deckState.isPro}
              onOpenProModal={() => setShowProModal(true)}
              onOpenEmbedModal={() => setShowEmbedModal(true)}
              runtimeConfig={runtimeConfig}
              clanTag={deckState.isPro ? deckState.clanTag : ''}
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

        {/* SCOPED ACTIVE-GAME DIRECTORY + COLLAPSED "BROWSE OTHER 9 GAMES" DRAWER */}
        <section className="seo-directory-hub" aria-label="Unpause Calculator Directory">
          <div className="seo-directory-head">
            <div>
              <h2>
                {`${activeGamePack.shortTitle} Calculators & Launch Scenarios`}
              </h2>
              <p>
                {`Zero-ad ${activeGamePack.fullTitle} scenario presets and deep links — expand below to jump across all 10 games.`}
              </p>
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
            {activeGameGroups.map((group) => (
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

          {otherGameGroups.length > 0 && (
            <details className="cross-game-directory-drawer">
              <summary className="cross-game-directory-summary">
                <span>Browse Other 9 Games</span>
                <ChevronDown className="cross-game-drawer-icon" size={16} aria-hidden="true" />
              </summary>
              <div className="seo-directory-grid cross-game-directory-inner">
                {otherGameGroups.map((group) => (
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
            </details>
          )}
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
              onSelectPath={(path) => navigateToPath(path, { scrollToTop: true })}
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
                  {deckState.deckCode
                    ? `Phone ↔ PC QR Sync · ${maskSyncCode(deckState.deckCode)}`
                    : 'Phone ↔ PC Cloud Sync (100% Free)'}
                </h2>
                <p className="selector-modal-sub">
                  {activeGamePack.isGta6Suite
                    ? '100% Free — Phone ↔ PC QR sync for up to 16 console setups, 16 crew rosters, 120 cross-game pins, and extended GTA VI routes.'
                    : '100% Free — Phone ↔ PC QR sync for 120 cross-game pinned builds, multi-night session checklists, unbranded OBS embeds (?mode=obs), and Custom Clan Tag PNG cards.'}
                </p>
              </div>
              <button
                type="button"
                className="tactile-icon-btn"
                aria-label="Close Sync modal"
                onClick={() => setShowProModal(false)}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="pass-live-inventory" aria-label="On This Device Right Now">
              <div className="pass-inventory-head">
                <span className="section-label">On This Device Right Now</span>
                <span className="mono pass-inventory-total">
                  {syncInventory.totalSavedCount} saved{' '}
                  {syncInventory.totalSavedCount === 1 ? 'item' : 'items'}
                </span>
              </div>
              <div className="pass-inventory-pills">
                {activeGamePack.isGta6Suite ? (
                  <>
                    <span>
                      <HardDrive size={12} aria-hidden="true" />
                      {syncInventory.consolesCount} / {MAX_SYNC_PROFILES} Consoles (Free)
                    </span>
                    <span>
                      <Bookmark size={12} aria-hidden="true" />
                      {syncInventory.pinsCount} / {MAX_SYNC_PINS_TOTAL} Pins (Free)
                    </span>
                    <span>
                      <KeyRound size={12} aria-hidden="true" />
                      Free Phone ↔ PC QR Sync
                    </span>
                    <span>
                      <Clock size={12} aria-hidden="true" />
                      Spoiler Shield &amp; 15 Save Slots
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      <Bookmark size={12} aria-hidden="true" />
                      {syncInventory.pinsCount} / {MAX_SYNC_PINS_TOTAL} Pins (Free)
                    </span>
                    <span>
                      <Check size={12} aria-hidden="true" />
                      OBS Mode (?mode=obs) Free
                    </span>
                    <span>
                      <Sparkles size={12} aria-hidden="true" />
                      {deckState.clanTag
                        ? `Clan Tag: [${deckState.clanTag}]`
                        : 'Clan Tag PNGs Free'}
                    </span>
                  </>
                )}
              </div>
            </div>

            {deckState.deckCode ? (
              <div className="mg-subcard">
                {revealSyncSecret && qrMatrix ? (
                  <div className="sync-qr-frame">
                    <svg
                      width="148"
                      height="148"
                      viewBox={`-4 -4 ${qrMatrix.length + 8} ${qrMatrix.length + 8}`}
                      role="img"
                      aria-label={`QR sync code for ${maskSyncCode(deckState.deckCode)}`}
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
                ) : (
                  <div className="sync-qr-masked-box">
                    <QrCode size={28} color="var(--ocean)" aria-hidden="true" />
                    <span className="mono" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                      {maskSyncCode(deckState.deckCode)} (Masked for OBS / Stream Safety)
                    </span>
                    <button
                      type="button"
                      className="secondary-key-btn"
                      onClick={() => {
                        playSwitchTick(deckState.soundEnabled, 760);
                        setRevealSyncSecret(true);
                      }}
                    >
                      Click to Reveal QR Code &amp; Key
                    </button>
                  </div>
                )}

                {qrError && (
                  <div className="inline-status-note err" role="alert">
                    {qrError}
                  </div>
                )}

                <div
                  className="mono sync-code-readout"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setRevealSyncSecret((v) => !v)}
                  title="Click to toggle full sync key visibility"
                >
                  {revealSyncSecret ? deckState.deckCode : maskSyncCode(deckState.deckCode)}
                </div>
                <p className="sync-sub-copy">
                  Scan on your phone while playing on console or PC — encodes <code>https://playunpause.com/#sync={revealSyncSecret ? deckState.deckCode : maskSyncCode(deckState.deckCode)}</code>.
                </p>
                <p className="sync-bearer-note">
                  OBS &amp; stream notice: Raw key and QR remain hidden until clicked. Keep screenshots private, as anyone holding your sync link can edit synced checklists.
                </p>

                <div className="pro-clan-field">
                  <label htmlFor="pro-clan-tag-input" className="section-label">
                    Custom Clan / Creator PNG Badge (Free · Max 16 Chars)
                  </label>
                  <input
                    id="pro-clan-tag-input"
                    type="text"
                    maxLength={16}
                    className="deck-input no-icon mono"
                    placeholder="e.g. TEAM-ALPHA"
                    value={deckState.clanTag}
                    onChange={(e) =>
                      setDeckState((prev) => ({
                        ...prev,
                        clanTag: e.target.value.replace(/[^a-zA-Z0-9 _\-.]/g, '').slice(0, 16),
                      }))
                    }
                    onBlur={() =>
                      setDeckState((prev) => ({
                        ...prev,
                        clanTag: sanitizeClanTag(prev.clanTag),
                      }))
                    }
                  />
                </div>

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
                  {revealSyncSecret && (
                    <button
                      type="button"
                      className="subtle-pill-btn"
                      onClick={() => setRevealSyncSecret(false)}
                    >
                      Hide QR
                    </button>
                  )}
                </div>

                {copiedSyncLink === 'blocked' && syncShareUrl && (
                  <div className="share-fallback-box">
                    <label htmlFor="sync-share-fallback-input" className="share-fallback-label">
                      Clipboard blocked — reveal key above or copy sync link:
                    </label>
                    <input
                      id="sync-share-fallback-input"
                      type="text"
                      readOnly
                      className="deck-input no-icon mono"
                      value={revealSyncSecret ? syncShareUrl : maskSyncCode(deckState.deckCode)}
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                )}

                <div role="status" aria-live="polite">
                  {copiedSyncLink === 'ok' ? (
                    <div className="inline-status-note ok">Sync link copied to clipboard.</div>
                  ) : copiedSyncLink === 'blocked' ? (
                    <div className="inline-status-note err">
                      Clipboard blocked — reveal key and copy your sync link above.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="pass-value-bento">
                <div className="pass-feature-grid">
                  <div className="pass-feature-item">
                    <QrCode size={14} color="var(--ocean)" aria-hidden="true" />
                    <span>Phone ↔ PC Instant QR Sync</span>
                  </div>
                  <div className="pass-feature-item">
                    <HardDrive size={14} color="var(--teal-dark)" aria-hidden="true" />
                    <span>
                      {activeGamePack.isGta6Suite ? '16 Saved Console Setups' : 'Unlimited Saved Pins & Checklists'}
                    </span>
                  </div>
                  <div className="pass-feature-item">
                    <Bookmark size={14} color="var(--gold)" aria-hidden="true" />
                    <span>
                      {activeGamePack.isGta6Suite ? '120 Cross-Game Saved Pins' : 'Unbranded OBS Mode (?mode=obs)'}
                    </span>
                  </div>
                  <div className="pass-feature-item">
                    <Clock size={14} color="var(--game-accent)" aria-hidden="true" />
                    <span>
                      {activeGamePack.isGta6Suite ? 'Ch. 1–Post Spoiler Shield & Cheats' : 'Custom Clan Tag on Share PNGs'}
                    </span>
                  </div>
                </div>

                <div className="pass-steps-strip" aria-label="How local backup works">
                  <span>1. All 16 setups &amp; OBS free</span>
                  <span>2. Generate free QR link</span>
                  <span>3. Export JSON/CSV anytime</span>
                </div>

                <div className="sync-actions-row">
                  <button
                    type="button"
                    className="primary-coral-btn full-width-btn"
                    onClick={handleCreateFreeSyncCode}
                    disabled={isCreatingSync}
                  >
                    <QrCode size={14} aria-hidden="true" />
                    <span>{isCreatingSync ? 'Generating Free QR Key…' : 'Generate Free Phone ↔ PC QR Sync'}</span>
                  </button>
                </div>

                <div className="pro-clan-field" style={{ marginTop: '10px' }}>
                  <label htmlFor="pro-clan-tag-input" className="section-label">
                    Custom Clan / Creator PNG Badge (Free · Max 16 Chars)
                  </label>
                  <input
                    id="pro-clan-tag-input"
                    type="text"
                    maxLength={16}
                    className="deck-input no-icon mono"
                    placeholder="e.g. TEAM-ALPHA"
                    value={deckState.clanTag}
                    onChange={(e) =>
                      setDeckState((prev) => ({
                        ...prev,
                        clanTag: e.target.value.replace(/[^a-zA-Z0-9 _\-.]/g, '').slice(0, 16),
                      }))
                    }
                    onBlur={() =>
                      setDeckState((prev) => ({
                        ...prev,
                        clanTag: sanitizeClanTag(prev.clanTag),
                      }))
                    }
                  />
                </div>

                <p className="sync-legal-fineprint">
                  All 10 game calculators, GTA VI launch companions, and portable CSV/JSON backups are 100% free with zero checkout required. Questions? Email{' '}
                  <a
                    href={`mailto:${runtimeConfig.supportEmail}`}
                    className="legal-contact-link"
                  >
                    {runtimeConfig.supportEmail}
                  </a>
                  .
                </p>
              </div>
            )}

            <form onSubmit={handleActivatePass}>
              <label htmlFor="claim-code-input" className="section-label">
                Already have a Sync Key? Restore via UP-XXXXXXXX Code or Legacy Receipt
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

            <div className="backup-section-box">
              <div className="section-label">
                Portable Device Backup (Free Forever · Zero Account Needed)
              </div>
              <div className="backup-actions-row">
                <button
                  type="button"
                  className="subtle-pill-btn"
                  onClick={handleExportCsv}
                >
                  <FileSpreadsheet size={14} aria-hidden="true" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  className="subtle-pill-btn"
                  onClick={handleExportJson}
                >
                  <Download size={14} aria-hidden="true" />
                  <span>Export JSON</span>
                </button>
                <button
                  type="button"
                  className="subtle-pill-btn"
                  onClick={() => backupInputRef.current?.click()}
                >
                  <Upload size={14} aria-hidden="true" />
                  <span>Import JSON</span>
                </button>
                <input
                  ref={backupInputRef}
                  type="file"
                  accept=".json,application/json"
                  hidden
                  aria-label="Import Unpause JSON backup file"
                  onChange={handleImportBackupFile}
                />
              </div>
              <div role="status" aria-live="polite">
                {backupNotice && (
                  <div className={`inline-status-note ${backupNotice.tone}`}>
                    {backupNotice.text}
                  </div>
                )}
              </div>
            </div>
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
                  Single clean text-pill above free calculator tools across all 10 live Unpause games (GTA VI, CoD: Warzone, Fortnite, Minecraft, EA FC 27, Roblox, CS2, Valorant, Apex Legends &amp; GTA Online). Zero pop-ups or tracking scripts.
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
                <strong>Ad Review First:</strong> 18+ / business buyers only; no gambling, real-money
                trading (RMT), malware, NSFW, deceptive urgency, or Punycode domains. Destinations are
                reviewed manually before invoicing. See{' '}
                <button
                  type="button"
                  className="inline-legal-link-btn"
                  onClick={() => {
                    setShowSponsorModal(false);
                    setLegalSection('refunds');
                  }}
                >
                  Sponsored Ad Policy
                </button>
                .
              </p>
            </div>

            <a
              href={`mailto:${runtimeConfig.sponsorEmail}?subject=${encodeURIComponent('PlayUnpause 24h Header Sponsor Inquiry ($149)')}`}
              className="primary-coral-btn full-width-btn"
            >
              <span>Request 24h Sponsor Slot · ${runtimeConfig.sponsorPriceUsd}</span>
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
              isPro={deckState.isPro}
              onOpenProModal={() => {
                setShowEmbedModal(false);
                setShowProModal(true);
              }}
            />
          </Suspense>
        </ChunkErrorBoundary>
      )}
    </div>
  );
}
