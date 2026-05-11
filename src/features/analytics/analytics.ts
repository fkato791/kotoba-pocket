type AnalyticsEvent = "card_created" | "review_completed" | "import_completed" | "share_link_created";

const enabled = process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === "true";

export const analytics = {
  track(event: AnalyticsEvent, properties: Record<string, unknown> = {}): void {
    if (!enabled) return;
    console.info("[analytics]", event, properties);
  }
};
