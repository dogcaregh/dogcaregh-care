-- ============================================================
-- DogCareGH — Metrics: incidents + metric_snapshots + RPCs
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── incidents ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.incidents (
  id               uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  type             text        NOT NULL CHECK (type IN (
                     'safety_dog','safety_person','provider_conduct',
                     'provider_no_show','payment_dispute','other')),
  booking_id       uuid        REFERENCES public.bookings(id),
  provider_id      uuid        REFERENCES public.providers(id),
  description      text        NOT NULL,
  status           text        NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  resolved_at      timestamptz,
  resolution_notes text
);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents (status, created_at DESC);

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_incidents" ON public.incidents FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));


-- ── metric_snapshots ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.metric_snapshots (
  week_start   date    NOT NULL,
  metric_key   text    NOT NULL,
  value        numeric,
  gate_status  text,
  PRIMARY KEY (week_start, metric_key)
);

ALTER TABLE public.metric_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_snapshots" ON public.metric_snapshots FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));


-- ── get_metrics(p_from, p_to) → jsonb ────────────────────────
-- All computation in Postgres; called from the API route via rpc().

CREATE OR REPLACE FUNCTION public.get_metrics(p_from timestamptz, p_to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days         numeric;
  v_closed       int     := 0;
  v_created      int     := 0;
  v_ever_conf    int     := 0;
  v_cancelled    int     := 0;
  v_prov_cancel  int     := 0;
  v_reviews      int     := 0;
  v_new_custs    int     := 0;
  v_gmv          numeric := 0;
  v_commission   numeric := 0;
  v_avg_rating   numeric := 0;
  v_fte          numeric := 0;
  v_bpp          numeric := 0;
  v_median_hrs   numeric := 0;
  v_no_resp_pct  numeric := 0;
  v_repeat_rate  numeric := 0;
  v_repeat_elig  int     := 0;
  v_acceptance   numeric := 100;
  v_payout_sr    numeric := 100;
  v_payout_delay numeric := 0;
  v_providers    jsonb   := '[]';
BEGIN

  v_days := GREATEST(1, EXTRACT(EPOCH FROM (p_to - p_from)) / 86400.0);

  -- Closed bookings in period (use end_date as the "when service happened" anchor)
  SELECT COUNT(*)::int INTO v_closed
  FROM bookings WHERE status = 'closed'
    AND end_date BETWEEN p_from::date AND p_to::date;

  -- All bookings created in period
  SELECT COUNT(*)::int INTO v_created
  FROM bookings WHERE created_at BETWEEN p_from AND p_to;

  -- Bookings that progressed to confirmed or beyond
  SELECT COUNT(*)::int INTO v_ever_conf
  FROM bookings WHERE created_at BETWEEN p_from AND p_to
    AND status IN ('confirmed','paid','in_progress','completed_pending','closed');

  -- Cancelled in period (split by who cancelled)
  SELECT
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE cancelled_by = 'provider')::int
  INTO v_cancelled, v_prov_cancel
  FROM bookings WHERE created_at BETWEEN p_from AND p_to AND status = 'cancelled';

  -- GMV and commission
  SELECT COALESCE(SUM(gross_amount), 0), COALESCE(SUM(commission_amount), 0)
  INTO v_gmv, v_commission
  FROM bookings WHERE status = 'closed'
    AND end_date BETWEEN p_from::date AND p_to::date;

  -- Reviews and average rating (for closed bookings by end_date)
  SELECT
    COUNT(r.id)::int,
    COALESCE(ROUND(AVG(r.rating::numeric), 2), 0)
  INTO v_reviews, v_avg_rating
  FROM reviews r
  JOIN bookings b ON b.id = r.booking_id
  WHERE b.status = 'closed' AND b.end_date BETWEEN p_from::date AND p_to::date;

  -- New customers (first-ever closed booking in this period)
  SELECT COUNT(DISTINCT b.owner_id)::int INTO v_new_custs
  FROM bookings b
  WHERE b.status = 'closed' AND b.end_date BETWEEN p_from::date AND p_to::date
    AND NOT EXISTS (
      SELECT 1 FROM bookings b2 WHERE b2.owner_id = b.owner_id
        AND b2.status = 'closed' AND b2.end_date < p_from::date
    );

  -- ── Gate 1: bookings per active provider per month (pro-rated) ──
  SELECT GREATEST(0.0001, COALESCE(SUM(
    GREATEST(0.0,
      EXTRACT(EPOCH FROM (LEAST(p_to, NOW()) - GREATEST(p_from, p.verified_at))) / 86400.0
    ) / v_days
  ), 0.0001))
  INTO v_fte
  FROM providers p
  WHERE p.verification_status = 'approved' AND p.active = true
    AND p.verified_at IS NOT NULL AND p.verified_at < p_to;

  v_bpp := ROUND((v_closed::numeric / v_fte) * (30.0 / v_days), 2);

  -- ── Gate 2: median provider response time (hours) ──
  -- Proxy: booking_confirmed or booking_declined notification timestamp − booking.created_at
  SELECT COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (first_resp.ts - b.created_at)) / 3600.0
  ), 0)
  INTO v_median_hrs
  FROM bookings b
  JOIN LATERAL (
    SELECT MIN(n.created_at) AS ts FROM notifications n
    WHERE n.booking_id = b.id AND n.type IN ('booking_confirmed','booking_declined')
  ) first_resp ON first_resp.ts IS NOT NULL
  WHERE b.created_at BETWEEN p_from AND p_to;

  -- No-response rate (old enough to have received a response, but didn't)
  SELECT CASE WHEN t.cnt > 0 THEN ROUND(nr.cnt::numeric / t.cnt * 100, 1) ELSE 0 END
  INTO v_no_resp_pct
  FROM (
    SELECT COUNT(*)::numeric AS cnt FROM bookings
    WHERE created_at BETWEEN p_from AND p_to
      AND created_at < NOW() - INTERVAL '48 hours'
      AND NOT EXISTS (
        SELECT 1 FROM notifications n WHERE n.booking_id = bookings.id
          AND n.type IN ('booking_confirmed','booking_declined')
      )
  ) nr,
  (
    SELECT COUNT(*)::numeric AS cnt FROM bookings
    WHERE created_at BETWEEN p_from AND p_to
      AND created_at < NOW() - INTERVAL '48 hours'
  ) t;

  -- ── Gate 3: repeat booking rate ──
  -- Customers whose first closed booking falls in [start−30d, end−30d],
  -- pct who had a second closed booking within 30 days of that first.
  SELECT COUNT(*)::int, COALESCE(ROUND(AVG(did_repeat::numeric) * 100, 1), 0)
  INTO v_repeat_elig, v_repeat_rate
  FROM (
    SELECT CASE WHEN EXISTS (
      SELECT 1 FROM bookings b2 WHERE b2.owner_id = fc.owner_id
        AND b2.status = 'closed'
        AND b2.end_date > fc.first_date
        AND b2.end_date <= fc.first_date + 30
    ) THEN 1 ELSE 0 END AS did_repeat
    FROM (
      SELECT owner_id, MIN(end_date) AS first_date FROM bookings
      WHERE status = 'closed'
      GROUP BY owner_id
      HAVING MIN(end_date) BETWEEN (p_from::date - 30) AND (p_to::date - 30)
    ) fc
  ) repeats;

  -- ── Health: acceptance rate (responded / received in period) ──
  SELECT CASE WHEN v_created > 0
    THEN ROUND(resp.cnt::numeric / v_created * 100, 1)
    ELSE 100 END
  INTO v_acceptance
  FROM (
    SELECT COUNT(DISTINCT b.id)::numeric AS cnt
    FROM bookings b
    JOIN notifications n ON n.booking_id = b.id
      AND n.type IN ('booking_confirmed','booking_declined')
    WHERE b.created_at BETWEEN p_from AND p_to
  ) resp;

  -- ── Health: payout success rate (cashout_requests in period) ──
  SELECT CASE WHEN COUNT(*) > 0
    THEN ROUND(COUNT(*) FILTER (WHERE status = 'paid')::numeric / COUNT(*) * 100, 1)
    ELSE 100 END
  INTO v_payout_sr
  FROM cashout_requests WHERE created_at BETWEEN p_from AND p_to;

  -- ── Health: median payout processing time (request → paid) ──
  SELECT COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (paid_at - created_at)) / 3600.0
  ), 0)
  INTO v_payout_delay
  FROM cashout_requests WHERE status = 'paid' AND paid_at BETWEEN p_from AND p_to;

  -- ── Provider drill-down ──
  SELECT COALESCE(jsonb_agg(row_data ORDER BY
    CASE row_data->>'chip' WHEN 'risk' THEN 0 WHEN 'watch' THEN 1 ELSE 2 END,
    (row_data->>'completed')::int DESC
  ), '[]')
  INTO v_providers
  FROM (
    SELECT jsonb_build_object(
      'id',          p.id,
      'name',        u.name,
      'hood',        COALESCE(p.neighbourhood, '—'),
      'level',       p.provider_level,
      'days_live',   GREATEST(0, EXTRACT(DAY FROM (NOW() - p.verified_at))::int),
      'completed',   COALESCE(cb.cnt, 0),
      'bpp',         ROUND(COALESCE(cb.cnt, 0)::numeric * 30.0 / v_days, 1),
      'resp_hours',  COALESCE(rt.median_hrs, -1),
      'accept_pct',  COALESCE(acc.pct, 100),
      'prov_cancel', COALESCE(pc.cnt, 0),
      'rating',      p.rating_avg,
      'last_active', COALESCE(la.d::text, null),
      'chip', CASE
        WHEN COALESCE(pc.cnt, 0) >= 2
          OR COALESCE(acc.pct, 100) < 50
          OR (la.d IS NULL AND EXTRACT(DAY FROM (NOW() - p.verified_at)) > 14)
          OR (la.d IS NOT NULL AND la.d < (NOW() - INTERVAL '14 days')::date) THEN 'risk'
        WHEN COALESCE(acc.pct, 100) < 70
          OR COALESCE(cb.cnt, 0)::numeric * 30.0 / v_days < 3 THEN 'watch'
        ELSE 'healthy'
      END
    ) AS row_data
    FROM providers p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS cnt FROM bookings
      WHERE provider_id = p.id AND status = 'closed'
        AND end_date BETWEEN p_from::date AND p_to::date
    ) cb ON true
    LEFT JOIN LATERAL (
      SELECT COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (fr.ts - b.created_at)) / 3600.0
      ), -1) AS median_hrs
      FROM bookings b
      JOIN LATERAL (
        SELECT MIN(n.created_at) AS ts FROM notifications n
        WHERE n.booking_id = b.id AND n.type IN ('booking_confirmed','booking_declined')
      ) fr ON fr.ts IS NOT NULL
      WHERE b.provider_id = p.id AND b.created_at BETWEEN p_from AND p_to
    ) rt ON true
    LEFT JOIN LATERAL (
      SELECT CASE WHEN t.cnt > 0 THEN ROUND(r.cnt::numeric / t.cnt * 100, 1) ELSE 100 END AS pct
      FROM (SELECT COUNT(*)::numeric AS cnt FROM bookings WHERE provider_id = p.id AND created_at BETWEEN p_from AND p_to) t,
           (SELECT COUNT(DISTINCT b.id)::numeric AS cnt FROM bookings b
            JOIN notifications n ON n.booking_id = b.id AND n.type IN ('booking_confirmed','booking_declined')
            WHERE b.provider_id = p.id AND b.created_at BETWEEN p_from AND p_to) r
    ) acc ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS cnt FROM bookings
      WHERE provider_id = p.id AND status = 'cancelled'
        AND cancelled_by = 'provider' AND created_at BETWEEN p_from AND p_to
    ) pc ON true
    LEFT JOIN LATERAL (
      SELECT MAX(end_date) AS d FROM bookings WHERE provider_id = p.id AND status = 'closed'
    ) la ON true
    WHERE p.verification_status = 'approved' AND p.active = true
  ) pdata;

  RETURN jsonb_build_object(
    'gates', jsonb_build_object(
      'bookings_per_provider', v_bpp,
      'median_response_hours', ROUND(v_median_hrs::numeric, 1),
      'no_response_pct',       v_no_resp_pct,
      'repeat_rate',           v_repeat_rate,
      'repeat_eligible',       v_repeat_elig
    ),
    'health', jsonb_build_object(
      'conversion_pct',      CASE WHEN v_created > 0 THEN ROUND(v_ever_conf::numeric / v_created * 100, 1) ELSE 0 END,
      'acceptance_pct',      v_acceptance,
      'cancel_rate_pct',     CASE WHEN (v_closed + v_cancelled) > 0 THEN ROUND(v_cancelled::numeric / (v_closed + v_cancelled) * 100, 1) ELSE 0 END,
      'provider_cancel_pct', CASE WHEN v_cancelled > 0 THEN ROUND(v_prov_cancel::numeric / v_cancelled * 100, 1) ELSE 0 END,
      'payout_success_pct',  v_payout_sr,
      'payout_delay_hours',  ROUND(v_payout_delay::numeric, 1),
      'review_rate_pct',     CASE WHEN v_closed > 0 THEN ROUND(v_reviews::numeric / v_closed * 100, 1) ELSE 0 END,
      'avg_rating',          v_avg_rating,
      'new_customers',       v_new_custs,
      'gmv',                 v_gmv,
      'commission',          v_commission
    ),
    'providers', v_providers,
    'volume',    v_closed
  );
