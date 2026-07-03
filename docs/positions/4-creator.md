# Month-End Financial Close and Reporting Procedure

---

## Document Control and Header

| Metadata Field | Document Information |
| :--- | :--- |
| **Document Title** | Month-End Financial Close and Reporting Procedure |
| **Document ID** | SOP-FIN-001 |
| **Version Number** | 4.2 |
| **Effective Date** | July 1, 2026 |
| **Author** | Senior Financial Controller |
| **Approver** | Chief Financial Officer (CFO) |
| **Review Cycle** | Annual |

---

## 1. Purpose

The purpose of this Standard Operating Procedure (SOP) is to establish a standardized, repeatable, and disciplined process for executing the month-end financial close and generating the monthly financial reporting package.

Accurate and timely financial data is the cornerstone of business existence and continuity. Without a structured close process, the organization risks operational blindness, misallocation of capital, tax non-compliance, and strategic misalignment. This procedure ensures that the company's financial records are complete, accurate, and compliant with Generally Accepted Accounting Principles (GAAP) or International Financial Reporting Standards (IFRS), providing senior leadership, board members, and external stakeholders with a reliable assessment of the company’s financial health.

---

## 2. Scope

This SOP applies strictly to the Finance and Accounting Department, specifically governing the activities of the Financial Controller, Staff Accountants, Bookkeepers, and Accounts Payable/Receivable clerks.

### In-Scope

* Reconciliations of all active balance sheet accounts, including operating bank accounts, credit cards, merchant processing gateways, and payroll accounts.
* Sub-ledger reviews and reconciliations for Accounts Receivable (AR) and Accounts Payable (AP).
* Adjustment journal entries, including depreciation, amortization, prepaid expenses, accrued liabilities, and deferred revenue.
* Generation, validation, and analysis of core financial statements: the Balance Sheet, Income Statement (P&L), and Statement of Cash Flows.
* The formal "locking" of the accounting period within the ERP/accounting system.

### Out-of-Scope

* **Strategic tax planning and filing:** Annual corporate income tax filings are handled by external CPA partners (SOP-FIN-089), though this SOP provides the reconciled trial balance required for those filings.
* **Annual external audit execution:** While this process ensures audit-readiness, the actual coordination of external audits is governed by SOP-FIN-095.
* **Long-term corporate budgeting and forecasting:** These strategic activities are managed under the CFO’s discretion (SOP-FIN-102) and are separate from the historical month-end reconciliation process.

---

## 3. Definitions and Acronyms

To ensure consistent communication across the finance team, the following terms and acronyms are defined for the context of this document:

* **GL (General Ledger):** The master set of double-entry accounts where all financial transactions are recorded and summarized.
* **ERP (Enterprise Resource Planning):** The centralized software system (e.g., NetSuite, QuickBooks Online, SAP) used to manage core business processes, including accounting.
* **GAAP (Generally Accepted Accounting Principles):** The standard framework of guidelines for financial accounting used in the United States.
* **IFRS (International Financial Reporting Standards):** The global framework for preparing financial statements.
* **AR (Accounts Receivable):** Money owed to the company by customers for goods or services delivered but not yet paid for.
* **AP (Accounts Payable):** Money owed by the company to vendors or suppliers for goods or services received but not yet paid for.
* **Accrual Basis Accounting:** An accounting method where revenues and expenses are recorded when they are earned or incurred, regardless of when cash is exchanged.
* **Prepaid Expenses:** Assets resulting from advance payments for goods or services to be received in the future (e.g., annual software subscriptions).
* **Accrued Liabilities:** Expenses incurred during the current period that have not yet been invoiced or paid (e.g., unbilled legal services, wages earned but unpaid).
* **Amortization:** The systematic write-off of the cost of an intangible asset over its useful life.
* **Depreciation:** The systematic allocation of the cost of a tangible fixed asset over its useful life.
* **Variance Analysis:** The quantitative investigation of the difference between actual financial outcomes and planned, budgeted, or historical benchmarks.
* **Trial Balance:** A bookkeeping worksheet in which the balances of all ledgers are compiled into debit and credit columns to ensure mathematical accuracy.

