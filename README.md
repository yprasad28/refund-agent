# AI Customer Support Agent — Refund Processing

A Next.js 14 AI agent that handles e-commerce refund requests using tool calling, built with the Vercel AI SDK and Google Gemini.

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
Open [http://localhost:3000/admin](http://localhost:3000/admin) for the admin dashboard.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT                              │
│                                                         │
│  ┌──────────────┐          ┌──────────────────────┐     │
│  │  Chat UI     │          │  Admin Dashboard      │     │
│  │  /page.tsx   │          │  /admin/page.tsx      │     │
│  │              │          │                       │     │
│  │  useChat()   │          │  Polls /api/logs      │     │
│  │  hook from   │          │  every 2s             │     │
│  │  @ai-sdk/react         │                       │     │
│  └──────┬───────┘          └──────────┬───────────┘     │
│         │                             │                  │
└─────────┼─────────────────────────────┼──────────────────┘
          │ POST /api/chat              │ GET /api/logs
          │                             │
┌─────────┼─────────────────────────────┼──────────────────┐
│         ▼          SERVER             ▼                  │
│                                                         │
│  ┌──────────────────┐    ┌─────────────────────────┐    │
│  │  /api/chat/route │    │  /api/logs/route         │    │
│  │                  │    │                          │    │
│  │  streamText()    │    │  Returns in-memory       │    │
│  │  from ai package │    │  tool call logs          │    │
│  │                  │    │                          │    │
│  │  Tools:          │    └─────────────────────────┘    │
│  │  ├ lookup_customer                                   │
│  │  ├ check_refund_policy                               │
│  │  ├ approve_refund       ┌───────────────────────┐    │
│  │  └ deny_refund          │  /lib/log-store.ts    │    │
│  └──────────┬─────────────│  (in-memory array)     │    │
│             │              └───────────────────────┘    │
│             ▼                                           │
│  ┌──────────────────┐    ┌───────────────────────┐      │
│  │  /lib/tools.ts   │───▶│  /lib/mock-crm.ts     │      │
│  │                  │    │                       │      │
│  │  Tool functions  │    │  15 customer profiles │      │
│  │  with logging    │    │  Refund policy rules  │      │
│  └──────────────────┘    └───────────────────────┘      │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Vercel AI SDK v6 (streamText + tool calling)    │   │
│  │  Model: Google Gemini 3.1-flash-lite             │   │
│  │  Multi-step: stopWhen: stepCountIs(10)           │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## File Structure

```
refund-agent/
├── app/
│   ├── api/
│   │   ├── chat/route.ts     # POST - AI agent with tool calling
│   │   └── logs/route.ts     # GET  - Returns tool call logs
│   ├── admin/page.tsx        # Admin dashboard with live logs
│   ├── globals.css           # Tailwind + global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Chat UI
├── lib/
│   ├── mock-crm.ts           # 15 customer profiles + refund policy
│   ├── log-store.ts          # In-memory tool call log store
│   └── tools.ts              # 4 tool definitions for the AI agent
├── tests/
│   ├── mock-crm.test.ts      # CRM data integrity tests
│   ├── tools.test.ts         # Tool execution + logging tests
│   ├── api-chat.test.ts      # Chat API route tests
│   └── api-logs.test.ts      # Logs API route tests
├── .env.local                # API key (Google Gemini)
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vitest.config.ts          # Test configuration
```

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

## Test Cases

### Approve Scenario (Customer C001)

**Customer**: Alice Johnson, ORD-1001, Wireless Headphones ($149.99)
**Purchase Date**: 2026-06-01 (within 30 days)
**Product Status**: unused
**Receipt**: provided

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
**Purchase Date**: 2026-06-10 (within 30 days)
**Product Status**: used
**Receipt**: provided

**Chat input:**
```
Can I get a refund for order ORD-1002?
```

**Expected flow:**
1. Agent calls `lookup_customer` → finds Bob Smith
2. Agent calls `check_refund_policy` → NOT eligible (product used)
3. Agent calls `deny_refund` with reason "Product status is used"
4. Agent responds: "Your refund for ORD-1002 has been denied. Reason: Product must be unused."

### Deny Scenario — Expired Window (Customer C003)

**Customer**: Carol White, ORD-1003, Bluetooth Speaker ($89.99)
**Purchase Date**: 2026-05-15 (more than 30 days ago)
**Product Status**: unused
**Receipt**: provided

**Chat input:**
```
I need a refund for C003
```

**Expected flow:**
1. Agent calls `lookup_customer` → finds Carol White
2. Agent calls `check_refund_policy` → NOT eligible (expired window)
3. Agent calls `deny_refund` with reason "Purchase was more than 30 days ago"
4. Agent responds: "Your refund has been denied. The 30-day refund window has expired."

### Deny Scenario — No Receipt (Customer C004)

**Customer**: David Brown, ORD-1004, Laptop Stand ($549.99)
**Purchase Date**: 2026-06-20 (within 30 days)
**Product Status**: unused
**Receipt**: NOT provided

**Chat input:**
```
Refund for customer C004 please
```

**Expected flow:**
1. Agent calls `lookup_customer` → finds David Brown
2. Agent calls `check_refund_policy` → NOT eligible (no receipt)
3. Agent calls `deny_refund` with reason "Receipt not provided"
4. Agent responds: "Your refund has been denied. A receipt is required."

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch
```

### Test Coverage

| File | Tests | What it covers |
|------|-------|----------------|
| `tests/mock-crm.test.ts` | 17 | Customer lookup, data integrity, ID patterns, policy constants |
| `tests/tools.test.ts` | 18 | All 4 tools: lookup/approve/deny/error cases + logging |
| `tests/api-chat.test.ts` | 5 | POST validation (400 for empty), streaming, legacy format |
| `tests/api-logs.test.ts` | 6 | GET returns array, field validation, insertion order |

**Total: 46 tests**

## Future Improvements

- **Supabase persistence** — replace in-memory log store with a real database
- **Session isolation** — multi-user log separation
- **Rate limiting** — protect `/api/chat` from abuse
- **Error boundaries** — graceful Gemini API failure handling
- **Tab visibility API** — pause admin polling when hidden
