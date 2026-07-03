# STANDARD OPERATING PROCEDURE: PRODUCTION PIPELINE MANAGEMENT AND VALUE DELIVERY

## Document Control and Header

* **Document Title:** Production Pipeline Management and Value Delivery Procedure
* **Document ID:** SOP-OPS-004
* **Version Number:** v3.2
* **Effective Date:** June 25, 2026
* **Author:** Marcus Vance, Director of Operations
* **Approver:** Sarah Jenkins, Chief Operating Officer

---

## 1. Purpose

The purpose of this Standard Operating Procedure (SOP) is to define, standardize, and govern the execution of the digital production and service delivery pipeline. The Producer/Creator role is responsible for transforming raw assets, user stories, and strategic directives into functional, high-value digital deliverables.

By standardizing this pipeline, the organization ensures:

1. Systematic mitigation of project drift and unauthorized scope extension.
2. Consistently high quality across all product and service touchpoints.
3. Optimized resource utilization, minimizing cost overruns and operational bottlenecks.
4. Predictable delivery schedules that maintain trust and commercial alignment with stakeholders.

---

## 2. Scope

### In-Scope

This procedure applies to all active digital production pipelines, product development cycles, and service delivery workflows managed by the Production and Creator teams. Specifically, it covers:

* Project intake assessment and requirement verification.
* Resource scheduling and operational capacity planning.
* The execution of production sprints and developmental milestones.
* Internal quality assurance (QA) and system integration testing.
* User Acceptance Testing (UAT) coordination and formal handoff.

### Out-of-Scope

This SOP does not cover activities managed by other distinct business departments. Explicitly excluded from this document are:

* The initial client acquisition, contract negotiation, and Statement of Work (SOW) drafting (managed by Sales/Commercial).
* Long-term post-delivery maintenance contracts and service level agreement (SLA) billing updates (managed by Finance/Accounts).
* Underlying cloud infrastructure provisioning and core security architecture definition (managed by IT/Systems Engineering).

---

## 3. Definitions and Acronyms

To ensure alignment across all delivery teams, the following terms and abbreviations are defined as follows:

* **DoD (Definition of Done):** A standardized list of criteria that a digital asset or feature must meet before it is considered fully complete and ready for deployment.
* **UAT (User Acceptance Testing):** The final phase of the production process where end-users or client representatives test the asset in a simulated environment to verify it meets real-world business needs.
* **SOW (Statement of Work):** The legally binding document that defines project-specific activities, deliverables, and timelines agreed upon by the business and the client.
* **WIP (Work in Progress) Limit:** A constraint placed on the number of production tasks that can be actively worked on at any single time, preventing bottlenecks and context-switching.
* **CI/CD (Continuous Integration/Continuous Deployment):** Automated pipelines that build, test, and deploy code changes to staging or production environments.
* **SME (Subject Matter Expert):** An individual with deep, specialized knowledge of a specific technical domain, system, or creative methodology.
* **Staging Environment:** A precise replica of the production environment used to run quality checks and UAT before code or assets go live.
* **Scope Creep:** Unapproved, undocumented changes or additions to project requirements that occur after the project scope has been locked.

---

## 4. Roles and Responsibilities

The successful execution of the production pipeline relies on clear boundaries and clear handoffs between key roles.

### The Executor (The Producer / Production Lead)

* **Primary Accountability:** Responsible for the day-to-day coordination, execution, and delivery of production tasks.
* **Key Responsibilities:**
  * Translates high-level project specs into clear, actionable technical tasks.
  * Allocates work to design, development, and content creation teams.
  * Monitors WIP limits and resolves pipeline blocks immediately.
  * Maintains the production log and reports on delivery milestones.

### The Reviewer (Product Owner / Account Director)

* **Primary Accountability:** Responsible for verifying that the production output aligns with strategic design requirements and commercial commitments.
* **Key Responsibilities:**
  * Reviews and approves completed tasks during internal sprint reviews.
  * Manages direct communication with client stakeholders during UAT.
  * Signs off on final deliverable acceptance, authorizing billing milestones.

### The Validator (Quality Assurance Analyst)

