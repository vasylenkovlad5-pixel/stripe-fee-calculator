# Stripe fee calculator

Small, dependency-free JavaScript for working out Stripe fees on standard US pricing:

- the fee on one card payment (domestic, international, currency conversion, manual entry)
- what to charge so a set amount arrives after the fee (gross-up)
- yearly Stripe fees on a card volume, including international, FX and Stripe Billing
- the ACH Direct Debit fee (0.8%, capped at $5)

**Try it in the browser:** https://vasylenkovlad5-pixel.github.io/stripe-fee-calculator/

Fees were last checked against [stripe.com/pricing](https://stripe.com/pricing) on **November 4, 2026** (`STRIPE_FEES.lastVerified`). Stripe can change its prices and negotiates custom rates with larger merchants, so treat results as estimates on published pricing.

## Use it

Copy `src/index.js` into your project, or import it straight from the repo. It is a plain ES module with JSDoc types.

```js
import { chargeFee, grossUp, annualFees, parseAmount } from "./src/index.js";

chargeFee(100);                      // { fee: 3.2, net: 96.8, pctRate: 0.029, fixed: 0.3, share: 0.032 }
chargeFee(100, "international-fx");  // fee: 5.7 (2.9% + 1.5% + 1% + $0.30)
grossUp(100).charge;                 // 103.295... → charge $103.30 to receive $100
annualFees(10_000_000, { avgTicket: 100, intlSharePct: 20 }).total; // 350000
parseAmount("$25M");                 // 25000000
```

### API

| Function | Returns |
| --- | --- |
| `chargeFee(amount, kind?)` | `{ fee, net, pctRate, fixed, share }` for one payment. `kind`: `"domestic"` (default), `"international"`, `"international-fx"`, `"manual"` |
| `grossUp(net, kind?)` | `{ charge, fee, pctRate, fixed }`: the amount to charge so `net` arrives. Formula: `(net + 0.30) / (1 − rate)` |
| `annualFees(volume, opts?)` | `{ total, effectiveRate, txCount, cardFees, intlFees, fxFees, billingFees }`. `opts`: `avgTicket`, `intlSharePct`, `fxSharePct`, `usesBilling`, `recurringSharePct` |
| `achFee(amount)` | ACH Direct Debit fee in USD |
| `parseAmount(text)` | Number from input like `"25,000,000"`, `"$25M"`, `"120k"`, `"2.9%"`, or `NaN` |
| `STRIPE_FEES` | The published rates used above, with `lastVerified` and `source` |
| `usd(n, digits?)`, `pct(n, digits?)` | Formatting helpers |

## Why the gross-up isn't just "add 2.9%"

Stripe takes its percentage from the whole charge, including the part you added to cover the fee. Adding 2.9% + $0.30 to $100 gives $103.20, but Stripe then takes $3.29 and you receive $99.91. Dividing by `1 − 0.029` fixes that: charge $103.30 and $100 arrives.

## Tests

```bash
node --test
```

## Embed the full calculator

If you write about payments, you can embed 71P's full savings calculator, which compares Stripe's flat rate with interchange-plus pricing for your volume and industry:

```html
<iframe src="https://71p.com/embed/stripe-fee-calculator" title="Stripe fee calculator" width="100%" height="900" style="border:0" loading="lazy"></iframe>
<p>Calculator by <a href="https://71p.com/stripe-fee-calculator">71P</a></p>
```

## Credit

MIT licensed, so you can use this however you like. If it helps you, a link to the [Stripe fee calculator on 71P](https://71p.com/stripe-fee-calculator) is appreciated.

## Keeping the numbers current

When Stripe publishes a price change, update `STRIPE_FEES` and `lastVerified` in `src/index.js`, then the expected values in `test/index.test.js`. Issues and pull requests that point to a change on stripe.com/pricing are welcome.

More on what each fee costs at real volume: [Stripe fees explained](https://71p.com/stripe-fees).
