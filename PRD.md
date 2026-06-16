# SalesPilot — Product Requirements Document

**Version:** 1.0  
**Date:** June 2025  
**Owner:** Sagar Pathak  
**Status:** Approved — Ready for Development

---

## 1. Product Overview

### What is SalesPilot?
SalesPilot is an AI-powered CRM built specifically for cohort-based course sales targeting SME owners. It replaces gut-feel sales decisions with data-driven intelligence — telling you exactly who to call, when to call, and who to stop chasing, based on patterns from 30+ historical cohorts.

### The Core Problem
- Leads say "I'll join the next cohort" and get lost in spreadsheets
- Sales effort wasted on dead leads while warm leads go cold
- No system connects WhatsApp conversations to lead records
- No memory of why a lead went cold or what objection they had
- No prediction of who will actually join the upcoming cohort

### Who Uses It
- Single user (Sagar Pathak)
- Access: Browser (desktop) + Mobile
- Use case: Managing ~1,000 SME owner leads for an AI course

---

## 2. Goals

| Goal | Metric |
|---|---|
| Stop wasting time on dead leads | Drop list accuracy > 80% |
| Never miss a "next cohort" promise | 0 missed pipeline reminders |
| Prioritise the right leads before each cohort | Top 10 priority list accuracy > 70% |
| Reduce time spent deciding who to call | Pre-cohort report generated in < 5 seconds |

---

## 3. User Stories

### Lead Management
- As a user, I want to add a lead with their business profile so I have full context when calling
- As a user, I want to log every call with outcome, objection, and notes so history is never lost
- As a user, I want to paste a WhatsApp chat and have AI extract the key information
- As a user, I want to see a lead's full history — all calls, chats, objections — on one screen

### AI Intelligence
- As a user, I want every lead to have an AI score (0–100) so I know who to prioritise
- As a user, I want AI to tell me WHY a lead has that score, not just the number
- As a user, I want AI to recommend what action to take for each lead
- As a user, I want to see patterns from my 30+ cohorts (e.g. "referral leads convert 71%")

### Pipeline & Reminders
- As a user, I want leads who say "next cohort" to be automatically tracked
- As a user, I want a reminder 7 days before cohort if a lead promised to join
- As a user, I want a reminder 1 day before cohort for final follow-up
- As a user, I want to see which pipeline leads are "at risk" (no contact for 15+ days)

### Pre-Cohort Report
- As a user, I want a ranked list of all leads before each cohort: green / yellow / red
- As a user, I want AI to predict how many leads will join this cohort
- As a user, I want to see conversion patterns by industry, source, objection type

---

## 4. Features — Phase 1

### 4.1 Lead Management

**Add Lead Form Fields:**

| Field | Type | Required |
|---|---|---|
| Full Name | Text | Yes |
| Phone | Text | Yes |
| WhatsApp Number | Text | No (defaults to phone) |
| Business Type | Dropdown | Yes |
| City | Text | Yes |
| Team Size | Dropdown | Yes |
| Revenue Range | Dropdown | No |
| How they found you | Dropdown | Yes |

**Business Type Options:** Manufacturing, Retail, Import/Export, Consulting, Services, Other  
**Team Size Options:** 1–5, 6–15, 16–50, 50+  
**Revenue Range Options:** Below ₹50L, ₹50L–₹2Cr, ₹2Cr–₹10Cr, ₹10Cr+  
**Source Options:** Referral, Instagram, LinkedIn, Word of mouth, Cold call, Other

---

### 4.2 Call Log

**Per call, user logs:**

| Field | Type | Required |
|---|---|---|
| Date | Date picker | Yes |
| Duration (minutes) | Number | No |
| Outcome | Dropdown | Yes |
| Objection type | Dropdown | No |
| Interest rating | 1–5 scale | Yes |
| Follow-up agreed? | Dropdown | No |
| Notes | Free text | No |

**Outcome Options:** Answered – good conversation, Answered – short call, Not answered, Callback requested, Said will join cohort  
**Objection Options:** None, Price too high, No time right now, Partner/spouse decision, Not sure yet, Not interested

---

### 4.3 WhatsApp Chat Log

- User pastes chat text OR types a summary
- AI reads the text and extracts:
  - Sentiment (positive / neutral / negative)
  - Any cohort promise ("will join July cohort")
  - Objection mentioned
  - Interest signal (explicit or implicit)
  - Whether follow-up is needed
- If cohort promise detected → prompts user to confirm cohort month → auto-tags lead to that cohort pipeline
- Raw text + AI extraction both stored on lead record

---

### 4.4 AI Lead Scoring

**Score: 0–100, updated after every interaction**

