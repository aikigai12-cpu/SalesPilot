# SalesPilot — Technical Documentation

**Version:** 1.0  
**Date:** June 2025

---

## 1. Project Structure

```
SalesPilot/
├── frontend/                  (React + Vite + Tailwind)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Leads.jsx
│   │   │   ├── Pipeline.jsx
│   │   │   ├── Report.jsx
│   │   │   └── Reminders.jsx
│   │   ├── components/
│   │   │   ├── LeadCard.jsx
│   │   │   ├── LeadDetail.jsx
│   │   │   ├── AddLeadModal.jsx
│   │   │   ├── LogCallModal.jsx
│   │   │   ├── WhatsappModal.jsx
│   │   │   ├── ReminderCard.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── api/               (axios calls to Flask)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── backend/                   (Flask + Python)
│   ├── app.py                 (main Flask app)
│   ├── routes/
│   │   ├── leads.py
│   │   ├── calls.py
│   │   ├── whatsapp.py
│   │   ├── pipeline.py
│   │   ├── reminders.py
│   │   └── report.py
│   ├── ai/
│   │   ├── scorer.py          (AI lead scoring logic)
│   │   ├── whatsapp_parser.py (Claude API — extract from chat)
│   │   └── report_generator.py(Pre-cohort report AI)
│   ├── db/
│   │   └── supabase_client.py
│   ├── config.py
│   └── requirements.txt
│
├── index.html                 (Prototype — UI reference only)
├── PRD.md
└── DOCUMENTATION.md
```

---

## 2. Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+
- Supabase account (free)
- Anthropic API key
- Render account (backend hosting)
- Vercel account (frontend hosting)

---

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

**requirements.txt**
```
flask
flask-cors
supabase
anthropic
python-dotenv
apscheduler
```

