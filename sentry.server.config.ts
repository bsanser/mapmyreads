// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://745695a906f22a4d26c62dba69152690@o4511093535735808.ingest.de.sentry.io/4511093539012688",

  environment: process.env.NODE_ENV,

  // Lower sample rate in production to stay within free tier limits
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,
});
