import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
const internalApi = internal as any;

crons.daily(
  "refresh dashboard insights",
  { hourUTC: 20, minuteUTC: 0 },
  internalApi.reports.refreshDashboardSnapshot,
);

export default crons;
