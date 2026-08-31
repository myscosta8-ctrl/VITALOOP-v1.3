export interface AccessibilityCheckItem {
  elementId: string;
  hasAriaLabel: boolean;
  hasKeyboardFocus: boolean;
  contrastRatioPass: boolean;
}

export function validateComponentAccessibility(items: AccessibilityCheckItem[]): { isCompliant: boolean; score: number } {
  if (!items || items.length === 0) return { isCompliant: true, score: 100 };

  const validItems = items.filter((item) => item.hasAriaLabel && item.hasKeyboardFocus && item.contrastRatioPass);
  const score = Math.round((validItems.length / items.length) * 100);

  return {
    isCompliant: score >= 90,
    score,
  };
}
