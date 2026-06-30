from flask import Blueprint, jsonify, g
from db import supabase
from auth import require_auth

admin_bp = Blueprint("admin", __name__)


@admin_bp.get("/users")
@require_auth
def get_users():
    if g.role != "admin":
        return jsonify({"error": "Forbidden"}), 403
    data = supabase.table("profiles").select("*").order("name").execute().data
    return jsonify(data)


@admin_bp.put("/users/<user_id>/role")
@require_auth
def set_role(user_id):
    if g.role != "admin":
        return jsonify({"error": "Forbidden"}), 403
    from flask import request
    body = request.json
    supabase.table("profiles").update({"role": body["role"]}).eq("id", user_id).execute()
    return jsonify({"ok": True})
