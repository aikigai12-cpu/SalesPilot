import os, json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "llama-3.3-70b-versatile"


def parse_whatsapp(text: str) -> dict:
    prompt = f"""You are an AI sales assistant. A salesperson pasted a WhatsApp chat with a lead.

Extract the following and return ONLY valid JSON, no explanation:
{{
  "sentiment": "positive" or "neutral" or "negative",
  "cohort_promise": "July 2025" or "August 2025" etc or null,
  "objection": "price" or "time" or "partner_decision" or "not_sure" or "not_interested" or null,
  "interest_signal": "high" or "medium" or "low",
  "followup_needed": true or false,
  "summary": "one sentence summary"
}}

Chat:
{text}"""

    resp = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=300,
        temperature=0.1,
    )
    raw = resp.choices[0].message.content.strip()
    try:
        # Strip markdown code block if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw)
    except Exception:
        return {"sentiment": "neutral", "cohort_promise": None, "objection": None,
                "interest_signal": "medium", "followup_needed": True, "summary": "Could not parse."}


def calculate_score(lead: dict, calls: list, whatsapps: list) -> dict:
    score = 40
    reasons = []

    # Call response rate (20 pts)
    if calls:
        answered = [c for c in calls if c.get("outcome") in ("Connected", "Interested", "Callback")]
        rate = len(answered) / len(calls)
        score += int(rate * 20)
        if rate >= 0.6:
            reasons.append("Good call response rate")
        elif rate < 0.3:
            reasons.append("Rarely answers calls")

    # WhatsApp engagement (20 pts)
    positive_wa = [w for w in whatsapps if w.get("ai_sentiment") == "positive"]
    wa_score = min(len(positive_wa) * 7, 20)
    score += wa_score
    if wa_score > 10:
        reasons.append("Active on WhatsApp")
    elif not whatsapps:
        reasons.append("No WhatsApp engagement yet")

    # Objection severity (25 pts)
    obj_map = {None: 25, "none": 25, "not_sure": 15, "time": 12,
               "price": 10, "partner_decision": 8, "not_interested": 0}
    last_obj = calls[-1].get("objection") if calls else None
    score += obj_map.get(last_obj, 10)
    if last_obj == "not_interested":
        reasons.append("Hard objection: not interested")
    elif last_obj == "price":
        reasons.append("Price objection — offer EMI option")

    # Interest rating (15 pts)
    ratings = [c["interest_rating"] for c in calls if c.get("interest_rating")]
    if ratings:
        avg = sum(ratings) / len(ratings)
        score += int((avg / 5) * 15)

    # Prospect fit — source (10 pts)
    if lead.get("source") == "Referral":
        score += 10
        reasons.append("Referral lead — converts 71%")
    elif lead.get("business_type") in ("Manufacturing", "Retail"):
        score += 7
        reasons.append(f"{lead.get('business_type')} converts well")

    # Recency (10 pts)
    if calls:
        from datetime import date
        try:
            last = date.fromisoformat(str(calls[-1].get("date", "")))
            days = (date.today() - last).days
            if days < 7:
                score += 10
            elif days < 14:
                score += 6
            elif days < 30:
                score += 3
            else:
                reasons.append("No contact in 30+ days — lead going cold")
        except Exception:
            pass

    score = max(5, min(score, 97))
    reason_text = ". ".join(reasons) if reasons else "Score based on interaction history."

    if score >= 80:
        rec = "High probability. Push for payment confirmation this week."
    elif score >= 60:
        rec = f"Warm lead. Keep consistent follow-ups. {reason_text}"
    elif score >= 40:
        rec = f"Medium score. Needs nurturing. {reason_text}"
    else:
        rec = "Low engagement. 1 final strong attempt — if no response, archive."

    return {"score": score, "score_reason": reason_text, "ai_recommendation": rec}


def _call(prompt: str) -> str:
    resp = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=600,
        temperature=0.3,
    )
    return resp.choices[0].message.content.strip()


def _confidence(calls, was, lead):
    real = 0
    total = 4
    if calls: real += 1
    if was: real += 1
    if lead.get("source") == "Referral": real += 1
    if any(c.get("interest_rating", 0) >= 4 for c in calls): real += 1
    level = "High" if real >= 3 else "Medium" if real >= 2 else "Low"
    return {"real_signals": real, "total_signals": total, "level": level,
            "note": f"Score is partly based on profile assumptions. Only {real} of {total} signals are real interactions."}


