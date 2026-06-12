import { runPendingCleanup } from "../lib/pending-cleanup";

runPendingCleanup()
  .then((r) => {
    console.log(`pending-cleanup: rejected ${r.rejected}, reminded about ${r.reminders}`);
    process.exit(0);
  })
  .catch((e) => {
    console.error("pending-cleanup failed", e);
    process.exit(1);
  });
