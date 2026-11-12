import React from 'react';
import { X, Scale, ShieldCheck, RefreshCcw, FileCheck2, Mail } from 'lucide-react';
import { playSwitchTick } from '../utils/soundHaptics.js';

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
  if (!isOpen) return null;

  const supportEmail = runtimeConfig?.supportEmail || 'hello@playunpause.com';
  const sponsorEmail = runtimeConfig?.sponsorEmail || 'sponsors@playunpause.com';
  const passPrice = runtimeConfig?.passPriceUsd ?? 6.99;
  const launchPrice = runtimeConfig?.launchPriceUsd ?? 9.99;
  const sponsorPrice = runtimeConfig?.sponsorPriceUsd ?? 149;

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
      <div
        className="modal-card legal-modal-card"
        ref={modalRef}
        style={{ maxWidth: 680, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <h2
              id="legal-modal-title"
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: '1.24rem',
                fontWeight: 700,
                letterSpacing: '-0.022em',
                color: 'var(--ink-primary)',
              }}
            >
              Legal, Privacy &amp; Buyer Protection Center
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--ink-secondary)' }}>
              Plain-English terms for <strong>playunpause.com</strong> · Effective November 12, 2026
            </p>
          </div>
          <button
            type="button"
            className="tactile-icon-btn"
            aria-label="Close legal dialog"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* Section Switcher Pills */}
        <div
          className="filter-row"
          role="group"
          aria-label="Legal policy sections"
          style={{ marginBottom: 14, flexShrink: 0 }}
        >
          {LEGAL_TABS.map((tab) => {
            const Icon = tab.icon;
            const selected = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={selected}
                className={`filter-pill ${selected ? 'active' : ''}`}
                onClick={() => {
                  playSwitchTick(soundEnabled, 705);
                  onSelectSection(tab.id);
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Icon size={14} aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Legal Content Body */}
        <div
          style={{
            overflowY: 'auto',
            paddingRight: 4,
            fontSize: '0.86rem',
            lineHeight: 1.62,
            color: 'var(--ink-primary)',
          }}
        >
          {activeSection === 'terms' && (
            <div>
              <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
                1. Operator &amp; Service Scope (ECTA s. 43 Disclosures)
              </h3>
              <p style={{ margin: '0 0 12px', color: 'var(--ink-secondary)' }}>
                <strong>Unpause</strong> (<code>https://playunpause.com</code>) is an independent, read-only browser calculator, checklist, and second-screen reference web application operated from South Africa with EU cloud infrastructure. We do <strong>not</strong> sell video games, game keys, cheats, memory injectors, aimbots, modded accounts, or in-game currency. Support &amp; statutory notices:{' '}
                <a href={`mailto:${supportEmail}`} style={{ color: 'var(--ocean)', fontWeight: 600 }}>
                  {supportEmail}
                </a>
                .
              </p>

              <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
                2. One-Time All-Access Pass (${passPrice} Pre-Launch / ${launchPrice} Standard)
              </h3>
              <ul style={{ margin: '0 0 12px', paddingLeft: 18, color: 'var(--ink-secondary)' }}>
                <li>
                  <strong>One-Time Payment, Zero Subscription:</strong> Purchasing the Unpause All-Access Pass via our checkout partner Whop / Stripe is a single one-time charge in USD. You will never be rebilled.
                </li>
                <li>
                  <strong>Service Duration:</strong> &ldquo;All-Access&rdquo; / &ldquo;Permanent&rdquo; pass access grants unlocked Pro Meta tables, checklist sync via your 8-character <code>UP-XXXXXXXX</code> code, and ad-free browsing across all supported games for the <strong>operational lifetime of the playunpause.com web service</strong>.
                </li>
                <li>
                  <strong>Pre-Launch GTA VI Transparency:</strong> Prior to public game release on November 18, 2026 (11:00 UTC), all 9 live companion suites (CoD, Fortnite, Minecraft, EA FC 25, Roblox, CS2, Valorant, Apex Legends, GTA Online) and Phone + PC cloud sync unlock immediately, while GTA VI safe codes, heist presets, stock flips, and route stops shown pre-release are <strong>simulated UI demos &amp; templates</strong> (zero leaked or NDA content). Verified GTA VI combinations and spoiler-free checkpoints populate starting November 18, 2026.
                </li>
                <li>
                  <strong>Acceptable Use:</strong> Sync codes are for personal and household squad use. Automated scraping, brute-forcing <code>/api/pass/activate</code>, or reselling sync codes is prohibited.
                </li>
              </ul>

              <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
                3. Warranty Disclaimer &amp; Limitation of Liability
              </h3>
              <p style={{ margin: 0, color: 'var(--ink-secondary)' }}>
                Game publishers frequently adjust weapon damage, XP curves, marketplace tax rates, and install sizes via live patches. Unpause calculators are provided &ldquo;as is&rdquo; for informational entertainment utility; our maximum aggregate liability to any pass holder shall not exceed the amount paid for the pass. Nothing in these terms limits non-waivable statutory consumer rights under South African CPA/ECTA, UK, EU, or US law.
              </p>
            </div>
          )}

          {activeSection === 'privacy' && (
            <div>
              <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
                1. Privacy-First Architecture (POPIA · EU/UK GDPR · CCPA)
              </h3>
              <p style={{ margin: '0 0 12px', color: 'var(--ink-secondary)' }}>
                Unpause runs <strong>zero third-party behavioral ad trackers</strong>, sets zero cross-site advertising cookies, and <strong>never sells or shares personal information</strong> under CCPA/CPRA, GDPR, or South Africa&rsquo;s Protection of Personal Information Act (POPIA, Act 4 of 2013).
              </p>

              <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
                2. Exact Data We Process &amp; Lawful Basis
              </h3>
              <ul style={{ margin: '0 0 12px', paddingLeft: 18, color: 'var(--ink-secondary)' }}>
                <li>
                  <strong>Free Calculators (Zero Server Data):</strong> Theme choice, mute state, checked safes, and pinned targets are saved strictly in your own browser&rsquo;s <code>localStorage</code>.
                </li>
                <li>
                  <strong>Pass Fulfillment &amp; Sync (Contract Performance — GDPR Art. 6(1)(b) / POPIA s. 11):</strong> Card and Apple Pay payments are processed directly by <strong>Whop Inc. / Stripe</strong>; Unpause never sees or stores your card numbers. To let you claim your <code>UP-XXXXXXXX</code> sync code without creating a password, our database stores a <strong>keyed cryptographic hash</strong> of your checkout email, your Whop transaction/membership ID (<code>mem_</code> / <code>pay_</code>), payment amount/currency, and your synced checklist JSON (safes, route stops, and pinned calculator values). We do <strong>not</strong> store plaintext buyer email addresses in SQLite.
                </li>
                <li>
                  <strong>Abuse Prevention (Legitimate Interest — GDPR Art. 6(1)(f)):</strong> Short-lived, in-memory IP rate-limit counters reset every 60 seconds to block automated credential/code guessing. Typography is loaded via Google Fonts CSS without user login identifiers.
                </li>
              </ul>

              <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
                3. Cross-Border Hosting &amp; Your Deletion Rights
              </h3>
              <p style={{ margin: 0, color: 'var(--ink-secondary)' }}>
                Our application database is hosted in <strong>Frankfurt, Germany (EU)</strong> on Render behind Cloudflare security, with checkout webhooks transmitted from Whop / Stripe (United States) under standard data-protection safeguards. To inspect, export, or permanently delete your <code>UP-XXXXXXXX</code> sync record and order hash, email{' '}
                <a href={`mailto:${supportEmail}`} style={{ color: 'var(--ocean)', fontWeight: 600 }}>
                  {supportEmail}
                </a>{' '}
                (fulfilled within 7 days). South African residents may also contact the Information Regulator at{' '}
                <code>POPIAComplaints@inforegulator.org.za</code>; EU/UK residents may contact their local supervisory authority.
              </p>
            </div>
          )}

          {activeSection === 'refunds' && (
            <div>
              <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
                1. 14-Day Hassle-Free Pass Refund Policy
              </h3>
              <p style={{ margin: '0 0 12px', color: 'var(--ink-secondary)' }}>
                Although your <code>UP-XXXXXXXX</code> digital pass unlocks immediately upon checkout (EU Directive 2011/83/EU Art. 16(m) immediate digital supply notice), we back every pass with a <strong>14-day no-questions-asked refund guarantee</strong>. If you bought by mistake, ordered twice, cannot activate via Apple Pay Private Relay, or simply aren&rsquo;t satisfied, email{' '}
                <a href={`mailto:${supportEmail}`} style={{ color: 'var(--ocean)', fontWeight: 600 }}>
                  {supportEmail}
                </a>{' '}
                with your checkout email, <code>UP-XXXXXXXX</code> code, or Whop <code>mem_</code> / <code>pay_</code> receipt ID for a full 100% refund. Refunded or disputed orders automatically deactivate their associated sync code.
              </p>
              <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
                Billing descriptor note: Purchases appear on card or Apple Pay statements via Whop (e.g., <code>WHOP*PLAYUNPAUSE</code>).
              </p>

              <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
                2. ${sponsorPrice}/Day Top-Bar Sponsorship &amp; Acceptable Ad Policy
              </h3>
              <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--ink-secondary)' }}>
                <li>
                  <strong>Manual Review &amp; Slot Queueing:</strong> Every 24-hour top-bar placement is manually reviewed within 4–12 hours after you send your 60-character copy and <code>https://</code> destination URL to{' '}
                  <a href={`mailto:${sponsorEmail}`} style={{ color: 'var(--ocean)', fontWeight: 600 }}>
                    {sponsorEmail}
                  </a>
                  . All live placements carry an explicit <strong>Sponsored</strong> label and <code>rel=&quot;sponsored&quot;</code> link attribute, and are hidden for All-Access Pass holders. If a date is already booked, your 24-hour window runs in the next open slot or you may request a 100% refund prior to publication.
                </li>
                <li>
                  <strong>Strictly Prohibited Categories:</strong> Game cheats, hacks, aimbots, modded accounts, in-game currency/coin/RMT sellers, skin gambling, casinos/betting, crypto tokens/NFTs, URL shorteners, malware, adult content, or trademark-infringing pages.
                </li>
                <li>
                  <strong>Right to Decline:</strong> Unpause reserves sole editorial discretion to reject any ad. Declined legitimate bookings receive a full refund; live links changed post-approval to redirect to prohibited or deceptive destinations are terminated immediately without refund.
                </li>
              </ul>
            </div>
          )}

          {activeSection === 'ip' && (
            <div>
              <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
                1. Nominative Fair Use &amp; Publisher Non-Affiliation
              </h3>
              <p style={{ margin: '0 0 10px', color: 'var(--ink-secondary)' }}>
                <strong>playunpause.com</strong> is an independent, unofficial player utility and is <strong>not</strong> affiliated with, endorsed, sponsored, or approved by Take-Two Interactive Software, Inc., Rockstar Games, Activision Publishing, Inc., Epic Games, Inc., Mojang AB, Microsoft Corporation, Electronic Arts Inc., Respawn Entertainment, Valve Corporation, Riot Games, Inc., Roblox Corporation, or Sony Interactive Entertainment LLC. All game titles, console names, and trademarks belong to their respective owners and are referenced strictly for nominative compatibility and mathematical calculation descriptions.
              </p>
              <p
                style={{
                  margin: '0 0 12px',
                  padding: '8px 12px',
                  borderRadius: 10,
                  background: 'var(--surface-muted)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'var(--ink-secondary)',
                }}
              >
                NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.
              </p>

              <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
                2. Zero Leaked Content &amp; DMCA Notice Contact (17 U.S.C. § 512)
              </h3>
              <p style={{ margin: '0 0 12px', color: 'var(--ink-secondary)' }}>
                Unpause contains 100% original code, custom geometric vector diagrams, and browser-synthesized Web Audio tones—zero ripped publisher assets, fonts, or leaked pre-release data. Pre-launch GTA VI safe entries and route stops are fictional UI demonstrations until public game launch on November 18, 2026. Intellectual property owners or designated agents may send inquiries or takedown notices to{' '}
                <a href="mailto:dmca@playunpause.com" style={{ color: 'var(--ocean)', fontWeight: 600 }}>
                  dmca@playunpause.com
                </a>{' '}
                for prompt review within 24 hours.
              </p>

              <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
                3. FTC Affiliate &amp; Native Advertising Disclosure (16 CFR Part 255)
              </h3>
              <p style={{ margin: 0, color: 'var(--ink-secondary)' }}>
                Outbound console storage upgrade links (such as PS5 Gen4 NVMe SSDs and Xbox Series X|S Storage Expansion Cards) may be affiliate links. <strong>As an Amazon Associate and retail affiliate partner, Unpause may earn a commission from qualifying purchases at no additional cost to you.</strong> Paid 24-hour header sponsorships are sold at a flat daily rate and clearly badged <strong>Sponsored</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Bottom Contact Bar */}
        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            fontSize: '0.79rem',
            color: 'var(--ink-muted)',
            flexShrink: 0,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Mail size={14} color="var(--ocean)" aria-hidden="true" />
            <span>
              Questions or refund requests:{' '}
              <a href={`mailto:${supportEmail}`} style={{ color: 'var(--ocean)', fontWeight: 600 }}>
                {supportEmail}
              </a>
            </span>
          </span>
          <button type="button" className="secondary-key-btn" style={{ minHeight: 36, padding: '6px 14px' }} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