---

## 4. Roles and Responsibilities

Executing a successful month-end close requires a strict division of labor and clear segregation of duties to prevent error and mitigate fraud risk. The following matrix outlines the specific roles involved in this procedure:

| Role | Responsibility Level | Specific Duties in This Process |
| :--- | :--- | :--- |
| **Accounts Receivable (AR) Clerk** | **Executor** | Clears outstanding invoices, applies customer payments, reviews the AR Aging Report, and resolves unapplied cash balances. |
| **Accounts Payable (AP) Clerk** | **Executor** | Enters all vendor bills, reconciles monthly vendor statements, processes approved bill payments, and reviews the AP Aging Report. |
| **Staff Accountant** | **Executor** | Performs initial bank, credit card, and gateway reconciliations; prepares standard adjusting journal entries; compiles supporting schedules for balance sheet accounts. |
| **Financial Controller** | **Executor & Primary Reviewer** | Reviews all reconciliations, posts complex adjusting entries (accruals, allocations), performs the preliminary trial balance review, drafts the financial package, and locks the accounting period. |
| **Chief Financial Officer (CFO)** | **Approver** | Conducts final executive review of the financial package, approves strategic variances, signs off on the locked period, and presents reports to the board. |

---

## 5. Prerequisites and Safety Warnings

Before beginning the month-end close process, the finance team must ensure all technical resources are accessible and that critical internal control warnings are strictly observed.

### Required Equipment and Access

* Administrator-level access to the ERP/accounting system.
* Secure read-only or transactional access to corporate banking portals, credit card portals, and merchant gateways (e.g., Stripe, PayPal).
* Access to payroll system reports (e.g., ADP, Gusto).
* Access to AP automation and expense management software (e.g., Bill.com, Ramp, Expensify).
* The standardized Month-End Close Checklist (Excel/Asana tracker).

### Financial and Operational Risk Warnings
>
> [!WARNING]
> **Strict Segregation of Duties:** The individual who initiates bank transactions must not be the individual who performs the bank reconciliation. Failure to maintain this boundary invites fraud risk and violates internal control standards.

> [!WARNING]
> **Transaction Cut-Off Integrity:** Do not enter, edit, or delete transactions dated in the prior month once the preliminary close process has reached Phase 3. Any late adjustments must be approved explicitly by the Financial Controller and posted via adjusting journal entry.

> [!WARNING]
> **Data Security and Verification:** Always download official bank statements in PDF format directly from the banking institution's portal. Do not rely solely on automated API bank feeds within the ERP, as feeds can drop transactions or generate duplicates.

---

## 6. The Procedure (Step-by-Step Instructions)

The month-end close is executed over an 11-working-day cycle starting immediately before the calendar month ends. Follow these sequential steps to ensure process integrity.

```
                  ┌──────────────────────────────────────────────┐
                  │ Phase 1: Sub-Ledger Clean-Up (Days -2 to 1)  │
                  └──────────────────────┬───────────────────────┘
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │ Phase 2: Cash & Gateway Reconcile (Days 2-3) │
                  └──────────────────────┬───────────────────────┘
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │  Phase 3: Balance Sheet Reconcile (Days 4-5) │
                  └──────────────────────┬───────────────────────┘
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │  Phase 4: Adjusting Journal Entries (Days 6-7)│
                  └──────────────────────┬───────────────────────┘
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │  Phase 5: Trial Balance & Variance (Day 8)   │
                  └──────────────────────┬───────────────────────┘
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │  Phase 6: Financial Pack & Review (Days 9-10)│
                  └──────────────────────┬───────────────────────┘
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │    Phase 7: Period Lock & Archive (Day 11)   │
                  └──────────────────────────────────────────────┘
```

