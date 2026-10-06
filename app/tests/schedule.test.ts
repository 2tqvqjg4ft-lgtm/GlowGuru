import { describe, expect, it } from "vitest";
import { appliesOn, type Stage, type Step } from "../src/lib/demo-data";

const step = (startDate: string, stages: Stage[]): Step => ({
  id: "schedule-test",
  productId: "product",
  note: "",
  paused: false,
  startDate,
  stages,
});

const date = (value: string) => new Date(`${value}T00:00:00`);

describe("График активов от выбранной первой даты", () => {
  it("не назначает применение до даты старта", () => {
    const s = step("2026-10-10", [{ freq: 2, weeks: null }]);
    expect(appliesOn(s, date("2026-10-09"))).toBe(false);
    expect(appliesOn(s, date("2026-10-10"))).toBe(true);
  });

  it("для 2 раз в неделю считает неделю от выбранной даты, а не от понедельника", () => {
    const s = step("2026-10-10", [{ freq: 2, weeks: null }]);
    const actual: string[] = [];
    for (let offset = 0; offset < 14; offset++) {
      const d = date("2026-10-10");
      d.setDate(d.getDate() + offset);
      if (appliesOn(s, d)) actual.push(d.toISOString().slice(0, 10));
    }
    expect(actual).toEqual(["2026-10-10", "2026-10-13", "2026-10-17", "2026-10-20"]);
  });

  it("новый этап начинается сразу после предыдущего и заново отсчитывает частоту", () => {
    const s = step("2026-10-10", [
      { freq: 2, weeks: 2 },
      { freq: "every_other", weeks: null },
    ]);
    expect(appliesOn(s, date("2026-10-23"))).toBe(false);
    expect(appliesOn(s, date("2026-10-24"))).toBe(true);
    expect(appliesOn(s, date("2026-10-25"))).toBe(false);
    expect(appliesOn(s, date("2026-10-26"))).toBe(true);
  });

  it("пустой список этапов означает ежедневное применение только с даты старта", () => {
    const s = step("2026-10-10", []);
    expect(appliesOn(s, date("2026-10-09"))).toBe(false);
    expect(appliesOn(s, date("2026-10-10"))).toBe(true);
    expect(appliesOn(s, date("2026-10-11"))).toBe(true);
  });
});
