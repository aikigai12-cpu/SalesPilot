from flask import Blueprint, request, jsonify
from db import supabase

cohorts_bp = Blueprint("cohorts", __name__)


@cohorts_bp.get("/")
def list_cohorts():
    data = supabase.table("cohorts").select("*").order("start_date", desc=True).execute().data
    result = []
    for c in data:
        leads = supabase.table("cohort_leads").select("*, leads(name,score)").eq("cohort_id", c["id"]).execute().data
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
def cohort_leads(cohort_id):
    standing_filter = request.args.get("standing")
    q = supabase.table("cohort_leads").select("*, leads(*)").eq("cohort_id", cohort_id)
    if standing_filter:
        q = q.eq("standing", standing_filter)
    data = q.execute().data
    # attach last call date per lead
    for row in data:
        lead_id = row.get("lead_id")
        calls = supabase.table("call_logs").select("date").eq("lead_id", lead_id).order("date", desc=True).limit(1).execute().data
        row["last_call"] = calls[0]["date"] if calls else None
    return jsonify(data)


@cohorts_bp.post("/<cohort_id>/leads/<lead_id>")
def assign_lead(cohort_id, lead_id):
    standing = request.json.get("standing", "Interested")
    # check if already assigned to this cohort
    existing = supabase.table("cohort_leads").select("id").eq("cohort_id", cohort_id).eq("lead_id", lead_id).execute().data
    if not existing:
        row = {"cohort_id": cohort_id, "lead_id": lead_id, "standing": standing, "status": "active"}
        supabase.table("cohort_leads").insert(row).execute()
    return jsonify({"ok": True})


@cohorts_bp.post("/<cohort_id>/bulk-assign")
def bulk_assign(cohort_id):
    lead_ids = request.json.get("lead_ids", [])
    added = 0
    for lead_id in lead_ids:
        existing = supabase.table("cohort_leads").select("id").eq("cohort_id", cohort_id).eq("lead_id", lead_id).execute().data
        if not existing:
            supabase.table("cohort_leads").insert({
                "cohort_id": cohort_id, "lead_id": lead_id,
                "standing": "Interested", "status": "active"
            }).execute()
            added += 1
    return jsonify({"ok": True, "added": added})


@cohorts_bp.put("/<cohort_id>/leads/<lead_id>")
def update_standing(cohort_id, lead_id):
    body = request.json
    supabase.table("cohort_leads").update({"standing": body["standing"]}).eq("cohort_id", cohort_id).eq("lead_id", lead_id).execute()
    return jsonify({"ok": True})
