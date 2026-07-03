export interface CopywritingStrategy {
  // Pacing constraints (e.g., the "1-3-1" rule or short/long variations)
  pacingRule: string;
  // Visceral verbs to prioritize (mechanical, biological, or violent verbs)
  priorityVerbs: string[];
  // Proven hook template structures to stop scrolling autopilot
  hookTemplates: string[];
  // Grok AI search optimization summary style instructions
  grokCapsuleStyle: string;
  // Specific templates for X.com Pulse posts/threads
  xPulsePromptAddition: string;
  // Templates for B2B outreach pitches
  outreachPromptAddition: string;
  // Templates for video narrative beat sheets
  videoPromptAddition: string;
}

export const CURRENT_STRATEGY: CopywritingStrategy = {
  pacingRule: "The 1-3-1 Rule: Short sentence. Winding, technical, visceral sentence. Punchy short sentence.",
  priorityVerbs: [
    "gutted",
    "scraped",
    "synthesized",
    "fractured",
    "distilled",
    "hemorrhaging",
    "gutting"
  ],
  hookTemplates: [
    "Most companies lose [Metric/Loss] trying to solve [Problem]. Here is the mistake to avoid:",
    "[Entity/Topic] is fundamentally broken in production. Standard search patterns are lying to you about context retention.",
    "Everything you knew about [topic] is wrong. Here is the data proving why:"
  ],
  grokCapsuleStyle: "Include a 40 to 60-word H2/H3 heading block containing a highly direct, self-contained answer capsule summarizing the core technical claim.",
  xPulsePromptAddition: "Always focus on the information and latency gap. Detail the latency leak (e.g. standard vector search bleeding context, database O(N) degradation) and how Dubstrata's O(1) graph traversal solves it in 4.2ms flat.",
  outreachPromptAddition: "Structure around the Latency Gap and Compliance Verifier. Keep the tone professional, authoritative, and direct. Offer a brief, no-fluff 5-minute technical teardown.",
  videoPromptAddition: "Follow the 7-Step Narrative Engine (Contrarian Anecdote Hook, The Shift Paradox, Historical Anchoring, Deep Mechanical Breakdown/Math, Case Studies, Unspoken Catch, Philosophical Outro)."
};
