from functools import wraps
from flask import request, jsonify, g
from db import supabase


def get_current_user():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[7:]
    try:
        resp = supabase.auth.get_user(token)
        if resp and resp.user:
            return resp.user.id
        return None
    except Exception:
        return None


def get_profile(user_id: str):
    try:
        r = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
        return r.data
    except Exception:
        return None


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user_id = get_current_user()
        if not user_id:
            return jsonify({"error": "Unauthorized"}), 401
        profile = get_profile(user_id)
        g.user_id = user_id
        g.profile = profile
        g.role = profile.get("role", "salesperson") if profile else "salesperson"
        view_as = request.headers.get("X-View-As")
        if g.role == "admin" and view_as:
            g.effective_user_id = view_as
        else:
            g.effective_user_id = user_id
        return f(*args, **kwargs)
    return decorated
