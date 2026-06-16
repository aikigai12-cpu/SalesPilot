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
