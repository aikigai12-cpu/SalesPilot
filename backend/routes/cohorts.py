from flask import Blueprint, request, jsonify, g
from db import supabase
from auth import require_auth

cohorts_bp = Blueprint("cohorts", __name__)


@cohorts_bp.get("/")
@require_auth
def list_cohorts():
    uid = g.effective_user_id
    user_lead_ids = [l["id"] for l in supabase.table("leads").select("id").eq("user_id", uid).execute().data]

    data = supabase.table("cohorts").select("*").order("start_date", desc=True).execute().data
    result = []
    for c in data:
        all_cl = supabase.table("cohort_leads").select("*, leads(name,score,user_id)").eq("cohort_id", c["id"]).execute().data
        leads = [cl for cl in all_cl if cl.get("leads") and cl["leads"].get("user_id") == uid]
        c["lead_count"] = len(leads)
        c["standings"] = {
            "Confirmed": sum(1 for l in leads if l["standing"] == "Confirmed"),
            "Promised": sum(1 for l in leads if l["standing"] == "Promised"),
            "Interested": sum(1 for l in leads if l["standing"] == "Interested"),
            "At Risk": sum(1 for l in leads if l["standing"] == "At Risk"),
            "Cold": sum(1 for l in leads if l["standing"] == "Cold"),
        }
        result.append(c)
    return jsonify(result)


@cohorts_bp.post("/")
@require_auth
def create_cohort():
    body = request.json
    row = {
        "name": body["name"],
        "start_date": body.get("start_date"),
        "is_active": body.get("is_active", False),
        "is_future": body.get("is_future", False)
    }
    data = supabase.table("cohorts").insert(row).execute()
    return jsonify(data.data[0]), 201


@cohorts_bp.get("/<cohort_id>/leads")
@require_auth
def cohort_leads(cohort_id):
    uid = g.effective_user_id
    standing_filter = request.args.get("standing")
    q = supabase.table("cohort_leads").select("*, leads(*)").eq("cohort_id", cohort_id)
    if standing_filter:
        q = q.eq("standing", standing_filter)
    all_data = q.execute().data
    # filter to only this user's leads
    data = [row for row in all_data if row.get("leads") and row["leads"].get("user_id") == uid]
    for row in data:
        lead_id = row.get("lead_id")
        calls = supabase.table("call_logs").select("date").eq("lead_id", lead_id).order("date", desc=True).limit(1).execute().data
        row["last_call"] = calls[0]["date"] if calls else None
    return jsonify(data)


@cohorts_bp.post("/<cohort_id>/leads/<lead_id>")
@require_auth
def assign_lead(cohort_id, lead_id):
    uid = g.effective_user_id
    lead = supabase.table("leads").select("user_id").eq("id", lead_id).single().execute().data
    if not lead or lead.get("user_id") != uid:
        return jsonify({"error": "Not found"}), 404
    standing = request.json.get("standing", "Interested")
    existing = supabase.table("cohort_leads").select("id").eq("cohort_id", cohort_id).eq("lead_id", lead_id).execute().data
    if not existing:
        supabase.table("cohort_leads").insert({"cohort_id": cohort_id, "lead_id": lead_id, "standing": standing, "status": "active"}).execute()
    return jsonify({"ok": True})


@cohorts_bp.post("/<cohort_id>/bulk-assign")
@require_auth
def bulk_assign(cohort_id):
    uid = g.effective_user_id
    lead_ids = request.json.get("lead_ids", [])
    added = 0
    for lead_id in lead_ids:
        lead = supabase.table("leads").select("user_id").eq("id", lead_id).single().execute().data
        if not lead or lead.get("user_id") != uid:
            continue
        existing = supabase.table("cohort_leads").select("id").eq("cohort_id", cohort_id).eq("lead_id", lead_id).execute().data
        if not existing:
            supabase.table("cohort_leads").insert({
                "cohort_id": cohort_id, "lead_id": lead_id,
                "standing": "Interested", "status": "active"
            }).execute()
            added += 1
    return jsonify({"ok": True, "added": added})


@cohorts_bp.put("/<cohort_id>/leads/<lead_id>")
@require_auth
def update_standing(cohort_id, lead_id):
    uid = g.effective_user_id
    lead = supabase.table("leads").select("user_id").eq("id", lead_id).single().execute().data
    if not lead or lead.get("user_id") != uid:
        return jsonify({"error": "Not found"}), 404
    body = request.json
    supabase.table("cohort_leads").update({"standing": body["standing"]}).eq("cohort_id", cohort_id).eq("lead_id", lead_id).execute()
    return jsonify({"ok": True})


@cohorts_bp.patch("/<cohort_id>/leads/<lead_id>/track")
@require_auth
def track_lead(cohort_id, lead_id):
    uid = g.effective_user_id
    lead = supabase.table("leads").select("user_id").eq("id", lead_id).single().execute().data
    if not lead or lead.get("user_id") != uid:
        return jsonify({"error": "Not found"}), 404
    body = request.json
    update = {}
    if "next_followup" in body:
        update["next_followup"] = body["next_followup"]
    if "quick_note" in body:
        update["quick_note"] = body["quick_note"]
        if body["quick_note"].strip():
            from datetime import date
            supabase.table("call_logs").insert({
                "lead_id": lead_id,
                "date": str(date.today()),
                "duration": 0,
                "outcome": "Note",
                "interest_level": 5,
                "objection": "",
                "notes": body["quick_note"].strip(),
                "next_followup": body.get("next_followup")
            }).execute()
    if update:
        supabase.table("cohort_leads").update(update).eq("cohort_id", cohort_id).eq("lead_id", lead_id).execute()
    return jsonify({"ok": True})
