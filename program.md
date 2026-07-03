# X.com Content Engine Autoresearch Program

This is an autonomous optimization loop to generate, evaluate, and iterate on viral technical content for X.com using Dubstrata causal graph insights and Gemini.

## The Imperative
Your goal is to optimize the writing strategy, hook structures, and content layouts in `src/content/strategy.ts` to maximize organic user engagement and viral reach on X.com. 

To achieve this, you must strictly align every post, thread, and outreach format with the frameworks outlined in [x-growth.md](file:///c:/Users/muzik/Documents/GitHub/dubstrata-investigation/x-growth.md):
1. **The SPCL Framework**: Structure all copy to project **Status** (control of scarce resources/quantifiable results), **Power** (actionable frameworks predicting clear wins), **Credibility** (third-party validation, empirical data), and **Likeness** (controlled vulnerability, human voice).
2. **The Writing Protocol ("THE PULSE")**:
   - **Curiosity Gaps / Pattern Interrupts**: Use bold contrarianism, extreme specificity, or subverted expectations to break scrolling autopilot in the first 3 lines of copy.
   - **Whitespace & Scrollytelling**: Short, punchy sentences. Separate lines aggressively for mobile scanning.
   - **Visceral Verbs**: Data is "gutted, scraped, synthesized, fractured, or distilled." Systems "stop hemorrhaging capital."
   - **Zero external links in primary posts**: Never include links in main posts (suppressed by algorithm). Direct users to the bio/profile link or drop links in self-replies.
   - **Banned Words**: Instantly rejects any text containing: `delve`, `tapestry`, `testament`, `beacon`, `fosters`, `nuanced`, `myriad`, `orchestrate`, `synergize`, `elevate`.

---

## Setup

To set up a new optimization run:

1. **Agree on a run tag**: Propose a tag based on the optimization target and date (e.g., `x-hook-jun20`). The branch `content/<tag>` must not already exist — this is a fresh iteration.
2. **Create the branch**: `git checkout -b content/<tag>` from current master.
3. **Read the in-scope files**: Read these files for full context:
   - `README.md` — system architecture and configuration.
   - `src/content/strategy.ts` — **the file you modify**. Contains prompt configurations, templates, hooks, and stylistic rules.
   - `src/content/complianceVerifier.ts` — validates text length, hard-banned words, and protocol structures.
   - `src/content/evaluator.ts` — computes the Engagement/Virality Score.
   - `src/harness.ts` — core content engine loop.
4. **Verify environment**: Ensure `.env` has a valid `GEMINI_API_KEY` and optional X.com API credentials.
5. **Initialize results.tsv**: Create `results.tsv` with the header row.
6. **Confirm and go**: Confirm setup looks good.

Once setup is confirmed, kick off the content optimization loop.

---

## The Optimization Loop

The optimization loop runs continuously to test and refine writing strategies.

**What you CAN do:**
- Modify `src/content/strategy.ts` — this is the **only file you edit**. You can change writing structures, tone instructions, hook layouts, templates, and formatting parameters.

**What you CANNOT do:**
- Modify the evaluation metrics or scoring equations in `src/content/evaluator.ts`.
- Modify the core harness or dashboard runner.
- Bypass compliance verification.

### Loop Steps:

LOOP FOREVER:

1. **Review git state**: Check current branch/commit.
2. **Tweak strategy**: Edit `src/content/strategy.ts` with a new copywriting hypothesis (e.g. changing the hook from a question to a contrarian claim, adjusting the 1-3-1 pacing rules, or adding a future prediction constraint).
3. **Git commit**: Commit your changes to the local branch.
4. **Run the experiment**: Execute the generation run:
   ```bash
   npm run experiment > run.log 2>&1
   ```
5. **Read the results**: Extract the computed metrics from the log file:
   ```bash
   grep -E "^engagement_score:|^likes:|^retweets:|^replies:" run.log
   ```
6. **Handle failures**: If the log contains validation failures or crashes, inspect the traceback in `run.log` and fix the strategy file.
7. **Record results**: Append the trial results to `results.tsv` (keep this file untracked by git):
   ```
   commit	engagement_score	likes	retweets	replies	status	description
   ```
8. **Advance or Reset**:
   * If the **engagement_score** is **higher** (better) than the baseline, keep the commit and advance the branch.
   * If the score is **equal or lower**, discard the changes by running `git reset --hard HEAD~1` (reverting to the previous best strategy).

---

## Virality Metric (The "Physics" of X.com)

Since we enforce a **Zero-Faking Policy**, engagement metrics are input manually by the operator at specific intervals post-publishing: 1 hour, 2 hours, 6 hours, and 12 hours.

The ground truth of content performance is the **Engagement Score ($E$)** computed as:

\[E = \frac{10 \times \text{Replies} + 5 \times \text{Retweets} + 2 \times \text{Likes} + 0.1 \times \text{Views}}{\text{Views} + 1}\]

* **Views**: Impressions (logged via X API or input manually).
* **Likes**: Positive sentiment confirmations.
* **Retweets**: High-value distribution amplifiers.
* **Replies**: Critical discussion and engagement drivers (conversation depth).

A higher $E$ indicates higher quality, technical resonance, and virality.
All else being equal, simpler strategy prompts are preferred to highly complex, bloated prompt files.
