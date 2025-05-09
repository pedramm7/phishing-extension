from flask import Flask, request, jsonify
import pickle
from flask_cors import CORS
import numpy as np
import re
import json
from urllib.parse import urlparse
import os
import requests

app = Flask(__name__)
CORS(app)

# JSON file to store user-reported phishing sites
PHISHING_DB_FILE = os.path.join(os.path.dirname(__file__), "phishing_db.json")
EXTRACTED_DATA_FILE = os.path.join(os.path.dirname(__file__), "extracted_data.json")

OPENPHISH_FEED_URL = "https://openphish.com/feed.txt"

def check_openphish(url):
    """Check if a URL is flagged as phishing in OpenPhish"""
    try:
        response = requests.get(OPENPHISH_FEED_URL)
        
        if response.status_code == 200:
            phishing_urls = response.text.split("\n")  # Get list of phishing URLs
            
            if url in phishing_urls:
                return True  # URL is phishing

    except Exception as e:
        print(f"Error checking OpenPhish: {e}")

    return False  # Assume safe if there's an error

@app.route('/api/store_data', methods=['POST'])
def store_data():
    data = request.get_json()

    with open('extracted_data.json', 'a') as f:
        json.dump(data, f, indent=4)
        f.write('\n')

    return jsonify({"message": "Data stored successfully!"})

# Load or create the phishing database file
if not os.path.exists(PHISHING_DB_FILE):
    with open(PHISHING_DB_FILE, "w") as f:
        json.dump({"reported_sites": []}, f)

# Load the trained model (if exists)
try:
    model = pickle.load(open('model/phishing_model.pkl', 'rb'))
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

# Rule-based phishing detection
def is_phishing(url):
    suspicious_keywords = ['secure', 'account', 'update', 'bank', 'login', 'verify', 'payment']
    parsed_url = urlparse(url)

    # 1. Check if domain uses an IP address
    if re.match(r"^\d{1,3}(\.\d{1,3}){3}$", parsed_url.netloc):
        return True

    # 2. Check for HTTP (not HTTPS)
    if parsed_url.scheme != "https":
        return True

    # 3. Check for suspicious keywords in the URL
    for keyword in suspicious_keywords:
        if keyword in parsed_url.netloc or keyword in parsed_url.path:
            return True

    # 4. Check for too many dots (subdomains)
    if parsed_url.netloc.count('.') > 3:
        return True

    # 5. Check for URL shorteners
    url_shorteners = [
        "bit.ly", "tinyurl.com", "goo.gl", "t.co", "is.gd", "buff.ly", "adf.ly",
        "ow.ly", "shorte.st", "cutt.ly", "t.ly", "rb.gy", "mcaf.ee", "soo.gd",
        "rebrand.ly", "bl.ink", "tr.im", "v.gd", "u.to", "linklyhq.com", "clck.ru"
    ]
    if any(shortener in parsed_url.netloc for shortener in url_shorteners):
        return True

    # 6. Check if URL is too long
    if len(url) > 75:
        return True

    return False

# Check if a URL is in the reported phishing list
def is_reported_phishing(url):
    with open(PHISHING_DB_FILE, "r") as f:
        data = json.load(f)
    try:
        return url in data["reported_sites"]
    except:
        return False

@app.route('/api/detect', methods=['POST'])
def detect_phishing():
    data = request.get_json()
    url = data.get('url','')
    page_text = data.get('pageText','')
    
    # Check if URL is in reported database
    phishing_by_report = is_reported_phishing(url)

    # Apply rule-based detection
    phishing_by_rules = is_phishing(url)

    # Check with OpenPhish API
    openphish_result = check_openphish(url)
    
    # AI-based detection (if model is available)
    phishing_by_ai = False
    if model:
        url_feature = np.array([[len(url)]])  # Basic feature extraction
        try:
            phishing_by_ai = model.predict([url_feature])[0]
        except Exception as e:
            print(f"⚠️ AI model error: {e}")
            phishing_by_ai = False

    # Combine all detection methods
    # phishing_detected = phishing_by_report or phishing_by_rules or phishing_by_ai
    # phishing_detected = phishing_by_report or phishing_by_rules or openphish_result

    # return jsonify({'phishing': bool(phishing_detected)})
    phishing_detected = (
        phishing_by_report
        or phishing_by_rules
        or openphish_result
        # or phishing_by_ai
    )

    # Return both the overall flag and the AI-specific flag
    # For now for the AI part we just return False since algorithm is not implemented
    return jsonify({
        'phishing': bool(phishing_detected),
        # 'phishing_by_ai': bool(phishing_by_ai)
        'phishing_by_ai': bool(False)
    })
    return jsonify({'phishing': bool(phishing_detected)})

@app.route('/api/report', methods=['POST'])
def report_phishing():
    """ Allows users to report a phishing website. """
    data = request.get_json()
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

    return jsonify({'message': 'Phishing site reported successfully!', 'url': url})

if __name__ == '__main__':
    app.run(debug=True)
