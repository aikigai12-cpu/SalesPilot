from flask import Blueprint, request, jsonify
from db import supabase
from ai import parse_whatsapp, calculate_score

interactions_bp = Blueprint("interactions", __name__)


def _rescore(lead_id):
    lead = supabase.table("leads").select("*").eq("id", lead_id).single().execute().data
    calls = supabase.table("call_logs").select("*").eq("lead_id", lead_id).order("date").execute().data
    was = supabase.table("whatsapp_logs").select("*").eq("lead_id", lead_id).execute().data
    result = calculate_score(lead, calls, was)
    supabase.table("leads").update({
        "score": result["score"],
        "score_reason": result["score_reason"],
        "ai_recommendation": result["ai_recommendation"]
    }).eq("id", lead_id).execute()
    return result


@interactions_bp.post("/leads/<lead_id>/calls")
def add_call(lead_id):
    body = request.json
    row = {
        "lead_id": lead_id,
        "date": body.get("date"),
        "duration_min": body.get("duration_min"),
        "outcome": body.get("outcome"),
        "objection": body.get("objection"),
        "interest_rating": body.get("interest_rating", 3),
        "followup_date": body.get("followup_date"),
        "notes": body.get("notes", "")
    }
    supabase.table("call_logs").insert(row).execute()
    score_result = _rescore(lead_id)

    # if promised cohort → update standing
    if body.get("outcome") == "promise":
        _promote_standing(lead_id, "Promised")

    return jsonify({"ok": True, "score": score_result})


@interactions_bp.get("/leads/<lead_id>/calls")
def get_calls(lead_id):
    data = supabase.table("call_logs").select("*").eq("lead_id", lead_id).order("date", desc=True).execute().data
    return jsonify(data)


@interactions_bp.post("/leads/<lead_id>/whatsapp")
def add_whatsapp(lead_id):
    body = request.json
    raw_text = body.get("raw_text", "")

    ai = parse_whatsapp(raw_text)

    row = {
        "lead_id": lead_id,
        "date": body.get("date"),
        "raw_text": raw_text,
        "ai_sentiment": ai.get("sentiment"),
        "ai_objection": ai.get("objection"),
        "ai_cohort_promise": ai.get("cohort_promise"),
        "ai_interest_signal": ai.get("interest_signal"),
        "ai_followup_needed": ai.get("followup_needed"),
        "ai_summary": ai.get("summary")
    }
    supabase.table("whatsapp_logs").insert(row).execute()
    score_result = _rescore(lead_id)

    # auto-assign cohort if promise detected
    if ai.get("cohort_promise"):
        _handle_cohort_promise(lead_id, ai["cohort_promise"])

    return jsonify({"ok": True, "ai": ai, "score": score_result})


@interactions_bp.get("/leads/<lead_id>/whatsapp")
def get_whatsapp(lead_id):
    data = supabase.table("whatsapp_logs").select("*").eq("lead_id", lead_id).order("date", desc=True).execute().data
    return jsonify(data)


def _promote_standing(lead_id, standing):
    cl = supabase.table("cohort_leads").select("id").eq("lead_id", lead_id).eq("status", "active").execute().data
    for row in cl:
        supabase.table("cohort_leads").update({"standing": standing}).eq("id", row["id"]).execute()


def _handle_cohort_promise(lead_id, promise_text):
    # find matching cohort by name (fuzzy)
    cohorts = supabase.table("cohorts").select("*").execute().data
    matched = None
    for c in cohorts:
        if any(w in (c.get("name") or "").lower() for w in promise_text.lower().split()):
            matched = c
            break

    future = next((c for c in cohorts if c.get("is_future")), None)
    target = matched if matched and not matched.get("is_future") else future

    if not target:
        return

    # remove from current cohort, add to target
    existing = supabase.table("cohort_leads").select("*").eq("lead_id", lead_id).execute().data
    for e in existing:
        supabase.table("cohort_leads").delete().eq("id", e["id"]).execute()

    supabase.table("cohort_leads").insert({
        "cohort_id": target["id"],
        "lead_id": lead_id,
        "standing": "Promised",
        "status": "active"
    }).execute()
