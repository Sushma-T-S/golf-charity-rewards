import { supabaseAdmin } from "./supabaseAdmin";

type RunOptions = {
  simulate?: boolean;
  algorithmic?: boolean;
  month?: string;
  year?: number;
};

const TIER_SHARES = {
  5: 0.4,
  4: 0.35,
  3: 0.25,
};

function generateUniqueNumbers(count = 5, max = 45) {
  const set = new Set<number>();
  while (set.size < count) {
    set.add(Math.floor(Math.random() * max) + 1);
  }
  return Array.from(set).sort((a, b) => a - b);
}

export async function runMonthlyDraw(opts: RunOptions = {}) {
  const simulate = !!opts.simulate;
  const month = opts.month ?? new Date().toLocaleString("default", { month: "long" });
  const year = opts.year ?? new Date().getFullYear();

  const { data: activeProfiles } = await supabaseAdmin
    .from("profiles")
    .select("id, charity_percentage")
    .eq("subscription_status", "active");

  const activeCount = Array.isArray(activeProfiles) ? activeProfiles.length : 0;

  // 1. generate unique draw numbers
  const drawNumbers = opts.algorithmic
    ? await generateAlgorithmicNumbers(activeProfiles || [], 45)
    : generateUniqueNumbers(5, 45);

  // If simulate only, return the generated numbers without touching DB
  if (simulate) {
    return { drawNumbers, simulated: true, algorithmic: Boolean(opts.algorithmic) };
  }

  // 2. insert base draw record (published)
  const status = "published";

  const { data: insertedDraw, error: insertErr } = await supabaseAdmin
    .from("draws")
    .insert({
      month,
      year,
      draw_numbers: drawNumbers,
      type: "Monthly",
      status,
    })
    .select()
    .single();

  if (insertErr) {
    console.error("Draw insert error:", insertErr);
    throw insertErr;
  }

  const drawId = insertedDraw?.id;

  // 3. compute prize pool
  // Basic model: use env config for monthly subscription price and contribution percent
  const monthlyPrice = Number(process.env.SUBSCRIPTION_PRICE_MONTHLY || 10);
  const contributionPercent = Number(process.env.PRIZE_POOL_CONTRIBUTION_PERCENT || 0.1); // default 10%

  async function generateAlgorithmicNumbers(activeProfiles: any[], maxNumber: number) {
    const frequency: Record<number, number> = {};

    for (const profile of activeProfiles) {
      const { data: scores } = await supabaseAdmin
        .from("scores")
        .select("score")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20);

      for (const score of scores || []) {
        const value = Number(score.score);
        if (!Number.isInteger(value) || value < 1 || value > maxNumber) continue;
        frequency[value] = (frequency[value] || 0) + 1;
      }
    }

    const ordered = Object.entries(frequency)
      .sort((a, b) => (b[1] - a[1]) || (Number(a[0]) - Number(b[0])))
      .map(([value]) => Number(value));

    const selected = new Set<number>();
    for (const value of ordered) {
      if (selected.size >= 5) break;
      selected.add(value);
    }

    while (selected.size < 5) {
      selected.add(Math.floor(Math.random() * maxNumber) + 1);
    }

    return Array.from(selected).sort((a, b) => a - b);
  }

  const basePool = activeCount * monthlyPrice * contributionPercent;

  // 4. collect user scores and determine matches
  const winnersByTier: Record<number, Array<any>> = { 5: [], 4: [], 3: [] };

  if (activeCount > 0) {
    for (const profile of activeProfiles as any[]) {
      try {
        const { data: scores } = await supabaseAdmin
          .from("scores")
          .select("score")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(5);

        const userScores = (scores || []).map((s: any) => Number(s.score));
        const matchCount = userScores.filter((v: number) => drawNumbers.includes(v)).length;

        if (matchCount >= 3) {
          winnersByTier[matchCount].push({ user_id: profile.id, matchCount });
        }
      } catch (err) {
        console.warn("Error checking scores for user", profile.id, err);
      }
    }
  }

  // 5. allocate pool per tier and insert winners
  const results: any = { drawId, drawNumbers, pool: basePool, tiers: {} };

  for (const tier of [5, 4, 3]) {
    const share = TIER_SHARES[tier as keyof typeof TIER_SHARES];
    const tierPool = basePool * share;
    const tierWinners = winnersByTier[tier];

    if (tierWinners.length > 0) {
      const perWinner = tierPool / tierWinners.length;

      // insert winners
      for (const w of tierWinners) {
        await supabaseAdmin.from("winners").insert({
          user_id: w.user_id,
          match_type: `${tier}-Match`,
          status: "pending",
          payment_status: "pending",
        });
      }

      results.tiers[tier] = { winners: tierWinners.length, total: tierPool, perWinner };
    } else {
      // if 5-match no winners, rollover that amount
      if (tier === 5) {
        await supabaseAdmin.from("draws").update({ rollover_amount: tierPool }).eq("id", drawId);
        results.tiers[tier] = { winners: 0, total: tierPool, rollover: true };
      } else {
        results.tiers[tier] = { winners: 0, total: tierPool };
      }
    }
  }

  // 6. update draw with summary
  await supabaseAdmin
    .from("draws")
    .update({
      total_pool: basePool,
      winners_summary: results.tiers,
      status: "published",
    })
    .eq("id", drawId);

  return results;
}