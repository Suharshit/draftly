// Turns a failed Trigger.dev run's error into something a user can act on.
// Raw provider errors (quota details, retry counts, URLs) are logged by the
// caller and never shown.

interface DescribeRunFailureOptions {
  /** Shown when nothing more specific applies. */
  generic: string;
  /** Shown when the run timed out. */
  timeout: string;
  /** Messages written for users (e.g. an abort reason) that are shown as they are. */
  passthrough?: readonly string[];
}

export function describeRunFailure(
  message: string | undefined,
  { generic, timeout, passthrough = [] }: DescribeRunFailureOptions,
): string {
  const trimmed = message?.trim();
  if (!trimmed) {
    return generic;
  }
  if (passthrough.includes(trimmed)) {
    return trimmed;
  }
  if (/quota|rate.?limit|too many requests|\b429\b/i.test(trimmed)) {
    return "Draftly AI has hit its usage limit for the moment. Wait a minute and try again.";
  }
  if (/high demand|overloaded|unavailable|\b503\b/i.test(trimmed)) {
    return "Draftly AI is busy right now. Try again in a moment.";
  }
  if (/timed? ?out|timeout|deadline/i.test(trimmed)) {
    return timeout;
  }
  return generic;
}
