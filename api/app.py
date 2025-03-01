from flask import Flask, request, jsonify
import pickle

app = Flask(__name__)

# Load the trained model
model = pickle.load(open('model/phishing_model.pkl', 'rb'))

@app.route('/api/detect', methods=['POST'])
def detect_phishing():
    data = request.get_json()
    url = data.get('url')
    
    # Here you'd add the code to extract features from the URL and make predictions
    prediction = model.predict([url])[0]
    
    return jsonify({'phishing': bool(prediction)})

if __name__ == '__main__':
    app.run(debug=True)
