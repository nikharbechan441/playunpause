import React, { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Lock,
  Radio,
  Search,
  Share2,
  Sliders,
  HardDrive,
  ShieldAlert,
  LayoutDashboard,
  X,
} from 'lucide-react';
import {
  LEONIDA_CHAPTERS,
  LEONIDA_SEARCH_ENTRIES,
  LEONIDA_TABS,
} from '../../data/games/leonidaV2Data.js';
import {
  computeTrackerStats,
  decodeLeonidaShareHash,
  encodeLeonidaShareHash,
  hasSavedLeonidaState,
  loadLeonidaState,
  mapRoutePresetToLeonida,
  sanitizeLeonidaState,
  saveLeonidaState,
} from '../../utils/leonidaState.js';
import { exportLeonidaPassportPng } from '../../utils/leonidaPassportCanvas.js';
import { playSwitchTick, playUnlockChime } from '../../utils/soundHaptics.js';
import LeonidaSessionTab from './leonida/LeonidaSessionTab.jsx';
import LeonidaStorageTab from './leonida/LeonidaStorageTab.jsx';
import LeonidaSettingsTab from './leonida/LeonidaSettingsTab.jsx';
import LeonidaHeatMoneyCheatsTab from './leonida/LeonidaHeatMoneyCheatsTab.jsx';
import LeonidaFixesRadioTab from './leonida/LeonidaFixesRadioTab.jsx';
import LeonidaSessionRail from './leonida/LeonidaSessionRail.jsx';

const TAB_ICONS = {
  session: LayoutDashboard,
  storage: HardDrive,
  settings: Sliders,
  money: ShieldAlert,
  fixes: Radio,
};

function copyWithExecFallback(text) {
  if (typeof document === 'undefined') return false;
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.className = 'lh-clipboard-ghost';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
}

