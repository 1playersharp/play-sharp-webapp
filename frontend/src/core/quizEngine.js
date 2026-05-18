export function evaluateDecision(option, scenario) {
  const best = Math.max(...scenario.options.map(o => o.quality));
  const delta = best - option.quality;

  let tier =
    delta <= 0 ? "elite" :
    delta <= 15 ? "strong" :
    delta <= 35 ? "developing" :
    "risky";

  let score =
    delta <= 0 ? 100 :
    delta <= 15 ? 85 :
    delta <= 35 ? 65 :
    40;

  return {
    tier,
    score,
    delta,
    explanation: option.explanation,
  };
}