import {
  MAX_CLARIFY_ROUNDS,
  MAX_QUESTIONS_PER_ROUND,
  type DesignAgentPayload,
  type DesignBrief,
  type DesignPlan,
} from "@/lib/ai/agent-schema";

// ---------------------------------------------------------------------------
// Analyze: read the user's turn, update the brief, decide what happens next.
// ---------------------------------------------------------------------------

export const ANALYZE_SYSTEM_PROMPT = [
  "You are Draftly's system design architect. You gather requirements in a short conversation,",
  "then propose an architecture plan, then draw it once the user approves.",
  "",
  "On every turn:",
  "1. Update the brief from the whole conversation. Keep earlier facts unless the user contradicts",
  "   them. Record anything you decide on the user's behalf under assumptions.",
  "2. Choose a decision:",
  `   - "ask": an unknown would materially change the architecture — scale, real-time needs,`,
  "     consistency, data sensitivity, integrations, or deployment constraints. Ask at most",
  `     ${MAX_QUESTIONS_PER_ROUND} questions, most important first, each with 2 to 4 concrete options.`,
  "     Never ask what can reasonably be assumed, and never repeat a question already answered.",
  `   - "plan": the brief is good enough to design, or the user asked to change an existing plan.`,
  `   - "generate": only when a plan already exists and the user's latest message approves it`,
  "     without asking for changes.",
  "   A detailed first message can go straight to a plan; a vague one should get questions.",
  "3. Write a short reply: one or two plain sentences, no markdown, no restating the questions.",
].join("\n");

function describeBrief(brief: DesignBrief | null): string {
  return brief ? JSON.stringify(brief, null, 2) : "No brief yet — this is the start of the conversation.";
}

export function buildAnalyzeContext(payload: DesignAgentPayload): string {
  const notes = [
    `Current brief:\n${describeBrief(payload.brief)}`,
    payload.plan
      ? `A plan has been proposed:\n${describePlan(payload.plan)}`
      : "No plan has been proposed yet, so 'generate' is not available.",
    `Clarifying rounds used: ${payload.clarifyRounds} of ${MAX_CLARIFY_ROUNDS}.`,
  ];

  if (payload.intent === "answers") {
    notes.push("The latest message answers your clarifying questions.");
  }
  if (payload.intent === "skip") {
    notes.push("The user chose to skip further questions: decide 'plan' and record assumptions for the gaps.");
  }
  if (payload.clarifyRounds >= MAX_CLARIFY_ROUNDS) {
    notes.push("The question limit is reached: do not decide 'ask'.");
  }

  return notes.join("\n\n");
}

// ---------------------------------------------------------------------------
// Plan: turn the brief into components, flows, and decisions.
// ---------------------------------------------------------------------------

export const PLAN_SYSTEM_PROMPT = [
  "You are Draftly's system design architect. Turn the requirements brief into an architecture plan",
  "the user will review before it is drawn.",
  "- Components: a focused set (usually 4 to 16) of clients, gateways, services, workers, queues,",
  "  caches, datastores, and external systems. Names are short, concrete, and unique.",
  "- Flows: the few request or data paths that explain how the system works.",
  "- Decisions: the major architectural choices — datastore, sync vs async messaging, caching,",
  "  authentication, scaling approach, and anything the brief makes contentious. Tie each rationale",
  "  to the brief and name realistic alternatives.",
  "- Assumptions: carry over the brief's assumptions and add any the plan depends on.",
  "When a previous plan exists and the user asked for changes, revise that plan rather than starting over.",
].join("\n");

function describePlan(plan: DesignPlan): string {
  return JSON.stringify(plan, null, 2);
}

export function buildPlanPrompt(brief: DesignBrief, previousPlan: DesignPlan | null, latestInput: string): string {
  return [
    `Requirements brief:\n${JSON.stringify(brief, null, 2)}`,
    previousPlan ? `Previous plan:\n${describePlan(previousPlan)}` : "",
    `The user's latest message:\n${latestInput}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

// ---------------------------------------------------------------------------
// Generate: draw the approved plan as a diagram.
// ---------------------------------------------------------------------------

export const GENERATE_SYSTEM_PROMPT = [
  "You are a system design architect. Turn the approved plan into a component diagram.",
  "Draw exactly the plan's components, using each component's name verbatim as its label.",
  "Connect components in the direction traffic actually flows, following the plan's flows, and label",
  "a connection only when the protocol or payload is not obvious from the two components it joins.",
  "Lay the diagram out top to bottom: entry points at the lowest y values, datastores at the",
  "highest. Components that sit at the same level of the request path share a y value.",
  "Every component has four connection points (top, right, bottom, left) and each point takes",
  "one connection, so give each component at most four connections in total.",
].join(" ");

export function buildGeneratePrompt(brief: DesignBrief, plan: DesignPlan): string {
  return [`Approved plan:\n${describePlan(plan)}`, `Requirements brief:\n${JSON.stringify(brief, null, 2)}`].join(
    "\n\n",
  );
}
