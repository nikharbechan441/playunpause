import React, { useEffect, useMemo, useRef, useState } from 'react';
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
} from 'lucide-react';
import { GAME_PACKS, resolveGameIdFromSlug } from './data/games/index.js';
import StorageUnlockDeck, { formatCountdownMs } from './components/StorageUnlockDeck.jsx';
import SafeKeypadVault from './components/SafeKeypadVault.jsx';
import SquadHeistMarketDeck from './components/SquadHeistMarketDeck.jsx';
import NightRunProDeck from './components/NightRunProDeck.jsx';
import MultiGameToolDeck from './components/MultiGameToolDeck.jsx';
import GameSelectorModal from './components/GameSelectorModal.jsx';
import LegalComplianceModal from './components/LegalComplianceModal.jsx';
import { generateQrMatrix } from './utils/qrCode.js';
import { playSwitchTick, playUnlockChime } from './utils/soundHaptics.js';

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

function loadInitialDeckState() {
  const fallback = {
    theme: 'obsidian',
    soundEnabled: true,
    isPro: false,
    deckCode: null,
    crackedSafeIds: [],
    checkedRouteIds: [],
    savedPins: [],
  };
  if (typeof window === 'undefined') return fallback;
  try {
    const rawV5 = window.localStorage.getItem(STORAGE_KEY);
    if (rawV5) {
      const parsed = JSON.parse(rawV5);
      return {
        ...fallback,
        ...parsed,
        theme: parsed.theme === 'paper' ? 'paper' : 'obsidian',
        crackedSafeIds: Array.isArray(parsed.crackedSafeIds) ? parsed.crackedSafeIds : [],
        checkedRouteIds: Array.isArray(parsed.checkedRouteIds) ? parsed.checkedRouteIds : [],
        savedPins: Array.isArray(parsed.savedPins) ? parsed.savedPins : [],
      };
    }
    for (const oldKey of LEGACY_KEYS) {
      const legacyRaw = window.localStorage.getItem(oldKey);
      if (!legacyRaw) continue;
      const parsed = JSON.parse(legacyRaw);
      return {
        ...fallback,
        soundEnabled: parsed.soundEnabled !== false,
        isPro: Boolean(parsed.isPro),
        deckCode: typeof parsed.deckCode === 'string' ? parsed.deckCode : null,
        crackedSafeIds: Array.isArray(parsed.crackedSafeIds)
          ? parsed.crackedSafeIds
          : Array.isArray(parsed.crackedSafes)
            ? parsed.crackedSafes
            : [],
        checkedRouteIds: Array.isArray(parsed.checkedRouteIds) ? parsed.checkedRouteIds : [],
        savedPins: Array.isArray(parsed.savedPins) ? parsed.savedPins : [],
      };
    }
  } catch {
    // Ignore storage read errors in restricted browsers
  }
  return fallback;
}

