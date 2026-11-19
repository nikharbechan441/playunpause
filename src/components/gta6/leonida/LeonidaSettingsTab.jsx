import React from 'react';
import { Check } from 'lucide-react';
import {
  LEONIDA_DISPLAY_TYPES,
  LEONIDA_PLAYSTYLES,
  LEONIDA_SETTINGS_CONSOLES,
  LEONIDA_SETTINGS_ITEMS,
} from '../../../data/games/leonidaV2Data.js';

export default function LeonidaSettingsTab({
  state,
  onSelectSetConsole,
  onSelectSetTv,
  onSelectSetStyle,
  onToggleSettingItem,
}) {
  const isPs5 = state.setConsole === 'ps5_pro' || state.setConsole === 'ps5';
  const activeTarget =
    LEONIDA_SETTINGS_CONSOLES.find((c) => c.id === state.setConsole) || LEONIDA_SETTINGS_CONSOLES[0];
  const visibleItems = LEONIDA_SETTINGS_ITEMS.filter((item) => !item.ps5Only || isPs5);
  const appliedCount = visibleItems.filter((item) => state.checkedSettings.includes(item.id)).length;

  return (
    <section className="lh-card" aria-labelledby="lh-settings-heading">
      <div className="lh-card-header">
        <div>
          <h2 id="lh-settings-heading" className="lh-card-title">
            30fps Settings Configurator
          </h2>
          <p className="lh-card-sub">
            Dial in crisp 30fps clarity, Trophy-safe accessibility, classic controls, and Streamer Mode audio.
          </p>
        </div>
        <span className="lh-badge teal lh-num">
          {appliedCount} / {visibleItems.length} applied
        </span>
      </div>

      {/* Console / Display / Playstyle Selectors */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          <span className="lh-badge">Console</span>
          {LEONIDA_SETTINGS_CONSOLES.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={state.setConsole === c.id}
              className={`lh-btn lh-pressable ${state.setConsole === c.id ? 'active-coral' : ''}`}
              onClick={() => onSelectSetConsole(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          <span className="lh-badge">Display</span>
          {LEONIDA_DISPLAY_TYPES.map((tv) => (
            <button
              key={tv.id}
              type="button"
              aria-pressed={state.setTv === tv.id}
              className={`lh-btn lh-pressable ${state.setTv === tv.id ? 'active-gold' : ''}`}
              onClick={() => onSelectSetTv(tv.id)}
            >
              {tv.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          <span className="lh-badge">Playstyle</span>
          {LEONIDA_PLAYSTYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              aria-pressed={state.setStyle === style.id}
              className={`lh-btn lh-pressable ${state.setStyle === style.id ? 'active-gold' : ''}`}
              onClick={() => onSelectSetStyle(style.id)}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Console Target Strip */}
      <div className="lh-inset-strip gold-border">
        <strong style={{ fontSize: '0.84rem', color: 'var(--lh-gold)' }}>{activeTarget.label} Target: </strong>
        <span style={{ fontSize: '0.84rem' }}>{activeTarget.target}</span>
      </div>

      {/* Tickable Checklist */}
      <div className="lh-checklist">
        {visibleItems.map((item, idx) => {
          const done = state.checkedSettings.includes(item.id);
          const highlighted = item.highlightStyle && item.highlightStyle === state.setStyle;
          const detailText =
            item.id === 'hdr'
              ? state.setTv === 'oled'
                ? item.detailOled
                : item.detailLed
              : item.detail;

          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={done}
              className={`lh-check-row lh-pressable ${done ? 'done' : highlighted ? 'highlighted' : ''}`}
              onClick={() => onToggleSettingItem(item.id)}
            >
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>
                  <span className="lh-num" style={{ color: 'var(--lh-slate)', marginRight: '6px' }}>
                    {idx + 1}.
                  </span>
                  {item.title}
                </div>
                <div className="lh-card-sub" style={{ marginTop: '3px' }}>
                  {detailText}
                </div>
              </div>
              <span className={`lh-badge ${done ? 'teal' : highlighted ? 'gold' : ''}`}>
                {done ? (
                  <>
                    <Check size={12} aria-hidden="true" /> Done
                  </>
                ) : highlighted ? (
                  'Recommended'
                ) : (
                  'Check'
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
