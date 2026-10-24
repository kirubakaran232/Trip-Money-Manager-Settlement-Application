/**
 * TripSettle Settlement Engine
 * ============================
 * All monetary values are stored and processed in integer PAISE (1 INR = 100 paise)
 * to eliminate floating-point rounding errors.
 *
 * The greedy debtor-creditor algorithm produces a VALID, EFFICIENT settlement but
 * does NOT guarantee the global minimum number of transfers in every case.
 * Finding the true minimum is NP-hard in the general case. The greedy approach
 * runs in O(n log n) and is optimal for most real-world group trip scenarios.
 */

// Helpers

/** Convert INR (float string or number) to integer paise */
export function inrToPaise(inr) {
  return Math.round(parseFloat(inr) * 100);
}

/** Convert integer paise to INR formatted string */
export function paiseToInr(paise) {
  return (paise / 100).toFixed(2);
}

/** Format paise as rupee string */
export function formatInr(paise) {
  const amount = paise / 100;
  return amount % 1 === 0 ? String.fromCharCode(8377) + amount : String.fromCharCode(8377) + amount.toFixed(2);
}

// Balance Calculation

/**
 * Calculates each participant's net balance from the expense list.
 * Returns a Map: participantId -> { paid: paise, fairShare: paise, net: paise, name: string }
 *   net > 0  => participant should RECEIVE this amount
 *   net < 0  => participant OWES this amount
 *   net = 0  => settled
 */
export function calculateBalances(participants, expenses) {
  const balances = new Map();

  participants.forEach((p) => {
    balances.set(p.id, { paid: 0, fairShare: 0, net: 0, name: p.name });
  });

  expenses.forEach((expense) => {
    const amountPaise = inrToPaise(expense.amount);

    if (balances.has(expense.payerId)) {
      balances.get(expense.payerId).paid += amountPaise;
    }

    expense.splits.forEach((split) => {
      if (balances.has(split.participantId)) {
        const sharePaise = inrToPaise(split.share);
        balances.get(split.participantId).fairShare += sharePaise;
      }
    });
  });

  balances.forEach((b) => {
    b.net = b.paid - b.fairShare;
  });

  return balances;
}

// Equal Split Helper

/**
 * Splits an amount (INR) equally among N participants.
 * Distributes any remainder paise to the first participants to ensure
 * the total always equals the original amount exactly.
 */
export function calculateEqualSplits(participantIds, amountInr) {
  const totalPaise = inrToPaise(amountInr);
  const n = participantIds.length;
  if (n === 0) return [];

  const basePaise = Math.floor(totalPaise / n);
  const remainder = totalPaise - basePaise * n;

  return participantIds.map((id, idx) => ({
    participantId: id,
    share: paiseToInr(basePaise + (idx < remainder ? 1 : 0)),
  }));
}

// Greedy Settlement Algorithm

/**
 * Greedy debtor-creditor algorithm.
 *
 * Strategy:
 *  1. Separate participants into debtors (net < 0) and creditors (net > 0).
 *  2. Sort both lists by absolute amount descending (largest first).
 *  3. At each step, match the largest debtor with the largest creditor.
 *  4. Settle min(debtor.owes, creditor.receives).
 *  5. Remove whoever reaches zero; repeat.
 *
 * NOTE: This generates a valid, efficient settlement but does NOT guarantee the
 * global minimum number of transfers in every case. The greedy approach runs in
 * O(n log n) and is optimal for most real-world group trip scenarios.
 *
 * Returns array of: { fromId, fromName, toId, toName, amount: paise }
 */
