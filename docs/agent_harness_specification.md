# Agent Harness Specification

In modern artificial intelligence engineering, the term agent harness has emerged to define the software infrastructure surrounding a foundation model. It is commonly represented by the industry equation:

$$\text{Agent} = \text{Model} + \text{Harness}$$

While a Large Language Model (LLM) serves as the "brain" (supplying raw intelligence and reasoning), the agent harness represents everything else—the code, configuration, execution environment, and state logic that wraps the model to transform it into a functional, autonomous, and production-ready system.

If an agent fails, developers often shift from adjusting the prompt to adjusting the harness—a discipline known as harness engineering.

## Core Characteristics and Components of an Agent Harness

According to modern architectural practices (championed by entities like LangChain, Anthropic, and Thoughtworks), a robust agent harness is built from two primary control categories—Guides and Sensors—supported by foundational state, security, and integration layers.

### 1. Guides (Feedforward Controls)
Guides shape and bias the agent’s behavior before it generates an output or executes an action, narrowing down the potential space for errors.
* **System Instructions and Rules Files**: Repository-level guidelines (e.g., files like `CLAUDE.md` or `AGENTS.md`) that outline structural and style requirements.
* **Context Curation & Retrieval**: Logic that dynamically queries databases or codebases to pass only the most relevant, formatted context to the model, preventing token bloat.
* **Tool Allowlists and Scoped Skills**: Rules that explicitly restrict which tools, APIs, or commands the agent is permitted to run for a given task.

### 2. Sensors (Feedback Controls)
Sensors evaluate the agent's work after it acts, creating a feedback loop that forces the model to self-correct before presenting outputs to a human.
* **Deterministic Compilers and Linters**: Automated syntax checks, type checkers (like TypeScript compilers), and static analysis tools (e.g., ESLint, Semgrep).
* **Automated Test Runners**: Systems that execute the project's test suite immediately after an agent completes a change to verify functionality.
* **Output and Format Validators**: Parsers that catch hallucinated tool parameters, broken JSON structures, or policy violations, and feed the error trace directly back into the LLM context for real-time correction.
* **Inferential Evaluators (LLM-as-a-Judge)**: Independent, cheaper models that assess semantic consistency, style adherence, or run visual checks (e.g., inspecting screenshots of a generated UI).

### 3. Memory & State Persistence
Long-running agents require state tracking that survives beyond a single context window or API session.
* **Compaction**: Built-in systems that automatically summarize, prune, or compress historical conversation and tool execution steps to stay within model token budgets without losing crucial details.
* **Checkpointing**: Routinely saving execution states to a database or filesystem. This allows the agent to recover from API timeouts, resume work after interruptions, or hand context off to a different specialized sub-agent.

### 4. Execution Sandboxing and Safety
Because autonomous agents can write and run code, the harness must secure the environment.
* **Isolated Runtimes**: Secure sandboxes (such as Docker containers or virtual filesystems) where the agent can run terminal commands safely without exposing the host machine.
* **Resource Governors**: Strict caps on maximum execution time, API token spend, and tool run loops to prevent runaway cost or infinite logic loops.

### 5. Environment Scaffolding & Version Control
The harness manages the project's workspace, allowing the agent to safely experiment.
* **Git Automation**: Automatically committing progressive, working steps of code. If a sensor reports a failure during the feedback loop, the harness can automatically revert the codebase to the last known working state.
* **Structured Progress Files**: Real-time tracking databases or JSON files where the agent updates its progress against a list of requirements, preventing the system from declaring victory prematurely.
