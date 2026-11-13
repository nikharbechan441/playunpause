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
  const legalOperatorName = runtimeConfig?.legalOperatorName || 'Unpause Interactive (Independent Operator, South Africa)';
  const legalServiceAddress = runtimeConfig?.legalServiceAddress || '';
  const legalContactPhone = runtimeConfig?.legalContactPhone || '';

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
                1. Operator, Age Rule &amp; Statutory Disclosures (ECTA s. 43 · CPA)
              </h3>
              <p style={{ margin: '0 0 12px', color: 'var(--ink-secondary)' }}>
                <strong>Unpause</strong> (<code>https://playunpause.com</code>) is operated from South Africa by{' '}
                <strong>{legalOperatorName}</strong>
                {legalServiceAddress ? ` (${legalServiceAddress})` : ''}
                {legalContactPhone ? ` · Tel: ${legalContactPhone}` : ''}
                , running on global cloud infrastructure. We provide an independent, unofficial read-only browser calculator and checklist utility—never games, keys, cheats, injectors, modded accounts, or RMT currency. Support, Information Officer &amp; statutory notices:{' '}
                <a href={`mailto:${supportEmail}`} style={{ color: 'var(--ocean)', fontWeight: 600 }}>
                  {supportEmail}
                </a>
                . Paid Sync Pass purchases require buyers aged <strong>18+ or competent parent/guardian consent</strong>. Consumer disputes may be referred to South Africa&rsquo;s <strong>National Consumer Commission</strong> (<code>nccsa.org.za</code>) or <strong>CGSO</strong>.
              </p>

              <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
                2. Unpause Sync Pass (${passPrice} Founders / ${launchPrice} Standard)
              </h3>
              <ul style={{ margin: '0 0 12px', paddingLeft: 18, color: 'var(--ink-secondary)' }}>
                <li>
                  <strong>Merchant of Record &amp; Tax Transparency:</strong> Checkout is processed by <strong>Whop Inc. / Stripe</strong> as Merchant of Record for the <strong>Unpause Sync Pass</strong> (billed USD). Founders pricing ($6.99 USD) shifts to $9.99 USD on November 18, 2026 at 11:00 UTC in a single non-recurring payment (never rebilled). Listed USD prices exclude local VAT/GST/sales tax, which Whop calculates and collects clearly prior to final payment.
                </li>
                <li>
                  <strong>Service Scope &amp; Minimum Term (EU DCD 2019/770):</strong> Unlocks instant QR + <code>UP-XXXXXXXX</code> cross-device cloud sync, extended GTA VI weeknight chains, Missables Shield preview, unlimited saved pins, and top sponsor-bar removal. Requires a modern Web browser; backed by a <strong>minimum 12-month operational commitment</strong> and at least 30 days&rsquo; notice prior to any future sunset.
                </li>
                <li>
                  <strong>Pre-Launch Estimates &amp; Non-Financial Gameplay Math:</strong> GTA VI install sizes (212/225 GB), NZ timing estimates, safe keypad previews, heist splits, and story stock flips are simulated UI previews ahead of Nov 18, 2026 (zero leaked publisher material). All calculators (including EA Sports FC™ coin math, CS2/Apex odds summaries, and Roblox DevEx USD estimates) are informational gameplay math only—<strong>not financial, tax, or investment advice, gambling, or RMT</strong>. Roblox DevEx payouts remain governed solely by Roblox Corp.
                </li>
                <li>
                  <strong>Bearer Code Safety &amp; Acceptable Use:</strong> Your <code>UP-XXXXXXXX</code> code (and <code>#sync=</code> URL) acts as a personal sync key—anyone holding it can read or edit synced checklists, so keep it private. Automated scraping, brute-forcing APIs, or reselling sync codes is prohibited.
                </li>
              </ul>

              <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
                3. Warranty Disclaimer &amp; Limitation of Liability
              </h3>
              <p style={{ margin: 0, color: 'var(--ink-secondary)' }}>
                Game publishers frequently adjust weapon tuning, XP curves, marketplace rules, and install sizes via live patches. Unpause calculators are provided &ldquo;as is&rdquo; for entertainment utility; our maximum aggregate liability to any Sync Pass holder shall not exceed the amount paid for the pass. Nothing in these terms limits non-waivable statutory consumer rights under South African CPA/ECTA, UK CRA 2015, EU DCD/CRD, or US law.
              </p>
            </div>
          )}

          {activeSection === 'privacy' && (
            <div>
              <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
                1. Operator, Information Officer &amp; Zero-Tracker Pledge (POPIA · GDPR · CCPA)
              </h3>
              <p style={{ margin: '0 0 12px', color: 'var(--ink-secondary)' }}>
                <strong>Unpause</strong> (<code>playunpause.com</code>) is operated from South Africa by{' '}
                <strong>{legalOperatorName}</strong>. Contact our designated <strong>Information Officer</strong> at{' '}
                <a href={`mailto:${supportEmail}`} style={{ color: 'var(--ocean)', fontWeight: 600 }}>
                  {supportEmail}
                </a>{' '}
                (Subject: <em>Information Officer</em>). We run <strong>zero behavioral ad trackers or third-party ad cookies</strong> and <strong>never sell or share personal information</strong> under CCPA/CPRA, EU/UK GDPR, or POPIA (Act 4 of 2013).
              </p>

              <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
                2. Data Inventory, Indirect Sources &amp; Lawful Bases (POPIA s. 18)
              </h3>
              <ul style={{ margin: '0 0 12px', paddingLeft: 18, color: 'var(--ink-secondary)' }}>
                <li>
                  <strong>Free Calculators (Voluntary · Browser-Only):</strong> Theme, audio mute, Sync state flags (<code>isPro</code>, <code>deckCode</code>), <code>crackedSafeIds</code>, <code>checkedRouteIds</code>, and <code>savedPins</code> are stored strictly in browser <code>localStorage</code> (<code>unpause_deck_state_v5</code>) until you clear them. Zero server data is created for free calculator use.
                </li>
                <li>
                  <strong>Sync Pass &amp; Cloud Sync (Contract — GDPR Art. 6(1)(b) / POPIA s. 11):</strong> Checkout is processed by <strong>Whop Inc. / Stripe</strong> (US), which indirectly supplies your receipt ID (<code>whop_ref</code>), USD amount, currency, and checkout email via signed webhooks (mandatory to provision &amp; restore a Sync Pass). Our database stores a <strong>keyed HMAC-SHA256 hash</strong> of checkout email (<code>email_hash</code>—never plaintext emails), <code>whop_ref</code>, order ledger metadata, and your synced checklist JSON (<code>sync_decks</code>). Anyone holding your <code>UP-XXXXXXXX</code> bearer code or <code>#sync=</code> QR link can access or edit synced checklists.
                </li>
                <li>
                  <strong>Sponsors, Replay Ledger &amp; Edge Security (Contract / Legitimate Interest — Art. 6(1)(b),(f)):</strong> Active 24h sponsor metadata (<code>badge_text</code>, <code>target_url</code>, flight dates) is stored in <code>sponsors</code>; <code>processed_webhooks</code> stores cryptographic SHA-256 webhook body/ID replay hashes (auto-pruned after 30 days) solely to block duplicate delivery. Edge IP rate limits reset automatically every <strong>60 seconds</strong>. Cookie-free <strong>Cloudflare Web Analytics</strong> (<code>cloudflareinsights.com</code>) captures aggregate telemetry without cookies or cross-site profiling; external <strong>Google Fonts</strong> stylesheet requests transmit standard HTTP headers (IP/User-Agent) to Google LLC.
                </li>
              </ul>

              <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
                3. Children &amp; Minors (COPPA · GDPR-K · POPIA s. 35)
              </h3>
              <p style={{ margin: '0 0 12px', color: 'var(--ink-secondary)' }}>
                Free calculators for titles including <em>Minecraft</em>, <em>Roblox</em>, and <em>Fortnite</em> collect zero server-side personal data and display zero targeted behavioral ads. Paid Sync Pass checkouts, cloud sync, and support emails are strictly for users aged <strong>18+ (or 13+ US/UK and 16+ EU with parent/guardian authorization; under POPIA s. 35, South African minors under 18 require competent parental consent)</strong>. Parents may email <code>{supportEmail}</code> for prompt removal of any minor&rsquo;s data.
              </p>

              <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
                4. Retention, Cross-Border Transfers &amp; Verified DSAR Rights
              </h3>
              <p style={{ margin: 0, color: 'var(--ink-secondary)' }}>
                Active <code>sync_decks</code> persist until verified deletion (use automated <code>DELETE /api/sync/:code</code> with your <code>receiptRef</code> or email support); refunded or deactivated decks have <code>email_hash</code> and <code>state_json</code> scrubbed immediately upon revocation (retaining only an opaque deactivation marker), and <code>processed_webhooks</code> replay hashes prune after 30 days. Mandatory <code>orders</code> ledger records (<code>transaction_id</code>, amount, currency, timestamp) are retained <strong>5–7 years</strong> for statutory tax compliance (SA Tax Administration Act s. 29; GDPR Art. 6(1)(c)), with email hashes unlinked upon erasure requests. Infrastructure runs across <strong>Cloudflare Workers &amp; D1</strong> (encrypted at rest globally), <strong>Whop / Stripe / Google</strong> (US under EU Standard Contractual Clauses, UK IDTA, and EU-US Data Privacy Framework where certified), and support operations from South Africa (POPIA s. 72 safeguards). Email{' '}
                <a href={`mailto:${supportEmail}`} style={{ color: 'var(--ocean)', fontWeight: 600 }}>
                  {supportEmail}
                </a>{' '}
                to access, correct, export, restrict, object, or erase your record—we respond to verified requests within <strong>7 days</strong> (well within GDPR&rsquo;s 1-month / POPIA statutory timeframe) upon matching checkout email, Whop <code>mem_</code> / <code>pay_</code> receipt ID (including Apple Pay Private Relay), or your <code>UP-XXXXXXXX</code> code. Escalate unresolved complaints to South Africa&rsquo;s <strong>Information Regulator</strong> (<code>POPIAComplaints@inforegulator.org.za</code>, POPIA Form 5, <code>inforegulator.org.za</code>), the UK ICO, or your EU authority.
              </p>
            </div>
          )}

          {activeSection === 'refunds' && (
            <div>
              <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
                1. 14-Day Hassle-Free Sync Pass Refund Policy
              </h3>
              <p style={{ margin: '0 0 12px', color: 'var(--ink-secondary)' }}>
                <strong>Whop Inc.</strong> acts as Merchant of Record. Despite instant <code>UP-XXXXXXXX</code> cloud activation, statutory EU/UK 14-day cancellation rights and UK CRA 2015 digital-content remedies remain fully intact alongside our <strong>voluntary 14-day unconditional refund guarantee</strong>. If you purchased by mistake, cannot locate an Apple Pay Private Relay receipt, or aren&rsquo;t satisfied, email{' '}
                <a href={`mailto:${supportEmail}`} style={{ color: 'var(--ocean)', fontWeight: 600 }}>
                  {supportEmail}
                </a>{' '}
                with your checkout email, <code>UP-XXXXXXXX</code> code, or Whop <code>mem_</code> / <code>pay_</code> ID for a 100% refund. Refunded or disputed orders automatically deactivate associated access.
              </p>
              <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
                Billing descriptor &amp; tax note: Charges appear via Whop (e.g., <code>WHOP*PLAYUNPAUSE</code>); VAT/GST/sales tax is itemized at checkout.
              </p>

              <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
                2. ${sponsorPrice}/Day Top-Bar Sponsorship &amp; Acceptable Ad Policy
              </h3>
              <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--ink-secondary)' }}>
                <li>
                  <strong>Manual Review &amp; Slot Queueing:</strong> Every 24-hour top-bar placement is manually reviewed within 4–12 hours after you email your 60-character copy and <code>https://</code> destination URL to{' '}
                  <a href={`mailto:${sponsorEmail}`} style={{ color: 'var(--ocean)', fontWeight: 600 }}>
                    {sponsorEmail}
                  </a>
                  . All live placements display an explicit <strong>Sponsored</strong> label and <code>rel=&quot;sponsored&quot;</code> link attribute, and are hidden for Sync Pass holders. If a date is already booked, your 24-hour window runs in the next open slot or qualifies for a full refund prior to publication.
                </li>
                <li>
                  <strong>Strictly Prohibited Categories:</strong> Game cheats, hacks, aimbots, modded accounts, in-game currency/coin/RMT sellers, skin gambling, casinos/betting, crypto tokens/NFTs, URL shorteners, malware, adult content, or trademark-infringing pages.
                </li>
                <li>
                  <strong>Right to Decline &amp; Revocation:</strong> Unpause reserves sole discretion to reject any ad. Declined legitimate bookings receive a 100% refund; refunded/disputed sponsor orders or links altered post-approval to deceptive/prohibited destinations are terminated immediately without refund.
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
                <strong>playunpause.com</strong> is an independent, unofficial player utility and is <strong>not</strong> affiliated with, endorsed, sponsored, or approved by Take-Two Interactive Software, Inc., Rockstar Games, Activision Publishing, Inc., Epic Games, Inc., Mojang AB, Microsoft Corporation (Xbox®), Electronic Arts Inc. (EA SPORTS FC™ / FUT™), FIFA (FIFA®), Respawn Entertainment, Valve Corporation, Riot Games, Inc., Roblox Corporation, CD PROJEKT S.A. (Cyberpunk 2077®), or Sony Interactive Entertainment LLC (PlayStation® / PS5® / PSN®). All product names, console marks, and legacy URL aliases are used strictly for nominative compatibility identification.
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
                2. Zero UGC Hosting, Zero Leaks &amp; DMCA Notices (17 U.S.C. § 512(c)(3))
              </h3>
              <p style={{ margin: '0 0 12px', color: 'var(--ink-secondary)' }}>
                Unpause hosts <strong>zero user-generated uploads</strong>, ripped publisher assets, or NDA leak material—pre-launch GTA VI safe entries and route stops are fictional UI previews until Nov 18, 2026 release. Rights holders or authorized agents may submit formal takedown notices (identifying the copyrighted work, exact URL, contact details, good-faith belief statement, and accuracy/authority signature under penalty of perjury) to our IP/DMCA contact at{' '}
                <a href="mailto:dmca@playunpause.com" style={{ color: 'var(--ocean)', fontWeight: 600 }}>
                  dmca@playunpause.com
                </a>{' '}
                {legalServiceAddress ? `(${legalServiceAddress}) ` : ''}
                for expedited 24-hour review.
              </p>

              <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
                3. FTC Affiliate &amp; Native Advertising Disclosure (16 CFR Part 255)
              </h3>
              <p style={{ margin: 0, color: 'var(--ink-secondary)' }}>
                Outbound console hardware recommendations (PS5® NVMe SSDs and Xbox® Expansion Cards) may be affiliate links. <strong>As an Amazon Associate I earn from qualifying purchases.</strong> Paid 24-hour top-bar sponsorships are badged explicitly as <strong>Sponsored</strong>.
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