| Signal | Weight |
|---|---|
| Call response rate (answered vs not answered) | 20% |
| WhatsApp engagement (replied vs ignored) | 20% |
| Objection severity (none=high score, "not interested"=low) | 25% |
| Interest rating (user's 1–5 input) | 15% |
| Profile match (industry + size vs historical joiners) | 10% |
| Recency (days since last contact) | 10% |

**Score Bands:**
- 70–100 → Hot (green) — prioritise
- 40–69 → Medium (yellow) — call if time
- Below 40 → Cold/Drop (red) — deprioritise or archive

**AI displays:** Score + 1-line reason + recommended action

---

### 4.5 Future Cohort Pipeline

- When WhatsApp chat or call log contains cohort promise → lead tagged to that cohort
- Pipeline view shows all leads per cohort with:
  - AI likelihood (Very likely / Likely / At risk)
  - Days until cohort
  - Last contact date
  - Score
- "At risk" = promised cohort + no contact in 15+ days

**Reminder triggers:**
- 7 days before cohort → reminder with AI-suggested follow-up action
- 1 day before cohort → final reminder with full lead summary

---

### 4.6 Pre-Cohort AI Report

User inputs cohort start date → system generates:

1. **Green list** — Score 70+, ranked by likelihood
2. **Yellow list** — Score 40–69
3. **Red/Drop list** — Score below 40 with archive recommendation
4. **Predicted joins** — range estimate based on score distribution + historical conversion rates
5. **Pattern insights** — conversion % by source, industry, objection type from past cohorts

---

### 4.7 Dashboard

**Stats bar (always visible):**
- Total leads
- Hot leads (70+)
- Next cohort pipeline count
- Drop list count

**Main content:**
- Today's reminders (right column)
- Priority calls today — top 5 leads to call (left column)
- AI Market Pulse — cohort-level insight

---

### 4.8 Reminders Page

- Today section — urgent reminders (cohort within 7 days)
- This week section — important but not urgent
- Each reminder shows: lead name, why it's urgent, AI recommended action, Log Call + Snooze buttons
- Snooze options: 1 day, 2 days, 1 week

---

## 5. Features — Phase 2 (Future)

| Feature | Description |
|---|---|
| Call recording upload | Upload audio → AI transcribes + auto-fills call log |
| WhatsApp screenshot | Upload screenshot → AI reads image and extracts chat |
| Bulk import | Upload CSV of leads from old spreadsheet |
| Email integration | Log email conversations alongside calls |
| Cohort history import | Upload past cohort data to improve AI accuracy from day 1 |
| Mobile app | Native iOS/Android app |

---

## 6. Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | React + Vite + Tailwind CSS | Fast, responsive, mobile-ready |
| Backend | Flask (Python) | AI/ML libraries work best in Python |
| Database | Supabase (PostgreSQL) | Free tier, structured data, real-time |
| AI/LLM | Claude API (Anthropic Sonnet) | Best for reading notes, scoring, extraction |
| Auth | Supabase Auth | Built-in, single user = simple setup |
| Frontend hosting | Vercel | Free, fast deployment |
| Backend hosting | Render | Free tier, Python support |

---

## 7. Data Models

### Lead
```
id, name, phone, whatsapp, business_type, city, team_size,
revenue_range, source, created_at, archived, score,
score_updated_at, cohort_pipeline (month/year or null)
```

### Call Log
```
id, lead_id, date, duration_min, outcome, objection,
interest_rating, followup_agreed, notes, created_at
```

### WhatsApp Log
```
id, lead_id, date, raw_text, ai_sentiment, ai_objection,
ai_cohort_promise, ai_interest_signal, ai_followup_needed, created_at
```

### Cohort
```
id, name (e.g. "July 2025"), start_date, created_at
```

### Cohort Lead (pipeline)
```
id, cohort_id, lead_id, likelihood, added_at, status (active/joined/lost)
```

### Reminder
```
id, lead_id, cohort_id, trigger_type (7day/1day/custom),
fire_at, snoozed_until, dismissed, message
```

---

## 8. API Endpoints (Backend)

```
POST   /api/leads                  — Add lead
GET    /api/leads                  — List all leads (with filters, search)
GET    /api/leads/:id              — Get lead detail
PUT    /api/leads/:id              — Update lead
DELETE /api/leads/:id              — Archive lead

POST   /api/leads/:id/calls        — Add call log
GET    /api/leads/:id/calls        — Get call history

POST   /api/leads/:id/whatsapp     — Add WhatsApp chat (AI processes it)
GET    /api/leads/:id/whatsapp     — Get WhatsApp history

GET    /api/leads/:id/score        — Get AI score + reasoning

GET    /api/pipeline               — Get all cohort pipelines
POST   /api/pipeline               — Create cohort + assign leads

GET    /api/reminders/today        — Get today's reminders
POST   /api/reminders/:id/snooze   — Snooze a reminder
POST   /api/reminders/:id/dismiss  — Dismiss a reminder

POST   /api/report/cohort          — Generate pre-cohort AI report
GET    /api/dashboard              — Dashboard stats + priority leads
```

---

## 9. Navigation Structure

```
Sidebar
├── Dashboard        (home — stats + priority calls + reminders)
├── Leads            (full list — search, filter, add)
├── Pipeline         (cohort tracker — future promises)
├── AI Report        (pre-cohort priority list + patterns)
└── Reminders        (today + this week follow-ups)

Lead Detail (overlay)
├── AI score + reasoning
├── Score breakdown
├── Interaction timeline (calls + WhatsApp)
└── Quick actions
```

---

## 10. Development Phases

### Phase 1A — Core CRM (Week 1–2)
- [ ] Supabase schema setup
- [ ] Flask API — leads CRUD
- [ ] React frontend — lead list + add lead
- [ ] Lead detail page with interaction timeline
- [ ] Call log form

### Phase 1B — AI Layer (Week 3–4)
- [ ] Claude API integration
- [ ] WhatsApp chat analysis endpoint
- [ ] AI lead scoring engine
- [ ] Score display on all lead cards

### Phase 1C — Pipeline & Reminders (Week 5–6)
- [ ] Cohort pipeline view
- [ ] Reminder system (7-day + 1-day triggers)
- [ ] Dashboard with priority calls
- [ ] Pre-cohort AI report

### Phase 1D — Polish (Week 7)
- [ ] Mobile responsive testing
- [ ] Vercel + Render deployment
- [ ] Historical cohort data import (manual CSV)

---

## 11. Success Criteria

Phase 1 is complete when:
1. User can add a lead and log calls without any bugs
2. WhatsApp chat paste extracts correct information 80%+ of the time
3. AI score updates after every interaction
4. Pipeline reminders fire at correct times
5. Pre-cohort report generates in under 10 seconds
6. Works on mobile browser without layout issues
