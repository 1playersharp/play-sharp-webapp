import useFoundationStore from '@/state/useFoundationStore';
import useEliteStore from '@/elite/engine/useEliteStore';

const clamp100 = (v) => Math.max(0, Math.min(100, Number(v) || 0));

export const computeFoundationIQ = (state) => {
  const r = state.reactionResult?.score || 0;
  const d = state.decisionResult?.score || 0;
  const s = state.scanningResult?.score || 0;
  const p = state.pressingResult?.score || 0;
  const t = state.tacticalQuizResult?.score || 0;
  const m = state.passMoveResult?.score || 0;

  const rNorm = Math.min(100, r / 10);
  return Math.round(
    rNorm * 0.2 +
    d * 0.2 +
    s * 0.2 +
    p * 0.2 +
    t * 0.1 +
    m * 0.1
  );
};

export const computeEliteIQ = (state) => {
  const d = state.eliteDecisionResult?.score ?? null;
  const p = state.elitePressingResult?.score ?? null;

  const values = [d, p].filter((v) => v !== null && v !== undefined);
  if (values.length === 0) return 0;

  const normed = values.map(clamp100);
  const sum = normed.reduce((a, b) => a + b, 0);
  return Math.round(sum / normed.length);
};

export const useFootballIQ = () => {
  const foundation = useFoundationStore();
  const elite = useEliteStore();
  const foundationIQ = computeFoundationIQ(foundation);
  const eliteIQ = computeEliteIQ(elite);
  const overallIQ = Math.round(foundationIQ * 0.7 + eliteIQ * 0.3);
  return { foundationIQ, eliteIQ, overallIQ };
};
