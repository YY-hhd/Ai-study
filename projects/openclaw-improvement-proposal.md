# OpenClaw Improvement Proposal: Tool Error Circuit Breaker & Edit Safety

**Date:** 2026-04-27  
**Severity:** Medium (token waste, task blocking)  
**Environment:** OpenClaw 2026.4.22, WSL2, Linux

---

## Problem Summary

The `edit` tool enters infinite retry loops when `oldText` and `newText` are identical, causing massive token waste (50K-80K tokens per incident).

### Incident Log

| Date | Retries | Tokens Wasted | Root Cause |
|:---|:---|:---|:---|
| 2026-04-24 16:00 | 30+ | ~20K | oldText == newText, edit fails, AI retries same params |
| 2026-04-27 08:44 | 100+ | ~50K-80K | Same issue, AI retries 100+ times |

### Root Cause Analysis

1. **No pre-validation**: edit tool doesn't check if oldText == newText before execution
2. **AI can't self-correct**: When the model generates identical oldText/newText, it doesn't recognize the error as "non-retryable"
3. **No circuit breaker**: System has no hard limit on repeated tool failures
4. **Error messages unclear**: Type mismatch errors don't clearly indicate "parameters are identical"

---

## Proposed Solutions

### 1. System-Level: Edit Tool Pre-Validation (Highest Priority)

```
Before executing edit:
  IF oldText == newText:
    → Reject immediately with clear error:
      "oldText and newText are identical. No change will be made."
    → Do NOT count against retry limits
```

### 2. System-Level: Tool Circuit Breaker

```
Per tool, per session:
  IF same tool returns same error N times:
    → Force pause, notify user
    → Do NOT allow retry without user intervention

Recommended thresholds:
  - edit: 3 identical errors → circuit break
  - exec: 5 identical errors → circuit break
  - Other tools: 5 identical errors → circuit break
```

### 3. System-Level: Error Classification

Distinguish between:
- **Retryable errors**: timeout, network, rate limit, temporary failures
- **Non-retryable errors**: parameter validation, type mismatch, identical content

Non-retryable errors should:
- Not trigger automatic retry
- Clear the retry counter
- Optionally notify user immediately

### 4. Agent Behavior Guidelines (Documentation)

Add to agent system prompt or behavior docs:

```
Tool Error Handling Rules:
1. If a tool returns the SAME error 3 times → STOP immediately
2. Do NOT retry with identical parameters
3. Classify errors:
   - "Not found" / "No match" → parameter error, NOT retryable
   - "Timeout" / "Rate limited" → retryable, backoff
4. After stopping, report status and wait for user instruction
5. Maximum 5 retries total for any single operation
```

---

## Impact Assessment

| Metric | Value |
|:---|:---|
| Token waste per incident | 50K-100K tokens |
| Frequency | 2 incidents in 4 days |
| Monthly budget impact | 7-10% if unaddressed |
| Data loss risk | None (idempotent operations) |
| Task blocking | Yes, retries consume session turns |

---

## Implementation Priority

| Priority | Solution | Effort | Impact |
|:---|:---|:---|:---|
| 🔴 P0 | edit pre-validation (oldText == newText) | Low | High |
| 🔴 P0 | Circuit breaker (3 same errors → stop) | Medium | High |
| 🟡 P1 | Error classification (retryable vs non-retryable) | Medium | Medium |
| 🟡 P1 | Agent behavior guidelines update | Low | Medium |
| 🟢 P2 | Retry with exponential backoff | Medium | Low |

---

## Additional Context

- Running in WSL2 environment
- Token budget: 50K daily / 1M monthly (百炼 Lite plan)
- Model: bailian/qwen3.5-plus (fallback: ollama/deepseek-r1:1.5b)
- System uptime: 41+ days stable before these incidents

---

_This proposal is based on real incidents observed in production. The author is a community user running OpenClaw for personal assistant use._
