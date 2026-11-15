---
name: cold-start-review
description: Check that a change can be understood by a teammate who did not build it, from the repository, issues, and PR alone. A fresh reviewer with no session context answers the five cold-start questions with citations; unanswered questions are gaps to fill with orcstack records. Use for /cold-start-review, before merging a boundary or architecture change, or when asked whether a change is documented enough.
disable-model-invocation: true
---

# Cold-start review

Code shows what the system does now. It does not show why a change mattered, what was rejected, who owns the risk, or which evidence must repeat. A change is not finished until someone who did not build it can recover those answers from the repository, the issues, and the PR.

## 1. Spawn a cold reviewer

Use {{spawn-subagent}} with {{spawn-readonly}}. Give it only the repository path, the PR number or branch, and the five questions below. Do not pass your plan, your summary, the transcript, or what you think the answers are. The reviewer reads the PR, the brief, the SSOT, ADRs, tests, and code like a new teammate would.

Ask it to answer each question with a citation (file and line, PR, or issue), or to write `UNANSWERED` and where it looked:

1. Which user need and failure cost justify this change?
2. Which subsystem and owner are responsible for it?
3. Which alternatives were rejected, and when should this decision be revisited?
4. What is a permanent automatic guard, and what was one-off evidence?
5. How far can it be rolled back, and which data or external contracts must be checked first?

## 2. Judge the answers

An answer counts only if its citation actually says it. A plausible guess without a citation is `UNANSWERED`. An answer that cites the transcript or a local file outside the repository is `UNANSWERED`.

## 3. Fill the gaps with orcstack records

| Unanswered | Fill it in |
|---|---|
| 1 | The brief's what-and-why, citing the SSOT section. Missing intent is a proposed SSOT change |
| 2 | CODEOWNERS or the architecture map |
| 3 | An ADR, via the **adr** skill, when the decision is long-lived. Otherwise the brief |
| 4 | The brief's acceptance table, 🔒 and 📎 per row |
| 5 | The PR's Blast Radius section, or the brief's remaining risk |

Never fill a gap with another framework's documents. After the fixes, run step 1 again with a new reviewer. Two rounds at most. Report what is still open.

**Reply:** the five answers with citations, what you filled, and anything still unanswered after the second round.
