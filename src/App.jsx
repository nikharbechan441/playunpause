import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  HardDrive,
  KeyRound,
  Calculator,
  Compass,
  Volume2,
  VolumeX,
  Link2,
  Sun,
  Sunrise,
  X,
  ExternalLink,
  Megaphone,
  Share2,
  CheckCircle2,
  Smartphone,
  Monitor,
  ShieldCheck,
  CreditCard,
  Gamepad2,
  Sparkles,
} from 'lucide-react';
import { GAME_PACKS, TOP_GAMES, resolveGameIdFromSlug } from './data/games/index.js';
import StorageUnlockDeck, { formatCountdownMs } from './components/StorageUnlockDeck.jsx';
import SafeKeypadVault from './components/SafeKeypadVault.jsx';
import SquadHeistMarketDeck from './components/SquadHeistMarketDeck.jsx';
import NightRunProDeck from './components/NightRunProDeck.jsx';
import MultiGameToolDeck from './components/MultiGameToolDeck.jsx';
import GameSelectorModal from './components/GameSelectorModal.jsx';
import LegalComplianceModal from './components/LegalComplianceModal.jsx';
import { playSwitchTick, playUnlockChime } from './utils/soundHaptics.js';

const STORAGE_KEY = 'unpause_local_state_v4';
const LEGACY_KEYS = ['unpause_local_state_v3', 'unpause_local_state_v2', 'unpause_local_state_v1'];
const VALID_TABS = new Set(['storage', 'safes', 'squad', 'nightrun']);
const VALID_LEGAL_SECTIONS = new Set(['terms', 'privacy', 'refunds', 'ip']);

function cleanIdArray(val) {
  if (!Array.isArray(val)) return [];
  return [...new Set(val.filter((item) => typeof item === 'string' && item.trim().length > 0))];
}

function cleanPinArray(val) {
  if (!Array.isArray(val)) return [];
  const seen = new Set();
  const out = [];
  for (const item of val) {
    if (!item || typeof item !== 'object') continue;
    const id = typeof item.id === 'string' ? item.id.trim().slice(0, 48) : '';
    const gameId = typeof item.gameId === 'string' ? item.gameId.trim().slice(0, 32) : '';
    const label = typeof item.label === 'string' ? item.label.trim().slice(0, 80) : '';
    const value = typeof item.value === 'string' ? item.value.trim().slice(0, 140) : '';
    if (!id || !gameId || !label || !value || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, gameId, label, value });
    if (out.length >= 50) break;
  }
  return out;
}

function mergeUniqueIds(a, b) {
  return [...new Set([...cleanIdArray(a), ...cleanIdArray(b)])];
}

function mergeUniquePins(a, b) {
  return cleanPinArray([...cleanPinArray(a), ...cleanPinArray(b)]);
}

function loadLocalState() {
  try {
    const v4Raw = localStorage.getItem(STORAGE_KEY);
    if (v4Raw) {
      const parsed = JSON.parse(v4Raw);
      if (parsed && typeof parsed === 'object') {
        return {
          theme: parsed.theme === 'sunset' ? 'sunset' : 'coastal',
          soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : false,
          crackedSafeIds: cleanIdArray(parsed.crackedSafeIds),
          checkedRouteIds: cleanIdArray(parsed.checkedRouteIds),
          savedPins: cleanPinArray(parsed.savedPins),
          deckCode: typeof parsed.deckCode === 'string' ? parsed.deckCode : '',
          isPro: Boolean(parsed.isPro && typeof parsed.deckCode === 'string' && parsed.deckCode),
        };
      }
    }

    for (const key of LEGACY_KEYS) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          theme: 'coastal',
          soundEnabled: false,
          crackedSafeIds: cleanIdArray(parsed.crackedSafeIds),
          checkedRouteIds: cleanIdArray(parsed.checkedRouteIds),
          savedPins: [],
          deckCode: typeof parsed.deckCode === 'string' ? parsed.deckCode : '',
          isPro: Boolean(parsed.isPro && typeof parsed.deckCode === 'string' && parsed.deckCode),
        };
      }
    }
    return {};
  } catch {
    return {};
  }
}

function readInitialUrlRouting(defaultLaunchTab) {
  try {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
    const rawGame = (params.get('game') || '').trim();
    const gameId = resolveGameIdFromSlug(rawGame);
    const rawTab = (params.get('tab') || '').toLowerCase();
    const rawQuery = (params.get('q') || '').trim().slice(0, 80);
    const syncParam = (hashParams.get('sync') || params.get('sync') || '').trim().toUpperCase();
    const unlockedParam = params.get('unlocked') === '1';
    const rawLegal = (params.get('legal') || '').trim().toLowerCase();
    const legalSection = VALID_LEGAL_SECTIONS.has(rawLegal) ? rawLegal : '';

    let tab = defaultLaunchTab;
    if (VALID_TABS.has(rawTab)) {
      tab = rawTab;
    } else if (rawQuery) {
      tab = 'safes';
    } else if (unlockedParam) {
      tab = 'nightrun';
    }

    return { gameId, tab, query: rawQuery, syncParam, unlockedParam, legalSection };
  } catch {
    return {
      gameId: 'gta-6',
      tab: defaultLaunchTab,
      query: '',
      syncParam: '',
      unlockedParam: false,
      legalSection: '',
    };
  }
}