---

### Phase 1: Sub-Ledger Clean-Up and Transaction Cut-Off (Working Days -2 to 1)

The objective of this phase is to ensure all transaction inputs for the closing month are finalized, categorized, and posted.

#### Step 1.1: AR Billing and Revenue Recognition Cut-off

* **Action:** Review all sales orders, delivery receipts, or milestone completions. Ensure that all goods shipped or services rendered during the month are officially invoiced with a transaction date falling within the close month.
* **Task:** The AR Clerk must run the *Unbilled Sales Orders* report in the ERP. For any completed order, generate the invoice.
* **Deadline:** 5:00 PM on Working Day -1.

#### Step 1.2: AP Bill Posting Cut-off

* **Action:** Gather all incoming vendor bills. Ensure they are scanned, OCR-processed, coded to the correct GL expense accounts, and approved within the AP automation portal.
* **Task:** The AP Clerk must check the physical and digital mailboxes for outstanding bills. Any invoice received with a service date in the closing month must be dated in the closing month, even if received after the calendar month ends.
* **Deadline:** 12:00 PM on Working Day 1.

#### Step 1.3: Employee Expense Reimbursement Cut-off

* **Action:** Trigger an automated notification to all employees requiring them to submit outstanding corporate card receipts and out-of-pocket mileage/expense claims.
* **Task:** The Staff Accountant must review all submitted expense reports, check them against the company's travel and entertainment policy, and sync them to the ERP.
* **Deadline:** 5:00 PM on Working Day 1.

---

### Phase 2: Cash, Banking, and Gateway Reconciliations (Working Days 2 to 3)

Liquid assets must be reconciled precisely to external banking records.

#### Step 2.1: Bank Statement Acquisition

* **Action:** Log into all corporate banking portals and download the official monthly bank statements in PDF format.
* **Task:** The Staff Accountant must save these files in the secure shared directory under: `/Finance/Reconciliations/[Year]/[Month]/Bank Statements/`.

#### Step 2.2: Bank Reconciliation Execution

* **Action:** In the ERP's reconciliation module, match the ending balance of the bank statement with the ending balance of the GL bank account.
* **Task:** Run the matching process for cleared deposits and withdrawals. Investigate any unmatched items (e.g., outstanding checks or deposits in transit).
* **Troubleshooting:** If the GL balance and the bank statement do not reconcile to zero:
  1. Verify if any prior-period transactions were edited or deleted. Run a *Modified Transactions Report* to identify unauthorized changes.
  2. Verify if bank fees, interest income, or merchant processing fees were omitted. Record these via manual journal entry if found.
  3. Ensure that cash transfers between accounts (e.g., Operating to Payroll) are matched on both sides.
* **Deadline:** 5:00 PM on Working Day 2.

#### Step 2.3: Merchant Gateway Reconciliation

* **Action:** Reconcile processing platforms (Stripe, PayPal, Adyen) to ensure that gross customer payments, gateway processing fees, and net payouts to the operating bank account are correctly matched.
* **Task:** The Staff Accountant must download the settlement reports from the merchant portals and run the reconciliation script to match internal invoice IDs to external transaction records.
* **Deadline:** 12:00 PM on Working Day 3.

---

### Phase 3: Balance Sheet Account Reconciliations (Working Days 4 to 5)

Every balance sheet account must have a supporting schedule or reconciliation ledger to substantiate its balance.

#### Step 3.1: Accounts Receivable Sub-ledger Reconciliation

* **Action:** Reconcile the AR aging report to the GL control account.
* **Task:** The AR Clerk must run the *AR Aging Detail Report* as of the last day of the close month. The total open balance on this report must match the exact balance of the AR Account on the Trial Balance.
* **Verification:** Identify and flag any customer accounts with credit balances (overpayments) or balances overdue by more than 90 days. Present these to the Controller for potential bad debt provision review.

