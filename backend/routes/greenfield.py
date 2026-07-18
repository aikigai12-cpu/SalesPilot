from flask import Blueprint, request, jsonify
from db import supabase
from ai import greenfield_quick, greenfield_full

greenfield_bp = Blueprint("greenfield", __name__)


@greenfield_bp.post("/leads/<lead_id>/quick-analysis")
def quick_analysis(lead_id):
    lead = supabase.table("leads").select("*").eq("id", lead_id).single().execute().data
    calls = supabase.table("call_logs").select("*").eq("lead_id", lead_id).order("date").execute().data
    was = supabase.table("whatsapp_logs").select("*").eq("lead_id", lead_id).execute().data
    result = greenfield_quick(lead, calls, was)
    return jsonify(result)


@greenfield_bp.post("/leads/<lead_id>/full-research")
def full_research(lead_id):
    body = request.json or {}
    lead = supabase.table("leads").select("*").eq("id", lead_id).single().execute().data
    calls = supabase.table("call_logs").select("*").eq("lead_id", lead_id).order("date").execute().data
    was = supabase.table("whatsapp_logs").select("*").eq("lead_id", lead_id).execute().data

    extra = {
        "website": body.get("website", ""),
        "linkedin": body.get("linkedin", ""),
        "instagram": body.get("instagram", ""),
        "mutual_contact": body.get("mutual_contact", ""),
        "stages": body.get("stages", []),
    }
    result = greenfield_full(lead, calls, was, extra)
    return jsonify(result)