def greenfield_quick(lead: dict, calls: list, was: list) -> dict:
    from datetime import date
    name = lead.get("name", "this lead")
    btype = lead.get("business_type", "business")
    city = lead.get("city", "")
    team = lead.get("team_size", "")
    last_obj = calls[-1].get("objection") if calls else None
    last_notes = " ".join(c.get("notes", "") for c in calls[-3:] if c.get("notes"))
    today = date.today().strftime("%B %Y")

    # Stage 0.5 — Trigger Radar
    trigger_prompt = f"""You are a sales coach helping sell an AI course to Indian SME owners.

GREENFIELD RULE — Trigger Radar: Before any outreach, find a time-based reason why this person would act NOW, not next month. Think about their industry, city, team size, and the current date.

Lead:
- Name: {name}
- Business type: {btype}
- City: {city}
- Team size: {team}
- Today: {today}

Give one specific, concrete reason why this SME owner would be receptive to buying an AI course RIGHT NOW. 2-3 sentences. Be specific to their industry and current season. Write in a direct, practical tone. No generic answers."""

    # Stage 9 — One Level Deeper
    obj_prompt = f"""You are a sales coach helping sell an AI course to Indian SME owners.

GREENFIELD RULE — One Level Deeper: The first objection someone gives is never the real one. Always find the WHY behind the objection.

Lead:
- Name: {name}
- Business type: {btype}
- Team size: {team}
- Last objection: {last_obj or 'none stated'}
- Call notes: {last_notes or 'none'}

{"Predict what objection this person will raise based on their profile." if not last_obj else f"Their stated objection is '{last_obj}'. What is the REAL underlying reason?"}

Return ONLY valid JSON:
{{"objection": "price/time/partner_decision/not_sure/not_interested or null", "root_cause": "one sentence explaining the real reason", "counter": "one sentence on what to actually say or do"}}"""

    # Stage 5.5 — Earned Right + Call Opener
    opener_prompt = f"""You are a sales coach helping sell an AI course to Indian SME owners.

GREENFIELD RULE — Earned Right: You cannot contact someone with a generic message. You must have ONE specific insight about them. If you don't, say so.

Lead:
- Name: {name}
- Business type: {btype}
- City: {city}
- Team size: {team}
- Last objection: {last_obj or 'none'}
- Call notes: {last_notes or 'none'}

Write a specific, personalised call opening line in Hinglish (mix of Hindi and English, like Indian SME owners speak). It must reference something specific about their business or situation. Max 3 sentences. If there is not enough data to write something specific, say: "Not enough insight yet — log more interactions first."

Return ONLY valid JSON:
{{"earned_right": true or false, "opener": "the opening line or the not-enough-data message", "based_on": "short note on what signals you used"}}"""

    why_now = _call(trigger_prompt)
    obj_raw = _call(obj_prompt)
    opener_raw = _call(opener_prompt)

    try:
        obj_data = json.loads(obj_raw)
    except Exception:
        obj_data = {"objection": last_obj, "root_cause": "Could not analyse.", "counter": ""}

    try:
        opener_data = json.loads(opener_raw)
    except Exception:
        opener_data = {"earned_right": False, "opener": opener_raw, "based_on": ""}

    confidence = _confidence(calls, was, lead)

    return {
        "confidence": confidence,
        "why_now": why_now,
        "objection_analysis": obj_data,
        "call_opener": opener_data,
    }