END;
$$;


-- ── compute_weekly_snapshot(p_week_start) — idempotent ───────

CREATE OR REPLACE FUNCTION public.compute_weekly_snapshot(p_week_start date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_m    jsonb;
  v_g    jsonb;
BEGIN
  v_m := public.get_metrics(p_week_start::timestamptz, (p_week_start + 7)::timestamptz);
  v_g  := v_m -> 'gates';

  INSERT INTO public.metric_snapshots (week_start, metric_key, value, gate_status) VALUES
    (p_week_start, 'gate_bpp',
     (v_g->>'bookings_per_provider')::numeric,
     CASE WHEN (v_g->>'bookings_per_provider')::numeric >= 5 THEN 'green' ELSE 'red' END),
    (p_week_start, 'gate_response_hours',
     (v_g->>'median_response_hours')::numeric,
     CASE WHEN (v_g->>'median_response_hours')::numeric < 4 THEN 'green' ELSE 'red' END),
    (p_week_start, 'gate_no_response_pct',
     (v_g->>'no_response_pct')::numeric,
     CASE WHEN (v_g->>'no_response_pct')::numeric < 10 THEN 'green' ELSE 'red' END),
    (p_week_start, 'gate_repeat_rate',
     (v_g->>'repeat_rate')::numeric,
     CASE WHEN (v_g->>'repeat_rate')::numeric >= 30 THEN 'green' ELSE 'red' END)
  ON CONFLICT (week_start, metric_key) DO UPDATE
    SET value = EXCLUDED.value, gate_status = EXCLUDED.gate_status;
END;
$$;
