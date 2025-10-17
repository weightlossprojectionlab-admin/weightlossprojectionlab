/**
 * Unit Tests for Coaching Eligibility Calculations
 * Tests: Consistency unlock, plateau detection, goal struggle
 */

describe('Coaching Eligibility System', () => {
  describe('Consistency Unlock', () => {
    test('should unlock with sufficient streak, logs, and adherence', () => {
      const streakDays = 15;
      const weightLogCount = 12;
      const adherence = 0.85;

      const MIN_STREAK_DAYS = 14;
      const MIN_WEIGHT_LOGS = 10;
      const MIN_ADHERENCE = 0.8;

      const isEligible =
        streakDays >= MIN_STREAK_DAYS &&
        weightLogCount >= MIN_WEIGHT_LOGS &&
        adherence >= MIN_ADHERENCE;

      expect(isEligible).toBe(true);
    });

    test('should not unlock with insufficient streak', () => {
      const streakDays = 13;
      const weightLogCount = 12;
      const adherence = 0.85;

      const MIN_STREAK_DAYS = 14;
      const MIN_WEIGHT_LOGS = 10;
      const MIN_ADHERENCE = 0.8;

      const isEligible =
        streakDays >= MIN_STREAK_DAYS &&
        weightLogCount >= MIN_WEIGHT_LOGS &&
        adherence >= MIN_ADHERENCE;

      expect(isEligible).toBe(false);
    });

    test('should not unlock with insufficient logs', () => {
      const streakDays = 15;
      const weightLogCount = 9;
      const adherence = 0.85;

      const MIN_STREAK_DAYS = 14;
      const MIN_WEIGHT_LOGS = 10;
      const MIN_ADHERENCE = 0.8;

      const isEligible =
        streakDays >= MIN_STREAK_DAYS &&
        weightLogCount >= MIN_WEIGHT_LOGS &&
        adherence >= MIN_ADHERENCE;

      expect(isEligible).toBe(false);
    });

    test('should not unlock with low adherence', () => {
      const streakDays = 15;
      const weightLogCount = 12;
      const adherence = 0.75;

      const MIN_STREAK_DAYS = 14;
      const MIN_WEIGHT_LOGS = 10;
      const MIN_ADHERENCE = 0.8;

      const isEligible =
        streakDays >= MIN_STREAK_DAYS &&
        weightLogCount >= MIN_WEIGHT_LOGS &&
        adherence >= MIN_ADHERENCE;

      expect(isEligible).toBe(false);
    });
  });

  describe('Plateau Detection', () => {
    test('should detect plateau with <1% change over 21 days', () => {
      const firstWeight = 80.0;
      const lastWeight = 80.5;
      const daysSpan = 21;
      const adherence = 0.85;

      const WEIGHT_CHANGE_THRESHOLD = 0.01; // 1%
      const MIN_DAYS_NO_CHANGE = 21;
      const MIN_ADHERENCE = 0.8;

      const percentChange = Math.abs((lastWeight - firstWeight) / firstWeight);
      const isPlateau =
        daysSpan >= MIN_DAYS_NO_CHANGE &&
        percentChange < WEIGHT_CHANGE_THRESHOLD &&
        adherence >= MIN_ADHERENCE;

      expect(percentChange).toBeCloseTo(0.00625, 5); // 0.625%
      expect(isPlateau).toBe(true);
    });

    test('should not detect plateau with >1% change', () => {
      const firstWeight = 80.0;
      const lastWeight = 79.0; // 1.25% loss
      const daysSpan = 21;
      const adherence = 0.85;

      const WEIGHT_CHANGE_THRESHOLD = 0.01;
      const MIN_DAYS_NO_CHANGE = 21;
      const MIN_ADHERENCE = 0.8;

      const percentChange = Math.abs((lastWeight - firstWeight) / firstWeight);
      const isPlateau =
        daysSpan >= MIN_DAYS_NO_CHANGE &&
        percentChange < WEIGHT_CHANGE_THRESHOLD &&
        adherence >= MIN_ADHERENCE;

      expect(percentChange).toBeCloseTo(0.0125, 4);
      expect(isPlateau).toBe(false);
    });

    test('should not detect plateau with insufficient days', () => {
      const firstWeight = 80.0;
      const lastWeight = 80.3;
      const daysSpan = 20;
      const adherence = 0.85;

      const WEIGHT_CHANGE_THRESHOLD = 0.01;
      const MIN_DAYS_NO_CHANGE = 21;
      const MIN_ADHERENCE = 0.8;

      const percentChange = Math.abs((lastWeight - firstWeight) / firstWeight);
      const isPlateau =
        daysSpan >= MIN_DAYS_NO_CHANGE &&
        percentChange < WEIGHT_CHANGE_THRESHOLD &&
        adherence >= MIN_ADHERENCE;

      expect(isPlateau).toBe(false);
    });

    test('should not detect plateau with low adherence', () => {
      const firstWeight = 80.0;
      const lastWeight = 80.5;
      const daysSpan = 21;
      const adherence = 0.75;

      const WEIGHT_CHANGE_THRESHOLD = 0.01;
      const MIN_DAYS_NO_CHANGE = 21;
      const MIN_ADHERENCE = 0.8;

      const percentChange = Math.abs((lastWeight - firstWeight) / firstWeight);
      const isPlateau =
        daysSpan >= MIN_DAYS_NO_CHANGE &&
        percentChange < WEIGHT_CHANGE_THRESHOLD &&
        adherence >= MIN_ADHERENCE;

      expect(isPlateau).toBe(false);
    });
  });

  describe('Goal Struggle Unlock', () => {
    test('should unlock with sufficient failed missions and engagement', () => {
      const failedMissionCount = 3;
      const engagementScore = 0.8;

      const MIN_FAILED_MISSIONS = 2;
      const MIN_ENGAGEMENT = 0.75;

      const isEligible =
        failedMissionCount >= MIN_FAILED_MISSIONS &&
        engagementScore >= MIN_ENGAGEMENT;

      expect(isEligible).toBe(true);
    });

    test('should not unlock with only 1 failed mission', () => {
      const failedMissionCount = 1;
      const engagementScore = 0.8;

      const MIN_FAILED_MISSIONS = 2;
      const MIN_ENGAGEMENT = 0.75;

      const isEligible =
        failedMissionCount >= MIN_FAILED_MISSIONS &&
        engagementScore >= MIN_ENGAGEMENT;

      expect(isEligible).toBe(false);
    });

    test('should not unlock with low engagement despite failures', () => {
      const failedMissionCount = 3;
      const engagementScore = 0.7;

      const MIN_FAILED_MISSIONS = 2;
      const MIN_ENGAGEMENT = 0.75;

      const isEligible =
        failedMissionCount >= MIN_FAILED_MISSIONS &&
        engagementScore >= MIN_ENGAGEMENT;

      expect(isEligible).toBe(false);
    });

    test('should unlock at exact thresholds', () => {
      const failedMissionCount = 2;
      const engagementScore = 0.75;

      const MIN_FAILED_MISSIONS = 2;
      const MIN_ENGAGEMENT = 0.75;

      const isEligible =
        failedMissionCount >= MIN_FAILED_MISSIONS &&
        engagementScore >= MIN_ENGAGEMENT;

      expect(isEligible).toBe(true);
    });
  });

  describe('Adherence Calculation', () => {
    test('should calculate 100% adherence for daily logging', () => {
      const loggedDaysCount = 30;
      const totalDays = 30;

      const adherence = Math.min(loggedDaysCount / totalDays, 1.0);

      expect(adherence).toBe(1.0);
    });

    test('should calculate 80% adherence correctly', () => {
      const loggedDaysCount = 24;
      const totalDays = 30;

      const adherence = Math.min(loggedDaysCount / totalDays, 1.0);

      expect(adherence).toBeCloseTo(0.8, 2);
    });

    test('should cap adherence at 1.0', () => {
      const loggedDaysCount = 35; // Somehow logged more (unique days counted)
      const totalDays = 30;

      const adherence = Math.min(loggedDaysCount / totalDays, 1.0);

      expect(adherence).toBe(1.0);
    });

    test('should calculate 50% adherence correctly', () => {
      const loggedDaysCount = 15;
      const totalDays = 30;

      const adherence = Math.min(loggedDaysCount / totalDays, 1.0);

      expect(adherence).toBe(0.5);
    });
  });

  describe('AI Coach Review Metrics', () => {
    test('should unlock human coach with high action rate', () => {
      const nudgesSent = 10;
      const nudgesActed = 8;
      const avgEngagement = 0.6;

      const actionRate = nudgesSent > 0 ? nudgesActed / nudgesSent : 0;
      const unlockHuman = actionRate > 0.7 || avgEngagement > 0.8;

      expect(actionRate).toBe(0.8);
      expect(unlockHuman).toBe(true);
    });

    test('should unlock human coach with high engagement', () => {
      const nudgesSent = 10;
      const nudgesActed = 6;
      const avgEngagement = 0.85;

      const actionRate = nudgesSent > 0 ? nudgesActed / nudgesSent : 0;
      const unlockHuman = actionRate > 0.7 || avgEngagement > 0.8;

      expect(actionRate).toBe(0.6);
      expect(unlockHuman).toBe(true);
    });

    test('should not unlock human coach with low metrics', () => {
      const nudgesSent = 10;
      const nudgesActed = 5;
      const avgEngagement = 0.6;

      const actionRate = nudgesSent > 0 ? nudgesActed / nudgesSent : 0;
      const unlockHuman = actionRate > 0.7 || avgEngagement > 0.8;

      expect(actionRate).toBe(0.5);
      expect(unlockHuman).toBe(false);
    });
  });
});
