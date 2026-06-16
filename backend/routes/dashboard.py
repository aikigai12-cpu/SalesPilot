from flask import Blueprint, jsonify
from db import supabase
from datetime import date

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.get("/")
def get_dashboard():
    # stats
    all_leads = supabase.table("leads").select("id,score,archived").eq("archived", False).execute().data
    total = len(all_leads)
    hot = sum(1 for l in all_leads if l["score"] >= 70)
    drop = sum(1 for l in all_leads if l["score"] < 30)

    # active cohort
    active = supabase.table("cohorts").select("*").eq("is_active", True).execute().data
    active_cohort = active[0] if active else None
    active_count = 0
    if active_cohort:
        active_count = supabase.table("cohort_leads").select("id").eq("cohort_id", active_cohort["id"]).execute().data
        active_count = len(active_count)

    # future cohort
    future = supabase.table("cohorts").select("*").eq("is_future", True).execute().data
    future_cohort = future[0] if future else None
    future_count = 0
    if future_cohort:
        future_count = supabase.table("cohort_leads").select("id").eq("cohort_id", future_cohort["id"]).execute().data
        future_count = len(future_count)

    # priority leads (top 5 by score)
    priority = supabase.table("leads").select("*").eq("archived", False).gte("score", 50).order("score", desc=True).limit(5).execute().data

    # today's reminders
    today = date.today().isoformat()
    reminders = supabase.table("reminders").select("*, leads(name,score)").lte("fire_at", today).eq("dismissed", False).execute().data

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
