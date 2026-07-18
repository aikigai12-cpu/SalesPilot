from flask import Blueprint, jsonify, g
from db import supabase
from datetime import date
from auth import require_auth

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.get("/")
@require_auth
def get_dashboard():
    uid = g.effective_user_id

    all_leads = supabase.table("leads").select("id,score,archived").eq("archived", False).eq("user_id", uid).execute().data
    total = len(all_leads)
    hot = sum(1 for l in all_leads if l["score"] >= 70)
    drop = sum(1 for l in all_leads if l["score"] < 30)

    # active cohort: user's own active cohort only
    all_active = supabase.table("cohorts").select("*").eq("is_active", True).execute().data
    active_cohort = next((c for c in all_active if c.get("user_id") == uid), None)
    active_count = 0
    if active_cohort and all_leads:
        active_count = len(supabase.table("cohort_leads").select("id").eq("cohort_id", active_cohort["id"]).in_("lead_id", [l["id"] for l in all_leads]).execute().data)

    future = supabase.table("cohorts").select("*").eq("is_future", True).execute().data
    future_cohort = future[0] if future else None
    future_count = 0
    if future_cohort and all_leads:
        future_count = len(supabase.table("cohort_leads").select("id").eq("cohort_id", future_cohort["id"]).in_("lead_id", [l["id"] for l in all_leads]).execute().data)

    priority = supabase.table("leads").select("*").eq("archived", False).eq("user_id", uid).gte("score", 50).order("score", desc=True).limit(5).execute().data

    today = date.today().isoformat()
    lead_ids_list = [l["id"] for l in all_leads]
    reminders = []
    if lead_ids_list:
        reminders = supabase.table("reminders").select("*, leads(name,score)").lte("fire_at", today).eq("dismissed", False).in_("lead_id", lead_ids_list).execute().data

    return jsonify({
        "stats": {
            "total": total, "hot": hot, "drop": drop,
            "active_cohort": active_cohort,
            "active_count": active_count,
            "future_count": future_count
        },
        "priority_leads": priority,
        "reminders": reminders
    })