* **Primary Accountability:** Responsible for identifying functional defects, design discrepancies, and performance bottlenecks before any asset is exposed to the client.
* **Key Responsibilities:**
  * Executes automated and manual regression tests against acceptance criteria.
  * Documents and categorizes bugs within the tracking system.
  * Verifies that production outputs strictly adhere to the organization’s Quality Standards.

---

## 5. Prerequisites and Safety Warnings

Before starting any production work, the Producer must verify that all prerequisites are met to protect the business from financial and digital risks.

### Required Equipment and Access Credentials

1. **Project Management Access:** Active administrative login credentials for Jira, Asana, or the designated internal project tracking suite.
2. **Asset Repository Access:** Write access permissions to the Git repository, Figma workspace, or Digital Asset Management (DAM) system containing the project files.
3. **Communication Channels:** Configured Slack/Teams channels dedicated specifically to the active production project.
4. **Local Staging Server Credentials:** Authorized access key to deploy changes to the staging/sandbox environment.

### Safety and Operational Risk Warnings

> ⚠️ **CRITICAL RISK: DATA SECURITY AND PRIVACY**
> Never use live, unencrypted customer database information in any staging, development, or design environment. Ensure all testing environments use anonymized, synthetic data to prevent accidental leaks of personally identifiable information (PII). Doing so violates security policy SEC-POL-08.

> ⚠️ **OPERATIONAL RISK: PRODUCTION ENVIRONMENT FREEZE**
> Do not merge code changes, alter live digital assets, or push changes directly to the production environment between Friday at 15:00 and Monday at 09:00. This minimizes the risk of system downtime during periods of limited staff availability.

> ⚠️ **FINANCIAL RISK: SCOPE DRIFT**
> Never begin production on a task or feature that is not explicitly documented in the approved SOW or a signed Change Request Form. Unapproved changes can quickly deplete project budgets and delay critical delivery schedules.

---

## 6. The Procedure (Step-by-Step Instructions)

The production pipeline is executed in five sequential phases. The Producer must complete each phase in order, ensuring that all step-by-step instructions are executed exactly as written.

```
+------------------------------------+
|  Phase 1: Project Intake & Setup   |
+------------------------------------+
                  |
                  v
+------------------------------------+
| Phase 2: Planning & Prioritization |
+------------------------------------+
                  |
                  v
+------------------------------------+
|    Phase 3: Production Execution   |
+------------------------------------+
                  |
                  v
+------------------------------------+
|    Phase 4: Quality & Validation   |
+------------------------------------+
                  |
                  v
+------------------------------------+
|     Phase 5: Release & Handover    |
+------------------------------------+
```

### Phase 1: Project Intake and Initialization

* **Step 1.1: Retrieve and Review SOW.** Locate the signed SOW in the CRM system. Read all requirements, deliverables, and timelines. If any technical or creative requirements are unclear, schedule a 15-minute clarification call with the Account Director before proceeding.
* **Step 1.2: Initialize the Project Workspace.** Create a new project space within the project management software using the standard organizational template. Assign the approved unique Project ID to the workspace.
* **Step 1.3: Set Up Team Directories.** Set up dedicated folders in the shared cloud drive and the central repository (e.g., GitHub, Figma, DAM). Organize these folders into three distinct directories: `/01_Source_Assets`, `/02_WIP_Production`, and `/03_Final_Deliverables`.
* **Step 1.4: Confirm Resource Availability.** cross-reference the required resource profile (e.g., UI designer, backend developer, copywriter) with the department-wide availability calendar. Flag any resource conflicts to the Operations Director immediately.

---

### Phase 2: Backlog Planning and Prioritization

* **Step 2.1: Break Down SOW Deliverables.** Deconstruct each major deliverable in the SOW into granular, atomic tasks. Each task must represent a single, focused action that takes no more than 8 hours of work to complete.
* **Step 2.2: Write Clear Acceptance Criteria.** For each task, write an explicit set of acceptance criteria in the following format:
  * *"Given [Context], When [Action], Then [Expected Outcome]."*
