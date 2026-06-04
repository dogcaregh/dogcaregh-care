// Shared cancellation policy logic — used by both the API route (server)
// and the booking detail page (client-side preview modal).

const PENALTY_RATE = 0.15;
const HOURS_48     = 48;

export type PolicyApplied =
  | "no_payment"      // pending/confirmed — no charge taken
  | "same_day"        // booked and cancelled same calendar day
  | "full_refund"     // 48+ hours before service
  | "penalty_48h"     // within 48 hours of service start
  | "mid_engagement"; // service already in progress

export type PenaltyDirection =
  | "owner_to_provider"  // owner cancels within 48h, provider compensated
  | "provider_to_owner"  // provider cancels within 48h, owner compensated
  | null;

export interface CancelPolicy {
  policyApplied:    PolicyApplied;
  refundAmount:     number;   // gross refund to owner
  penaltyAmount:    number;   // 15% penalty
  penaltyDirection: PenaltyDirection;
  workedDays:       number | null;
  totalDays:        number | null;
}

interface BookingSnapshot {
  status:         string;
  gross_amount:   number | string;
  start_date:     string;  // "YYYY-MM-DD"
  end_date:       string;  // "YYYY-MM-DD"
  created_at:     string;  // ISO timestamp
  selected_dates: string[] | null;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeCancelPolicy(
  booking:     BookingSnapshot,
  cancelledBy: "owner" | "provider",
): CancelPolicy {
  const gross = Number(booking.gross_amount);
  const none: CancelPolicy = {
    policyApplied:    "no_payment",
    refundAmount:     0,
    penaltyAmount:    0,
    penaltyDirection: null,
    workedDays:       null,
    totalDays:        null,
  };

  // No charge taken yet
  if (booking.status === "pending" || booking.status === "confirmed") return none;

  const now       = new Date();
  const createdAt = new Date(booking.created_at);
  const startDate = new Date(booking.start_date + "T00:00:00");

  // Same-day booking and cancellation — full refund, no penalty
  if (now.toDateString() === createdAt.toDateString()) {
    return { ...none, policyApplied: "same_day", refundAmount: gross };
  }

  // Mid-engagement (service already started)
  if (booking.status === "in_progress") {
    let totalDays: number;
    let workedDays: number;

    if (booking.selected_dates && booking.selected_dates.length > 0) {
      const today = now.toISOString().split("T")[0];
      totalDays  = booking.selected_dates.length;
      workedDays = booking.selected_dates.filter(d => d <= today).length;
    } else {
      const endDate = new Date(booking.end_date + "T23:59:59");
      totalDays  = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1);
      workedDays = Math.min(totalDays - 1, Math.max(1, Math.floor((now.getTime() - startDate.getTime()) / 86400000)));
    }

    const daysRemaining   = Math.max(0, totalDays - workedDays);
    const dailyRate       = gross / totalDays;
    const workedAmount    = round(dailyRate * workedDays);
    const remainingBalance = round(gross - workedAmount);
    const penaltyAmount   = daysRemaining > 0 ? round(remainingBalance * PENALTY_RATE) : 0;

    if (cancelledBy === "owner") {
      return {
        policyApplied:    "mid_engagement",
        refundAmount:     round(remainingBalance - penaltyAmount),
        penaltyAmount,
        penaltyDirection: penaltyAmount > 0 ? "owner_to_provider" : null,
        workedDays,
        totalDays,
      };
    } else {
      return {
        policyApplied:    "mid_engagement",
        refundAmount:     remainingBalance,
        penaltyAmount,
        penaltyDirection: penaltyAmount > 0 ? "provider_to_owner" : null,
        workedDays,
        totalDays,
      };
    }
  }

  // Status is 'paid' — check hours until service
  const hoursUntilService = (startDate.getTime() - now.getTime()) / 3600000;

  if (hoursUntilService >= HOURS_48) {
    return { ...none, policyApplied: "full_refund", refundAmount: gross };
  }

  // Within 48 hours — penalty applies
  const penaltyAmount = round(gross * PENALTY_RATE);

  if (cancelledBy === "owner") {
    return {
      policyApplied:    "penalty_48h",
      refundAmount:     round(gross - penaltyAmount),
      penaltyAmount,
      penaltyDirection: "owner_to_provider",
      workedDays:       null,
      totalDays:        null,
    };
  } else {
    return {
      policyApplied:    "penalty_48h",
      refundAmount:     gross,
      penaltyAmount,
      penaltyDirection: "provider_to_owner",
      workedDays:       null,
      totalDays:        null,
    };
  }
}

// Human-readable summary for notifications and modals
export function policyDescription(policy: CancelPolicy, cancelledBy: "owner" | "provider"): {
  ownerMsg:    string;
  providerMsg: string;
} {
  const { policyApplied, refundAmount, penaltyAmount } = policy;
  const fmt = (n: number) => `GHS ${n.toFixed(2)}`;

  switch (policyApplied) {
    case "no_payment":
      return {
        ownerMsg:    "Your booking has been cancelled. No charge was taken.",
        providerMsg: "The booking has been cancelled before payment. No action needed.",
      };

    case "same_day":
    case "full_refund":
      return {
        ownerMsg:    `Your booking has been cancelled. You will receive a full refund of ${fmt(refundAmount)}.`,
        providerMsg: `The booking has been cancelled. No compensation applies.`,
      };

    case "penalty_48h":
      if (cancelledBy === "owner") {
        return {
          ownerMsg:    `You cancelled within 48 hours. You will receive ${fmt(refundAmount)} (${fmt(penaltyAmount)} cancellation fee goes to the provider).`,
          providerMsg: `The owner cancelled within 48 hours. You will receive ${fmt(penaltyAmount)} as compensation.`,
        };
      } else {
        return {
          ownerMsg:    `Your provider cancelled within 48 hours. You will receive a full refund of ${fmt(refundAmount)}. An additional ${fmt(penaltyAmount)} compensation will be arranged.`,
          providerMsg: `You cancelled within 48 hours. The owner receives a full refund. ${fmt(penaltyAmount)} will be deducted from your next payout as compensation to the owner.`,
        };
      }

    case "mid_engagement": {
      const worked = policy.workedDays ?? 0;
      const total  = policy.totalDays ?? 1;
      if (cancelledBy === "owner") {
        return {
          ownerMsg:    `Booking cancelled mid-service (${worked} of ${total} days completed). You will receive a refund of ${fmt(refundAmount)}${penaltyAmount > 0 ? ` (after ${fmt(penaltyAmount)} cancellation fee)` : ""}.`,
          providerMsg: `The owner cancelled mid-service. You will be paid for ${worked} day${worked !== 1 ? "s" : ""} worked${penaltyAmount > 0 ? ` plus ${fmt(penaltyAmount)} cancellation compensation` : ""}.`,
        };
      } else {
        return {
          ownerMsg:    `Your provider cancelled mid-service (${worked} of ${total} days completed). You will receive a refund of ${fmt(refundAmount)}${penaltyAmount > 0 ? ` plus ${fmt(penaltyAmount)} compensation` : ""}.`,
          providerMsg: `You cancelled mid-service after ${worked} day${worked !== 1 ? "s" : ""}. You will be paid for work completed${penaltyAmount > 0 ? ` minus ${fmt(penaltyAmount)} compensation to the owner` : ""}.`,
        };
      }
    }
  }
}