#### Step 3.2: Accounts Payable Sub-ledger Reconciliation

* **Action:** Reconcile the AP aging report to the GL control account.
* **Task:** The AP Clerk must run the *AP Aging Detail Report* as of the last day of the close month. The total outstanding balance must match the exact balance of the AP Account on the Trial Balance.
* **Verification:** Check for any vendor credits that have remained unapplied for over 60 days.

#### Step 3.3: Inventory Valuation Verification (If Applicable)

* **Action:** Adjust the book value of inventory to match physical stock counts or warehouse management system (WMS) summaries.
* **Task:** The Staff Accountant must obtain the physical count sheet from the warehouse manager. If a variance exists between the physical count and the ERP inventory valuation, calculate the variance and prepare an inventory adjustment entry.
* **Formula:**
$$\text{Inventory Adjustment Expense} = (\text{ERP Count} - \text{Physical Count}) \times \text{Unit Cost}$$
* **Deadline:** 5:00 PM on Working Day 5.

---

### Phase 4: Adjusting Journal Entries (Working Days 6 to 7)

Adjusting journal entries transition the books from cash-basis records to GAAP/IFRS accrual-basis records.

#### Step 4.1: Prepaid Expenses Amortization

* **Action:** Amortize the portion of prepaid assets that was consumed during the close month.
* **Task:** The Staff Accountant must open the *Prepaid Expense Amortization Schedule* (Excel). Record a journal entry to debit the specific operating expense accounts (e.g., Software Subscriptions Expense, Insurance Expense) and credit the Prepaid Expense asset account.
* **Example Entry:**
  * `Debit: Software License Expense — $5,000`
  * `Credit: Prepaid Expenses — $5,000`

#### Step 4.2: Fixed Asset Depreciation

* **Action:** Allocate the monthly cost of tangible assets over their estimated useful lives.
* **Task:** Run the Fixed Asset Management module in the ERP or calculate straight-line monthly depreciation manually.
* **Formula:**
$$\text{Monthly Depreciation} = \frac{\text{Asset Purchase Cost} - \text{Salvage Value}}{\text{Useful Life in Months}}$$
* **Task:** Record a journal entry to debit Depreciation Expense and credit Accumulated Depreciation for each active asset class (e.g., Computer Equipment, Leasehold Improvements).

#### Step 4.3: Payroll and Wage Accruals

* **Action:** Accrue wages earned by employees during the close month but not paid until the subsequent month.
* **Task:** The Financial Controller must calculate the number of unpaid working days between the last payroll run end date and the calendar month-end date.
* **Formula:**
$$\text{Accrued Payroll} = \left(\frac{\text{Gross Payroll of Next Cycle}}{\text{Total Days in Next Cycle}}\right) \times \text{Days in Close Month Unpaid}$$
* **Task:** Prepare and post the journal entry:
  * `Debit: Salaries & Wages Expense`
  * `Debit: Payroll Tax Expense`
  * `Credit: Accrued Payroll / Liabilities`
* **Note:** Set this entry to automatically reverse on the first day of the subsequent month.

#### Step 4.4: Expense Accruals (Unbilled Liabilities)

* **Action:** Capture expenses for services received for which no invoice has been provided by the vendor.
* **Task:** Review significant vendor contracts (e.g., marketing agencies, legal counsel, utility providers). If services were rendered in the close month, contact the vendor for an estimate or estimate based on historic costs.
* **Task:** Record the accrual:
  * `Debit: Professional Fees Expense`
  * `Credit: Accrued Liabilities`
* **Deadline:** 5:00 PM on Working Day 7.

---

### Phase 5: Trial Balance Review and Preliminary Analysis (Working Day 8)

Before compiling official reports, the Financial Controller must check the integrity of the ledger.

#### Step 5.1: Run the Preliminary Trial Balance

