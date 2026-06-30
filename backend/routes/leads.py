from flask import Blueprint, request, jsonify, g
from db import supabase
from ai import calculate_score
from auth import require_auth

leads_bp = Blueprint("leads", __name__)


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


@leads_bp.get("/")
@require_auth
def list_leads():
    archived = request.args.get("archived", "false") == "true"
    cohort = request.args.get("cohort")
    search = request.args.get("search", "")
    q = supabase.table("leads").select("*").eq("archived", archived).eq("user_id", g.effective_user_id).order("score", desc=True)
    if search:
        q = q.ilike("name", f"%{search}%")
    data = q.execute().data
    if cohort:
        ids = [r["lead_id"] for r in supabase.table("cohort_leads").select("lead_id").eq("cohort_id", cohort).execute().data]
        data = [d for d in data if d["id"] in ids]
    # attach cohort memberships
    all_cl = supabase.table("cohort_leads").select("lead_id, cohort_id, cohorts(id, name)").execute().data
    cl_map: dict = {}
    for cl in all_cl:
        lid = cl["lead_id"]
        if lid not in cl_map:
            cl_map[lid] = []
        if cl.get("cohorts"):
            cl_map[lid].append({"id": cl["cohorts"]["id"], "name": cl["cohorts"]["name"]})
    for lead in data:
        lead["cohorts"] = cl_map.get(lead["id"], [])
    return jsonify(data)


@leads_bp.post("/")
@require_auth
def add_lead():
    body = request.json
    row = {
        "name": body["name"],
        "phone": body["phone"],
        "whatsapp": body.get("whatsapp", body["phone"]),
        "business_type": body.get("business_type", ""),
        "city": body.get("city", ""),
        "team_size": body.get("team_size", ""),
        "revenue_range": body.get("revenue_range", ""),
        "source": body.get("source", ""),
        "score": 40,
        "score_reason": "New lead — no interactions yet.",
        "ai_recommendation": "Log a call or WhatsApp to get AI scoring.",
        "archived": False,
        "user_id": g.effective_user_id
    }
    result = supabase.table("leads").insert(row).execute()
    lead = result.data[0]

    cohort_id = body.get("cohort_id")
    if not cohort_id:
        future = supabase.table("cohorts").select("id").eq("is_future", True).limit(1).execute().data
        cohort_id = future[0]["id"] if future else None
    if cohort_id:
        supabase.table("cohort_leads").insert({
            "cohort_id": cohort_id, "lead_id": lead["id"],
            "standing": "Interested", "status": "active"
        }).execute()

    return jsonify(lead), 201


@leads_bp.get("/<lead_id>")
@require_auth
def get_lead(lead_id):
    lead = supabase.table("leads").select("*").eq("id", lead_id).single().execute().data
    calls = supabase.table("call_logs").select("*").eq("lead_id", lead_id).order("date", desc=True).execute().data
    was = supabase.table("whatsapp_logs").select("*").eq("lead_id", lead_id).order("date", desc=True).execute().data
    cl = supabase.table("cohort_leads").select("*, cohorts(name, is_future, is_active)").eq("lead_id", lead_id).execute().data
    return jsonify({"lead": lead, "calls": calls, "whatsapps": was, "cohort_leads": cl})


@leads_bp.put("/<lead_id>")
@require_auth
def update_lead(lead_id):
    body = request.json
    supabase.table("leads").update(body).eq("id", lead_id).execute()
    return jsonify({"ok": True})


@leads_bp.post("/<lead_id>/archive")
@require_auth
def archive_lead(lead_id):
    supabase.table("leads").update({"archived": True}).eq("id", lead_id).execute()
    return jsonify({"ok": True})
