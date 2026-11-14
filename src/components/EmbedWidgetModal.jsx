import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Code2, Copy, Check, ExternalLink, X } from 'lucide-react';
import { CANONICAL_ORIGIN, EMBED_ROUTES } from '../data/seoRoutes.js';
import { copyTextReliably } from '../utils/clipboard.js';
import { playSwitchTick } from '../utils/soundHaptics.js';
import { useModalFocusTrap } from '../utils/useModalFocusTrap.js';

export default function EmbedWidgetModal({
  isOpen,
  onClose,
  initialEmbedPath = '/embed/gta-6/storage',
  soundEnabled = true,
}) {
  const [selectedEmbedPath, setSelectedEmbedPath] = useState(initialEmbedPath);
  const [embedHeight, setEmbedHeight] = useState(620);
  const [copiedMode, setCopiedMode] = useState('');
  const cardRef = useRef(null);

  useModalFocusTrap(isOpen, cardRef, onClose);

  useEffect(() => {
    if (isOpen) {
      const valid = EMBED_ROUTES.some((r) => r.path === initialEmbedPath);
      setSelectedEmbedPath(valid ? initialEmbedPath : EMBED_ROUTES[0]?.path || '/embed/gta-6/storage');
      setCopiedMode('');
    }
  }, [isOpen, initialEmbedPath]);

  const activeRoute = useMemo(
    () => EMBED_ROUTES.find((r) => r.path === selectedEmbedPath) || EMBED_ROUTES[0],
    [selectedEmbedPath]
  );

  const iframeSrc = `${CANONICAL_ORIGIN}${activeRoute?.path || '/embed/gta-6/storage'}`;
  const parentHref = `${CANONICAL_ORIGIN}${activeRoute?.parentCanonicalPath || '/gta-6/storage'}`;
  const parentLabel = activeRoute?.shortLabel || 'Unpause Calculator';

  const htmlSnippet = useMemo(
    () =>
      `<iframe src="${iframeSrc}" title="${parentLabel} — Unpause" width="100%" height="${embedHeight}" loading="lazy" class="unpause-embed-frame"></iframe>\n<p>Powered by <a href="${parentHref}" target="_blank" rel="noopener">Unpause ${parentLabel}</a></p>`,
    [iframeSrc, parentLabel, embedHeight, parentHref]
  );

  const markdownSnippet = useMemo(
    () => `[${parentLabel} — Interactive Calculator on Unpause](${parentHref})`,
    [parentLabel, parentHref]
  );

  if (!isOpen) return null;

  const copySnippet = async (text, mode) => {
    playSwitchTick(soundEnabled, 820);
    const ok = await copyTextReliably(text);
    setCopiedMode(ok ? mode : `blocked-${mode}`);
    setTimeout(() => setCopiedMode(''), 2200);
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="embed-modal-title"
      onClick={onClose}
    >
      <div
        ref={cardRef}
        className="modal-card embed-modal-card"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="selector-modal-header">
          <div className="embed-title-row">
            <div className="selector-icon-badge">
              <Code2 size={18} />
            </div>
            <div>
              <h2 id="embed-modal-title" className="selector-modal-title">
                Embed Free Calculator Widget
              </h2>
              <p className="selector-modal-sub">
                Zero ads, responsive from 320px to full-width, instant HTML &amp; Markdown attribution snippet.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="tactile-icon-btn"
            aria-label="Close embed widget modal"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        <div className="embed-controls-grid">
          <div>
            <label htmlFor="embed-widget-select" className="section-label">
              Calculator Deck
            </label>
            <select
              id="embed-widget-select"
              className="deck-input no-icon embed-route-select"
              value={selectedEmbedPath}
              onChange={(e) => {
                playSwitchTick(soundEnabled, 680);
                setSelectedEmbedPath(e.target.value);
              }}
            >
              {EMBED_ROUTES.map((r) => (
                <option key={r.path} value={r.path}>
                  {r.shortLabel} ({r.path})
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="section-label">Frame Height</span>
            <div className="embed-size-toggle" role="group" aria-label="Iframe height">
              {[580, 620, 680].map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`filter-pill ${embedHeight === h ? 'active' : ''}`}
                  onClick={() => {
                    playSwitchTick(soundEnabled, 700);
                    setEmbedHeight(h);
                  }}
                >
                  {h}px
                </button>
              ))}
            </div>
          </div>
        </div>

        <label htmlFor="embed-code-output" className="section-label">
          HTML Embed Code (Responsive Iframe + Dofollow Source Link)
        </label>
        <textarea
          id="embed-code-output"
          className="deck-input no-icon mono embed-code-box"
          rows={4}
          readOnly
          value={htmlSnippet}
          onFocus={(e) => e.target.select()}
        />

        <div className="stage-action-row embed-actions-row">
          <button
            type="button"
            className="primary-coral-btn"
            onClick={() => copySnippet(htmlSnippet, 'html')}
          >
            {copiedMode === 'html' ? <Check size={15} /> : <Copy size={15} />}
            <span>
              {copiedMode === 'html'
                ? 'HTML Snippet Copied'
                : copiedMode === 'blocked-html'
                  ? 'Select Box & Press Ctrl+C'
                  : 'Copy HTML Embed'}
            </span>
          </button>
          <button
            type="button"
            className="secondary-key-btn"
            onClick={() => copySnippet(markdownSnippet, 'md')}
          >
            {copiedMode === 'md' ? <Check size={15} /> : <Copy size={15} />}
            <span>
              {copiedMode === 'md'
                ? 'Markdown Copied'
                : copiedMode === 'blocked-md'
                  ? 'Copy Blocked — Use Permalink'
                  : 'Copy Markdown Citation'}
            </span>
          </button>
          <a
            href={activeRoute?.path || '/embed/gta-6/storage'}
            target="_blank"
            rel="noopener"
            className="subtle-pill-btn embed-preview-link"
          >
            <span>Preview Frame</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </div>
  );
}