* **Action:** Extract the *Preliminary Trial Balance* report from the ERP.
* **Task:** The Financial Controller must check that the sum of all debit balances equals the sum of all credit balances. If there is a system variance, contact IT and the ERP support desk immediately.

#### Step 5.2: Scan for Account Anomalies

* **Action:** Review the trial balance for illogical account balances.
* **Task:** Check the following specific balances:
  * Asset accounts must have **debit** balances. A credit balance in an asset account (other than Accumulated Depreciation or Allowance for Doubtful Accounts) indicates a double-entry error or an incorrect bank classification.
  * Liability accounts must have **credit** balances. A debit balance in a liability account (such as Accounts Payable or Credit Cards Payable) indicates a posting error or unapplied prepayment.
  * Investigate any balances sitting in "Suspense," "Uncategorized Expenses," or "Ask My Accountant" accounts. Reallocate all such balances to their correct GL accounts.

#### Step 5.3: Intercompany Eliminations (If Applicable)

* **Action:** Reconcile and eliminate intercompany transactions for businesses with parent-subsidiary structures.
* **Task:** The Financial Controller must ensure that intercompany receivables on the parent ledger match intercompany payables on the subsidiary ledger exactly. Book elimination entries to prevent double-counting of consolidated revenue and expenses.
* **Deadline:** 5:00 PM on Working Day 8.

---

### Phase 6: Financial Statement Package Generation & Analysis (Working Days 9 to 10)

This phase turns the reconciled data into structured business intelligence.

#### Step 6.1: Run Standard Reports

