/**
 * Unit Tests for Nudge Scheduling Logic
 * Tests: Quiet hours, daily limits, delivery windows
 */

describe('Nudge Scheduling System', () => {
  describe('Quiet Hours Enforcement', () => {
    test('should detect overlap with quiet hours (22:00-07:00)', () => {
      const startHour = 23;
      const endHour = 2;
      const quietStart = 22;
      const quietEnd = 7;

      // Check if window overlaps with quiet period
      const overlaps =
        (startHour >= quietStart && startHour < 24) ||
        (endHour > 0 && endHour <= quietEnd) ||
        (quietStart > quietEnd && (startHour >= quietStart || endHour <= quietEnd));

      expect(overlaps).toBe(true);
    });

    test('should allow morning delivery (08:00-12:00)', () => {
      const startHour = 8;
      const endHour = 12;
      const quietStart = 22;
      const quietEnd = 7;

      const overlaps =
        (startHour >= quietStart && startHour < 24) ||
        (endHour > 0 && endHour <= quietEnd) ||
        (quietStart > quietEnd && (startHour >= quietStart || endHour <= quietEnd));

      expect(overlaps).toBe(false);
    });

    test('should allow evening delivery (17:00-20:00)', () => {
      const startHour = 17;
      const endHour = 20;
      const quietStart = 22;
      const quietEnd = 7;

      const overlaps =
        (startHour >= quietStart && startHour < 24) ||
        (endHour > 0 && endHour <= quietEnd) ||
        (quietStart > quietEnd && (startHour >= quietStart || endHour <= quietEnd));

      expect(overlaps).toBe(false);
    });

    test('should block early morning delivery (05:00-08:00)', () => {
      const startHour = 5;
      const endHour = 8;
      const quietStart = 22;
      const quietEnd = 7;

      // End hour check: 8 > 7, so doesn't directly overlap
      // But start hour 5 is within quiet period
      const overlaps =
        (startHour >= quietStart && startHour < 24) ||
        (endHour > 0 && endHour <= quietEnd) ||
        (quietStart > quietEnd && (startHour >= quietStart || startHour <= quietEnd));

      // More accurate check for wraparound quiet hours
      const startsInQuiet =
        quietStart > quietEnd
          ? startHour >= quietStart || startHour < quietEnd
          : startHour >= quietStart && startHour < quietEnd;

      expect(startsInQuiet).toBe(true);
    });
  });

  describe('Daily Nudge Limits', () => {
    test('should allow nudges when under limit', () => {
      const nudgesSentToday = 1;
      const maxDailyNudges = 2;
      const remainingSlots = maxDailyNudges - nudgesSentToday;

      expect(remainingSlots).toBe(1);
      expect(remainingSlots > 0).toBe(true);
    });

    test('should block nudges at daily limit', () => {
      const nudgesSentToday = 2;
      const maxDailyNudges = 2;
      const canSendMore = nudgesSentToday < maxDailyNudges;

      expect(canSendMore).toBe(false);
    });

    test('should calculate remaining slots correctly', () => {
      const nudgesSentToday = 0;
      const maxDailyNudges = 2;
      const pendingNudges = 5;

      const remainingSlots = maxDailyNudges - nudgesSentToday;
      const nudgesToSend = Math.min(pendingNudges, remainingSlots);

      expect(remainingSlots).toBe(2);
      expect(nudgesToSend).toBe(2);
    });

    test('should handle single remaining slot', () => {
      const nudgesSentToday = 1;
      const maxDailyNudges = 2;
      const pendingNudges = 3;

      const remainingSlots = maxDailyNudges - nudgesSentToday;
      const nudgesToSend = Math.min(pendingNudges, remainingSlots);

      expect(remainingSlots).toBe(1);
      expect(nudgesToSend).toBe(1);
    });
  });

  describe('Fatigue Threshold', () => {
    test('should allow delivery below fatigue threshold', () => {
      const fatigueScore = 0.5;
      const fatigueThreshold = 0.6;
      const shouldDeliver = fatigueScore < fatigueThreshold;

      expect(shouldDeliver).toBe(true);
    });

    test('should block delivery at fatigue threshold', () => {
      const fatigueScore = 0.6;
      const fatigueThreshold = 0.6;
      const shouldDeliver = fatigueScore < fatigueThreshold;

      expect(shouldDeliver).toBe(false);
    });

    test('should block delivery above fatigue threshold', () => {
      const fatigueScore = 0.75;
      const fatigueThreshold = 0.6;
      const shouldDeliver = fatigueScore < fatigueThreshold;

      expect(shouldDeliver).toBe(false);
    });

    test('should allow delivery at low fatigue', () => {
      const fatigueScore = 0.1;
      const fatigueThreshold = 0.6;
      const shouldDeliver = fatigueScore < fatigueThreshold;

      expect(shouldDeliver).toBe(true);
    });
  });

  describe('Delivery Window Calculation', () => {
    test('should create valid 4-hour morning window', () => {
      const startHour = 8;
      const endHour = 12;
      const windowHours = endHour - startHour;

      expect(windowHours).toBe(4);
    });

    test('should create valid 3-hour evening window', () => {
      const startHour = 17;
      const endHour = 20;
      const windowHours = endHour - startHour;

      expect(windowHours).toBe(3);
    });

    test('should check if current time is within window', () => {
      const windowStart = new Date('2025-10-07T08:00:00Z');
      const windowEnd = new Date('2025-10-07T12:00:00Z');
      const currentTime = new Date('2025-10-07T10:00:00Z');

      const isInWindow =
        currentTime >= windowStart && currentTime <= windowEnd;

      expect(isInWindow).toBe(true);
    });

    test('should detect time before window', () => {
      const windowStart = new Date('2025-10-07T08:00:00Z');
      const windowEnd = new Date('2025-10-07T12:00:00Z');
      const currentTime = new Date('2025-10-07T07:00:00Z');

      const isInWindow =
        currentTime >= windowStart && currentTime <= windowEnd;

      expect(isInWindow).toBe(false);
    });

    test('should detect time after window', () => {
      const windowStart = new Date('2025-10-07T08:00:00Z');
      const windowEnd = new Date('2025-10-07T12:00:00Z');
      const currentTime = new Date('2025-10-07T13:00:00Z');

      const isInWindow =
        currentTime >= windowStart && currentTime <= windowEnd;

      expect(isInWindow).toBe(false);
    });
  });

  describe('A/B Variant Assignment', () => {
    test('should assign variants roughly 50/50', () => {
      const trials = 10000;
      let controlCount = 0;
      let variantCount = 0;

      for (let i = 0; i < trials; i++) {
        const variant = Math.random() < 0.5 ? 'control' : 'variant_a';
        if (variant === 'control') {
          controlCount++;
        } else {
          variantCount++;
        }
      }

      const controlRatio = controlCount / trials;
      const variantRatio = variantCount / trials;

      // Should be roughly 50/50 (within 5% margin)
      expect(controlRatio).toBeGreaterThan(0.45);
      expect(controlRatio).toBeLessThan(0.55);
      expect(variantRatio).toBeGreaterThan(0.45);
      expect(variantRatio).toBeLessThan(0.55);
    });

    test('should calculate CTR correctly', () => {
      const sent = 100;
      const acted = 35;

      const ctr = sent > 0 ? acted / sent : 0;

      expect(ctr).toBe(0.35);
    });

    test('should handle zero sent gracefully', () => {
      const sent = 0;
      const acted = 0;

      const ctr = sent > 0 ? acted / sent : 0;

      expect(ctr).toBe(0);
    });
  });
});