export default function App() {
  const initial = loadLocalState();
  const primaryPack = GAME_PACKS[0];
  const initialNow = Date.now();
  const defaultLaunchTab = initialNow >= Date.parse(primaryPack.nzUnlockIsoUtc) ? 'safes' : 'storage';
  const urlInit = readInitialUrlRouting(defaultLaunchTab);

  const [theme, setTheme] = useState(initial.theme || 'coastal');
  const [activeGameId, setActiveGameId] = useState(urlInit.gameId || 'gta-6');
  const [gameModalOpen, setGameModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(urlInit.tab);
  const [safeSearchQuery] = useState(urlInit.query);
  const [soundEnabled, setSoundEnabled] = useState(initial.soundEnabled ?? false);
  const [crackedSafeIds, setCrackedSafeIds] = useState(initial.crackedSafeIds || []);
  const [checkedRouteIds, setCheckedRouteIds] = useState(initial.checkedRouteIds || []);
  const [savedPins, setSavedPins] = useState(initial.savedPins || []);
  const [deckCode, setDeckCode] = useState(initial.deckCode || '');
  const [isPro, setIsPro] = useState(Boolean(initial.isPro && initial.deckCode));
  const [remoteSyncReady, setRemoteSyncReady] = useState(!initial.isPro);
  const [nowMs, setNowMs] = useState(initialNow);

  const [runtimeConfig, setRuntimeConfig] = useState({
    passPriceUsd: 6.99,
    launchPriceUsd: 9.99,
    sponsorPriceUsd: 149,
    passCheckoutUrl: 'https://whop.com/playunpause/',
    sponsorCheckoutUrl: 'https://whop.com/playunpause/',
    supportEmail: 'hello@playunpause.com',
    sponsorEmail: 'sponsors@playunpause.com',
    demoUnlockEnabled: false,
    activeSponsor: null,
  });

  const [proModalOpen, setProModalOpen] = useState(false);
  const [returningBuyerView, setReturningBuyerView] = useState(false);
  const [sponsorModalOpen, setSponsorModalOpen] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(Boolean(urlInit.legalSection));
  const [legalSection, setLegalSection] = useState(urlInit.legalSection || 'terms');
  const [activateInput, setActivateInput] = useState('');
  const [activateStatus, setActivateStatus] = useState({ loading: false, error: '', success: '' });

  const modalCardRef = useRef(null);
  const lastFocusedRef = useRef(null);

  const activeGamePack =
    GAME_PACKS.find((g) => g.id === activeGameId && !g.comingSoon) || GAME_PACKS[0];

  const nzTargetMs = Date.parse(GAME_PACKS[0].nzUnlockIsoUtc);
  const isPreLaunch = nowMs < nzTargetMs;
  const nzCountdown = formatCountdownMs(nzTargetMs - nowMs);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'sunset' ? '#FFF7F2' : '#F3F7FB');
    }
  }, [theme]);

  // Dynamic per-game title, canonical & OpenGraph URL state sync
  useEffect(() => {
    const canonicalHref = legalModalOpen
      ? `https://playunpause.com/?legal=${encodeURIComponent(legalSection)}`
      : activeGameId === 'gta-6'
        ? activeTab === defaultLaunchTab
          ? 'https://playunpause.com/'
          : `https://playunpause.com/?tab=${encodeURIComponent(activeTab)}`
        : `https://playunpause.com/?game=${encodeURIComponent(activeGameId)}`;

    if (activeGameId === 'gta-6') {
      document.title = '3-Second Gaming Calculators & Safe Codes — Unpause';
    } else {
      document.title = `${activeGamePack.fullTitle || activeGamePack.shortTitle} Calculator & Meta — Unpause`;
    }

    const linkCanonical = document.querySelector('link[rel="canonical"]');
    if (linkCanonical) linkCanonical.setAttribute('href', canonicalHref);
    const metaOgUrl = document.querySelector('meta[property="og:url"]');
    if (metaOgUrl) metaOgUrl.setAttribute('content', canonicalHref);
  }, [activeGameId, activeGamePack, activeTab, defaultLaunchTab, legalModalOpen, legalSection]);

  // Global Ctrl+K / Cmd+K Command Palette Shortcut
  useEffect(() => {
    const onGlobalKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setProModalOpen(false);
        setSponsorModalOpen(false);
        setLegalModalOpen(false);
        setGameModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onGlobalKey);
    return () => window.removeEventListener('keydown', onGlobalKey);
  }, []);

  // Browser Back / Forward navigation sync
  useEffect(() => {
    const onPopState = () => {
      const nextRoute = readInitialUrlRouting(defaultLaunchTab);
      setActiveGameId(nextRoute.gameId);
      setActiveTab(nextRoute.tab);
      if (nextRoute.legalSection) {
        setLegalSection(nextRoute.legalSection);
        setLegalModalOpen(true);
      } else {
        setLegalModalOpen(false);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [defaultLaunchTab]);

  const switchGame = useCallback(
    (nextGameId, pitch = 710) => {
      const resolved = resolveGameIdFromSlug(nextGameId);
      playSwitchTick(soundEnabled, pitch);
      setActiveGameId(resolved);
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('legal');
        if (resolved === 'gta-6') {
          url.searchParams.delete('game');
        } else {
          url.searchParams.set('game', resolved);
          url.searchParams.delete('tab');
        }
        window.history.pushState({}, '', url.toString());
      } catch {
        // Ignore history errors
      }
    },
    [soundEnabled]
  );

  const activateWithCodeOrInput = useCallback(
    async ({ inputVal = '', demoUnlock = false, silentAuto = false }) => {
      if (!silentAuto) {
        setActivateStatus({ loading: true, error: '', success: '' });
      }
      try {
        const resp = await fetch('/api/pass/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(demoUnlock ? { demoUnlock: true } : { codeOrEmail: inputVal }),
        });
        const data = await resp.json();
        if (!resp.ok || !data.ok) {
          if (!silentAuto) {
            setActivateStatus({
              loading: false,
              error: data.error || 'Could not verify that code. Check your code or email and try again.',
              success: '',
            });
          }
          return false;
        }
        playUnlockChime(soundEnabled);
        setDeckCode(data.deckCode);
        setIsPro(true);
        setCrackedSafeIds((prev) => mergeUniqueIds(prev, data.state?.crackedSafeIds));
        setCheckedRouteIds((prev) => mergeUniqueIds(prev, data.state?.checkedRouteIds));
        setSavedPins((prev) => mergeUniquePins(prev, data.state?.savedPins));
        setRemoteSyncReady(true);
        setReturningBuyerView(false);
        setActivateStatus({
          loading: false,
          error: '',
          success: `Pass active! Your permanent sync code is ${data.deckCode}`,
        });
        return true;
      } catch {
        if (!silentAuto) {
          setActivateStatus({
            loading: false,
            error: 'Could not reach the sync server. Check your connection and try again.',
            success: '',
          });
        }
        return false;
      }
    },
    [soundEnabled]
  );

  useEffect(() => {
    fetch('/api/config')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setRuntimeConfig((prev) => ({ ...prev, ...data }));
      })
      .catch(() => {});

    if (urlInit.syncParam && /^UP-[A-Z0-9]{8,12}$/.test(urlInit.syncParam)) {
      setActivateInput(urlInit.syncParam);
      activateWithCodeOrInput({ inputVal: urlInit.syncParam, silentAuto: false }).then((ok) => {
        if (ok) {
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete('sync');
          if (cleanUrl.hash.toLowerCase().includes('sync=')) {
            cleanUrl.hash = '';
          }
          window.history.replaceState({}, '', cleanUrl.toString());
        } else {
          setProModalOpen(true);
        }
      });
    } else if (urlInit.unlockedParam && !initial.isPro) {
      setReturningBuyerView(true);
      setProModalOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!initial.isPro || !initial.deckCode) {
      setRemoteSyncReady(true);
      return;
    }
    let cancelled = false;
    fetch(`/api/sync/${encodeURIComponent(initial.deckCode)}`)
      .then(async (r) => {
        if (r.status === 403) {
          if (!cancelled) {
            setIsPro(false);
            setDeckCode('');
          }
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((data) => {
        if (cancelled) return;
        if (data?.ok && data.state) {
          setCrackedSafeIds((prev) => mergeUniqueIds(prev, data.state.crackedSafeIds));
          setCheckedRouteIds((prev) => mergeUniqueIds(prev, data.state.checkedRouteIds));
          setSavedPins((prev) => mergeUniquePins(prev, data.state.savedPins));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setRemoteSyncReady(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          theme,
          soundEnabled,
          crackedSafeIds,
          checkedRouteIds,
          savedPins,
          deckCode,
          isPro,
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [theme, soundEnabled, crackedSafeIds, checkedRouteIds, savedPins, deckCode, isPro]);

  useEffect(() => {
    if (!isPro || !deckCode || !remoteSyncReady) return undefined;
    const timer = setTimeout(() => {
      fetch(`/api/sync/${encodeURIComponent(deckCode)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: { crackedSafeIds, checkedRouteIds, savedPins },
        }),
      }).catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, [crackedSafeIds, checkedRouteIds, savedPins, deckCode, isPro, remoteSyncReady]);

  const switchTab = (nextTab, pitch = 700) => {
    playSwitchTick(soundEnabled, pitch);
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(8);
      } catch {
        // Ignore
      }
    }
    setActiveTab(nextTab);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('legal');
      if (nextTab === defaultLaunchTab) {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', nextTab);
      }
      window.history.pushState({}, '', url.toString());
    } catch {
      // Ignore history errors
    }
  };

  const openLegalSection = useCallback(
    (section = 'terms') => {
      const cleanSec = VALID_LEGAL_SECTIONS.has(section) ? section : 'terms';
      playSwitchTick(soundEnabled, 710);
      setProModalOpen(false);
      setSponsorModalOpen(false);
      setGameModalOpen(false);
      setLegalSection(cleanSec);
      setLegalModalOpen(true);
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('legal', cleanSec);
        window.history.pushState({}, '', url.toString());
      } catch {
        // Ignore history errors
      }
    },
    [soundEnabled]
  );

  const anyModalOpen = proModalOpen || sponsorModalOpen || gameModalOpen || legalModalOpen;
  const closeModals = useCallback(() => {
    setProModalOpen(false);
    setSponsorModalOpen(false);
    setGameModalOpen(false);
    setLegalModalOpen(false);
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('legal')) {
        url.searchParams.delete('legal');
        window.history.replaceState({}, '', url.toString());
      }
    } catch {
      // Ignore history errors
    }
  }, []);

  useEffect(() => {
    if (!anyModalOpen) return undefined;
    lastFocusedRef.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = setTimeout(() => {
      const card = modalCardRef.current;
      if (!card) return;
      const firstInput = card.querySelector('input:not([disabled]), a[href], button:not([disabled])');
      if (firstInput) firstInput.focus();
    }, 20);

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModals();
        return;
      }
      if (e.key === 'Tab' && modalCardRef.current) {
        const focusables = modalCardRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKeyDown);
      if (lastFocusedRef.current && typeof lastFocusedRef.current.focus === 'function') {
        lastFocusedRef.current.focus();
      }
    };
  }, [anyModalOpen, closeModals]);

  const toggleSafe = (safeId) => {
    setCrackedSafeIds((prev) =>
      prev.includes(safeId) ? prev.filter((id) => id !== safeId) : [...prev, safeId]
    );
  };

  const toggleRouteStop = (stopId) => {
    setCheckedRouteIds((prev) =>
      prev.includes(stopId) ? prev.filter((id) => id !== stopId) : [...prev, stopId]
    );
  };

  const addSavedPin = (pinObj) => {
    setSavedPins((prev) => cleanPinArray([pinObj, ...prev]));
  };

  const removeSavedPin = (pinId) => {
    setSavedPins((prev) => prev.filter((p) => p.id !== pinId));
  };

  const handleActivateSubmit = async (e, demoUnlock = false) => {
    if (e) e.preventDefault();
    await activateWithCodeOrInput({ inputVal: activateInput, demoUnlock, silentAuto: false });
  };

  const shareMagicSyncUrl = async () => {
    if (!deckCode) return;
    const magicUrl = `${window.location.origin}/#sync=${encodeURIComponent(deckCode)}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Unpause Sync Link',
          text: `Open on your phone or PC to mirror Unpause (${deckCode})`,
          url: magicUrl,
        });
        return;
      }
    } catch {
      // Fallback to clipboard
    }
    try {
      await navigator.clipboard.writeText(magicUrl);
      setActivateStatus({
        loading: false,
        error: '',
        success: `Copied sync link: ${magicUrl}`,
      });
    } catch {
      // Ignore
    }
  };

  const activeFaqs =
    Array.isArray(activeGamePack.faqs) && activeGamePack.faqs.length >= 2
      ? activeGamePack.faqs.slice(0, 2)
      : GAME_PACKS[0].faqs.slice(0, 2);

  return (
    <>
      {runtimeConfig.activeSponsor && !isPro && (
        <div className="sponsor-strip">
          <div className="sponsor-strip-inner">
            <a
              href={runtimeConfig.activeSponsor.targetUrl}
              target="_blank"
              rel="sponsored noopener noreferrer"
              className="sponsor-tag"
            >
              <span className="sponsor-dot" aria-hidden="true" />
              <span>Sponsored · {runtimeConfig.activeSponsor.badgeText}</span>
              <ExternalLink size={13} aria-hidden="true" />
            </a>
          </div>
        </div>
      )}

      {/* Sticky Bright Coastal Header */}
      <header className="hud-header-wrap">
        <div className="hud-command-bar">
          <div className="brand-cluster">
            <div className="brand-mark" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="5" width="4.4" height="14" rx="1.4" fill="#FFFFFF" />
                <path d="M12.2 5.2L21 12L12.2 18.8V5.2Z" fill="#FFFFFF" />
              </svg>
            </div>
            <div className="brand-wordmark">
              <span className="brand-name">Unpause</span>
              <span className="brand-tagline">
                {activeGameId === 'gta-6'
                  ? 'Unofficial Tools for GTA VI'
                  : `Unofficial ${activeGamePack.shortTitle || activeGamePack.name} Utility`}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="game-switch-btn"
            onClick={() => {
              playSwitchTick(soundEnabled, 700);
              setGameModalOpen(true);
            }}
            title="Switch companion game (Ctrl+K)"
            aria-label={`Current game: ${activeGamePack.shortTitle || activeGamePack.name}. Press to search all 10 games.`}
          >
            <Gamepad2 size={15} className="game-switch-icon" />
            <span className="game-switch-label">{activeGamePack.shortTitle || activeGamePack.name}</span>
            <span className="game-switch-badge">10 Games</span>
            <span className="kbd-hint" aria-hidden="true">Ctrl K</span>
          </button>

          {/* Desktop Color-Coded Tool Navigation (>860px) */}
          {activeGameId === 'gta-6' ? (
            <nav className="mode-rail desktop-only-rail" aria-label="GTA VI companion tools">
              <button
                type="button"
                data-accent="ocean"
                aria-current={activeTab === 'storage' ? 'page' : undefined}
                className={`mode-tab ${activeTab === 'storage' ? 'active' : ''}`}
                onClick={() => switchTab('storage', 680)}
              >
                <HardDrive size={16} className="mode-tab-icon" />
                <span>212 GB Check</span>
              </button>

              <button
                type="button"
                data-accent="teal"
                aria-current={activeTab === 'safes' ? 'page' : undefined}
                className={`mode-tab ${activeTab === 'safes' ? 'active' : ''}`}
                onClick={() => switchTab('safes', 710)}
              >
                <KeyRound size={16} className="mode-tab-icon" />
                <span>Safe Codes</span>
              </button>

              <button
                type="button"
                data-accent="gold"
                aria-current={activeTab === 'squad' ? 'page' : undefined}
                className={`mode-tab ${activeTab === 'squad' ? 'active' : ''}`}
                onClick={() => switchTab('squad', 740)}
              >
                <Calculator size={16} className="mode-tab-icon" />
                <span>Heist Split</span>
              </button>

              <button
                type="button"
                data-accent="coral"
                aria-current={activeTab === 'nightrun' ? 'page' : undefined}
                className={`mode-tab ${activeTab === 'nightrun' ? 'active' : ''}`}
                onClick={() => switchTab('nightrun', 770)}
              >
                <Compass size={16} className="mode-tab-icon" />
                <span>Night Run</span>
              </button>
            </nav>
          ) : (
            <nav className="mode-rail desktop-only-rail" aria-label="Game companion navigation">
              <button
                type="button"
                className="mode-tab"
                onClick={() => switchGame('gta-6', 700)}
              >
                <Gamepad2 size={16} className="mode-tab-icon" />
                <span>← GTA VI Tools</span>
              </button>
              <button
                type="button"
                className="mode-tab active"
                onClick={() => {
                  playSwitchTick(soundEnabled, 720);
                  setGameModalOpen(true);
                }}
              >
                <Sparkles size={16} className="mode-tab-icon" style={{ color: activeGamePack.accentColor }} />
                <span>{activeGamePack.shortTitle} Deck</span>
              </button>
            </nav>
          )}

          <div className="topbar-controls">
            {activeGameId === 'gta-6' && (
              <span className="nz-hud-pill" title="New Zealand rolling midnight unlock countdown">
                <span className="nz-live-dot" />
                <span className="nz-full-text">NZ Unlock: {nzCountdown}</span>
                <span className="nz-compact-text">{nzCountdown.split(' ').slice(0, 2).join(' ')}</span>
              </span>
            )}

            <button
              type="button"
              className="tactile-icon-btn"
              title={theme === 'coastal' ? 'Switch to Warm Sunset palette' : 'Switch to Cool Coastal palette'}
              aria-label={theme === 'coastal' ? 'Switch to Warm Sunset palette' : 'Switch to Cool Coastal palette'}
              onClick={() => {
                const next = theme === 'coastal' ? 'sunset' : 'coastal';
                playSwitchTick(soundEnabled, 750);
                setTheme(next);
              }}
            >
              {theme === 'coastal' ? <Sunrise size={16} color="var(--coral)" /> : <Sun size={16} color="var(--ocean)" />}
            </button>

            <button
              type="button"
              className="tactile-icon-btn"
              title={soundEnabled ? 'Mute sound effects' : 'Enable keypad sound effects'}
              aria-label={soundEnabled ? 'Mute sound effects' : 'Enable keypad sound effects'}
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) playSwitchTick(true, 760);
              }}
            >
              {soundEnabled ? <Volume2 size={16} color="var(--teal)" /> : <VolumeX size={16} />}
            </button>

            <button
              type="button"
              className={`tactile-icon-btn ${isPro ? 'sync-pill-pro' : 'pass-header-btn'}`}
              onClick={() => {
                playSwitchTick(soundEnabled, 780);
                setReturningBuyerView(false);
                setProModalOpen(true);
              }}
            >
              <Link2 size={14} />
              <span className="pass-full-label">
                {isPro ? `UP-••••${deckCode.slice(-4)}` : `Full Pass $${runtimeConfig.passPriceUsd}`}
              </span>
              <span className="pass-short-label">
                {isPro ? 'Synced' : `$${runtimeConfig.passPriceUsd}`}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* 1-Click Top-10 Quick Game Dock (Crawlable <a href> Links + <=2-Click Depth) */}
      <div className="quick-game-dock-wrap">
        <nav className="quick-game-dock" aria-label="Quick switch top 10 games">
          <span className="quick-dock-eyebrow">Top 10 Games:</span>
          {TOP_GAMES.map((g) => {
            const selected = g.id === activeGameId;
            const href = g.id === 'gta-6' ? '/' : `/?game=${g.id}`;
            return (
              <a
                key={g.id}
                href={href}
                className={`quick-game-pill ${selected ? 'active' : ''}`}
                aria-current={selected ? 'page' : undefined}
                onClick={(e) => {
                  if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) {
                    e.preventDefault();
                    switchGame(g.id, 715);
                  }
                }}
              >
                <span
                  className="quick-game-dot"
                  style={{ backgroundColor: selected ? '#FFFFFF' : g.accentColor }}
                  aria-hidden="true"
                />
                <span>{g.shortTitle}</span>
              </a>
            );
          })}
        </nav>
      </div>

      {/* Mobile Fixed Bottom Navigation (<=860px) */}
      {activeGameId === 'gta-6' ? (
        <nav className="mobile-bottom-rail" aria-label="Mobile companion tools">
          <button
            type="button"
            aria-current={activeTab === 'storage' ? 'page' : undefined}
            className={`mode-tab ${activeTab === 'storage' ? 'active' : ''}`}
            onClick={() => switchTab('storage', 680)}
          >
            <HardDrive size={17} className="mode-tab-icon" />
            <span>212 GB</span>
          </button>

          <button
            type="button"
            aria-current={activeTab === 'safes' ? 'page' : undefined}
            className={`mode-tab ${activeTab === 'safes' ? 'active' : ''}`}
            onClick={() => switchTab('safes', 710)}
          >
            <KeyRound size={17} className="mode-tab-icon" />
            <span>Safe Codes</span>
          </button>

          <button
            type="button"
            aria-current={activeTab === 'squad' ? 'page' : undefined}
            className={`mode-tab ${activeTab === 'squad' ? 'active' : ''}`}
            onClick={() => switchTab('squad', 740)}
          >
            <Calculator size={17} className="mode-tab-icon" />
            <span>Heist Split</span>
          </button>

          <button
            type="button"
            aria-current={activeTab === 'nightrun' ? 'page' : undefined}
            className={`mode-tab ${activeTab === 'nightrun' ? 'active' : ''}`}
            onClick={() => switchTab('nightrun', 770)}
          >
            <Compass size={17} className="mode-tab-icon" />
            <span>Night Run</span>
          </button>
        </nav>
      ) : (
        <nav
          className="mobile-bottom-rail"
          style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}
          aria-label="Mobile companion tools"
        >
          <button
            type="button"
            className="mode-tab"
            onClick={() => switchGame('gta-6', 700)}
          >
            <Gamepad2 size={17} className="mode-tab-icon" />
            <span>GTA VI Tools</span>
          </button>

          <button
            type="button"
            className="mode-tab active"
            onClick={() => {
              playSwitchTick(soundEnabled, 720);
              setGameModalOpen(true);
            }}
          >
            <Sparkles size={17} className="mode-tab-icon" />
            <span>10 Games</span>
          </button>

          <button
            type="button"
            className="mode-tab"
            onClick={() => {
              playSwitchTick(soundEnabled, 760);
              setReturningBuyerView(false);
              setProModalOpen(true);
            }}
          >
            <Link2 size={17} className="mode-tab-icon" />
            <span>{isPro ? 'Synced' : `Pass $${runtimeConfig.passPriceUsd}`}</span>
          </button>
        </nav>
      )}

      <div className="app-shell">
        <main>
          <div
            key={`${activeGameId}-${activeGameId === 'gta-6' ? activeTab : 'suite'}`}
            className="deck-stage-transition"
          >
            {activeGameId !== 'gta-6' ? (
              <MultiGameToolDeck
                game={activeGamePack}
                isPro={isPro}
                onOpenProModal={() => {
                  setReturningBuyerView(false);
                  setProModalOpen(true);
                }}
                soundEnabled={soundEnabled}
                savedPins={savedPins}
                onSavePin={addSavedPin}
                onRemovePin={removeSavedPin}
              />
            ) : (
              <>
                {activeTab === 'storage' && (
                  <StorageUnlockDeck
                    gamePack={activeGamePack}
                    runtimeConfig={runtimeConfig}
                    soundEnabled={soundEnabled}
                    nowMs={nowMs}
                  />
                )}

                {activeTab === 'safes' && (
                  <SafeKeypadVault
                    gamePack={activeGamePack}
                    crackedSafeIds={crackedSafeIds}
                    onToggleSafe={toggleSafe}
                    soundEnabled={soundEnabled}
                    isPro={isPro}
                    isPreLaunch={isPreLaunch}
                    initialQuery={safeSearchQuery}
                    onOpenProModal={() => {
                      setReturningBuyerView(false);
                      setProModalOpen(true);
                    }}
                  />
                )}

                {activeTab === 'squad' && (
                  <SquadHeistMarketDeck gamePack={activeGamePack} soundEnabled={soundEnabled} />
                )}

                {activeTab === 'nightrun' && (
                  <NightRunProDeck
                    gamePack={activeGamePack}
                    isPro={isPro}
                    isPreLaunch={isPreLaunch}
                    deckCode={deckCode}
                    checkedRouteIds={checkedRouteIds}
                    onToggleRouteStop={toggleRouteStop}
                    onOpenProModal={() => {
                      setReturningBuyerView(false);
                      setProModalOpen(true);
                    }}
                    runtimeConfig={runtimeConfig}
                    soundEnabled={soundEnabled}
                  />
                )}
              </>
            )}
          </div>

          {/* Dynamic Per-Game Answer-First Editorial Guide & Buyer Confidence Strip */}
          <section aria-label="Quick companion answers" className="trust-faq-grid">
            {activeFaqs.map((faqItem) => (
              <article key={faqItem.q} className="trust-card">
                <h2>{faqItem.q}</h2>
                <p>{faqItem.a}</p>
              </article>
            ))}

            <article className="trust-card">
              <h2>How does the ${runtimeConfig.passPriceUsd} All-Access sync work?</h2>
              <p>
                Pay once with Apple Pay or card to get a permanent <code>UP-XXXXXXXX</code> sync link. Open it on your phone and PC to mirror safe checklists, Pro Meta tables, and pinned targets across all 10 games with zero login.
              </p>
            </article>
          </section>
        </main>

        <footer
          style={{
            marginTop: 26,
            paddingTop: 18,
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            fontSize: '0.79rem',
            color: 'var(--ink-muted)',
          }}
        >
          <div style={{ lineHeight: 1.55 }}>
            <strong style={{ color: 'var(--ink-primary)' }}>playunpause.com</strong> is an independent, unofficial read-only browser calculator &amp; reference utility (we do not sell game software, cheats, mods, or in-game currency) and is not affiliated with, endorsed, or sponsored by Take-Two Interactive, Rockstar Games, Activision, Epic Games, Electronic Arts, Respawn, Valve, Riot Games, Roblox Corp., Sony Interactive Entertainment, or Microsoft.{' '}
            <strong>NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.</strong>{' '}
            IP / DMCA:{' '}
            <a href="mailto:dmca@playunpause.com" style={{ color: 'var(--ocean)', fontWeight: 600, textDecoration: 'none' }}>
              dmca@playunpause.com
            </a>
            .
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <nav aria-label="Legal and buyer policies" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <a
                href="/?legal=terms"
                onClick={(e) => {
                  e.preventDefault();
                  openLegalSection('terms');
                }}
                style={{ color: 'var(--ink-secondary)', fontWeight: 600, textDecoration: 'none' }}
              >
                Terms of Service
              </a>
              <a
                href="/?legal=privacy"
                onClick={(e) => {
                  e.preventDefault();
                  openLegalSection('privacy');
                }}
                style={{ color: 'var(--ink-secondary)', fontWeight: 600, textDecoration: 'none' }}
              >
                Privacy (POPIA · GDPR)
              </a>
              <a
                href="/?legal=refunds"
                onClick={(e) => {
                  e.preventDefault();
                  openLegalSection('refunds');
                }}
                style={{ color: 'var(--ink-secondary)', fontWeight: 600, textDecoration: 'none' }}
              >
                14-Day Refund Policy
              </a>
              <a
                href="/?legal=ip"
                onClick={(e) => {
                  e.preventDefault();
                  openLegalSection('ip');
                }}
                style={{ color: 'var(--ink-secondary)', fontWeight: 600, textDecoration: 'none' }}
              >
                IP &amp; Affiliate Disclosure
              </a>
            </nav>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <a
                href={`mailto:${runtimeConfig.supportEmail}`}
                style={{ color: 'var(--ocean)', fontWeight: 600, textDecoration: 'none' }}
              >
                {runtimeConfig.supportEmail}
              </a>
              <button
                type="button"
                className="subtle-pill-btn"
                onClick={() => {
                  playSwitchTick(soundEnabled, 740);
                  setSponsorModalOpen(true);
                }}
              >
                <Megaphone size={13} color="var(--coral)" aria-hidden="true" />
                <span>Sponsor Top Bar (${runtimeConfig.sponsorPriceUsd}/day)</span>
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* Modal 1: Full Pass & Device Sync */}
      {proModalOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pro-modal-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModals();
          }}
        >
          <div className="modal-card" ref={modalCardRef}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <h2
                id="pro-modal-title"
                style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.26rem', fontWeight: 700, letterSpacing: '-0.022em' }}
              >
                {isPro
                  ? `Active Pass: ${deckCode}`
                  : returningBuyerView
                    ? 'Claim your sync code'
                    : `Unpause One-Time All-Access Pass ($${runtimeConfig.passPriceUsd})`}
              </h2>
              <button
                type="button"
                className="tactile-icon-btn"
                aria-label="Close dialog"
                onClick={closeModals}
              >
                <X size={16} />
              </button>
            </div>

            {isPro && (
              <div
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: 'var(--teal-soft)',
                  border: '1px solid var(--teal)',
                  marginBottom: 16,
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--teal-dark)', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <CheckCircle2 size={17} /> Active on this device with zero login
                </div>
                <p style={{ margin: '6px 0 12px', fontSize: '0.87rem', color: 'var(--ink-primary)', lineHeight: 1.5 }}>
                  Open <strong>playunpause.com/#sync={deckCode}</strong> on your phone or PC to mirror every checked safe, route stop, and pinned target automatically.
                </p>
                <button type="button" className="secondary-key-btn" onClick={shareMagicSyncUrl} style={{ width: '100%' }}>
                  <Share2 size={15} />
                  <span>Copy or share sync link</span>
                </button>
              </div>
            )}

            {!isPro && returningBuyerView && (
              <div
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: 'var(--teal-soft)',
                  border: '1px solid var(--teal)',
                  marginBottom: 16,
                  fontSize: '0.88rem',
                }}
              >
                <strong>Thank you for your purchase!</strong> Enter your checkout email or Whop receipt ID (<code>mem_</code> / <code>pay_</code>) below to claim your permanent <strong>UP-XXXXXXXX</strong> code.
              </div>
            )}

            {!isPro && !returningBuyerView && (
              <>
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: 'var(--ocean-soft)',
                    border: '1px solid var(--ocean-border)',
                    marginBottom: 14,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--ocean)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Smartphone size={15} /> Phone + <Monitor size={15} /> PC Sync
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <ShieldCheck size={15} /> One-time purchase · No subscription
                  </span>
                </div>

                <ul style={{ margin: '0 0 16px', paddingLeft: 18, fontSize: '0.89rem', color: 'var(--ink-primary)', lineHeight: 1.62 }}>
                  <li>
                    <strong>Instant Unlock Today (9 Live Game Suites):</strong> CoD BO6/Warzone, Fortnite, Minecraft, FC 25, Roblox, CS2, Valorant, Apex &amp; GTA Online Pro Meta tables
                  </li>
                  <li>
                    <strong>GTA VI Vault &amp; Missables Shield:</strong>{' '}
                    {isPreLaunch
                      ? 'Pre-order access—verified safe codes & spoiler-free checkpoints populate live starting Nov 18 (simulated UI demos live today)'
                      : 'Acts I to III Missables Shield & verified safe codes with spoiler-free pause checkpoints'}
                  </li>
                  <li>
                    <strong>Passwordless Phone + PC Cloud Sync:</strong> Mirror checklists &amp; pinned calculator targets across screens via one <code>UP-XXXXXXXX</code> code
                  </li>
                  <li>
                    <strong>Ad-Free Utility Access:</strong> Hides top sponsor banners and delivers 3-second answers for the operational life of playunpause.com
                  </li>
                </ul>

                <a
                  href={runtimeConfig.passCheckoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="primary-coral-btn"
                  style={{ width: '100%', marginBottom: 8 }}
                >
                  <CreditCard size={16} />
                  <span>
                    {isPreLaunch
                      ? `Lock In Founders Pass — $${runtimeConfig.passPriceUsd} (Apple Pay / Card)`
                      : `Unlock One-Time Pass — $${runtimeConfig.passPriceUsd} (Apple Pay / Card)`}
                  </span>
                  <ExternalLink size={15} />
                </a>
                <div style={{ textAlign: 'center', fontSize: '0.76rem', color: 'var(--ink-muted)', lineHeight: 1.5, marginBottom: 14 }}>
                  <div>
                    {isPreLaunch
                      ? `Founders rate $${runtimeConfig.passPriceUsd} USD before Nov 18 ($${runtimeConfig.launchPriceUsd} standard). Instant digital unlock · Statement: WHOP*PLAYUNPAUSE.`
                      : `One-time $${runtimeConfig.passPriceUsd} USD payment · Instant digital unlock · Statement: WHOP*PLAYUNPAUSE.`}
                  </div>
                  <div style={{ marginTop: 3 }}>
                    <strong>14-day hassle-free refund</strong> via {runtimeConfig.supportEmail} ·{' '}
                    <button
                      type="button"
                      onClick={() => openLegalSection('terms')}
                      style={{ background: 'none', border: 'none', padding: 0, color: 'var(--ocean)', fontWeight: 600, fontSize: 'inherit', textDecoration: 'underline' }}
                    >
                      Terms
                    </button>
                    {' · '}
                    <button
                      type="button"
                      onClick={() => openLegalSection('privacy')}
                      style={{ background: 'none', border: 'none', padding: 0, color: 'var(--ocean)', fontWeight: 600, fontSize: 'inherit', textDecoration: 'underline' }}
                    >
                      Privacy
                    </button>
                    {' · '}
                    <button
                      type="button"
                      onClick={() => openLegalSection('refunds')}
                      style={{ background: 'none', border: 'none', padding: 0, color: 'var(--ocean)', fontWeight: 600, fontSize: 'inherit', textDecoration: 'underline' }}
                    >
                      Refund Policy
                    </button>
                  </div>
                </div>
              </>
            )}

            <form
              onSubmit={(e) => handleActivateSubmit(e, false)}
              style={{
                paddingTop: 14,
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <label
                htmlFor="sync-claim-input"
                style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: 8 }}
              >
                {isPro
                  ? 'Load a different UP-XXXXXXXX sync code:'
                  : 'Already purchased? Enter your UP-XXXXXXXX code, checkout email, or receipt ID:'}
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  id="sync-claim-input"
                  type="text"
                  autoComplete="email"
                  className="deck-input no-icon"
                  style={{ flex: '1 1 190px' }}
                  placeholder="UP-7K4M9P2X or checkout email"
                  value={activateInput}
                  onChange={(e) => setActivateInput(e.target.value)}
                />
                <button type="submit" className="secondary-key-btn" disabled={activateStatus.loading}>
                  {activateStatus.loading ? 'Checking...' : 'Activate'}
                </button>
              </div>

              {!isPro && returningBuyerView && (
                <button
                  type="button"
                  className="subtle-pill-btn"
                  style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}
                  onClick={() => setReturningBuyerView(false)}
                >
                  Need to complete checkout first? View Full Pass details
                </button>
              )}

              {runtimeConfig.demoUnlockEnabled && !isPro && (
                <button
                  type="button"
                  className="subtle-pill-btn"
                  style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}
                  onClick={() => handleActivateSubmit(null, true)}
                >
                  Local Preview: Generate test UP-XXXXXXXX sync code
                </button>
              )}

              {activateStatus.error && (
                <p style={{ color: 'var(--coral)', fontSize: '0.84rem', fontWeight: 600, margin: '10px 0 0' }}>
                  {activateStatus.error}
                </p>
              )}
              {activateStatus.success && (
                <p style={{ color: 'var(--teal-dark)', fontSize: '0.85rem', fontWeight: 600, margin: '10px 0 0' }}>
                  {activateStatus.success}
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: 24-Hour Sponsor Slot */}
      {sponsorModalOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sponsor-modal-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModals();
          }}
        >
          <div className="modal-card" ref={modalCardRef}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2
                id="sponsor-modal-title"
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Megaphone size={18} color="var(--coral)" />
                Sponsor the top bar for 24 hours
              </h2>
              <button
                type="button"
                className="tactile-icon-btn"
                aria-label="Close sponsor dialog"
                onClick={closeModals}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'var(--ink-secondary)', lineHeight: 1.55 }}>
              Place your gaming hardware deal, SSD promotion, creator stream, or community server at the top of <strong>playunpause.com</strong> for 24 hours.
            </p>

            <ul style={{ margin: '0 0 14px', paddingLeft: 18, fontSize: '0.87rem', lineHeight: 1.6 }}>
              <li><strong>Single exclusive header banner</strong> across desktop and mobile (badged <strong>Sponsored</strong>)</li>
              <li>Clean headline copy (up to 60 characters) + direct <code>https://</code> link</li>
              <li>Book below, then send your link and copy to <strong>{runtimeConfig.sponsorEmail}</strong></li>
            </ul>

            <div
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                background: 'var(--surface-tint)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.78rem',
                color: 'var(--ink-secondary)',
                lineHeight: 1.5,
                marginBottom: 14,
              }}
            >
              <strong style={{ color: 'var(--ink-primary)' }}>Acceptable Ad &amp; Review Policy:</strong> Placements undergo manual safety review (4–12 hrs). Booked dates queue to the next open 24h window or qualify for a 100% pre-live refund. <strong>Strictly prohibited:</strong> cheats, aimbots, modded accounts, RMT/coin sellers, skin casinos/gambling, crypto/NFTs, URL shorteners, or infringing pages.{' '}
              <button
                type="button"
                onClick={() => openLegalSection('refunds')}
                style={{ background: 'none', border: 'none', padding: 0, color: 'var(--ocean)', fontWeight: 600, fontSize: 'inherit', textDecoration: 'underline' }}
              >
                Full Ad Terms
              </button>
            </div>

            <a
              href={runtimeConfig.sponsorCheckoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="primary-coral-btn"
              style={{ width: '100%' }}
            >
              <span>Reserve 24-Hour Slot (${runtimeConfig.sponsorPriceUsd} USD)</span>
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      )}

      {/* Modal 3: Game Switcher Command Palette (10 Worldwide Titles) */}
      <GameSelectorModal
        isOpen={gameModalOpen}
        onClose={() => setGameModalOpen(false)}
        activeGameId={activeGameId}
        onSelectGame={(gId) => switchGame(gId, 720)}
        soundEnabled={soundEnabled}
        modalRef={modalCardRef}
      />

      {/* Modal 4: Legal, Privacy (POPIA/GDPR/CCPA), Refunds & IP Compliance Center */}
      <LegalComplianceModal
        isOpen={legalModalOpen}
        activeSection={legalSection}
        onSelectSection={(sec) => openLegalSection(sec)}
        onClose={closeModals}
        modalRef={modalCardRef}
        runtimeConfig={runtimeConfig}
        soundEnabled={soundEnabled}
      />
    </>
  );
}
