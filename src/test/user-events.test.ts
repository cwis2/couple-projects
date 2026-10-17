import { describe, expect, it, beforeEach } from "vitest";
import {
  getEvents,
  saveEvent,
  deleteEvent,
  subscribeToEvents,
  runStartupCleanup,
  getUserStorageKey,
  readLocalEvents,
  INITIAL_SAMPLE_EVENTS,
} from "../lib/overlap-finder/db";

describe("User-Specific Events Isolation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads only Cwis events when querying for Cwis", async () => {
    const cwisEvents = await getEvents("cwis");

    expect(cwisEvents.length).toBeGreaterThan(0);
    // Every loaded event must have user_id === 'cwis'
    for (const evt of cwisEvents) {
      expect(evt.user_id).toBe("cwis");
    }

    // Must include Cwis initial events and NOT Monokork events
    const titles = cwisEvents.map((e) => e.title);
    expect(titles).toContain("Coffee & Catchup");
    expect(titles).toContain("Movie Night Prep");
    expect(titles).toContain("Dinner Date");
    expect(titles).not.toContain("Grocery Run");
    expect(titles).not.toContain("Gym Session");
  });

  it("loads only Monokork events when querying for Monokork", async () => {
    const monokorkEvents = await getEvents("monokork");

    expect(monokorkEvents.length).toBeGreaterThan(0);
    // Every loaded event must have user_id === 'monokork'
    for (const evt of monokorkEvents) {
      expect(evt.user_id).toBe("monokork");
    }

    // Must include Monokork initial events and NOT Cwis events
    const titles = monokorkEvents.map((e) => e.title);
    expect(titles).toContain("Grocery Run");
    expect(titles).toContain("Gym Session");
    expect(titles).not.toContain("Coffee & Catchup");
    expect(titles).not.toContain("Dinner Date");
  });

  it("saves a new event for Cwis that is invisible to Monokork", async () => {
    const newCwisEvent = await saveEvent(
      {
        title: "Cwis Secret Solo Project",
        date: "2026-10-25",
        start_time: "15:00",
        end_time: "17:00",
      },
      "cwis",
    );

    expect(newCwisEvent.user_id).toBe("cwis");

    // Fetch Cwis events
    const cwisEvents = await getEvents("cwis");
    expect(cwisEvents.some((e) => e.title === "Cwis Secret Solo Project")).toBe(true);

    // Fetch Monokork events -> must NOT contain Cwis's new event
    const monokorkEvents = await getEvents("monokork");
    expect(monokorkEvents.some((e) => e.title === "Cwis Secret Solo Project")).toBe(false);
  });

  it("saves a new event for Monokork that is invisible to Cwis", async () => {
    const newMonokorkEvent = await saveEvent(
      {
        title: "Monokork Secret Quest",
        date: "2026-10-26",
        start_time: "09:00",
        end_time: "10:30",
      },
      "monokork",
    );

    expect(newMonokorkEvent.user_id).toBe("monokork");

    // Fetch Monokork events
    const monokorkEvents = await getEvents("monokork");
    expect(monokorkEvents.some((e) => e.title === "Monokork Secret Quest")).toBe(true);

    // Fetch Cwis events -> must NOT contain Monokork's new event
    const cwisEvents = await getEvents("cwis");
    expect(cwisEvents.some((e) => e.title === "Monokork Secret Quest")).toBe(false);
  });

  it("deleting an event for a user removes it only from that user's schedule", async () => {
    // Add event for Cwis
    const evt = await saveEvent(
      {
        id: "evt-to-delete",
        title: "Temporary Plan",
        date: "2026-10-20",
        start_time: "10:00",
        end_time: "11:00",
      },
      "cwis",
    );

    let cwisEvents = await getEvents("cwis");
    expect(cwisEvents.some((e) => e.id === "evt-to-delete")).toBe(true);

    // Delete it
    await deleteEvent("evt-to-delete", "cwis");

    cwisEvents = await getEvents("cwis");
    expect(cwisEvents.some((e) => e.id === "evt-to-delete")).toBe(false);
  });

  it("notifies listeners only for the relevant user subscription", async () => {
    let cwisNotificationCount = 0;
    let monokorkNotificationCount = 0;

    const unsubCwis = subscribeToEvents(() => {
      cwisNotificationCount++;
    }, "cwis");

    const unsubMonokork = subscribeToEvents(() => {
      monokorkNotificationCount++;
    }, "monokork");

    // Save event for Cwis
    await saveEvent(
      {
        title: "Cwis Event Trigger",
        date: "2026-10-22",
        start_time: "10:00",
        end_time: "11:00",
      },
      "cwis",
    );

    expect(cwisNotificationCount).toBe(1);
    expect(monokorkNotificationCount).toBe(0);

    // Save event for Monokork
    await saveEvent(
      {
        title: "Monokork Event Trigger",
        date: "2026-10-22",
        start_time: "12:00",
        end_time: "13:00",
      },
      "monokork",
    );

    expect(cwisNotificationCount).toBe(1);
    expect(monokorkNotificationCount).toBe(1);

    unsubCwis();
    unsubMonokork();
  });
});
