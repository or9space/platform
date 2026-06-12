// Load .env so integration tests see DATABASE_URL when run locally.
// CI provides env vars directly; loadEnv is a no-op there.
import { config } from "dotenv";
config();
