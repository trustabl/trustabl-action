import { evaluateGate, GateInput } from './gate';

const base: GateInput = {
  nativeExit: 0,
  risk: 0,
  maxSeverity: 'none',
  findingsCount: 0,
  riskThreshold: 0,
  severityThreshold: 'none',
};

describe('evaluateGate', () => {
  it('passes a clean scan with no thresholds', () => {
    expect(evaluateGate(base).fail).toBe(false);
  });

  it('fails on native exit 2 (scanner error)', () => {
    const r = evaluateGate({ ...base, nativeExit: 2 });
    expect(r.fail).toBe(true);
    expect(r.reasons.join()).toMatch(/exit 2/);
  });

  it('fails on native exit 1 (gated)', () => {
    const r = evaluateGate({ ...base, nativeExit: 1 });
    expect(r.fail).toBe(true);
    expect(r.reasons.join()).toMatch(/gated/);
  });

  describe('risk-score threshold', () => {
    it('fails when risk >= threshold', () => {
      expect(evaluateGate({ ...base, risk: 70, riskThreshold: 70 }).fail).toBe(true);
      expect(evaluateGate({ ...base, risk: 80, riskThreshold: 70 }).fail).toBe(true);
    });
    it('passes when risk < threshold', () => {
      expect(evaluateGate({ ...base, risk: 69, riskThreshold: 70 }).fail).toBe(false);
    });
    it('is disabled at threshold 0', () => {
      expect(evaluateGate({ ...base, risk: 100, riskThreshold: 0 }).fail).toBe(false);
    });
  });

  describe('severity threshold', () => {
    it('fails when max severity >= threshold and there are findings', () => {
      const r = evaluateGate({ ...base, maxSeverity: 'high', findingsCount: 3, severityThreshold: 'high' });
      expect(r.fail).toBe(true);
    });
    it('does not fire when there are zero findings', () => {
      const r = evaluateGate({ ...base, maxSeverity: 'none', findingsCount: 0, severityThreshold: 'high' });
      expect(r.fail).toBe(false);
    });
    it('passes when max severity is below threshold', () => {
      const r = evaluateGate({ ...base, maxSeverity: 'low', findingsCount: 2, severityThreshold: 'high' });
      expect(r.fail).toBe(false);
    });
    it('is disabled at threshold none', () => {
      const r = evaluateGate({ ...base, maxSeverity: 'critical', findingsCount: 9, severityThreshold: 'none' });
      expect(r.fail).toBe(false);
    });
  });

  it('accumulates multiple failure reasons', () => {
    const r = evaluateGate({
      nativeExit: 1, risk: 90, maxSeverity: 'critical', findingsCount: 5,
      riskThreshold: 50, severityThreshold: 'medium',
    });
    expect(r.fail).toBe(true);
    expect(r.reasons.length).toBe(3);
  });
});