function readRouteFromLocation() {
  if (typeof window === 'undefined') {
    return { gameId: 'gta-6', tab: 'storage', searchQuery: '', legal: null, syncCode: null };
  }
  const params = new URLSearchParams(window.location.search);
  const rawGame = params.get('game');
  const rawTab = params.get('tab');
  const rawSearch = params.get('q') || '';
  const rawLegal = params.get('legal');

  let syncCode = null;
  const hash = window.location.hash || '';
  const syncMatch = hash.match(/#sync=(UP-[A-Z0-9]{6,12})/i);
  if (syncMatch) {
    syncCode = syncMatch[1].toUpperCase();
  }

  const validTabs = new Set(['storage', 'safes', 'squad', 'nightrun']);
  return {
    gameId: resolveGameIdFromSlug(rawGame),
    tab: validTabs.has(rawTab) ? rawTab : 'storage',
    searchQuery: rawSearch,
    legal: rawLegal && ['terms', 'privacy', 'refunds', 'ip'].includes(rawLegal) ? rawLegal : null,
    syncCode,
  };
}

export default function App() {
  const initialRoute = useMemo(() => readRouteFromLocation(), []);
  const [deckState, setDeckState] = useState(loadInitialDeckState);
  const [activeGameId, setActiveGameId] = useState(initialRoute.gameId);
  const [activeTab, setActiveTab] = useState(initialRoute.tab);
  const [safeInitialQuery, setSafeInitialQuery] = useState(initialRoute.searchQuery);
  const [runtimeConfig, setRuntimeConfig] = useState(DEFAULT_RUNTIME);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const [showGameModal, setShowGameModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [legalSection, setLegalSection] = useState(initialRoute.legal);

  const [claimInput, setClaimInput] = useState('');
  const [claimReceiptInput, setClaimReceiptInput] = useState('');
  const [claimStatus, setClaimStatus] = useState('');
  const [claimError, setClaimError] = useState('');
  const [localDataCleared, setLocalDataCleared] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [copiedSyncLink, setCopiedSyncLink] = useState(false);

  const gameModalRef = useRef(null);
  const proModalRef = useRef(null);
  const sponsorModalRef = useRef(null);
  const legalModalRef = useRef(null);
  const syncTimerRef = useRef(null);
  const skipNextPersistRef = useRef(false);

  const activeGamePack = useMemo(
    () => GAME_PACKS.find((g) => g.id === activeGameId) || GAME_PACKS[0],
    [activeGameId]
  );

  const isPreLaunch = nowMs < Date.parse(GAME_PACKS[0].nzUnlockIsoUtc || '2026-11-18T11:00:00Z');
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
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(deckState));
    } catch {
      // Ignore quota errors
    }
  }, [deckState]);

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

  // Auto-hydrating #sync=UP-XXXXXXXX hash links (Cross-device QR flow) & scrubbing fragment from history
  useEffect(() => {
    if (!initialRoute.syncCode) return;
    fetch(`/api/sync/${encodeURIComponent(initialRoute.syncCode)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (res.status === 403) {
          setDeckState((prev) =>
            prev.deckCode === initialRoute.syncCode
              ? { ...prev, isPro: false, deckCode: null }
              : prev
          );
          setClaimError(data?.error || 'This Sync Pass was refunded or deactivated.');
          setShowProModal(true);
          return;
        }
        if (res.ok && data?.ok && data?.state) {
          setDeckState((prev) => ({
            ...prev,
            isPro: true,
            deckCode: data.deckCode || initialRoute.syncCode,
            crackedSafeIds: Array.isArray(data.state.crackedSafeIds) ? data.state.crackedSafeIds : prev.crackedSafeIds,
            checkedRouteIds: Array.isArray(data.state.checkedRouteIds) ? data.state.checkedRouteIds : prev.checkedRouteIds,
            savedPins: Array.isArray(data.state.savedPins) ? data.state.savedPins : prev.savedPins,
          }));
          setShowProModal(true);
        }
      })
      .catch(() => {})
      .finally(() => {
        try {
          if (window.location.hash && window.location.hash.toLowerCase().startsWith('#sync=')) {
            window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`);
          }
        } catch {
          // Ignore history restrictions
        }
      });
  }, [initialRoute.syncCode]);

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

  // Keyboard shortcuts: Ctrl/Cmd + K opens Game Selector, Escape closes active modal
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowGameModal((open) => !open);
      } else if (e.key === 'Escape') {
        setShowGameModal(false);
        setShowProModal(false);
        setShowSponsorModal(false);
        setLegalSection(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Browser back/forward URL navigation support
  useEffect(() => {
    const onPopState = () => {
      const next = readRouteFromLocation();
      setActiveGameId(next.gameId);
      setActiveTab(next.tab);
      setSafeInitialQuery(next.searchQuery);
      setLegalSection(next.legal);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const syncUrlParams = (gameId, tabId) => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('legal');
      if (gameId && gameId !== 'gta-6') {
        url.searchParams.set('game', gameId);
        url.searchParams.delete('tab');
      } else {
        url.searchParams.delete('game');
        if (tabId && tabId !== 'storage') {
          url.searchParams.set('tab', tabId);
        } else {
          url.searchParams.delete('tab');
        }
      }
      const safeHash = url.hash && url.hash.toLowerCase().startsWith('#sync=') ? '' : url.hash;
      window.history.pushState({}, '', `${url.pathname}${url.search}${safeHash}`);
    } catch {
      // Ignore history edge cases
    }
  };

  const handleSelectGame = (nextGameId) => {
    playSwitchTick(deckState.soundEnabled, 700);
    setActiveGameId(nextGameId);
    if (nextGameId === 'gta-6') {
      syncUrlParams('gta-6', activeTab);
    } else {
      syncUrlParams(nextGameId, null);
    }
  };

  const handleSelectTab = (tabId) => {
    playSwitchTick(deckState.soundEnabled, 660);
    setActiveGameId('gta-6');
    setActiveTab(tabId);
    syncUrlParams('gta-6', tabId);
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
      savedPins: [pinObj, ...prev.savedPins].slice(0, 60),
    }));
  };

  const handleRemovePin = (pinId) => {
    playSwitchTick(deckState.soundEnabled, 580);
    setDeckState((prev) => ({
      ...prev,
      savedPins: prev.savedPins.filter((p) => p.id !== pinId),
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
        setClaimError(data?.error || 'Could not verify code or receipt.');
      } else {
        playUnlockChime(deckState.soundEnabled);
        setDeckState((prev) => ({
          ...prev,
          isPro: true,
          deckCode: data.deckCode,
          crackedSafeIds:
            Array.isArray(data.state?.crackedSafeIds) && data.state.crackedSafeIds.length
              ? data.state.crackedSafeIds
              : prev.crackedSafeIds,
          checkedRouteIds:
            Array.isArray(data.state?.checkedRouteIds) && data.state.checkedRouteIds.length
              ? data.state.checkedRouteIds
              : prev.checkedRouteIds,
          savedPins:
            Array.isArray(data.state?.savedPins) && data.state.savedPins.length
              ? data.state.savedPins
              : prev.savedPins,
        }));
        setClaimStatus(`Synced to ${data.deckCode}`);
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
    try {
      const res = await fetch(`/api/sync/${encodeURIComponent(deckState.deckCode)}`);
      const data = await res.json().catch(() => null);
      if (res.status === 403) {
        setDeckState((prev) => ({ ...prev, isPro: false, deckCode: null }));
        setClaimError(data?.error || 'Sync Pass inactive or refunded.');
        return;
      }
      if (res.ok && data?.ok && data?.state) {
        playSwitchTick(deckState.soundEnabled, 820);
        setDeckState((prev) => ({
          ...prev,
          crackedSafeIds: data.state.crackedSafeIds || [],
          checkedRouteIds: data.state.checkedRouteIds || [],
          savedPins: data.state.savedPins || [],
        }));
        setClaimStatus('Synced latest state from cloud.');
        setTimeout(() => setClaimStatus(''), 2000);
      }
    } catch {
      // Ignore
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
    setLocalDataCleared(true);
    setTimeout(() => setLocalDataCleared(false), 3000);
  };

  const syncShareUrl = useMemo(() => {
    if (!deckState.deckCode) return '';
    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://playunpause.com';
    return `${origin}/#sync=${deckState.deckCode}`;
  }, [deckState.deckCode]);

  const qrMatrix = useMemo(() => {
    if (!syncShareUrl) return null;
    try {
      return generateQrMatrix(syncShareUrl);
    } catch {
      return null;
    }
  }, [syncShareUrl]);

  const accentStyle = useMemo(
    () => ({
      '--game-accent': activeGamePack.accentColor,
      '--game-accent-soft': activeGamePack.accentSoft || hexToRgba(activeGamePack.accentColor, 0.14),
      '--game-accent-ring': hexToRgba(activeGamePack.accentColor, 0.38),
    }),
    [activeGamePack.accentColor, activeGamePack.accentSoft]
  );

  const faqCards = useMemo(() => {
    const packFaqs = activeGamePack.faqs || [];
    return [
      ...packFaqs,
      {
        q: `What does the one-time $${runtimeConfig.passPriceUsd} Sync Pass unlock?`,
        a: 'Instant QR and UP-XXXXXXXX cloud synchronization between Phone and Desktop across safes, weeknight routes, and unlimited multi-game pins, plus extended 90m/120m routes and Act II–III Shield. Digital delivery starts immediately on activation; GTA VI data remains pre-launch estimate until Nov 18 (11:00 UTC) and Whop calculates applicable VAT/sales tax at checkout.',
      },
    ];
  }, [activeGamePack.faqs, runtimeConfig.passPriceUsd]);

  const activeSponsorHref = sanitizeHttpsUrl(runtimeConfig.activeSponsor?.targetUrl, null);
  const passCheckoutHref = sanitizeHttpsUrl(
    runtimeConfig.passCheckoutUrl,
    DEFAULT_RUNTIME.passCheckoutUrl
  );
  const sponsorCheckoutHref = sanitizeHttpsUrl(
    runtimeConfig.sponsorCheckoutUrl,
    DEFAULT_RUNTIME.sponsorCheckoutUrl
  );

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
                handleSelectTab('storage');
              }}
            >
              <div className="brand-mark" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="5" width="4" height="14" rx="1.2" fill="#FFFFFF" />
                  <path d="M11 5.5L20 12L11 18.5V5.5Z" fill="#FFFFFF" />
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
            <div className="nz-hud-pill" title="New Zealand Early Launch Clock (Nov 18 @ 11:00 UTC)">
              <span className="nz-live-dot" />
              <span className="nz-full-text">NZ Unlock: {headerNzClock}</span>
              <span className="nz-compact-text">NZ: {headerNzClock}</span>
            </div>

            <button
              type="button"
              className="tactile-icon-btn"
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
              {deckState.theme === 'paper' ? <Moon size={15} /> : <Sun size={15} />}
            </button>

            <button
              type="button"
              className={`tactile-icon-btn pass-header-btn ${deckState.isPro ? 'sync-pill-pro' : ''}`}
              onClick={() => {
                playSwitchTick(deckState.soundEnabled, 700);
                setShowProModal(true);
              }}
            >
              <QrCode size={14} />
              <span className="pass-full-label">
                {deckState.isPro ? `Synced · ${deckState.deckCode}` : `Sync Pass · $${runtimeConfig.passPriceUsd}`}
              </span>
              <span className="pass-short-label">
                {deckState.isPro ? 'Sync' : 'Pass'}
              </span>
            </button>
          </div>
        </div>

        {/* SLIM TOP-10 GAME DOCK */}
        <nav className="quick-game-dock-wrap" aria-label="Quick Top 10 Games">
          <div className="quick-game-dock">
            {GAME_PACKS.map((g) => {
              const isActive = g.id === activeGameId;
              const href = g.id === 'gta-6' ? '/' : `/?game=${g.id}`;
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
      <main className="app-shell">
        {activeGamePack.isGta6Suite ? (
          <div className="deck-stage-transition" key={`gta-${activeTab}`}>
            <div className="gta-workspace-nav" role="tablist" aria-label="GTA VI Tools">
              {GTA_MODES.map((m) => {
                const IconM = m.icon;
                const active = activeTab === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`mode-tab ${active ? 'active' : ''}`}
                    onClick={() => handleSelectTab(m.id)}
                  >
                    <IconM size={15} className="mode-tab-icon" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {activeTab === 'storage' && (
              <StorageUnlockDeck
                gamePack={activeGamePack}
                runtimeConfig={runtimeConfig}
                soundEnabled={deckState.soundEnabled}
                nowMs={nowMs}
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
                initialQuery={safeInitialQuery}
                onOpenProModal={() => setShowProModal(true)}
              />
            )}

            {activeTab === 'squad' && (
              <SquadHeistMarketDeck
                gamePack={activeGamePack}
                soundEnabled={deckState.soundEnabled}
                isPreLaunch={isPreLaunch}
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
              />
            )}
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
            />
          </div>
        )}

        {/* TRUST / GAME DOMAIN FAQ GRID */}
        <section className="trust-faq-grid" aria-label="Quick Reference FAQs">
          {faqCards.map((faq) => (
            <article key={faq.q} className="trust-card">
              <h2>{faq.q}</h2>
              <p>{faq.a}</p>
            </article>
          ))}
        </section>

        {/* TRANSPARENT STUDIO FOOTER */}
        <footer className="studio-footer">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span>Unpause (playunpause.com) · Independent Player Companion</span>
              <span>·</span>
              <a
                href={`mailto:${runtimeConfig.supportEmail}`}
                style={{ color: 'var(--ink-secondary)', textDecoration: 'none' }}
              >
                {runtimeConfig.supportEmail}
              </a>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="subtle-pill-btn"
                onClick={() => setLegalSection('terms')}
              >
                Terms
              </button>
              <button
                type="button"
                className="subtle-pill-btn"
                onClick={() => setLegalSection('privacy')}
              >
                Privacy (POPIA/GDPR)
              </button>
              <button
                type="button"
                className="subtle-pill-btn"
                onClick={() => setLegalSection('refunds')}
              >
                Refund &amp; Ads
              </button>
              <button
                type="button"
                className="subtle-pill-btn"
                onClick={() => setLegalSection('ip')}
              >
                IP &amp; DMCA
              </button>
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
                <Megaphone size={13} />
                <span>Sponsor 24h</span>
              </button>
            </div>
          </div>

          <p style={{ margin: '10px 0 0', fontSize: '0.73rem', lineHeight: 1.55, color: 'var(--ink-muted)' }}>
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
      {activeGamePack.isGta6Suite && (
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
                <IconM size={16} className="mode-tab-icon" />
                <span>{m.mobileLabel}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* MODAL 1: GAME SWITCHER */}
      <GameSelectorModal
        isOpen={showGameModal}
        onClose={() => setShowGameModal(false)}
        activeGameId={activeGameId}
        onSelectGame={handleSelectGame}
        soundEnabled={deckState.soundEnabled}
        modalRef={gameModalRef}
      />

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
                <X size={16} />
              </button>
            </div>

            {deckState.isPro && deckState.deckCode ? (
              <div className="mg-subcard" style={{ marginBottom: '16px', textAlign: 'center' }}>
                {qrMatrix && (
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '12px',
                      background: '#FFFFFF',
                      borderRadius: '12px',
                      marginBottom: '12px',
                    }}
                  >
                    <svg
                      width="148"
                      height="148"
                      viewBox={`0 0 ${qrMatrix.length} ${qrMatrix.length}`}
                      role="img"
                      aria-label={`QR sync code for ${deckState.deckCode}`}
                      shapeRendering="crispEdges"
                    >
                      <rect width={qrMatrix.length} height={qrMatrix.length} fill="#FFFFFF" />
                      {qrMatrix.map((row, y) =>
                        row.map((cell, x) =>
                          cell ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#0B0E14" /> : null
                        )
                      )}
                    </svg>
                  </div>
                )}

                <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '6px' }}>
                  {deckState.deckCode}
                </div>
                <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: 'var(--ink-secondary)' }}>
                  Scan on your phone while playing on console or PC — safes, routes &amp; pinned calcs sync automatically.
                </p>
                <p style={{ margin: '0 0 12px', fontSize: '0.73rem', color: 'var(--ink-muted)', lineHeight: 1.45 }}>
                  Security notice: Your <code>UP-</code> code and QR link act as a bearer sync key. Keep screenshots private.
                </p>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="secondary-key-btn"
                    onClick={() => {
                      if (navigator?.clipboard?.writeText && syncShareUrl) {
                        navigator.clipboard.writeText(syncShareUrl).catch(() => {});
                      }
                      setCopiedSyncLink(true);
                      setTimeout(() => setCopiedSyncLink(false), 1800);
                    }}
                  >
                    {copiedSyncLink ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedSyncLink ? 'Sync Link Copied' : 'Copy Sync Link'}</span>
                  </button>
                  <button type="button" className="subtle-pill-btn" onClick={handlePullCloudNow}>
                    <RefreshCw size={13} /> Refresh Cloud
                  </button>
                </div>
              </div>
            ) : (
              <div className="pass-value-bento">
                <div className="pass-feature-grid">
                  <div className="pass-feature-item">
                    <QrCode size={14} color="var(--ocean)" />
                    <span>Phone ↔ PC QR Sync</span>
                  </div>
                  <div className="pass-feature-item">
                    <Clock size={14} color="var(--teal-dark)" />
                    <span>90m &amp; 120m Weeknight Routes</span>
                  </div>
                  <div className="pass-feature-item">
                    <Sparkles size={14} color="var(--gold)" />
                    <span>Acts II–III Missables Shield</span>
                  </div>
                  <div className="pass-feature-item">
                    <Check size={14} color="var(--game-accent)" />
                    <span>Unlimited Pins &amp; No Sponsor Bar</span>
                  </div>
                </div>

                <div style={{ marginTop: '14px' }}>
                  <a
                    href={passCheckoutHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="primary-coral-btn"
                    style={{ width: '100%' }}
                  >
                    <span>Unlock Sync Pass · ${runtimeConfig.passPriceUsd} One-Time</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
                <p style={{ margin: '10px 0 0', fontSize: '0.73rem', color: 'var(--ink-muted)', textAlign: 'center', lineHeight: 1.5 }}>
                  18+ (or parental/guardian consent). Merchant of Record: Whop (applicable VAT/sales tax shown before payment; statement reads <strong>WHOP*PLAYUNPAUSE</strong>). Instant digital delivery; GTA VI modules remain pre-launch previews until Nov 18 (11:00 UTC). Includes 14-day hassle-free refunds.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '8px', fontSize: '0.73rem' }}>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--ink-secondary)', textDecoration: 'underline', font: 'inherit' }}
                    onClick={() => {
                      setShowProModal(false);
                      setLegalSection('terms');
                    }}
                  >
                    Terms
                  </button>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--ink-secondary)', textDecoration: 'underline', font: 'inherit' }}
                    onClick={() => {
                      setShowProModal(false);
                      setLegalSection('privacy');
                    }}
                  >
                    Privacy
                  </button>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--ink-secondary)', textDecoration: 'underline', font: 'inherit' }}
                    onClick={() => {
                      setShowProModal(false);
                      setLegalSection('refunds');
                    }}
                  >
                    Refund Policy
                  </button>
                  <a
                    href={`mailto:${runtimeConfig.supportEmail}`}
                    style={{ color: 'var(--ink-secondary)', textDecoration: 'underline' }}
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
              <div style={{ display: 'flex', gap: '8px', marginTop: '7px' }}>
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
                <div style={{ marginTop: '8px' }}>
                  <label htmlFor="claim-receipt-input" className="section-label">
                    Whop Receipt ID (required with email for account security)
                  </label>
                  <input
                    id="claim-receipt-input"
                    type="text"
                    className="deck-input no-icon mono"
                    style={{ marginTop: '5px' }}
                    placeholder="mem_... or pay_..."
                    value={claimReceiptInput}
                    onChange={(e) => setClaimReceiptInput(e.target.value)}
                  />
                </div>
              )}
              {claimError && (
                <div style={{ marginTop: '7px', fontSize: '0.79rem', color: 'var(--coral)', fontWeight: 600 }}>
                  {claimError}
                </div>
              )}
              {claimStatus && (
                <div style={{ marginTop: '7px', fontSize: '0.79rem', color: 'var(--teal-dark)', fontWeight: 600 }}>
                  {claimStatus}
                </div>
              )}
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
                <X size={16} />
              </button>
            </div>

            <div className="mg-subcard" style={{ marginBottom: '14px' }}>
              <p style={{ margin: '0 0 8px', fontSize: '0.83rem', color: 'var(--ink-secondary)', lineHeight: 1.55 }}>
                Reserve a clean 24-hour hardware, peripheral, or creator header pill labeled{' '}
                <strong>Sponsored:</strong>. Strictly HTTPS-verified destinations only. Questions?
                Email <strong>{runtimeConfig.sponsorEmail}</strong>.
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ink-muted)', lineHeight: 1.5 }}>
                <strong>Pre-Checkout Ad Rules:</strong> 18+ / business buyers only; no gambling, real-money
                trading (RMT), malware, NSFW, deceptive urgency, or Punycode domains. Subject to
                moderation review before publishing; tax calculated by Whop. See{' '}
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', padding: 0, color: 'var(--ink-secondary)', textDecoration: 'underline', font: 'inherit' }}
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
              className="primary-coral-btn"
              style={{ width: '100%' }}
            >
              <span>Reserve 24h Slot via Whop · ${runtimeConfig.sponsorPriceUsd}</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      )}

      {/* MODAL 4: COMPLIANCE & LEGAL */}
      <LegalComplianceModal
        isOpen={Boolean(legalSection)}
        activeSection={legalSection || 'terms'}
        onSelectSection={setLegalSection}
        onClose={() => setLegalSection(null)}
        modalRef={legalModalRef}
        runtimeConfig={runtimeConfig}
        soundEnabled={deckState.soundEnabled}
      />
    </div>
  );
}
