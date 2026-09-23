export type PlanKind = "panel" | "sunum" | "event" | "program";

export type PlanItem = {
  id: string;
  kind: PlanKind;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  people: string;
  href?: string;
};

export type PlanDay = {
  date: string;
  themeTr: string;
  weekday: string;
  weekdayShort: string;
  day: number;
  items: PlanItem[];
};