export default function LeonidaCommandCenter({
  activeRoute,
  preset,
  presetKey,
  runtimeConfig,
  soundEnabled = false,
  onNavigatePath,
}) {
  const [initialSetup] = useState(() => {
    const localState = loadLeonidaState();
    const hadLocal = hasSavedLeonidaState();
    const rawHash = typeof window !== 'undefined' ? window.location.hash : '';
    const decoded = decodeLeonidaShareHash(rawHash);
    const mapped = mapRoutePresetToLeonida(activeRoute, preset);
    const routePath = activeRoute?.path || '/';
    const isSpecificStorageScenario =
      routePath.startsWith('/gta-6/storage/') ||
      routePath.startsWith('/gta-6/download-time/') ||
      routePath.startsWith('/gta-6/unlock-time/');

    const baseWithRoute = {
      ...localState,
      tab: mapped.tab,
      ...(mapped.activeFix ? { activeFix: mapped.activeFix } : {}),
      ...(isSpecificStorageScenario && mapped.consoleId ? { consoleId: mapped.consoleId } : {}),
      ...(isSpecificStorageScenario && mapped.mbps ? { mbps: mapped.mbps } : {}),
      ...(isSpecificStorageScenario && typeof mapped.includePatch === 'boolean'
        ? { includePatch: mapped.includePatch }
        : {}),
    };

    if (decoded) {
      if (hadLocal) {
        return {
          state: sanitizeLeonidaState({ ...baseWithRoute, ...decoded }),
          sharedConflict: decoded,
        };
      }
      return {
        state: sanitizeLeonidaState({ ...baseWithRoute, ...decoded }),
        sharedConflict: null,
      };
    }

    return {
      state: sanitizeLeonidaState(baseWithRoute),
      sharedConflict: null,
    };
  });

  const [state, setState] = useState(initialSetup.state);
  const [sharedConflict, setSharedConflict] = useState(initialSetup.sharedConflict);
  const [previewSample, setPreviewSample] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [radioSearchSync, setRadioSearchSync] = useState(() => ({
    query: initialSetup.state.radioQuery || '',
    nonce: 0,
  }));

  const [wakeEnabled, setWakeEnabled] = useState(false);
  const wakeEnabledRef = useRef(false);
  const wakeSentinelRef = useRef(null);

  const [editingSlot, setEditingSlot] = useState(null);
  const [slotDraftLabel, setSlotDraftLabel] = useState('');
  const [slotDraftSaved, setSlotDraftSaved] = useState(false);

  const [toastMsg, setToastMsg] = useState('');
  const toastTimerRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchWrapRef = useRef(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(''), 3200);
  };

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    []
  );

  const latestStateRef = useRef(state);
  const sharedConflictRef = useRef(sharedConflict);
  const saveTimerRef = useRef(null);
  const firstSaveRunRef = useRef(true);

  // Single source of truth for active tab derived from router state
  const routeMapped = useMemo(
    () => mapRoutePresetToLeonida(activeRoute, preset),
    [activeRoute, preset]
  );
  const activeTabId = typeof onNavigatePath === 'function' ? routeMapped.tab : state.tab;

  // Clear stale focus border on any tab button when route changes
  useEffect(() => {
    if (typeof document !== 'undefined' && document.activeElement?.closest?.('.lh-tabs-bar')) {
      document.activeElement.blur();
    }
  }, [activeRoute?.path]);

  // Sync URL route (/, /gta-6/storage, /gta-6/settings, /gta-6/money, /gta-6/robberies, /gta-6/cheats, /gta-6/ultimate, /gta-6/fixes, /gta-6/radio, /gta-6/platinum)
  useEffect(() => {
    const mapped = routeMapped;
    const routePath = activeRoute?.path || '/';
    const isSpecificStorageScenario =
      routePath.startsWith('/gta-6/storage/') ||
      routePath.startsWith('/gta-6/download-time/') ||
      routePath.startsWith('/gta-6/unlock-time/');

    startTransition(() => {
      setState((prev) => {
        const nextConsole =
          isSpecificStorageScenario && mapped.consoleId ? mapped.consoleId : prev.consoleId;
        const nextMbps =
          isSpecificStorageScenario && mapped.mbps ? mapped.mbps : prev.mbps;
        const nextIncludePatch =
          isSpecificStorageScenario && typeof mapped.includePatch === 'boolean'
            ? mapped.includePatch
            : prev.includePatch;
        const nextActiveFix = mapped.activeFix || prev.activeFix;
        if (
          prev.tab === mapped.tab &&
          prev.consoleId === nextConsole &&
          prev.mbps === nextMbps &&
          prev.includePatch === nextIncludePatch &&
          prev.activeFix === nextActiveFix
        ) {
          return prev;
        }
        return {
          ...prev,
          tab: mapped.tab,
          consoleId: nextConsole,
          mbps: nextMbps,
          includePatch: nextIncludePatch,
          activeFix: nextActiveFix,
        };
      });
    });
  }, [activeRoute, presetKey, routeMapped]);

  // Debounced persist to localStorage (ONLY when NOT previewing a shared conflict over existing local data)
  useEffect(() => {
    latestStateRef.current = state;
    sharedConflictRef.current = sharedConflict;
    if (sharedConflict) return undefined;
    if (firstSaveRunRef.current) {
      firstSaveRunRef.current = false;
      return undefined;
    }
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      saveLeonidaState(latestStateRef.current);
    }, 250);
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [state, sharedConflict]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;
    const flushPendingSave = () => {
      if (saveTimerRef.current && !sharedConflictRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        saveLeonidaState(latestStateRef.current);
      }
    };
    const onVisibilityFlush = () => {
      if (document.visibilityState === 'hidden') flushPendingSave();
    };
    window.addEventListener('pagehide', flushPendingSave);
    document.addEventListener('visibilitychange', onVisibilityFlush);
    return () => {
      window.removeEventListener('pagehide', flushPendingSave);
      document.removeEventListener('visibilitychange', onVisibilityFlush);
      flushPendingSave();
    };
  }, []);

  // Handle #s=... hash changes while open
  useEffect(() => {
    const onHashChange = () => {
      const decoded = decodeLeonidaShareHash(window.location.hash || '');
      if (!decoded) return;
      if (hasSavedLeonidaState()) {
        setSharedConflict(decoded);
        setState((prev) => sanitizeLeonidaState({ ...prev, ...decoded }));
      } else {
        setSharedConflict(null);
        setState((prev) => sanitizeLeonidaState({ ...prev, ...decoded }));
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Wake-Lock visibilitychange re-acquire
  useEffect(() => {
    wakeEnabledRef.current = wakeEnabled;
  }, [wakeEnabled]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onVisibilityChange = async () => {
      if (
        wakeEnabledRef.current &&
        document.visibilityState === 'visible' &&
        typeof navigator !== 'undefined' &&
        'wakeLock' in navigator
      ) {
        try {
          wakeSentinelRef.current = await navigator.wakeLock.request('screen');
        } catch {
          // Ignore silent re-acquire rejection
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (wakeSentinelRef.current && typeof wakeSentinelRef.current.release === 'function') {
        wakeSentinelRef.current.release().catch(() => {});
      }
    };
  }, []);

  // Keyboard shortcuts: "/" focuses local Leonida Search ONLY when not inside an input/textarea/select; Ctrl/Cmd+K belongs globally to Game Switcher; Escape closes dropdown & modal
  useEffect(() => {
    const onKeyDown = (e) => {
      const target = e.target;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (e.key === '/' && !isTyping && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
        setEditingSlot(null);
        if (document.activeElement === searchInputRef.current) {
          searchInputRef.current.blur();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Outside click closes search dropdown
  useEffect(() => {
    const onPointerDown = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const searchHits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return LEONIDA_SEARCH_ENTRIES.slice(0, 7);
    const terms = q.split(/\s+/).filter(Boolean);
    return LEONIDA_SEARCH_ENTRIES.filter((entry) => {
      const hay = `${entry.title} ${entry.detail} ${entry.category} ${entry.keywords}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    }).slice(0, 7);
  }, [searchQuery]);

  const handleToggleWakeLock = async () => {
    playSwitchTick(soundEnabled, 740);
    if (wakeEnabled) {
      setWakeEnabled(false);
      if (wakeSentinelRef.current && typeof wakeSentinelRef.current.release === 'function') {
        try {
          await wakeSentinelRef.current.release();
        } catch {
          // Ignore release edge case
        }
        wakeSentinelRef.current = null;
      }
      showToast('Screen Wake Lock released.');
      return;
    }

    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      showToast('Keep Screen On is not supported by this browser.');
      return;
    }

    try {
      const sentinel = await navigator.wakeLock.request('screen');
      wakeSentinelRef.current = sentinel;
      setWakeEnabled(true);
      showToast('Screen On active — display will stay awake.');
    } catch {
      showToast('Could not lock screen wake state on this device.');
    }
  };

  const handleShareHash = async () => {
    playSwitchTick(soundEnabled, 780);
    const hash = encodeLeonidaShareHash(state);
    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://playunpause.com';
    const currentPath = typeof window !== 'undefined' ? window.location.pathname || '/' : '/';
    const currentSearch = typeof window !== 'undefined' ? window.location.search || '' : '';
    const shareUrl = `${origin}${currentPath}${currentSearch}${hash}`;

    let copied = false;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        copied = true;
      } catch {
        copied = false;
      }
    }
    if (!copied) {
      copied = copyWithExecFallback(shareUrl);
    }
    if (typeof window !== 'undefined') {
      try {
        window.history.replaceState({}, '', `${currentPath}${currentSearch}${hash}`);
      } catch {
        // Ignore history restriction
      }
    }
    showToast(
      copied
        ? 'Progress #s= link copied — share cleanly with zero login.'
        : 'Updated URL #s= hash — copy your address bar to share.'
    );
  };

  const handleCopyDiscordSummary = async () => {
    playSwitchTick(soundEnabled, 760);
    const stats = computeTrackerStats(state.counts);
    const chMeta = LEONIDA_CHAPTERS.find((c) => c.id === state.chapter) || LEONIDA_CHAPTERS[0];
    const savedCount = state.saves.filter((s) => s.saved).length;
    const hash = encodeLeonidaShareHash(state);
    const summary = [
      `**GTA VI Leonida Run** · ${stats.totalPct}% Complete (${chMeta.label})`,
      `WAiNK ${state.counts.waink}/200 · Wildlife ${state.counts.wildlife}/100 · Flamingos ${state.counts.flamingos}/100 · Stunts ${state.counts.stunts}/300 · Cards ${state.counts.cards}/15 · Saves ${savedCount}/15`,
      `https://playunpause.com/${hash}`,
    ].join('\n');

    let copied = false;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(summary);
        copied = true;
      } catch {
        copied = false;
      }
    }
    if (!copied) {
      copied = copyWithExecFallback(summary);
    }
    showToast(copied ? 'Discord run summary copied.' : 'Could not access clipboard.');
  };

  const handleKeepMine = () => {
    playSwitchTick(soundEnabled, 660);
    const own = loadLeonidaState();
    setSharedConflict(null);
    setState(own);
    if (typeof window !== 'undefined') {
      try {
        window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`);
      } catch {
        // Ignore
      }
    }
    showToast('Restored your saved local Leonida run.');
  };

  const handleReplaceWithShared = () => {
    playUnlockChime(soundEnabled);
    setSharedConflict(null);
    saveLeonidaState(state);
    if (typeof window !== 'undefined') {
      try {
        window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`);
      } catch {
        // Ignore
      }
    }
    showToast('Replaced local data with shared Leonida run.');
  };

  const switchTab = (tabId) => {
    playSwitchTick(soundEnabled, 660);
    startTransition(() => {
      setState((prev) => ({ ...prev, tab: tabId }));
    });
    const targetTab = LEONIDA_TABS.find((t) => t.id === tabId);
    if (targetTab && typeof onNavigatePath === 'function') {
      onNavigatePath(targetTab.path, { scrollToTop: false });
    }
  };

  const handleSelectSearchHit = (hit) => {
    playSwitchTick(soundEnabled, 740);
    const nextRadioFilter =
      hit.radioFilter !== undefined
        ? hit.radioFilter
        : hit.category === 'Radio'
          ? hit.title
          : undefined;
    if (nextRadioFilter !== undefined) {
      setRadioSearchSync((prev) => ({
        query: String(nextRadioFilter).slice(0, 60),
        nonce: prev.nonce + 1,
      }));
    }
    startTransition(() => {
      setState((prev) => ({
        ...prev,
        tab: hit.tab,
        activeFix: hit.activeFix || prev.activeFix,
      }));
    });
    const targetTab = LEONIDA_TABS.find((t) => t.id === hit.tab);
    if (targetTab && typeof onNavigatePath === 'function') {
      onNavigatePath(targetTab.path, { scrollToTop: false });
    }
    setSearchOpen(false);
    setSearchQuery('');
  };

  const handleJumpToPill = (pill) => {
    playSwitchTick(soundEnabled, 700);
    startTransition(() => {
      setState((prev) => ({
        ...prev,
        tab: pill.tab,
        activeFix: pill.activeFix || prev.activeFix,
      }));
    });
    const targetTab = LEONIDA_TABS.find((t) => t.id === pill.tab);
    if (targetTab && typeof onNavigatePath === 'function') {
      onNavigatePath(targetTab.path, { scrollToTop: false });
    }
  };

  const handleAdjustCount = (key, delta) => {
    playSwitchTick(soundEnabled, delta > 0 ? 780 : 620);
    setState((prev) => {
      const nextCounts = {
        ...prev.counts,
        [key]: (prev.counts[key] || 0) + delta,
      };
      return sanitizeLeonidaState({ ...prev, counts: nextCounts });
    });
  };

  const handleSetCount = (key, rawVal) => {
    const parsed = Number(rawVal);
    if (!Number.isFinite(parsed)) return;
    setState((prev) => {
      const nextCounts = {
        ...prev.counts,
        [key]: Math.round(parsed),
      };
      return sanitizeLeonidaState({ ...prev, counts: nextCounts });
    });
  };

  const handleOpenSlotModal = (slotObj) => {
    playSwitchTick(soundEnabled, 680);
    setEditingSlot(slotObj.slot);
    setSlotDraftLabel(slotObj.label);
    setSlotDraftSaved(Boolean(slotObj.saved));
  };

  const handleSaveSlotModal = (e) => {
    e.preventDefault();
    if (!editingSlot) return;
    playUnlockChime(soundEnabled);
    setState((prev) =>
      sanitizeLeonidaState({
        ...prev,
        saves: prev.saves.map((s) =>
          s.slot === editingSlot
            ? { ...s, label: slotDraftLabel.trim().slice(0, 32) || s.label, saved: slotDraftSaved }
            : s
        ),
      })
    );
    setEditingSlot(null);
    showToast(`Updated Manual Save Slot #${String(editingSlot).padStart(2, '0')}.`);
  };

  const handleToggleInstalledGame = (gameId) => {
    playSwitchTick(soundEnabled, 700);
    setState((prev) => {
      const exists = prev.installedGames.includes(gameId);
      const nextGames = exists
        ? prev.installedGames.filter((id) => id !== gameId)
        : [...prev.installedGames, gameId];
      return { ...prev, installedGames: nextGames };
    });
  };

  const handleToggleCheckedCheat = (cheatId) => {
    playSwitchTick(soundEnabled, 760);
    setState((prev) => {
      const current = Array.isArray(prev.checkedCheats) ? prev.checkedCheats : [];
      const exists = current.includes(cheatId);
      return {
        ...prev,
        checkedCheats: exists
          ? current.filter((id) => id !== cheatId)
          : [...current, cheatId],
      };
    });
  };

  const handleExportPng = async () => {
    playUnlockChime(soundEnabled);
    setIsExporting(true);
    try {
      const ok = await exportLeonidaPassportPng({
        state,
        previewSample,
        bannerSrc: '/images/leonida-banner.jpg',
      });
      showToast(ok ? '9:16 Flex Card PNG exported.' : 'PNG export unavailable in this browser.');
    } catch {
      showToast('Could not generate 9:16 Flex Card PNG.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="leonida-hud-root">
      {/* Non-Destructive Shared Link Gold Top Banner */}
      {sharedConflict && (
        <div className="lh-shared-banner" role="region" aria-label="Shared progress link notice">
          <span>Viewing a shared Leonida progress link. Your own saved progress is untouched.</span>
          <div className="lh-shared-banner-actions">
            <button
              type="button"
              className="lh-btn primary-gold lh-pressable"
              onClick={handleKeepMine}
            >
              Keep Mine
            </button>
            <button
              type="button"
              className="lh-btn active-teal lh-pressable"
              onClick={handleReplaceWithShared}
            >
              Replace With Shared
            </button>
          </div>
        </div>
      )}

      {/* Atmospheric Header Banner + Persistent Top HUD Bar + 5 Operate-Mode Tabs */}
      <section className="lh-hud-header-card" aria-label="Leonida Command Center HUD">
        <div className="lh-hero-banner-wrap">
          <div className="lh-hero-banner-bg" aria-hidden="true">
            <img
              src="/images/leonida-banner.jpg"
              alt=""
              className="lh-hero-banner-img"
            />
            <div className="lh-hero-banner-scrim" />
          </div>

          <div className="lh-top-hud-row">
            <div>
              {activeRoute?.h1 && activeRoute?.path && activeRoute.path !== '/' && activeRoute.path !== '/gta-6' ? (
                <>
                  <span className="lh-brand-kicker">
                    PLAYUNPAUSE <span className="lh-h1-slash">/</span> LEONIDA HUB
                  </span>
                  <h1 className="lh-brand-h1">{activeRoute.h1}</h1>
                </>
              ) : (
                <h1 className="lh-brand-h1">
                  PLAYUNPAUSE <span className="lh-h1-slash">/</span> GTA VI LEONIDA HUB
                </h1>
              )}
            </div>

            {/* Global Instant Search */}
            <div className="lh-search-wrap" ref={searchWrapRef}>
              <div className="lh-search-input-box">
                <Search size={15} className="lh-search-icon" aria-hidden="true" />
                <input
                  ref={searchInputRef}
                  type="search"
                  className="lh-search-input"
                  aria-label="Global instant Leonida search"
                  placeholder="Search fixes, cheats, radio..."
                  value={searchQuery}
                  onFocus={() => setSearchOpen(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                />
                <span className="lh-search-kbd" aria-hidden="true">
                  /
                </span>
              </div>

              {searchOpen && (
                <div className="lh-search-dropdown" role="listbox" aria-label="Instant search results">
                  {searchHits.length === 0 ? (
                    <div style={{ padding: '12px', fontSize: '0.82rem', color: 'var(--lh-slate)' }}>
                      No matching fixes, settings, heat factors, or radio stations.
                    </div>
                  ) : (
                    searchHits.map((hit) => (
                      <button
                        key={hit.id}
                        type="button"
                        role="option"
                        className="lh-search-hit-btn"
                        onClick={() => handleSelectSearchHit(hit)}
                      >
                        <div>
                          <span className="lh-search-hit-title">{hit.title}</span>
                          <span className="lh-search-hit-detail">{hit.detail}</span>
                        </div>
                        <span className="lh-search-hit-cat">{hit.category}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Right: Spoiler-Shield + Wake-Lock + Share */}
            <div className="lh-hud-actions-right">
              <div className="lh-shield-group" role="group" aria-label="Chapter Spoiler Shield">
                {LEONIDA_CHAPTERS.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    aria-pressed={state.chapter === ch.id}
                    className={`lh-shield-pill lh-pressable ${state.chapter === ch.id ? 'active' : ''}`}
                    title={ch.title}
                    onClick={() => {
                      playSwitchTick(soundEnabled, 720);
                      setState((prev) => ({ ...prev, chapter: ch.id }));
                    }}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                aria-pressed={wakeEnabled}
                className={`lh-hud-btn lh-pressable ${wakeEnabled ? 'active-teal' : ''}`}
                onClick={handleToggleWakeLock}
              >
                {wakeEnabled && <span className="lh-teal-dot" aria-hidden="true" />}
                <span>{wakeEnabled ? 'Screen On ✓' : 'Keep Screen On'}</span>
              </button>

              <button
                type="button"
                className="lh-hud-btn lh-pressable"
                onClick={handleShareHash}
              >
                <Share2 size={14} aria-hidden="true" />
                <span>Share</span>
              </button>

              <button
                type="button"
                className="lh-hud-btn lh-pressable"
                onClick={handleCopyDiscordSummary}
              >
                <Copy size={14} aria-hidden="true" />
                <span>Discord</span>
              </button>
            </div>
          </div>
        </div>

        {/* 5 Horizontal Operate-Mode Tabs (crawlable <a> links for Googlebot WRS) */}
        <nav className="lh-tabs-bar" role="tablist" aria-label="Leonida Command Center Tabs">
          {LEONIDA_TABS.map((t) => {
            const IconComp = TAB_ICONS[t.id] || LayoutDashboard;
            const active = activeTabId === t.id;
            return (
              <a
                key={t.id}
                href={t.path}
                role="tab"
                aria-selected={active}
                className={`lh-mode-tab lh-pressable ${active ? 'active' : ''}`}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  e.preventDefault();
                  switchTab(t.id);
                }}
              >
                <IconComp size={15} aria-hidden="true" />
                <span>{t.label}</span>
              </a>
            );
          })}
        </nav>
      </section>

      {/* Desktop 2-Column Bento Layout: 8-Col Workbench + 4-Col Sticky Right Session Rail */}
      <div className="lh-bento-grid">
        <div className="lh-workbench-col" role="tabpanel">
          {activeTabId === 'session' && (
            <LeonidaSessionTab
              state={state}
              onJumpToPill={handleJumpToPill}
              onAdjustCount={handleAdjustCount}
              onSetCount={handleSetCount}
              onToggleBalcony={() => {
                playUnlockChime(soundEnabled);
                setState((prev) => ({ ...prev, balconyDone: !prev.balconyDone }));
              }}
              onSelectPace={(paceId) => {
                playSwitchTick(soundEnabled, 690);
                setState((prev) => ({ ...prev, pace: paceId }));
              }}
              onChangeHoursPerDay={(raw) => {
                const n = Number(raw);
                const nextHours = Number.isFinite(n)
                  ? Math.round(Math.max(0.5, Math.min(16, n)) * 2) / 2
                  : 2.5;
                setState((prev) => ({ ...prev, hoursPerDay: nextHours }));
              }}
              onOpenSlotModal={handleOpenSlotModal}
            />
          )}

          {activeTabId === 'storage' && (
            <LeonidaStorageTab
              state={state}
              runtimeConfig={runtimeConfig}
              onTogglePatch={() => {
                playSwitchTick(soundEnabled, 720);
                setState((prev) => ({ ...prev, includePatch: !prev.includePatch }));
              }}
              onSelectConsole={(consoleId) => {
                playSwitchTick(soundEnabled, 700);
                setState((prev) => ({ ...prev, consoleId }));
              }}
              onToggleInstalledGame={handleToggleInstalledGame}
              onChangeOtherUsedGb={(gb) => {
                const n = Number(gb);
                const nextGb = Number.isFinite(n) ? Math.max(0, Math.min(600, Math.round(n))) : 0;
                setState((prev) => ({ ...prev, otherUsedGb: nextGb }));
              }}
              onChangeMbps={(mbps) => {
                const n = Number(mbps);
                const nextMbps = Number.isFinite(n) ? Math.max(5, Math.min(2500, Math.round(n))) : 100;
                setState((prev) => ({ ...prev, mbps: nextMbps }));
              }}
            />
          )}

          {activeTabId === 'settings' && (
            <LeonidaSettingsTab
              state={state}
              onSelectSetConsole={(setConsole) => {
                playSwitchTick(soundEnabled, 700);
                setState((prev) => ({ ...prev, setConsole }));
              }}
              onSelectSetTv={(setTv) => {
                playSwitchTick(soundEnabled, 700);
                setState((prev) => ({ ...prev, setTv }));
              }}
              onSelectSetStyle={(setStyle) => {
                playSwitchTick(soundEnabled, 700);
                setState((prev) => ({ ...prev, setStyle }));
              }}
              onToggleSettingItem={(itemId) => {
                playSwitchTick(soundEnabled, 760);
                setState((prev) => {
                  const exists = prev.checkedSettings.includes(itemId);
                  return {
                    ...prev,
                    checkedSettings: exists
                      ? prev.checkedSettings.filter((id) => id !== itemId)
                      : [...prev.checkedSettings, itemId],
                  };
                });
              }}
            />
          )}

          {activeTabId === 'money' && (
            <LeonidaHeatMoneyCheatsTab
              state={state}
              activeRoutePath={activeRoute?.path || '/gta-6'}
              onSelectStarState={(starState) => {
                playSwitchTick(soundEnabled, 700);
                setState((prev) => ({ ...prev, starState }));
              }}
              onToggleHeatFactor={(factorId) => {
                playSwitchTick(soundEnabled, 720);
                setState((prev) => {
                  const exists = prev.activeHeat.includes(factorId);
                  return {
                    ...prev,
                    activeHeat: exists
                      ? prev.activeHeat.filter((id) => id !== factorId)
                      : [...prev.activeHeat, factorId],
                  };
                });
              }}
              onSelectProfileTier={(profileTier) => {
                playSwitchTick(soundEnabled, profileTier === 'psycho' || profileTier === 'irred' ? 560 : 720);
                setState((prev) => ({ ...prev, profileTier }));
              }}
              onToggleCheckedCheat={handleToggleCheckedCheat}
              onShowToast={showToast}
            />
          )}

          {activeTabId === 'fixes' && (
            <LeonidaFixesRadioTab
              state={state}
              activeRoutePath={activeRoute?.path || '/gta-6'}
              externalRadioQuery={radioSearchSync.query}
              externalRadioNonce={radioSearchSync.nonce}
              onSelectFix={(activeFix) => {
                playSwitchTick(soundEnabled, 700);
                setState((prev) => ({ ...prev, activeFix }));
              }}
            />
          )}
        </div>

        {/* Sticky 4-Column Session Rail */}
        <LeonidaSessionRail
          state={state}
          runtimeConfig={runtimeConfig}
          previewSample={previewSample}
          isExporting={isExporting}
          hideMiniStorage={activeTabId === 'storage'}
          onSelectConsole={(consoleId) => {
            playSwitchTick(soundEnabled, 700);
            setState((prev) => ({ ...prev, consoleId }));
          }}
          onToggleInstalledGame={handleToggleInstalledGame}
          onTogglePreviewSample={() => {
            playSwitchTick(soundEnabled, 720);
            setPreviewSample((p) => !p);
          }}
          onExportPng={handleExportPng}
        />
      </div>

      {/* Crawlable GTA VI Sub-Hub Quick Links */}
      <nav className="lh-subhub-links" aria-label="GTA VI Tools">
        {[
          { path: '/gta-6/storage', label: 'Storage Fit' },
          { path: '/gta-6/cheats', label: 'Pure D-Pad Cheats' },
          { path: '/gta-6/money', label: 'Money & Heat' },
          { path: '/gta-6/robberies', label: 'Robberies & Keypads' },
          { path: '/gta-6/settings', label: '30FPS Settings' },
          { path: '/gta-6/platinum', label: '100% Platinum' },
          { path: '/gta-6/fixes', label: 'Patch 01.002.002 & Fixes' },
          { path: '/gta-6/radio', label: '23 Radio Stations' },
        ].map((link) => (
          <a
            key={link.path}
            href={link.path}
            className={`lh-subhub-link ${activeRoute?.path === link.path ? 'active' : ''}`}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
              if (typeof onNavigatePath === 'function') {
                e.preventDefault();
                onNavigatePath(link.path, { scrollToTop: false });
              }
            }}
          >
            {link.label}
          </a>
        ))}
      </nav>

      {/* In-Page Modal for 15-Slot Save Guard Editing */}
      {editingSlot !== null && (
        <div
          className="lh-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lh-slot-modal-title"
          onClick={() => setEditingSlot(null)}
        >
          <form
            className="lh-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSaveSlotModal}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 id="lh-slot-modal-title" className="lh-card-title">
                Edit Save Slot #{String(editingSlot).padStart(2, '0')}
              </h2>
              <button
                type="button"
                className="lh-btn lh-pressable"
                aria-label="Close slot editor"
                onClick={() => setEditingSlot(null)}
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>

            <label htmlFor="lh-slot-label-input" style={{ fontSize: '0.82rem', color: 'var(--lh-slate)' }}>
              Checkpoint Label (max 32 chars):
            </label>
            <input
              id="lh-slot-label-input"
              type="text"
              maxLength={32}
              autoFocus
              className="lh-modal-input"
              value={slotDraftLabel}
              onChange={(e) => setSlotDraftLabel(e.target.value)}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '14px' }}>
              <button
                type="button"
                aria-pressed={slotDraftSaved}
                className={`lh-btn lh-pressable ${slotDraftSaved ? 'primary-teal' : ''}`}
                onClick={() => setSlotDraftSaved((v) => !v)}
              >
                {slotDraftSaved ? (
                  <>
                    <Check size={14} aria-hidden="true" />
                    <span>Status: SAVED</span>
                  </>
                ) : (
                  <>
                    <Lock size={14} aria-hidden="true" />
                    <span>Status: OPEN (Click to Lock)</span>
                  </>
                )}
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="lh-btn lh-pressable"
                  onClick={() => setEditingSlot(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="lh-btn primary-coral lh-pressable">
                  Save Slot
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="lh-toast" role="status" aria-live="polite">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
