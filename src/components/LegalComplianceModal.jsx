import React, { useRef } from 'react';
import { X, Scale, ShieldCheck, RefreshCcw, FileCheck2, Mail } from 'lucide-react';
import { playSwitchTick } from '../utils/soundHaptics.js';
import { useModalFocusTrap } from '../utils/useModalFocusTrap.js';

const LEGAL_TABS = [
  { id: 'terms', label: 'Terms of Service', icon: Scale },
  { id: 'privacy', label: 'Privacy (POPIA · GDPR)', icon: ShieldCheck },
  { id: 'refunds', label: 'Refunds & Ad Rules', icon: RefreshCcw },
  { id: 'ip', label: 'IP, DMCA & Affiliates', icon: FileCheck2 },
];

export default function LegalComplianceModal({
  isOpen,
  activeSection = 'terms',
  onSelectSection,
  onClose,
  modalRef,
  runtimeConfig,
  soundEnabled,
}) {
  const supportEmail = runtimeConfig?.supportEmail || 'hello@playunpause.com';
  const sponsorEmail = runtimeConfig?.sponsorEmail || 'sponsors@playunpause.com';
  const passPrice = 0;
  const sponsorPrice = runtimeConfig?.sponsorPriceUsd ?? 149;
  const legalOperatorName =
    runtimeConfig?.legalOperatorName || 'Unpause Interactive (Independent Operator, South Africa)';
  const legalServiceAddress = runtimeConfig?.legalServiceAddress || '';
  const legalContactPhone = runtimeConfig?.legalContactPhone || '';
  const tabRefs = useRef([]);

  useModalFocusTrap(isOpen, modalRef, onClose);

  if (!isOpen) return null;

  const handleTabKeyDown = (e, idx) => {
    let nextIdx = null;
    if (e.key === 'ArrowRight') nextIdx = (idx + 1) % LEGAL_TABS.length;
    else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + LEGAL_TABS.length) % LEGAL_TABS.length;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = LEGAL_TABS.length - 1;
    if (nextIdx === null) return;
    e.preventDefault();
    const target = LEGAL_TABS[nextIdx];
    playSwitchTick(soundEnabled, 705);
    onSelectSection(target.id);
    tabRefs.current[nextIdx]?.focus();
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card legal-modal-card" ref={modalRef} tabIndex={-1}>
        <div className="legal-modal-header">
          <div>
            <h2 id="legal-modal-title" className="legal-modal-title">
              Legal, Privacy &amp; Buyer Protection Center
            </h2>
            <p className="legal-modal-sub">
              Plain-English terms for <strong>playunpause.com</strong> · Updated November 19, 2026
            </p>
          </div>
          <button
            type="button"
            className="tactile-icon-btn"
            aria-label="Close legal dialog"
            onClick={onClose}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Section Switcher Tabs */}
        <div
          className="filter-row legal-tabs-row"
          role="tablist"
          aria-label="Legal policy sections"
        >
          {LEGAL_TABS.map((tab, idx) => {
            const Icon = tab.icon;
            const selected = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[idx] = el;
                }}
                id={`legal-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="legal-panel-content"
                tabIndex={selected ? 0 : -1}
                className={`filter-pill legal-tab-pill ${selected ? 'active' : ''}`}
                onClick={() => {
                  playSwitchTick(soundEnabled, 705);
                  onSelectSection(tab.id);
                }}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
              >
                <Icon size={14} aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Legal Content Body */}
        <div
          id="legal-panel-content"
          role="tabpanel"
          aria-labelledby={`legal-tab-${activeSection}`}
          tabIndex={0}
          className="legal-modal-body"
        >
          {activeSection === 'terms' && (
            <div>
              <h3 className="legal-heading">
                1. Operator, Free Consumer Utility &amp; Statutory Disclosures (ECTA s. 43 · CPA)
              </h3>
              <p className="legal-copy">
                <strong>Unpause</strong> (<code>https://playunpause.com</code>) is operated from South Africa by{' '}
                <strong>{legalOperatorName}</strong>
                {legalServiceAddress ? ` (${legalServiceAddress})` : ''}
                {legalContactPhone ? ` · Tel: ${legalContactPhone}` : ''}
                . All 10 game calculators, GTA VI launch companions, saved console setups, OBS overlays, and CSV/JSON backups are <strong>100% free with zero self-serve consumer checkout</strong>. We never sell games, keys, cheats, injectors, modded accounts, or RMT currency. Support, Information Officer &amp; statutory notices:{' '}
                <a href={`mailto:${supportEmail}`} className="legal-inline-link">
                  {supportEmail}
                </a>
                . Formal ECTA s. 43(1) physical service address and direct operator telephone particulars for B2B sponsor contracts are provided on written request via{' '}
                <a href={`mailto:${sponsorEmail}`} className="legal-inline-link">
                  {sponsorEmail}
                </a>{' '}
                prior to invoicing. Consumer queries may also be referred to South Africa&rsquo;s <strong>National Consumer Commission</strong> (<code>nccsa.org.za</code>) or <strong>CGSO</strong>.
              </p>

              <h3 className="legal-heading">
                2. Free Tools, Pre-Launch Alignment &amp; Sync Safety
              </h3>
              <ul className="legal-list">
                <li>
                  <strong>100% Free Interactive Calculators (Zero Consumer Billing):</strong> Every calculator, console SSD headroom planner, 16 saved console/crew setups, 120 cross-game pins, GTA VI Haptic Cheat Deck, Money/Robbery &amp; Platinum trackers, portable JSON/CSV backup, OBS overlay mode (<code>?mode=obs</code>), and Phone &harr; PC QR sync is free with zero Paywall or active Whop consumer checkout.
                </li>
                <li>
                  <strong>Release Dates &amp; Gameplay Math:</strong> Grand Theft Auto VI launched on <strong>November 19, 2026</strong> as single-player ($79.99 Standard / $99.99 Ultimate) with Base 212 GB install + Patch 01.002.002 (~603.8 MB PS5) / 1.0.2.2 (+1.6 GB Xbox). In-world safe combinations are randomized per playthrough (aside from static story keypads). All calculators (including EA Sports FC&trade; coin math, CS2/Apex odds summaries, and Roblox DevEx USD estimates) are informational gameplay math only&mdash;<strong>not financial, tax, or investment advice, gambling, or RMT</strong>.
                </li>
                <li>
                  <strong>Bearer Sync Key Safety &amp; Acceptable Use:</strong> Optional free <code>UP-XXXXXXXX</code> sync keys (and <code>#sync=</code> QR URLs) allow checklist sync between your own devices—anyone holding your code can read or edit that checklist, so keep screenshots private on stream. Automated scraping or API abuse is prohibited.
                </li>
              </ul>

              <h3 className="legal-heading">
                3. Warranty Disclaimer &amp; Limitation of Liability
              </h3>
              <p className="legal-copy flush">
                Game publishers frequently adjust weapon tuning, XP curves, marketplace rules, and install sizes via live patches. Unpause calculators are provided free &ldquo;as is&rdquo; for entertainment utility; nothing in these terms limits non-waivable statutory consumer rights under South African CPA/ECTA, UK CRA 2015, EU law, or US law.
              </p>
            </div>
          )}

          {activeSection === 'privacy' && (
            <div>
              <h3 className="legal-heading">
                1. Operator, Information Officer &amp; Zero-Tracker Pledge (POPIA · GDPR · CCPA)
              </h3>
              <p className="legal-copy">
                <strong>Unpause</strong> (<code>playunpause.com</code>) is operated from South Africa by{' '}
                <strong>{legalOperatorName}</strong>. Contact our designated <strong>Information Officer</strong> at{' '}
                <a href={`mailto:${supportEmail}`} className="legal-inline-link">
                  {supportEmail}
                </a>{' '}
                (Subject: <em>Information Officer</em>). We run <strong>zero behavioral ad trackers or third-party ad cookies</strong> and <strong>never sell or share personal information</strong> under CCPA/CPRA, EU/UK GDPR, or POPIA (Act 4 of 2013).
              </p>

              <h3 className="legal-heading">
                2. Data Inventory &amp; Lawful Bases (POPIA s. 18)
              </h3>
              <ul className="legal-list">
                <li>
                  <strong>Local-First Calculator Data (Voluntary · Browser-Only):</strong> Theme, audio mute, sync keys, <code>crackedSafeIds</code>, <code>checkedRouteIds</code>, <code>savedPins</code>, <code>storageProfiles</code>, and <code>crewPresets</code> stay strictly in browser <code>localStorage</code> (<code>unpause_deck_state_v5</code>) until you clear them or export portable JSON/CSV backups.
                </li>
                <li>
                  <strong>Optional QR Sync &amp; Legacy Ledger Storage:</strong> When you generate a free <code>UP-XXXXXXXX</code> sync code or restore a legacy deck, only your sanitized game-checklist JSON (<code>sync_decks</code>) is synced via Cloudflare Workers &amp; D1—zero personal names or payment cards are stored for free calculator use. Any historical transaction hashes are unlinked on DSAR erasure.
                </li>
                <li>
                  <strong>Sponsors &amp; Edge Security:</strong> Active 24h sponsor metadata (<code>badge_text</code>, <code>target_url</code>) is stored in <code>sponsors</code>. Edge per-IP and per-code rate limits reset automatically every <strong>60 seconds</strong>. All typography fonts are <strong>self-hosted</strong> on <code>playunpause.com</code>; cookie-free <strong>Cloudflare Web Analytics</strong> captures aggregate telemetry without cookies or cross-site profiling.
                </li>
              </ul>

              <h3 className="legal-heading">
                3. Children &amp; Minors (COPPA · GDPR-K · POPIA s. 35)
              </h3>
              <p className="legal-copy">
                Free calculators for titles including <em>Minecraft</em>, <em>Roblox</em>, and <em>Fortnite</em> collect zero server-side personal data, have zero consumer checkouts, and display zero behavioral ads or adult gear promotions.
              </p>

              <h3 className="legal-heading">
                4. Retention &amp; Verified DSAR Rights
              </h3>
              <p className="legal-copy flush">
                You may delete local state anytime via Clear Local Data or purge synced checklists via <code>DELETE /api/sync/:code</code> or by emailing{' '}
                <a href={`mailto:${supportEmail}`} className="legal-inline-link">
                  {supportEmail}
                </a>
                . We respond to access, correction, or erasure requests within <strong>7 days</strong>. Escalate unresolved complaints to South Africa&rsquo;s <strong>Information Regulator</strong> (<code>POPIAComplaints@inforegulator.org.za</code>, POPIA Form 5, <code>inforegulator.org.za</code>), the UK ICO, or your EU authority.
              </p>
            </div>
          )}

          {activeSection === 'refunds' && (
            <div>
              <h3 className="legal-heading">
                1. Zero Active Consumer Billing &amp; Legacy Receipt Support
              </h3>
              <p className="legal-copy">
                All Unpause calculators, routes, OBS overlays, and QR sync features are <strong>100% free</strong> with no active consumer subscription or Merchant-of-Record checkout. For legacy receipt questions or data erasure requests, email{' '}
                <a href={`mailto:${supportEmail}`} className="legal-inline-link">
                  {supportEmail}
                </a>{' '}
                with your <code>UP-XXXXXXXX</code> code or legacy reference.
              </p>

              <h3 className="legal-heading">
                2. ${sponsorPrice}/Day Top-Bar Sponsorship &amp; B2B Acceptable Ad Policy
              </h3>
              <ul className="legal-list flush">
                <li>
                  <strong>Manual Review Before Invoicing (ECTA s. 43 Compliant):</strong> Every 24-hour top-bar placement is manually reviewed within 4&ndash;12 hours after business buyers email their copy and <code>https://</code> destination URL to{' '}
                  <a href={`mailto:${sponsorEmail}`} className="legal-inline-link">
                    {sponsorEmail}
                  </a>
                  . Complete operator legal name, physical service address, and contact telephone disclosures are provided directly on B2B quotes/invoices prior to accepting payment. All live placements display an explicit <strong>Sponsored</strong> label and <code>rel=&quot;sponsored&quot;</code> link attribute.
                </li>
                <li>
                  <strong>Strictly Prohibited Categories:</strong> Game cheats, hacks, aimbots, modded accounts, in-game currency/coin/RMT sellers, skin gambling, casinos/betting, crypto tokens/NFTs, URL shorteners, malware, adult content, or trademark-infringing pages.
                </li>
                <li>
                  <strong>Right to Decline &amp; Revocation:</strong> Unpause reserves sole discretion to reject any ad before publication or terminate any destination altered post-approval to prohibited content.
                </li>
              </ul>
            </div>
          )}

          {activeSection === 'ip' && (
            <div>
              <h3 className="legal-heading">
                1. Nominative Fair Use &amp; Publisher Non-Affiliation
              </h3>
              <p className="legal-copy compact-bottom">
                <strong>playunpause.com</strong> is an independent, unofficial player utility and is <strong>not</strong> affiliated with, endorsed, sponsored, or approved by Take-Two Interactive Software, Inc., Rockstar Games, Activision Publishing, Inc., Epic Games, Inc., Mojang AB, Microsoft Corporation (Xbox®), Electronic Arts Inc. (EA SPORTS FC™ / FUT™), FIFA (FIFA®), Respawn Entertainment, Valve Corporation, Riot Games, Inc., Roblox Corporation, CD PROJEKT S.A. (Cyberpunk 2077®), or Sony Interactive Entertainment LLC (PlayStation® / PS5® / PSN®). All product names, console marks, and legacy URL aliases are used strictly for nominative compatibility identification.
              </p>
              <p className="legal-disclaimer-box">
                NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.
              </p>

              <h3 className="legal-heading">
                2. Zero UGC Hosting, Zero Leaks &amp; DMCA Notices (17 U.S.C. § 512(c)(3))
              </h3>
              <p className="legal-copy">
                Unpause hosts <strong>zero user-generated uploads</strong>, ripped publisher assets, or NDA leak material—GTA VI safe strategies reflect randomized playthrough behavior confirmed on launch (November 19, 2026). Rights holders or authorized agents may submit formal takedown notices (identifying the copyrighted work, exact URL, contact details, good-faith belief statement, and accuracy/authority signature under penalty of perjury) to our IP/DMCA contact at{' '}
                <a href="mailto:dmca@playunpause.com" className="legal-inline-link">
                  dmca@playunpause.com
                </a>{' '}
                {legalServiceAddress ? `(${legalServiceAddress}) ` : ''}
                for expedited 24-hour review.
              </p>

              <h3 className="legal-heading">
                3. FTC Affiliate &amp; Native Advertising Disclosure (16 CFR Part 255)
              </h3>
              <p className="legal-copy flush">
                Outbound console hardware recommendations (PS5® NVMe SSDs and Xbox® Expansion Cards) may be affiliate links. <strong>As an Amazon Associate I earn from qualifying purchases.</strong> Paid 24-hour top-bar sponsorships are badged explicitly as <strong>Sponsored</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Bottom Contact Bar */}
        <div className="legal-contact-bar">
          <span className="legal-contact-row">
            <Mail size={14} color="var(--ocean)" aria-hidden="true" />
            <span>
              Questions or refund requests:{' '}
              <a href={`mailto:${supportEmail}`} className="legal-contact-link">
                {supportEmail}
              </a>
            </span>
          </span>
          <button
            type="button"
            className="secondary-key-btn legal-done-btn"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
