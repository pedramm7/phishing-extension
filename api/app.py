from flask import Flask, request, jsonify
from flask_cors import CORS
import re
import json
from urllib.parse import urlparse
import os
import requests
import whois
from datetime import datetime
from gradio_client import Client
from bs4 import BeautifulSoup


app = Flask(__name__)
CORS(app)

# JSON file to store user-reported phishing sites
PHISHING_DB_FILE = os.path.join(os.path.dirname(__file__), "phishing_db.json")
EXTRACTED_DATA_FILE = os.path.join(os.path.dirname(__file__), "extracted_data.json")

OPENPHISH_FEED_URL = "https://openphish.com/feed.txt"

def check_openphish(url):
    """Check if a URL is flagged as phishing in OpenPhish"""
    try:
        response = requests.get(OPENPHISH_FEED_URL, timeout=10)
        
        if response.status_code == 200:
            phishing_urls = response.text.split("\n")  # Get list of phishing URLs
            
            if url in phishing_urls:
                return True  # URL is phishing

    except Exception as e:
        print(f"Error checking OpenPhish: {e}")

    return False  # Assume safe if there's an error

def get_page_content(url):
    """Safely fetch and parse page content"""
    try:
        response = requests.get(url, timeout=10, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        return soup.get_text()
    except Exception as e:
        print(f"Error fetching page content: {e}")
        return ""

@app.route('/api/store_data', methods=['POST'])
def store_data():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400

        with open('extracted_data.json', 'a') as f:
            json.dump(data, f, indent=4)
            f.write('\n')

        return jsonify({"message": "Data stored successfully!"})
    
    except Exception as e:
        print(f"Error storing data: {e}")
        return jsonify({"error": "Failed to store data"}), 500

# Load or create the phishing database file
if not os.path.exists(PHISHING_DB_FILE):
    with open(PHISHING_DB_FILE, "w") as f:
        json.dump({"reported_sites": []}, f)

# Load the trained model (if exists)
try:
    client = Client("nijatmammadov/pda")
    print("AI model loaded successfully")
except Exception as e:
    print(f"Error loading model: {e}")
    client = None


def is_phishing_rules(url):
    """Rule-based phishing detection only"""
    suspicious_keywords = ['secure', 'account', 'update', 'bank', 'login', 'verify', 'payment']
    url_shorteners = {
        "bit.ly", "tinyurl.com", "goo.gl", "t.co", "is.gd", "buff.ly", "adf.ly",
        "ow.ly", "shorte.st", "cutt.ly", "t.ly", "rb.gy", "mcaf.ee", "soo.gd",
        "rebrand.ly", "bl.ink", "tr.im", "v.gd", "u.to", "linklyhq.com", "clck.ru"
    }
    risky_tlds = {'.tk', '.ml', '.ga', '.cf', '.gq', '.zip', '.work'}
    
    try:
        parsed_url = urlparse(url)
        netloc = parsed_url.netloc.lower()
        path   = parsed_url.path.lower()
        qs     = parsed_url.query.lower()

        # 1. IP-address host
        if re.match(r"^\d{1,3}(\.\d{1,3}){3}$", netloc):
            return True, "Uses raw IP address"

        # 2. Non-HTTPS
        if parsed_url.scheme != "https":
            return True, "Not using HTTPS"

        # 3. Suspicious keywords
        for kw in suspicious_keywords:
            if kw in netloc or kw in path:
                return True, f"Suspicious keyword: \"{kw}\""

        # 4. Too many subdomains
        if netloc.count('.') > 3:
            return True, "Too many subdomains"

        # 5. Embedded credentials ("@" trick)
        if '@' in netloc:
            return True, "Embedded credentials in URL"

        # 6. URL shorteners
        if any(short in netloc for short in url_shorteners):
            return True, "Uses a known URL shortener"

        # 7. Risky TLDs
        for tld in risky_tlds:
            if netloc.endswith(tld):
                return True, f"Risky TLD \"{tld}\""

        # 8. Excessive length
        if len(url) > 75:
            return True, "URL is too long"

        # 9. Punycode / IDN homograph (any label starting with xn--)
        for label in netloc.split('.'):
            if label.startswith('xn--'):
                return True, "Internationalized (Punycode) domain"

        # 10. Double file extensions (e.g. invoice.pdf.exe)
        if re.search(r'\.\w+\.\w+$', path):
            return True, "Double file-extension in path"

        # 11. High-risk query parameters
        for param in ['password=', 'token=', 'session=']:
            if param in qs:
                return True, f"High-risk param \"{param}\""

        # 12. Very young domain (WHOIS < 30 days)
        try:
            info = whois.whois(netloc)
            created = info.creation_date
            # creation_date can be a list or a single datetime
            if isinstance(created, list):
                created = created[0]
            if isinstance(created, datetime):
                age_days = (datetime.utcnow() - created).days
                if age_days < 30:
                    return True, "Very newly registered domain"
        except Exception:
            # silent fail: if WHOIS errors or no date available, just continue
            pass

        return False, ""
    
    except Exception as e:
        print(f"Error in rule-based detection: {e}")
        return False, ""

def check_ai_model(content):
    """Check content using AI model"""
    if not client or not content:
        return False, ""
    
    try:
        result = client.predict(content, api_name="/predict")
        if result and isinstance(result, dict) and result.get('label') == "Phishing":
            return True, "Flagged by AI model"
    except Exception as e:
        print(f"AI model error: {e}")
    
    return False, ""

# Check if a URL is in the reported phishing list
def is_reported_phishing(url):
    try:
        with open(PHISHING_DB_FILE, "r") as f:
            data = json.load(f)
        return url in data.get("reported_sites", [])
    except Exception as e:
        print(f"Error reading phishing DB: {e}")
        return False

@app.route('/api/detect', methods=['POST'])
def detect_phishing():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        url = data.get('url', '')
        page_text = data.get('pageText', '')

        if not url:
            return jsonify({'error': 'No URL provided'}), 400

        # 1) User-reported DB
        if is_reported_phishing(url):
            return jsonify({
                'phishing': True,
                'reason': 'Previously reported by a user',
                'phishing_by_ai': True
            })

        # 2) Rule-based detection
        phishing_by_rules, rule_reason = is_phishing_rules(url)

        # 3) OpenPhish lookup
        openphish_result = check_openphish(url)

        # 4) AI model - fetch content once and reuse
        phishing_by_ai = False
        ai_reason = ""
        
        # Use provided page_text or fetch it
        content = page_text or get_page_content(url)
        if content:
            phishing_by_ai, ai_reason = check_ai_model(content)

        # Combine all detectors
        phishing_detected = (
            phishing_by_rules
            or openphish_result
            or phishing_by_ai
        )

        # Choose a top-level reason (prioritize more specific reasons)
        if phishing_by_rules:
            reason = rule_reason
        elif openphish_result:
            reason = "Listed in OpenPhish feed"
        elif phishing_by_ai:
            reason = ai_reason
        else:
            reason = "No threats detected"

        # Return overall flag, the reason, and the AI flag
        return jsonify({
            'phishing': phishing_detected,
            'reason': reason,
            'phishing_by_ai': phishing_by_ai
        })
        
    except Exception as e:
        print(f"Error in detect_phishing: {e}")
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@app.route('/api/report', methods=['POST'])
def report_phishing():
    """Allows users to report a phishing website."""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        url = data.get('url')

        if not url:
            return jsonify({'error': 'No URL provided'}), 400

        db = {}
        if os.path.exists(PHISHING_DB_FILE):
            try:
                with open(PHISHING_DB_FILE, "r") as f:
                    content = f.read().strip()
                    db = json.loads(content) if content else {}
            except Exception as e:
                print(f"Error reading phishing DB: {e}")
                db = {}

        # Ensure the key exists
        if "reported_sites" not in db:
            db["reported_sites"] = []
        
        # Add the reported URL if it's not already in the list
        if url not in db["reported_sites"]:
            db["reported_sites"].append(url)
            with open(PHISHING_DB_FILE, "w") as f:
                json.dump(db, f, indent=4)
            message = 'Phishing site reported successfully!'
        else:
            message = 'Site already reported'

        return jsonify({'message': message, 'url': url})
    
    except Exception as e:
        print(f"Error reporting phishing site: {e}")
        return jsonify({
            'error': 'Failed to report site',
            'message': str(e)
        }), 500

# NEW ENDPOINTS FOR BROWSER EXTENSION

@app.route('/get-reports', methods=['GET'])
def get_reports():
    """Get all user-reported phishing sites for the browser extension"""
    try:
        # Read from your existing phishing database file
        if os.path.exists(PHISHING_DB_FILE):
            with open(PHISHING_DB_FILE, "r") as f:
                content = f.read().strip()
                db = json.loads(content) if content else {}
        else:
            db = {"reported_sites": []}
        
        reported_sites = db.get("reported_sites", [])
        
        return jsonify({
            "reported_sites": reported_sites,
            "count": len(reported_sites),
            "status": "success",
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"Error reading phishing reports: {e}")
        return jsonify({
            "error": "Failed to fetch reports",
            "status": "error"
        }), 500

@app.route('/get-openphish-reports', methods=['GET'])
def get_openphish_reports():
    """Get phishing URLs from OpenPhish feed"""
    try:
        response = requests.get(OPENPHISH_FEED_URL, timeout=10)
        
        if response.status_code == 200:
            phishing_urls = [url.strip() for url in response.text.split("\n") if url.strip()]
            
            return jsonify({
                "reported_sites": phishing_urls[:100],  # Limit to first 100 for performance
                "count": len(phishing_urls[:100]),
                "total_available": len(phishing_urls),
                "source": "OpenPhish",
                "status": "success"
            })
        else:
            return jsonify({
                "error": "Failed to fetch OpenPhish data",
                "status": "error"
            }), 500
            
    except Exception as e:
        print(f"Error fetching OpenPhish data: {e}")
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

@app.route('/get-all-reports', methods=['GET'])
def get_all_reports():
    """Get combined phishing URLs from both user reports and OpenPhish"""
    try:
        # Get user-reported sites
        user_sites = []
        if os.path.exists(PHISHING_DB_FILE):
            with open(PHISHING_DB_FILE, "r") as f:
                content = f.read().strip()
                db = json.loads(content) if content else {}
                user_sites = db.get("reported_sites", [])
        
        # Get OpenPhish sites (limited number for performance)
        openphish_sites = []
        try:
            response = requests.get(OPENPHISH_FEED_URL, timeout=10)
            if response.status_code == 200:
                openphish_sites = [url.strip() for url in response.text.split("\n") if url.strip()][:50]
        except Exception as e:
            print(f"Error fetching OpenPhish: {e}")
        
        # Combine and deduplicate
        all_sites = list(set(user_sites + openphish_sites))
        
        return jsonify({
            "reported_sites": all_sites,
            "count": len(all_sites),
            "user_reported": len(user_sites),
            "openphish_count": len(openphish_sites),
            "status": "success",
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"Error getting all reports: {e}")
        return jsonify({
            "error": "Failed to fetch all reports",
            "status": "error"
        }), 500

# Health check endpoint
@app.route('/', methods=['GET'])
def home():
    """Health check and API info"""
    return jsonify({
        "message": "Phishing Detection Backend API",
        "status": "running",
        "endpoints": {
            "POST /api/detect": "Detect phishing for a URL",
            "POST /api/report": "Report a phishing site",
            "POST /api/store_data": "Store extracted data",
            "GET /get-reports": "Get user-reported phishing sites",
            "GET /get-openphish-reports": "Get OpenPhish feed data",
            "GET /get-all-reports": "Get combined phishing reports"
        },
        "timestamp": datetime.now().isoformat()
    })

if __name__ == '__main__':
    print("=" * 60)
    print("Starting Phishing Detection Backend")
    print("=" * 60)
    print(f"Server URL: http://127.0.0.1:5000")
    print(f"Health check: http://127.0.0.1:5000/")
    print(f"User reports: http://127.0.0.1:5000/get-reports")
    print(f"OpenPhish data: http://127.0.0.1:5000/get-openphish-reports")
    print(f"All reports: http://127.0.0.1:5000/get-all-reports")
    print("=" * 60)
    
    app.run(debug=True)
