import { db } from "../config/db";
import { sql, eq, and, gte } from "drizzle-orm";
import { Applications } from "../db/schemas";

class StationStatisticsServices {
  /**
   * Compute a full statistics snapshot for a single station.
   *
   * Station isolation: the station UUID comes from the caller (JWT claim);
   * every query is scoped with `eq(Applications.station, station)`.
   *
   * Two DB round-trips:
   *  1. All-time totals: total received, per-status counts, per-type counts,
   *     and printing breakdown — all computed in one conditional-aggregate query.
   *  2. Period-bounded counts (today / this week / this month) — one query
   *     with FILTER expressions for each window.
   */
  static async getStationStatistics(station: string) {
    // ─── Shared time boundaries (server local time) ───────────────────────────
    const now = new Date();

    // Today: midnight of the current day
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    // This week: Monday midnight of the current ISO week
    const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon …
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const startOfWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + diffToMonday,
    );

    // This month: 1st of the current month at midnight
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // ─── Query 1: all-time totals + printing ──────────────────────────────────
    const [totalsRow] = await db
      .select({
        received: sql<number>`COUNT(*)::int`,

        // --- by status ---
        pendingReview: sql<number>`COUNT(*) FILTER (WHERE ${Applications.status} = 'PENDING_REVIEW')::int`,
        approved: sql<number>`COUNT(*) FILTER (WHERE ${Applications.status} = 'APPROVED')::int`,
        rejected: sql<number>`COUNT(*) FILTER (WHERE ${Applications.status} = 'REJECTED')::int`,
        collected: sql<number>`COUNT(*) FILTER (WHERE ${Applications.status} = 'COLLECTED')::int`,
        resubmitted: sql<number>`COUNT(*) FILTER (WHERE ${Applications.status} = 'RESUBMITTED')::int`,

        // --- by type ---
        birth: sql<number>`COUNT(*) FILTER (WHERE ${Applications.type} = 'BIRTH')::int`,
        id: sql<number>`COUNT(*) FILTER (WHERE ${Applications.type} = 'ID')::int`,

        // --- printing ---
        approvedNotPrinted: sql<number>`COUNT(*) FILTER (WHERE ${Applications.status} = 'APPROVED' AND ${Applications.isPrinted} = false)::int`,
        printed: sql<number>`COUNT(*) FILTER (WHERE ${Applications.isPrinted} = true)::int`,
      })
      .from(Applications)
      .where(eq(Applications.station, station));

    // ─── Query 2: period-bounded counts ───────────────────────────────────────
    const [periodsRow] = await db
      .select({
        // today
        todayReceived: sql<number>`COUNT(*) FILTER (WHERE ${Applications.createdAt} >= ${startOfToday})::int`,
        todayApproved: sql<number>`COUNT(*) FILTER (WHERE ${Applications.status} = 'APPROVED' AND ${Applications.approvedAt} >= ${startOfToday})::int`,
        todayRejected: sql<number>`COUNT(*) FILTER (WHERE ${Applications.status} = 'REJECTED' AND ${Applications.rejectedAt} >= ${startOfToday})::int`,

        // this week
        weekReceived: sql<number>`COUNT(*) FILTER (WHERE ${Applications.createdAt} >= ${startOfWeek})::int`,
        weekApproved: sql<number>`COUNT(*) FILTER (WHERE ${Applications.status} = 'APPROVED' AND ${Applications.approvedAt} >= ${startOfWeek})::int`,
        weekRejected: sql<number>`COUNT(*) FILTER (WHERE ${Applications.status} = 'REJECTED' AND ${Applications.rejectedAt} >= ${startOfWeek})::int`,

        // this month
        monthReceived: sql<number>`COUNT(*) FILTER (WHERE ${Applications.createdAt} >= ${startOfMonth})::int`,
        monthApproved: sql<number>`COUNT(*) FILTER (WHERE ${Applications.status} = 'APPROVED' AND ${Applications.approvedAt} >= ${startOfMonth})::int`,
        monthRejected: sql<number>`COUNT(*) FILTER (WHERE ${Applications.status} = 'REJECTED' AND ${Applications.rejectedAt} >= ${startOfMonth})::int`,
      })
      .from(Applications)
      .where(eq(Applications.station, station));

    // ─── Shape the response ───────────────────────────────────────────────────
    return {
      statistics: {
        totals: {
          received: totalsRow?.received ?? 0,
          byStatus: {
            PENDING_REVIEW: totalsRow?.pendingReview ?? 0,
            APPROVED: totalsRow?.approved ?? 0,
            REJECTED: totalsRow?.rejected ?? 0,
            COLLECTED: totalsRow?.collected ?? 0,
            RESUBMITTED: totalsRow?.resubmitted ?? 0,
          },
          byType: {
            BIRTH: totalsRow?.birth ?? 0,
            ID: totalsRow?.id ?? 0,
          },
        },
        periods: {
          today: {
            received: periodsRow?.todayReceived ?? 0,
            approved: periodsRow?.todayApproved ?? 0,
            rejected: periodsRow?.todayRejected ?? 0,
          },
          thisWeek: {
            received: periodsRow?.weekReceived ?? 0,
            approved: periodsRow?.weekApproved ?? 0,
            rejected: periodsRow?.weekRejected ?? 0,
          },
          thisMonth: {
            received: periodsRow?.monthReceived ?? 0,
            approved: periodsRow?.monthApproved ?? 0,
            rejected: periodsRow?.monthRejected ?? 0,
          },
        },
        printing: {
          approvedNotPrinted: totalsRow?.approvedNotPrinted ?? 0,
          printed: totalsRow?.printed ?? 0,
        },
      },
    };
  }
}

export default StationStatisticsServices;