**Create `.env` in backend/**
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
ANTHROPIC_API_KEY=your_claude_api_key
FLASK_ENV=development
```

**Run backend:**
```bash
python app.py
# Runs on http://localhost:5000
```

---

### Frontend Setup

```bash
cd frontend
npm install
```

**Create `.env` in frontend/**
```
VITE_API_URL=http://localhost:5000
```

**Run frontend:**
```bash
npm run dev
# Runs on http://localhost:5173
```

---

## 3. Supabase Database Schema

Run these SQL commands in Supabase SQL editor:

```sql
-- LEADS
create table leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  whatsapp text,
  business_type text,
  city text,
  team_size text,
  revenue_range text,
  source text,
  score integer default 0,
  score_updated_at timestamptz,
  score_reason text,
  archived boolean default false,
  created_at timestamptz default now()
);

-- CALL LOGS
create table call_logs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  date date not null,
  duration_min integer,
  outcome text,
  objection text,
  interest_rating integer check (interest_rating between 1 and 5),
  followup_agreed text,
  notes text,
  created_at timestamptz default now()
);

-- WHATSAPP LOGS
create table whatsapp_logs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  date date,
  raw_text text,
  ai_sentiment text,
  ai_objection text,
  ai_cohort_promise text,
  ai_interest_signal text,
  ai_followup_needed boolean,
  created_at timestamptz default now()
);

-- COHORTS
create table cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  created_at timestamptz default now()
);

-- COHORT PIPELINE (leads who promised a cohort)
create table cohort_leads (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid references cohorts(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  likelihood text,
  status text default 'active',
  added_at timestamptz default now()
);

-- REMINDERS
create table reminders (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  cohort_id uuid references cohorts(id),
  trigger_type text,
  message text,
  fire_at timestamptz,
  snoozed_until timestamptz,
  dismissed boolean default false,
  created_at timestamptz default now()
);
```

---

## 4. AI Integration

### 4.1 WhatsApp Chat Parser

**File:** `backend/ai/whatsapp_parser.py`

```python
import anthropic

client = anthropic.Anthropic()

def parse_whatsapp_chat(raw_text: str) -> dict:
    prompt = f"""
You are an AI sales assistant. A salesperson has pasted a WhatsApp conversation with a lead.

Extract the following information from this chat:
1. sentiment: "positive", "neutral", or "negative"
2. cohort_promise: the cohort they mentioned (e.g. "July 2025") or null
3. objection: the main objection if any ("price", "time", "partner_decision", "not_sure", "not_interested") or null
4. interest_signal: "high", "medium", "low"
5. followup_needed: true or false
6. summary: one sentence summary of this conversation

Return ONLY valid JSON. No explanation.

Chat:
{raw_text}
"""
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}]
    )
    import json
    return json.loads(message.content[0].text)
```

---

### 4.2 Lead Scorer

**File:** `backend/ai/scorer.py`

Scoring logic runs after every call log or WhatsApp log is saved.

```python
def calculate_score(lead_id: str, db) -> dict:
    # Fetch lead profile
    lead = db.table('leads').select('*').eq('id', lead_id).single().execute().data

    # Fetch all call logs
    calls = db.table('call_logs').select('*').eq('lead_id', lead_id).execute().data

    # Fetch all whatsapp logs
    wa = db.table('whatsapp_logs').select('*').eq('lead_id', lead_id).execute().data

    score = 0
    reasons = []

    # Signal 1: Call response rate (20 pts)
    if calls:
        answered = [c for c in calls if 'Answered' in (c.get('outcome') or '')]
        rate = len(answered) / len(calls)
        call_score = int(rate * 20)
        score += call_score
        if rate > 0.6:
            reasons.append("Good call response rate")
        elif rate < 0.3:
            reasons.append("Rarely answers calls")

    # Signal 2: WhatsApp engagement (20 pts)
    if wa:
        positive_wa = [w for w in wa if w.get('ai_sentiment') == 'positive']
        wa_score = min(len(positive_wa) * 7, 20)
        score += wa_score
        if wa_score > 10:
            reasons.append("Active on WhatsApp")

    # Signal 3: Objection severity (25 pts)
    objection_scores = {
        None: 25, 'none': 25, 'not_sure': 15,
        'time': 12, 'price': 10, 'partner_decision': 8, 'not_interested': 0
    }
    last_objection = calls[-1].get('objection') if calls else None
    obj_score = objection_scores.get(last_objection, 10)
    score += obj_score
    if obj_score < 10:
        reasons.append(f"Hard objection: {last_objection}")

    # Signal 4: Average interest rating (15 pts)
    ratings = [c['interest_rating'] for c in calls if c.get('interest_rating')]
    if ratings:
        avg = sum(ratings) / len(ratings)
        rating_score = int((avg / 5) * 15)
        score += rating_score

    # Signal 5: Profile match (10 pts) — compare to historical joiners
    high_converting = ['Manufacturing', 'Retail']
    if lead.get('business_type') in high_converting:
        score += 10
        reasons.append(f"{lead['business_type']} converts well")
    elif lead.get('source') == 'Referral':
        score += 8
        reasons.append("Referral lead")

    # Signal 6: Recency (10 pts)
    from datetime import datetime, date
    if calls:
        last_call_date = calls[-1].get('date')
        if last_call_date:
            days_ago = (date.today() - date.fromisoformat(last_call_date)).days
            if days_ago < 7:
                score += 10
            elif days_ago < 14:
                score += 6
            elif days_ago < 30:
                score += 3

    score = min(score, 100)
    reason_text = ". ".join(reasons) if reasons else "Score based on interaction history."

    return {"score": score, "reason": reason_text}
```

---

### 4.3 Pre-Cohort Report Generator

**File:** `backend/ai/report_generator.py`

```python
def generate_report(cohort_id: str, db) -> dict:
    # Get all active (non-archived) leads with scores
    leads = db.table('leads').select('*').eq('archived', False).order('score', desc=True).execute().data

    green = [l for l in leads if l['score'] >= 70]
    yellow = [l for l in leads if 40 <= l['score'] < 70]
    red = [l for l in leads if l['score'] < 40]

    # Historical conversion rate (hardcoded for now, will improve with real data)
    # As user adds more cohort data, this becomes more accurate
    estimated_joins = int(len(green) * 0.65) + int(len(yellow) * 0.20)

    return {
        "green": green,
        "yellow": yellow,
        "red": red,
        "estimated_joins_min": int(estimated_joins * 0.8),
        "estimated_joins_max": int(estimated_joins * 1.2),
        "total_leads": len(leads)
    }
```

---

## 5. Reminder System

**File:** `backend/routes/pipeline.py`

Reminders are generated when a lead is added to a cohort pipeline.

```python
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta

scheduler = BackgroundScheduler()

def create_reminders_for_cohort_lead(lead_id, cohort_id, cohort_start_date, db):
    # 7-day reminder
    fire_7 = cohort_start_date - timedelta(days=7)
    db.table('reminders').insert({
        'lead_id': lead_id,
        'cohort_id': cohort_id,
        'trigger_type': '7day',
        'fire_at': fire_7.isoformat(),
        'message': 'Cohort starts in 7 days — follow up now'
    }).execute()

    # 1-day reminder
    fire_1 = cohort_start_date - timedelta(days=1)
    db.table('reminders').insert({
        'lead_id': lead_id,
        'cohort_id': cohort_id,
        'trigger_type': '1day',
        'fire_at': fire_1.isoformat(),
        'message': 'Cohort starts TOMORROW — final follow-up'
    }).execute()
```

---

## 6. Deployment

### Backend on Render
1. Push `backend/` to GitHub
2. Create new Web Service on Render
3. Build command: `pip install -r requirements.txt`
4. Start command: `python app.py`
5. Add environment variables (SUPABASE_URL, SUPABASE_KEY, ANTHROPIC_API_KEY)

### Frontend on Vercel
1. Push `frontend/` to GitHub
2. Import repo on Vercel
3. Framework: Vite
4. Add environment variable: `VITE_API_URL=https://your-render-url.onrender.com`
5. Deploy

---

## 7. Color System

| Color | Variable | Used For |
|---|---|---|
| `#00d4a0` | Green | Hot leads, AI insights, positive signals |
| `#ff6b35` | Orange | Reminders, warnings, pipeline urgency |
| `#4f8ef7` | Blue | WhatsApp, info, medium priority |
| `#f5c518` | Yellow | Medium score, lukewarm leads |
| `#ef4444` | Red | Drop list, cold leads, archive |
| `#8b5cf6` | Purple | Neutral avatars |
| `#0d0f18` | BG Primary | Page background |
| `#13151f` | BG Secondary | Sidebar, cards |
| `#1a1d2b` | BG Tertiary | Inputs, inner sections |

---

## 8. Score Band Reference

| Score | Label | Color | Action |
|---|---|---|---|
| 70–100 | Hot | Green | Call immediately |
| 40–69 | Medium | Yellow | Call if time allows |
| 20–39 | Cold | Orange | Low priority |
| 0–19 | Drop | Red | Archive — stop chasing |

---

## 9. Key Business Rules

1. Score recalculates after EVERY call log or WhatsApp log saved
2. A lead stays in pipeline until manually marked as Joined or Lost
3. Reminder fires at 9:00 AM on the trigger date
4. Snooze options: 1 day, 2 days, 1 week
5. A lead with "Not interested" objection 2+ times → auto-flag for drop list
6. Archive = soft delete (hidden from active lists, not deleted from DB)
7. Cohort history (who joined) feeds AI accuracy over time

---

## 10. Environment Variables Reference

### Backend (.env)
```
SUPABASE_URL=
SUPABASE_KEY=
ANTHROPIC_API_KEY=
FLASK_ENV=development
PORT=5000
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000
```