* **Step 2.3: Assign Estimates and WIP Limits.** Meet with the assigned production team to estimate task complexity using story points or hours. Set a strict Work-In-Progress (WIP) limit of two active tasks per producer to maintain focus and reduce context-switching.
* **Step 2.4: Schedule Kickoff Meeting.** Host a 30-minute kickoff meeting with the production team. Walk through the backlog, clarify the sprint goal, and confirm that every team member understands their assigned tasks and deadlines.

---

### Phase 3: Production and Value Creation

* **Step 3.1: Move Tasks to Active Status.** Transition the first prioritized task from the "Backlog" column to the "In Progress" column in the tracking system. Update the task assignee to the specific producer executing the work.
* **Step 3.2: Conduct Daily Standup Meetings.** Lead a daily, 15-minute production standup. Ensure each team member answers three key questions:
    1. What did you complete yesterday?
    2. What will you focus on today?
    3. Are there any blockers stopping you?
* **Step 3.3: Manage Production Blockers.** If a blocker is reported, immediately identify the owner. If the block is external (e.g., waiting for client feedback or assets), log the delay in the tracking system, notify the Account Director, and assign an alternative task to the blocked producer.
* **Step 3.4: Maintain Asset Version Control.** Ensure all design files, code branches, and copy documents follow standard naming conventions:
  * Format: `[ProjectID]_[DeliverableName]_v[Version]_[Date]`
  * *Example:* `PROJ104_LandingPageWireframe_v1.0_2026-06-25`
* **Step 3.5: Execute Unit Testing.** As work is produced, the individual creator must verify their output against the task's acceptance criteria on their local workspace before submitting it for review.

---

### Phase 4: Quality Assurance and System Validation

* **Step 4.1: Submit Work for Internal Review.** Once a task is complete, move it to the "Internal QA" column in the tracking system. Update the assignee to the assigned Quality Assurance (QA) Analyst.
* **Step 4.2: Perform Functional and Visual Testing.** The QA Analyst must test the deliverable against the documented acceptance criteria. For digital products, this includes checking cross-browser compatibility, testing responsiveness across mobile devices, and running performance speed tests.
* **Step 4.3: Log and Remediate Bugs.** If a defect is found:
    1. The QA Analyst must log it in the bug tracking tool with step-by-step instructions to reproduce the issue.
    2. Move the task back to the "In Progress" column and assign it to the original producer for remediation.
    3. Once fixed, the producer must resubmit the task for QA testing.
* **Step 4.4: Approve Internal Quality Review.** Once the deliverable passes all quality checks with zero critical defects, the QA Analyst must check the "Approved for UAT" box, log their approval, and move the task to "Staging/UAT."

---

### Phase 5: Release and Handover

* **Step 5.1: Deploy to the Staging Environment.** Deploy the approved assets to the client-facing staging environment. Double-check that all links, media files, and interactive features are working correctly.
* **Step 5.2: Initiate User Acceptance Testing (UAT).** Provide the client with secure access links to the staging environment, along with a structured UAT feedback form. Set a clear, reasonable deadline for their feedback (typically 3 to 5 business days).
* **Step 5.3: Consolidate and Address Client Feedback.** Collect and prioritize all client feedback:
  * *Critical Bugs:* Fix these issues immediately before launching the project.
  * *Out-of-Scope Requests:* Route these requests to the Account Director to be scoped out as separate paid change requests.
* **Step 5.4: Execute Final Production Launch.** Once the client signs off on UAT, run the automated deployment pipeline to push the assets live to the production environment.
* **Step 5.5: Conduct the Post-Mortem Review.** Within five business days of delivery, hold a brief retrospective with the internal team. Note what went well, what could be improved, and update the internal template library to improve future workflows.

---

### Troubleshooting and Exception Handling

The following table provides step-by-step solutions for common issues that can occur during the production process.

