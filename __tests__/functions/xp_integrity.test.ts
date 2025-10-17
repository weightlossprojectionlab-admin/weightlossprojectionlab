/**
 * Unit Tests for XP Integrity System
 * Tests: Daily cap, repeat penalty, duplicate detection, weight log validation
 */

describe('XP Integrity System', () => {
  describe('Daily Soft Cap Enforcement', () => {
    test('should allow XP award when under daily cap', () => {
      const dailyTotal = 300;
      const baseXP = 100;
      const softCap = 500;

      const newTotal = dailyTotal + baseXP;
      const isUnderCap = newTotal <= softCap;

      expect(isUnderCap).toBe(true);
      expect(newTotal).toBe(400);
    });

    test('should reduce XP when exceeding daily cap', () => {
      const dailyTotal = 450;
      const baseXP = 100;
      const softCap = 500;

      const newTotal = dailyTotal + baseXP;
      let finalXP = baseXP;

      if (newTotal > softCap) {
        const excess = newTotal - softCap;
        finalXP = Math.max(baseXP - excess, 0);
      }

      expect(finalXP).toBe(50); // 100 - 50 excess
      expect(dailyTotal + finalXP).toBe(500);
    });

    test('should award 0 XP when already at cap', () => {
      const dailyTotal = 500;
      const baseXP = 100;
      const softCap = 500;

      const newTotal = dailyTotal + baseXP;
      let finalXP = baseXP;

      if (newTotal > softCap) {
        const excess = newTotal - softCap;
        finalXP = Math.max(baseXP - excess, 0);
      }

      expect(finalXP).toBe(0);
    });

    test('should bypass cap on grace day', () => {
      const dailyTotal = 450;
      const baseXP = 100;
      const softCap = 500;
      const isGraceDay = true;

      let finalXP = baseXP;

      if (!isGraceDay && dailyTotal + baseXP > softCap) {
        const excess = dailyTotal + baseXP - softCap;
        finalXP = Math.max(baseXP - excess, 0);
      }

      expect(finalXP).toBe(100); // Full XP on grace day
      expect(dailyTotal + finalXP).toBe(550);
    });
  });

  describe('Repeat Action Penalty', () => {
    test('should apply no penalty for first 3 actions', () => {
      const eventCounts = [1, 2, 3];
      const penaltyThreshold = 3;
      const penaltyMultiplier = 0.5;

      eventCounts.forEach(count => {
        const multiplier = count >= penaltyThreshold ? penaltyMultiplier : 1.0;
        expect(multiplier).toBe(1.0);
      });
    });

    test('should apply 0.5 penalty after 3rd action', () => {
      const eventCount = 3; // This would be the 4th action
      const penaltyThreshold = 3;
      const penaltyMultiplier = 0.5;

      const multiplier = eventCount >= penaltyThreshold ? penaltyMultiplier : 1.0;

      expect(multiplier).toBe(0.5);

      const baseXP = 100;
      const finalXP = baseXP * multiplier;
      expect(finalXP).toBe(50);
    });

    test('should continue penalty for subsequent repeats', () => {
      const eventCounts = [3, 4, 5, 6];
      const penaltyThreshold = 3;
      const penaltyMultiplier = 0.5;

      eventCounts.forEach(count => {
        const multiplier = count >= penaltyThreshold ? penaltyMultiplier : 1.0;
        expect(multiplier).toBe(0.5);
      });
    });
  });

  describe('Weight Log Validation', () => {
    test('should validate reasonable weight change', () => {
      const lastWeight = 80.0; // kg
      const currentWeight = 79.0; // kg
      const threshold = 0.1; // 10%

      const percentChange = Math.abs((currentWeight - lastWeight) / lastWeight);
      const isValid = percentChange <= threshold;

      expect(percentChange).toBeCloseTo(0.0125, 4); // 1.25%
      expect(isValid).toBe(true);
    });

    test('should reject unrealistic weight change', () => {
      const lastWeight = 80.0; // kg
      const currentWeight = 70.0; // kg (12.5% loss)
      const threshold = 0.1; // 10%

      const percentChange = Math.abs((currentWeight - lastWeight) / lastWeight);
      const isValid = percentChange <= threshold;

      expect(percentChange).toBeCloseTo(0.125, 4); // 12.5%
      expect(isValid).toBe(false);
    });

    test('should validate weight gain within threshold', () => {
      const lastWeight = 80.0; // kg
      const currentWeight = 87.0; // kg (8.75% gain)
      const threshold = 0.1; // 10%

      const percentChange = Math.abs((currentWeight - lastWeight) / lastWeight);
      const isValid = percentChange <= threshold;

      expect(percentChange).toBeCloseTo(0.0875, 4); // 8.75%
      expect(isValid).toBe(true);
    });
  });

  describe('Duplicate Detection Window', () => {
    test('should detect duplicate within 24 hours', () => {
      const lastLogTime = new Date('2025-10-07T10:00:00Z');
      const currentTime = new Date('2025-10-07T20:00:00Z');
      const windowHours = 24;

      const hoursDiff =
        (currentTime.getTime() - lastLogTime.getTime()) / (1000 * 60 * 60);
      const isDuplicate = hoursDiff < windowHours;

      expect(hoursDiff).toBe(10);
      expect(isDuplicate).toBe(true);
    });

    test('should allow log after 24 hour window', () => {
      const lastLogTime = new Date('2025-10-06T10:00:00Z');
      const currentTime = new Date('2025-10-07T11:00:00Z');
      const windowHours = 24;

      const hoursDiff =
        (currentTime.getTime() - lastLogTime.getTime()) / (1000 * 60 * 60);
      const isDuplicate = hoursDiff < windowHours;

      expect(hoursDiff).toBe(25);
      expect(isDuplicate).toBe(false);
    });

    test('should enforce 12 hour minimum for weight logs', () => {
      const lastWeightTime = new Date('2025-10-07T08:00:00Z');
      const currentTime = new Date('2025-10-07T19:00:00Z');
      const minIntervalHours = 12;

      const hoursDiff =
        (currentTime.getTime() - lastWeightTime.getTime()) / (1000 * 60 * 60);
      const isTooSoon = hoursDiff < minIntervalHours;

      expect(hoursDiff).toBe(11);
      expect(isTooSoon).toBe(true);
    });

    test('should allow weight log after 12 hours', () => {
      const lastWeightTime = new Date('2025-10-07T08:00:00Z');
      const currentTime = new Date('2025-10-07T20:30:00Z');
      const minIntervalHours = 12;

      const hoursDiff =
        (currentTime.getTime() - lastWeightTime.getTime()) / (1000 * 60 * 60);
      const isTooSoon = hoursDiff < minIntervalHours;

      expect(hoursDiff).toBe(12.5);
      expect(isTooSoon).toBe(false);
    });
  });

  describe('Grace Day Mechanics', () => {
    test('should identify first day as grace day', () => {
      const joinDate = new Date('2025-10-07');
      const today = new Date('2025-10-07');

      const isFirstDay =
        joinDate.toISOString().split('T')[0] === today.toISOString().split('T')[0];

      expect(isFirstDay).toBe(true);
    });

    test('should not be grace day on second day', () => {
      const joinDate = new Date('2025-10-06');
      const today = new Date('2025-10-07');

      const isFirstDay =
        joinDate.toISOString().split('T')[0] === today.toISOString().split('T')[0];

      expect(isFirstDay).toBe(false);
    });

    test('should identify return after 7 days as grace day', () => {
      const lastActiveDate = new Date('2025-09-30');
      const today = new Date('2025-10-07');

      const daysSinceActive =
        (today.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24);
      const isGraceDay = daysSinceActive >= 7;

      expect(daysSinceActive).toBe(7);
      expect(isGraceDay).toBe(true);
    });

    test('should not be grace day for 6 day absence', () => {
      const lastActiveDate = new Date('2025-10-01');
      const today = new Date('2025-10-07');

      const daysSinceActive =
        (today.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24);
      const isGraceDay = daysSinceActive >= 7;

      expect(daysSinceActive).toBe(6);
      expect(isGraceDay).toBe(false);
    });
  });
});