export function calculateGreedySettlement(balances) {
  const transfers = [];

  const debtors = [];
  const creditors = [];

  balances.forEach((b, id) => {
    if (b.net < 0) debtors.push({ id, name: b.name, amount: -b.net });
    if (b.net > 0) creditors.push({ id, name: b.name, amount: b.net });
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  let di = 0;
  let ci = 0;

  while (di < debtors.length && ci < creditors.length) {
    const debtor = debtors[di];
    const creditor = creditors[ci];

    if (debtor.id === creditor.id) {
      ci++;
      continue;
    }

    const settle = Math.min(debtor.amount, creditor.amount);

    if (settle > 0) {
      transfers.push({
        fromId: debtor.id,
        fromName: debtor.name,
        toId: creditor.id,
        toName: creditor.name,
        amount: settle,
      });
    }

    debtor.amount -= settle;
    creditor.amount -= settle;

    if (debtor.amount === 0) di++;
    if (creditor.amount === 0) ci++;
  }

  return transfers;
}

// Baseline (Naive) Settlement Algorithm

/**
 * Baseline strategy: alphabetical round-robin pairing.
 * Sorts debtors and creditors by name instead of by amount.
 * Produces a valid settlement but generally uses the same or more
 * transfers than the greedy approach.
 * Used as a comparison baseline in the Settlement Strategy Comparator.
 */
export function calculateBaselineSettlement(balances) {
  const transfers = [];

  const debtors = [];
  const creditors = [];

  balances.forEach((b, id) => {
    if (b.net < 0) debtors.push({ id, name: b.name, amount: -b.net });
    if (b.net > 0) creditors.push({ id, name: b.name, amount: b.net });
  });

  debtors.sort((a, b) => a.name.localeCompare(b.name));
  creditors.sort((a, b) => a.name.localeCompare(b.name));

  let di = 0;
  let ci = 0;

  while (di < debtors.length && ci < creditors.length) {
    const debtor = debtors[di];
    const creditor = creditors[ci];

    if (debtor.id === creditor.id) {
      ci++;
      continue;
    }

    const settle = Math.min(debtor.amount, creditor.amount);

    if (settle > 0) {
      transfers.push({
        fromId: debtor.id,
        fromName: debtor.name,
        toId: creditor.id,
        toName: creditor.name,
        amount: settle,
      });
    }

    debtor.amount -= settle;
    creditor.amount -= settle;

    if (debtor.amount === 0) di++;
    if (creditor.amount === 0) ci++;
  }

  return transfers;
}

// Greedy Step-by-Step Trace

/**
 * Returns greedy transfers AND step-by-step trace for animation panel.
 * Each step: { stepIndex, debtor, creditor, settleAmount, debtorRemainingAfter, creditorRemainingAfter }
 */
export function calculateGreedySettlementWithSteps(balances) {
  const steps = [];
  const transfers = [];

  const debtors = [];
  const creditors = [];

  balances.forEach((b, id) => {
    if (b.net < 0) debtors.push({ id, name: b.name, amount: -b.net });
    if (b.net > 0) creditors.push({ id, name: b.name, amount: b.net });
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const debtorsCopy = debtors.map((d) => ({ ...d }));
  const creditorsCopy = creditors.map((c) => ({ ...c }));

  let di = 0;
  let ci = 0;

  while (di < debtorsCopy.length && ci < creditorsCopy.length) {
    const debtor = debtorsCopy[di];
    const creditor = creditorsCopy[ci];

    if (debtor.id === creditor.id) {
      ci++;
      continue;
    }

    const settle = Math.min(debtor.amount, creditor.amount);

    steps.push({
      stepIndex: steps.length,
      debtor: { id: debtor.id, name: debtor.name, owedBefore: debtor.amount },
      creditor: { id: creditor.id, name: creditor.name, owedBefore: creditor.amount },
      settleAmount: settle,
      debtorRemainingAfter: debtor.amount - settle,
      creditorRemainingAfter: creditor.amount - settle,
    });

    if (settle > 0) {
      transfers.push({
        fromId: debtor.id,
        fromName: debtor.name,
        toId: creditor.id,
        toName: creditor.name,
        amount: settle,
      });
    }

    debtor.amount -= settle;
    creditor.amount -= settle;

    if (debtor.amount === 0) di++;
    if (creditor.amount === 0) ci++;
  }

  return { transfers, steps };
}

// Verification

/**
 * Verifies that all balances are settled after applying the given transfers.
 * Returns { valid: bool, residuals: Map<id, paise> }
 */
export function verifySettlement(balances, transfers) {
  const residuals = new Map();
  balances.forEach((b, id) => residuals.set(id, b.net));

  transfers.forEach((t) => {
    residuals.set(t.fromId, (residuals.get(t.fromId) || 0) + t.amount);
    residuals.set(t.toId, (residuals.get(t.toId) || 0) - t.amount);
  });

  const valid = [...residuals.values()].every((v) => v === 0);
  return { valid, residuals };
}

// Demo Data

export const DEMO_DATA = {
  participants: [
    { id: "p1", name: "Asha" },
    { id: "p2", name: "Bala" },
    { id: "p3", name: "Charan" },
  ],
  expenses: [
    {
      id: "e1",
      title: "Group Transportation",
      amount: "900",
      category: "Travel",
      payerId: "p1",
      splitMethod: "equal",
      splits: [
        { participantId: "p1", share: "300.00" },
        { participantId: "p2", share: "300.00" },
        { participantId: "p3", share: "300.00" },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: "e2",
      title: "Group Meal",
      amount: "300",
      category: "Food",
      payerId: "p2",
      splitMethod: "equal",
      splits: [
        { participantId: "p1", share: "150.00" },
        { participantId: "p2", share: "150.00" },
      ],
      createdAt: new Date().toISOString(),
    },
  ],
  completedTransfers: [],
};