| Issue | Root Cause | Immediate Remediation Action |
| :--- | :--- | :--- |
| **Significant Scope Creep Detected** | Client is requesting features or changes that are not outlined in the original SOW. | 1. Pause work on the unapproved requests immediately.<br>2. Notify the Account Director with a clear comparison of the SOW vs. the new request.<br>3. Do not resume work on these tasks until a signed Change Request is uploaded to the system. |
| **Critical Resource Bottleneck** | A key producer is unavailable due to unexpected leave or overallocation. | 1. Identify critical-path tasks that are directly affected by the bottleneck.<br>2. Reallocate non-critical work to free up available team members.<br>3. If no internal capacity exists, request contract support from the Operations Director within 24 hours. |
| **Client Delays in UAT Feedback** | The client has not provided feedback within the agreed UAT timeframe. | 1. Send a polite reminder on the morning of the deadline.<br>2. If they do not respond within 48 hours of the deadline, notify the Account Director.<br>3. Pause the production schedule to avoid idle resource costs and shift team members to alternative active projects. |
| **Critical Bug Found in Production** | A major defect escaped internal QA and is affecting live users. | 1. Immediately roll back the live environment to the previous stable release.<br>2. Assemble a triage team of developers and QA analysts to diagnose and patch the issue in a safe sandbox environment.<br>3. Do not redeploy until the patch passes a full regression test. |

---

## 7. Quality Assurance and Metrics

To maintain a highly efficient pipeline, the Producer must regularly measure performance and quality against standard business metrics.

### Expected Deliverable Outputs

* **Functional Code/Assets:** High-quality code merged into the main production branch, or clean creative assets exported in their final requested formats.
* **Completed Documentation:** Updated release notes, architecture diagrams, and user guides stored in the shared project directory.
* **Official Client Sign-off:** A signed and dated UAT Acceptance Form stored securely in the client's account directory.

### Key Performance Indicators (KPIs)

Production leads must track the following metrics to monitor efficiency and identify bottlenecks:

1. **Lead Time (LT):** The average time from when a task is first created in the backlog to when it is fully deployed to production. Target: $\le 10$ business days for standard feature requests.
2. **First-Time-Right (FTR) Rate:** The percentage of deliverables that pass internal QA checks on their very first attempt without needing bug fixes. Target: $\ge 85\%$.
3. **Defect Leakage Rate:** The percentage of bugs or issues found by the client during UAT or post-launch, compared to those caught during internal QA. Target: $\le 5\%$.
4. **Capacity Utilization Rate:** The ratio of time spent on direct value-creating tasks compared to overall logged hours. Target: $75\% \text{ to } 85\%$.

---

## 8. References and Related Documents

This SOP is designed to work in tandem with other key operational procedures and compliance frameworks within our organization.

### Related Internal SOPs

* **SOP-OPS-001:** Client Onboarding and Project Intake Procedure. (Establishes the pre-conditions and SOW checks required before starting Phase 1).
* **SOP-QA-008:** Test Case Design and Automated Regression Testing. (Detailed procedures for executing manual and automated tests in Phase 4).
* **SOP-SEC-012:** Data Privacy and Encryption Standards. (Defines correct handling of sensitive client and customer data).
* **SOP-PM-003:** Client Communication and Conflict Resolution Guide. (Outlines how to handle client relationships during UAT delays).

### External Frameworks and Standards

* **ISO 9001:2015 (Section 8.5):** International standard outlining requirements for consistent production and service provision.
* **Agile Alliance Kanban Method:** Core principles used to manage WIP limits, map workflows, and improve team efficiency.

---

## 9. Revision History

This SOP is a living document. It must be reviewed every twelve months or immediately following any major change in our production systems to ensure it remains accurate and effective.

| Date of Change | Version | Summary of Change | Updated By |
| :--- | :--- | :--- | :--- |
| **May 12, 2024** | v1.0 | Initial release of the production pipeline standard operating procedure. | Marcus Vance (Prod. Lead) |
| **August 19, 2025** | v2.0 | Major update to incorporate modern CI/CD deployment steps and automated testing tools. | Sarah Jenkins (COO) |
| **January 14, 2026** | v3.0 | Added strict WIP limits and a more detailed troubleshooting table to address common bottlenecks. | Marcus Vance (Dir. of Ops) |
| **March 22, 2026** | v3.1 | Updated security warnings to ensure strict compliance with new data privacy policies. | Robert Chen (Security Lead) |
| **June 25, 2026** | v3.2 | Document reviewed for annual alignment. Re-formatted structure to match the new company-wide SOP layout. | Marcus Vance (Dir. of Ops) |
