# AI Customer Support Agent — Refund Processing

A Next.js 14 AI agent that handles e-commerce refund requests using tool calling, built with the Vercel AI SDK and Google Gemini.

## Live Demo

- **Chat UI**: https://refund-agent-chi.vercel.app
- **Admin Dashboard**: https://refund-agent-chi.vercel.app/admin

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Set your Google Gemini API key
export GOOGLE_GENERATIVE_AI_API_KEY="your-key-here"
# or on Windows PowerShell:
$env:GOOGLE_GENERATIVE_AI_API_KEY="your-key-here"
# or create a .env.local file (already configured if cloned from repo)

# 3. Run the dev server
npm run dev

# 4. Run tests
npm test
```

Open [http://localhost:3000](http://localhost:3000) for the chat interface.
Open [http://localhost:3000/admin](http://localhost:3000/admin) for the admin dashboard (opens in new tab).

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                       │
│                                                              │
│  ┌─────────────────┐              ┌──────────────────────┐   │
│  │    Chat UI       │              │   Admin Dashboard     │   │
│  │   /page.tsx      │              │   /admin/page.tsx     │   │
│  │                  │              │                       │   │
│  │  useChat() hook  │              │  Reads from           │   │
│  │  from @ai-sdk    │              │  localStorage         │   │
│  │                  │              │  every 1 second       │   │
│  │  useEffect()     │              │                       │   │
│  │  extracts tool   │              │  Shows color-coded    │   │
│  │  calls from      │              │  tool call cards:     │   │
│  │  messages and    │              │  - Green: approved    │   │
│  │  saves to        │              │  - Red: denied        │   │
│  │  localStorage    │              │  - Yellow: in progress│   │
│  └────────┬─────────┘              └──────────┬───────────┘   │
│           │                                    │               │
│           │        localStorage                │               │
│           │   ┌──────────────────────┐         │               │
│           └──▶│  Key: "refund-agent  │◀────────┘               │
│               │        -logs"        │                         │
│               │  Value: JSON array   │                         │
│               │  of tool call logs   │                         │
│               └──────────────────────┘                         │
└──────────────────────────────────────────────────────────────┘
           │
           │ POST /api/chat (streaming)
           ▼
┌──────────────────────────────────────────────────────────────┐
│                     SERVER (Next.js)                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  /api/chat/route.ts                                  │    │
│  │                                                      │    │
│  │  streamText() from Vercel AI SDK                     │    │
│  │  Model: Google Gemini 3.1-flash-lite                 │    │
│  │  Multi-step: stopWhen: stepCountIs(10)               │    │
│  │                                                      │    │
│  │  System prompt defines 6-step workflow:              │    │
│  │  1. lookup_customer                                  │    │
│  │  2. If not found → tell user, STOP                   │    │
│  │  3. check_refund_policy                              │    │
│  │  4. If not eligible → tell user why, STOP            │    │
│  │  5. approve_refund (or deny_refund)                  │    │
│  │  6. Tell user the result                             │    │
│  └──────────────────────┬───────────────────────────────┘    │
│                         │                                     │
│                         ▼                                     │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  /lib/tools.ts                                       │    │
│  │                                                      │    │
│  │  4 tool definitions:                                 │    │
│  │  ├ lookup_customer    → searches mock CRM            │    │
│  │  ├ check_refund_policy → validates 3 refund rules    │    │
│  │  ├ approve_refund     → marks refund approved        │    │
│  │  └ deny_refund        → marks refund denied          │    │
│  └──────────────────────┬───────────────────────────────┘    │
│                         │                                     │
│                         ▼                                     │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  /lib/mock-crm.ts                                    │    │
│  │                                                      │    │
│  │  15 customer profiles (C001–C015)                    │    │
│  │  Refund policy: 30 days, unused, receipt required    │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### Why localStorage for Logs?

On Vercel serverless, each API request runs on a separate function instance. Server-side in-memory logs don't persist across instances. The solution: the chat page extracts tool call data from the AI SDK message stream and stores it in the browser's `localStorage`. The admin page reads from `localStorage` — logs persist across page navigations without needing a database.

## File Structure

```
refund-agent/
├── app/
│   ├── api/
│   │   └── chat/route.ts       # POST - AI agent with streaming + tool calling
│   ├── admin/page.tsx           # Admin dashboard - reads logs from localStorage
│   ├── globals.css              # Tailwind + global styles
│   ├── layout.tsx               # Root layout with Geist fonts
│   └── page.tsx                 # Chat UI - extracts tool logs to localStorage
├── lib/
│   ├── mock-crm.ts              # 15 customer profiles + refund policy
│   ├── log-store.ts             # Server-side log store (globalThis for same-instance)
│   └── tools.ts                 # 4 tool definitions for the AI agent
├── tests/
│   ├── mock-crm.test.ts         # CRM data integrity tests (17)
│   ├── tools.test.ts            # Tool execution + logging tests (18)
│   ├── api-chat.test.ts         # Chat API route tests (5)
│   └── api-logs.test.ts         # Logs API route tests (6)
├── .env.local                   # API key (Google Gemini)
├── vitest.config.ts             # Test configuration
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Agent Workflow

