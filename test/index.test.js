import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAmount, chargeFee, grossUp, achFee, annualFees } from "../src/index.js";

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test("parseAmount", () => {
  assert.equal(parseAmount("25,000,000"), 25e6);
  assert.equal(parseAmount("$25M"), 25e6);
  assert.equal(parseAmount("120k"), 120e3);
  assert.equal(parseAmount("2.9%"), 2.9);
  assert.ok(Number.isNaN(parseAmount("abc")));
  assert.ok(Number.isNaN(parseAmount("")));
});

test("chargeFee: $100 domestic is $3.20", () => {
  const r = chargeFee(100);
  near(r.fee, 3.2);
  near(r.net, 96.8);
  near(r.share, 0.032);
});

test("chargeFee: international with currency conversion is 5.4% + $0.30", () => {
  const r = chargeFee(100, "international-fx");
  near(r.pctRate, 0.054);
  near(r.fee, 5.7);
});

test("chargeFee: manual entry is 3.4% + $0.30", () => {
  near(chargeFee(100, "manual").fee, 3.7);
});

test("grossUp: charge $103.30 to net $100", () => {
  const r = grossUp(100);
  near(r.charge, 100.3 / 0.971);
  near(chargeFee(r.charge).net, 100);
});

test("achFee caps at $5", () => {
  near(achFee(100), 0.8);
  assert.equal(achFee(10_000), 5);
});

test("annualFees: $10M at $100 tickets", () => {
  const r = annualFees(10e6, { avgTicket: 100 });
  near(r.cardFees, 290_000 + 100_000 * 0.3);
  near(r.total, 320_000);
  near(r.effectiveRate, 0.032);
});

test("annualFees: surcharges and Billing", () => {
  const r = annualFees(10e6, { avgTicket: 100, intlSharePct: 20, fxSharePct: 10, usesBilling: true, recurringSharePct: 50 });
  near(r.intlFees, 30_000);
  near(r.fxFees, 10_000);
  near(r.billingFees, 35_000);
  near(r.total, 395_000);
});
