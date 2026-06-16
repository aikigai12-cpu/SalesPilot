import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from routes.leads import leads_bp
from routes.interactions import interactions_bp
from routes.cohorts import cohorts_bp
from routes.dashboard import dashboard_bp
from routes.reminders import reminders_bp
from routes.bulk import bulk_bp

app = Flask(__name__)
CORS(app, origins="*")

app.register_blueprint(leads_bp, url_prefix="/api/leads")
app.register_blueprint(interactions_bp, url_prefix="/api")
app.register_blueprint(cohorts_bp, url_prefix="/api/cohorts")
app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
app.register_blueprint(reminders_bp, url_prefix="/api/reminders")
app.register_blueprint(bulk_bp, url_prefix="/api/bulk")


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "SalesPilot"}


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5001))
    app.run(debug=True, port=port)