* **Action:** Export the three primary financial statements from the ERP as of the close month:
  1. **Balance Sheet** (showing cumulative financial position).
  2. **Income Statement (P&L)** (showing the month's profitability).
  3. **Statement of Cash Flows** (showing sources and uses of cash).
* **Task:** Ensure the formatting is consistent, with clear page breaks, thousands separators, and correct date ranges.

#### Step 6.2: Complete the Variance Analysis Report

* **Action:** Compare the current month’s actual financial results to the:
  * Current month's approved Budget.
  * Prior month's Actuals (Month-Over-Month).
  * Prior year's same month Actuals (Year-Over-Year).
* **Task:** The Financial Controller must calculate both absolute dollar variances and percentage variances.
* **Formula:**
$$\text{Variance \%} = \frac{\text{Actual} - \text{Budget}}{\text{Budget}} \times 100$$
* **Threshold Flagging:** Highlight any line-item variance exceeding **10%** and **$5,000** (or a customized materiality threshold defined by the CFO).
* **Documentation:** The Financial Controller must research flagged variances by examining underlying invoices or discussing them with department heads. Write brief, descriptive explanations for each flagged variance (e.g., *"Marketing expense exceeded budget by 18% due to an accelerated ad campaign launch scheduled originally for next month."*).

#### Step 6.3: Package Assembly and Submission

* **Action:** Compile the Financial Close Package into a single, professional PDF document.
* **Task:** The package must contain:
  1. Executive Summary (written by the Controller).
  2. Balance Sheet.
  3. Income Statement (current month and Year-To-Date).
  4. Cash Flow Statement.
  5. Variance Analysis Report with explanations.
  6. Accounts Receivable and Accounts Payable Aging summaries.
* **Task:** Submit the package securely to the CFO via the company's internal portal.
* **Deadline:** 12:00 PM on Working Day 10.

---

### Phase 7: Period Close and Lock (Working Day 11)

To ensure the historical integrity of the financial records, the close period must be permanently restricted.

#### Step 7.1: Apply System Period Lock

* **Action:** Log into the ERP as an Administrator. Access the accounting settings and lock the closed month.
* **Task:** Update the system rules to prevent any user (except the CFO and Financial Controller) from posting, deleting, or editing journal entries, bills, invoices, or cash transactions in the closed period.
* **Verification:** Attempt to enter a test transaction backdated to the closed month to verify the lock is operational and returns a permission error.

#### Step 7.2: File Archiving and Backup

* **Action:** Archive all supporting reconciliation files.
* **Task:** Gather all bank statements, excel reconciliation sheets, sub-ledger aging reports, and manual journal entry approvals. Save them in the permanent digital vault under: `/Finance/Locked Periods/[Year]/[Month]/`.
* **Task:** Send a confirmation email to the CFO and executive team stating: *"The accounting books for [Month/Year] are officially closed, reconciled, and locked as of [Date]."*
* **Deadline:** 5:00 PM on Working Day 11.

---

## 7. Quality Assurance and Metrics

To verify that this procedure was completed accurately and to the expected standard, the following checks must be performed before signing off on the close.

### Expected Output Checklist

* [ ] The preliminary Trial Balance debits equal credits.
* [ ] All bank and credit card accounts have an attached, signed reconciliation report matching the ending bank statement balance to the penny.
* [ ] Accounts Receivable sub-ledger matches the AR GL account balance.
* [ ] Accounts Payable sub-ledger matches the AP GL account balance.
* [ ] All flagged variances (>10% and >$5,000) have documented, clear, and verified explanations.
* [ ] The period lock has been successfully applied to the ERP.
* [ ] All supporting documentation is filed in the designated secure digital archive folder.

### Key Performance Indicators (KPIs) for the Close Process

These metrics are tracked by the CFO to monitor the efficiency and quality of the accounting team:

```
┌─────────────────────────────────┬─────────────────┬─────────────────┐
│ Metric                          │ Target Baseline │ Maximum Limit   │
├─────────────────────────────────┼─────────────────┼─────────────────┤
│ Days to Close (DTC)             │ 8 Working Days  │ 11 Working Days │
│ Unreconciled General Ledger     │ $0.00           │ $0.00           │
│ Post-Close Adjustments Required │ 0 adjustments   │ 1 adjustment    │
│ Variance Explanations Coverage  │ 100% of flags   │ 100% of flags   │
└─────────────────────────────────┴─────────────────┴─────────────────┘
```

---

## 8. References and Related Documents

To support the successful execution of this SOP, refer to the following policies, guidelines, and related procedures:

* **SOP-FIN-003: Accounts Payable Processing Procedure:** Outlines the daily entering, coding, and paying of vendor bills.
* **SOP-FIN-004: Accounts Receivable Billing and Collection Procedure:** Details invoice generation, cash application, and collection protocols.
* **SOP-FIN-012: Fixed Asset Capitalization and Depreciation Policy:** Defines capitalization thresholds, asset classes, and useful lives.
* **SOP-FIN-025: Corporate Travel and Expense Reimbursement Policy:** Sets boundaries for acceptable business expenses and reimbursement timelines.
* **GAAP Accounting Standards Codification (ASC) / IFRS Guidelines:** External frameworks dictating standard revenue recognition and asset treatment rules.

---

## 9. Revision History

This SOP is a living document and must be reviewed annually or when major upgrades are made to the corporate ERP platform.

| Date of Change | Version Number | Summary of Change | Updated By | Approved By |
| :--- | :--- | :--- | :--- | :--- |
| **Jan 15, 2024** | 1.0 | Initial creation and deployment of the Month-End Close process. | Controller | CFO |
| **Mar 10, 2025** | 2.0 | Updated to reflect migration from QuickBooks Online to NetSuite ERP. Adjusted bank import steps. | Senior Accountant | CFO |
| **Nov 02, 2025** | 3.0 | Integrated Stripe and Ramp automation. Added merchant gateway reconciliation steps. | Controller | CFO |
| **Jun 25, 2026** | 4.2 | Comprehensive review. Added explicit step-by-step variance threshold calculations, segregation of duties warnings, and detailed adjusting journal entry formulas. | Senior Controller | CFO |
