from flask import Blueprint, request, jsonify, g
from db import supabase
from datetime import date, timedelta
from auth import require_auth

reminders_bp = Blueprint("reminders", __name__)


@reminders_bp.get("/")
@require_auth
def get_reminders():
    uid = g.effective_user_id
    today = date.today().isoformat()
    lead_ids = [l["id"] for l in supabase.table("leads").select("id").eq("user_id", uid).execute().data]
    if not lead_ids:
        return jsonify([])
    data = supabase.table("reminders").select("*, leads(name, score)").lte("fire_at", today).eq("dismissed", False).in_("lead_id", lead_ids).order("fire_at").execute().data
    return jsonify(data)


@reminders_bp.post("/<reminder_id>/snooze")
@require_auth
def snooze(reminder_id):
    days = request.json.get("days", 2)
    snooze_until = (date.today() + timedelta(days=days)).isoformat()
    supabase.table("reminders").update({"fire_at": snooze_until}).eq("id", reminder_id).execute()
    return jsonify({"ok": True})


@reminders_bp.post("/<reminder_id>/dismiss")
@require_auth
def dismiss(reminder_id):
    supabase.table("reminders").update({"dismissed": True}).eq("id", reminder_id).execute()
    return jsonify({"ok": True})


def create_cohort_reminders(lead_id, cohort_id, start_date):
    from datetime import date as d
    start = d.fromisoformat(start_date)
    rows = [
        {"lead_id": lead_id, "cohort_id": cohort_id, "trigger_type": "7day",
         "fire_at": (start - timedelta(days=7)).isoformat(), "dismissed": False,
         "message": "Cohort starts in 7 days — follow up now"},
        {"lead_id": lead_id, "cohort_id": cohort_id, "trigger_type": "1day",
         "fire_at": (start - timedelta(days=1)).isoformat(), "dismissed": False,
         "message": "Cohort starts TOMORROW — final follow-up"},
    ]
    supabase.table("reminders").insert(rows).execute()
