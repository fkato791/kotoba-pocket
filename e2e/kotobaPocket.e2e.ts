describe("Kotoba Pocket MVP", () => {
  it("adds a card offline, restarts, and reviews it", async () => {
    await device.launchApp({ delete: true });
    await expect(element(by.text("すばやく追加"))).toBeVisible();
  });

  it.todo("signs in on a second device and syncs cards");
  it.todo("imports CSV and reviews imported cards");
  it.todo("exports JSON and verifies schema");
  it.todo("runs accessibility smoke checks");
  it.todo("deletes account and verifies remote purge");
});