def greenfield_full(lead: dict, calls: list, was: list, extra: dict) -> dict:
    from datetime import date
    name = lead.get("name", "this lead")
    btype = lead.get("business_type", "business")
    city = lead.get("city", "")
    team = lead.get("team_size", "")
    last_obj = calls[-1].get("objection") if calls else None
    last_notes = " ".join(c.get("notes", "") for c in calls[-3:] if c.get("notes"))
    today = date.today().strftime("%B %Y")
    website = extra.get("website", "")
    linkedin = extra.get("linkedin", "")
    instagram = extra.get("instagram", "")
    mutual = extra.get("mutual_contact", "")
    stages = extra.get("stages", [])

    results = {}

    context = f"""Lead: {name} | Business: {btype} | City: {city} | Team: {team} | Today: {today}
Website: {website or 'not provided'} | LinkedIn: {linkedin or 'not provided'} | Instagram: {instagram or 'not provided'} | Mutual contact: {mutual or 'none'}
Last objection: {last_obj or 'none'} | Call notes: {last_notes or 'none'}"""

    if "stage_0" in stages:
        p = f"""GREENFIELD Stage 0 — Account Identity: Confirm this is the right person before researching.
{context}
Confirm: Is this a real identifiable business? What is the full business name likely to be? Any risk of wrong person?
Return JSON: {{"confirmed": true/false, "business_name": "...", "note": "one line"}}"""
        try:
            results["stage_0"] = json.loads(_call(p))
        except Exception:
            results["stage_0"] = {"confirmed": True, "note": "Could not verify."}

    if "stage_05" in stages:
        p = f"""GREENFIELD Stage 0.5 — Trigger Radar: Find urgency signals.
{context}
List 2-3 specific reasons why this SME owner would buy an AI course RIGHT NOW. Each reason should be HIGH, MED, or LOW urgency. Consider industry trends, season, city economy.
Return JSON: {{"score": 1-10, "triggers": [{{"level": "HIGH/MED/LOW", "reason": "..."}}]}}"""
        try:
            results["stage_05"] = json.loads(_call(p))
        except Exception:
            results["stage_05"] = {"score": 5, "triggers": []}

    if "stage_1" in stages:
        p = f"""GREENFIELD Stage 1 — Warm Path via LinkedIn: Find intro routes.
{context}
Given the mutual contact '{mutual or 'unknown'}', suggest how to use this connection. If no mutual contact provided, suggest what type of person in the lead's network might be a bridge.
Return JSON: {{"warm_path_exists": true/false, "route": "...", "action": "what to do next"}}"""
        try:
            results["stage_1"] = json.loads(_call(p))
        except Exception:
            results["stage_1"] = {"warm_path_exists": bool(mutual), "route": mutual or "", "action": ""}

    if "stage_4" in stages:
        p = f"""GREENFIELD Stage 4 — Website & Business Analysis: Understand their business.
{context}
Based on business type '{btype}' in '{city}', what are the likely operational pain points of this business that an AI course would solve? What tools do they probably use?
Return JSON: {{"pain_points": ["..."], "likely_tools": ["..."], "opportunity": "one sentence"}}"""
        try:
            results["stage_4"] = json.loads(_call(p))
        except Exception:
            results["stage_4"] = {"pain_points": [], "likely_tools": [], "opportunity": ""}

    if "stage_5" in stages:
        p = f"""GREENFIELD Stage 5 — Hiring Signals: Growing teams = willing to invest.
{context}
A {btype} with {team} people in {city}. Are they likely hiring or growing right now? What does team size signal about their investment mindset?
Return JSON: {{"likely_hiring": true/false, "signal": "one sentence", "pitch_angle": "how to use this in your pitch"}}"""
        try:
            results["stage_5"] = json.loads(_call(p))
        except Exception:
            results["stage_5"] = {"likely_hiring": False, "signal": "", "pitch_angle": ""}

    if "stage_7" in stages:
        p = f"""GREENFIELD Stage 7 — Leadership Deep Dive: Understand how the owner thinks.
{context}
Instagram: {instagram or 'not provided'}. Based on their business type and city, what is the owner's likely communication style, priorities, and what would make them trust you?
Return JSON: {{"communication_style": "...", "priorities": ["..."], "trust_builder": "one line on what to say to build trust fast"}}"""
        try:
            results["stage_7"] = json.loads(_call(p))
        except Exception:
            results["stage_7"] = {"communication_style": "", "priorities": [], "trust_builder": ""}

    if "stage_55" in stages:
        p = f"""GREENFIELD Stage 5.5 — Earned Right Test: Do you have enough to reach out?
{context}
Based on all available data, do you have at least ONE specific, real insight about this person that justifies outreach? Or would the outreach be generic?
Return JSON: {{"passed": true/false, "insight": "the specific insight you have", "reason": "why this passes or fails the test"}}"""
        try:
            results["stage_55"] = json.loads(_call(p))
        except Exception:
            results["stage_55"] = {"passed": False, "insight": "", "reason": "Could not evaluate."}

    if "stage_9" in stages:
        p = f"""GREENFIELD Stage 9 — One Level Deeper on Objections:
{context}
{"Predict what objection this person will raise." if not last_obj else f"Their stated objection is '{last_obj}'. What is the REAL underlying reason?"}
Return JSON: {{"objection": "...", "root_cause": "...", "counter": "what to actually say"}}"""
        try:
            results["stage_9"] = json.loads(_call(p))
        except Exception:
            results["stage_9"] = {"objection": last_obj, "root_cause": "", "counter": ""}

    if "stage_11" in stages:
        p = f"""GREENFIELD Stage 11 — Persona-Driven Opening Message:
{context}
Write a personalised opening message in Hinglish for {name}. Use specific details from their profile. Reference their industry, city, or a relevant insight. Max 4 sentences. Practical and warm tone — like one business owner talking to another.
Return JSON: {{"message": "...", "based_on": "what signals you used"}}"""
        try:
            results["stage_11"] = json.loads(_call(p))
        except Exception:
            results["stage_11"] = {"message": _call(p), "based_on": ""}

    results["confidence"] = _confidence(calls, was, lead)
    return results