The agent follows a strict 6-step workflow defined in the system prompt:

```
User: "I want a refund for C001"

Step 1: Agent calls lookup_customer("C001")
        → Returns: { found: true, customer: Alice Johnson, order: ORD-1001 }

Step 2: Agent calls check_refund_policy("ORD-1001")
        → Returns: { eligible: true, reasons: [] }
        (30-day check: PASS, unused: PASS, receipt: PASS)

Step 3: Agent calls approve_refund("ORD-1001")
        → Returns: { success: true, status: "approved", amount: $149.99 }

Step 4: Agent responds to user:
        "Your refund for order ORD-1001 has been approved. Amount: $149.99"
```

For deny scenarios, the agent stops at Step 2 (not eligible) and calls `deny_refund` instead.

## Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `lookup_customer` | Look up customer by ID | `customer_id: string` |
| `check_refund_policy` | Check if order qualifies for refund | `order_id: string` |
| `approve_refund` | Approve a refund | `order_id: string` |
| `deny_refund` | Deny a refund with reason | `order_id: string, reason: string` |

## Refund Policy

- Purchase must be within **30 days**
- Product must be **unused**
- **Receipt** must be provided

## Demo Scenarios

### Approve Scenario (Customer C001)

**Customer**: Alice Johnson, ORD-1001, Wireless Headphones ($149.99)
**Status**: unused, receipt provided, within 30 days

**Chat input:**
```
I want a refund for customer C001
```

**Expected flow:**
1. Agent calls `lookup_customer` → finds Alice Johnson
2. Agent calls `check_refund_policy` → eligible (all criteria met)
3. Agent calls `approve_refund` → refund approved
4. Agent responds: "Your refund for order ORD-1001 has been approved. You will receive $149.99."

### Deny Scenario — Product Used (Customer C002)

**Customer**: Bob Smith, ORD-1002, Smart Watch ($299.99)
**Status**: used, receipt provided, within 30 days

**Chat input:**
```
Can I get a refund for order ORD-1002?
```

**Expected flow:**
1. Agent calls `lookup_customer` → finds Bob Smith
2. Agent calls `check_refund_policy` → NOT eligible (product used)
3. Agent responds: "Your refund for ORD-1002 has been denied. Reason: Product must be unused."

### Deny Scenario — Expired Window (Customer C003)

**Customer**: Carol White, ORD-1003, Bluetooth Speaker ($89.99)
**Status**: unused, receipt provided, purchased >30 days ago

**Chat input:**
```
I need a refund for C003
```

**Expected flow:**
1. Agent calls `lookup_customer` → finds Carol White
2. Agent calls `check_refund_policy` → NOT eligible (expired window)
3. Agent responds: "Your refund has been denied. The 30-day refund window has expired."

### Deny Scenario — No Receipt (Customer C004)

**Customer**: David Brown, ORD-1004, Laptop Stand ($549.99)
**Status**: unused, NO receipt, within 30 days

**Chat input:**
```
Refund for customer C004 please
```

**Expected flow:**
1. Agent calls `lookup_customer` → finds David Brown
2. Agent calls `check_refund_policy` → NOT eligible (no receipt)
3. Agent responds: "Your refund has been denied. A receipt is required."

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Test Coverage

| File | Tests | What it covers |
|------|-------|----------------|
| `tests/mock-crm.test.ts` | 17 | Customer lookup, data integrity, ID patterns, policy constants |
| `tests/tools.test.ts` | 18 | All 4 tools: lookup/approve/deny/error cases + logging |
| `tests/api-chat.test.ts` | 5 | POST validation (400 for empty), streaming, legacy format |
| `tests/api-logs.test.ts` | 6 | GET returns array, field validation, insertion order |

**Total: 46 tests — all passing**

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **AI SDK**: Vercel AI SDK v6
- **LLM**: Google Gemini 3.1-flash-lite
- **Styling**: Tailwind CSS
- **Testing**: Vitest
- **Deployment**: Vercel

## Future Improvements

- **Voice pipeline** — Web Speech API or ElevenLabs for voice interaction
- **Supabase persistence** — replace in-memory log store with a real database
- **Session isolation** — multi-user log separation
- **Rate limiting** — protect `/api/chat` from abuse
- **Error boundaries** — graceful Gemini API failure handling
