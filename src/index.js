// Stripe fee math on Stripe's standard US published pricing. No dependencies, no DOM.
// Fees checked against stripe.com/pricing on STRIPE_FEES.lastVerified. Stripe can change prices;
// if you depend on these numbers, check the date and the source.
//
// Maintained by 71P: https://71p.com/stripe-fee-calculator

/** Stripe US standard pricing, as decimals (0.029 = 2.9%) and USD. */
export const STRIPE_FEES = Object.freeze({
  lastVerified: "2026-11-04",
  source: "https://stripe.com/pricing",
  domesticCardPct: 0.029,
  domesticCardFixed: 0.3,
  internationalSurchargePct: 0.015,
  currencyConversionPct: 0.01,
  manualCardPct: 0.034,
  manualCardFixed: 0.3,
  disputeFee: 15,
  disputeCounterFee: 15,
  achPct: 0.008,
  achCap: 5,
  billingPct: 0.007,
  radarPerScreen: 0.05,
  invoicingPct: 0.004,
  instantPayoutPct: 0.015,
  instantPayoutMin: 0.5,
  taxPct: 0.005,
});

const F = STRIPE_FEES;

/**
 * Parse "25,000,000", "$25M", "2.9%", "120k" into a number. Returns NaN for anything else.
 * @param {unknown} raw
 * @returns {number}
 */
export function parseAmount(raw) {
  if (raw == null) return NaN;
  let s = String(raw).trim().toLowerCase().replace(/[$,%\s]/g, "");
  if (!s) return NaN;
  let mult = 1;
  const suffix = s.slice(-1);
  if (suffix === "k") mult = 1e3;
  else if (suffix === "m") mult = 1e6;
  else if (suffix === "b") mult = 1e9;
  if (mult !== 1) s = s.slice(0, -1);
  if (!/^\d*\.?\d+$/.test(s)) return NaN;
  return Number(s) * mult;
}

/**
 * @typedef {"domestic" | "international" | "international-fx" | "manual"} CardKind
 * domestic: US card, online. international: non-US card (+1.5%).
 * international-fx: non-US card that also needs currency conversion (+1.5% +1%).
 * manual: card number typed in by hand (3.4% + $0.30).
 */

/**
 * The Stripe fee on one successful card payment.
 * @param {number} amount payment amount, USD
 * @param {CardKind} [kind]
 * @returns {{ pctRate: number, fixed: number, fee: number, net: number, share: number }}
 */
export function chargeFee(amount, kind = "domestic") {
  const pctRate =
    kind === "manual" ? F.manualCardPct
    : kind === "international" ? F.domesticCardPct + F.internationalSurchargePct
    : kind === "international-fx" ? F.domesticCardPct + F.internationalSurchargePct + F.currencyConversionPct
    : F.domesticCardPct;
  const fixed = kind === "manual" ? F.manualCardFixed : F.domesticCardFixed;
  const fee = amount * pctRate + fixed;
  return { pctRate, fixed, fee, net: amount - fee, share: amount > 0 ? fee / amount : 0 };
}

/**
 * What to charge so that `net` arrives after Stripe's fee: (net + fixed) / (1 - rate).
 * @param {number} net amount you want to receive, USD
 * @param {CardKind} [kind]
 * @returns {{ charge: number, fee: number, pctRate: number, fixed: number }}
 */
export function grossUp(net, kind = "domestic") {
  const { pctRate, fixed } = chargeFee(0, kind);
  const charge = (net + fixed) / (1 - pctRate);
  return { charge, fee: charge - net, pctRate, fixed };
}

/**
 * Stripe ACH Direct Debit fee: 0.8%, capped at $5.
 * @param {number} amount USD
 */
export function achFee(amount) {
  return Math.min(amount * F.achPct, F.achCap);
}

/**
 * Yearly Stripe fees on a card volume, from published pricing.
 * @param {number} annualVolume card volume per year, USD
 * @param {{ avgTicket?: number, intlSharePct?: number, fxSharePct?: number, usesBilling?: boolean, recurringSharePct?: number }} [opts]
 *   avgTicket: average payment, USD (default 100). intlSharePct / fxSharePct / recurringSharePct: 0-100.
 * @returns {{ txCount: number, cardFees: number, intlFees: number, fxFees: number, billingFees: number, total: number, effectiveRate: number }}
 */
export function annualFees(annualVolume, opts = {}) {
  const avgTicket = opts.avgTicket && opts.avgTicket > 0 ? opts.avgTicket : 100;
  const txCount = annualVolume / avgTicket;
  const cardFees = annualVolume * F.domesticCardPct + txCount * F.domesticCardFixed;
  const intlFees = annualVolume * ((opts.intlSharePct ?? 0) / 100) * F.internationalSurchargePct;
  const fxFees = annualVolume * ((opts.fxSharePct ?? 0) / 100) * F.currencyConversionPct;
  const billingFees = opts.usesBilling ? annualVolume * ((opts.recurringSharePct ?? 100) / 100) * F.billingPct : 0;
  const total = cardFees + intlFees + fxFees + billingFees;
  return { txCount, cardFees, intlFees, fxFees, billingFees, total, effectiveRate: annualVolume > 0 ? total / annualVolume : 0 };
}

/** Format USD, e.g. usd(1234.5, 2) → "$1,234.50". */
export const usd = (n, digits = 0) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: digits, minimumFractionDigits: digits });

/** Format a decimal as a percent, e.g. pct(0.032) → "3.20%". */
export const pct = (n, digits = 2) => `${(n * 100).toFixed(digits)}%`;
