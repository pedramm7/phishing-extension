import gdown
import torch
from fastapi import FastAPI
from transformers import AutoModel, BertTokenizerFast
from pydantic import BaseModel
from model import BERT_Arch
from preprocess_data import remove_html,remove_links

class TextRequest(BaseModel):
    text: str

# Download model from Google Drive
#link:https://drive.google.com/drive/folders/102UPd446eHCCENR58EC3UxnJfcYkBa8U?usp=sharing
model_url = "https://drive.google.com/uc?id=16ZWVa0d2V0T3s11Oq86rLOTA6bOR0DnR"
model_path = "model.pth"
gdown.download(model_url, model_path, quiet=False)

# Load pre-trained BERT model
bert = AutoModel.from_pretrained("bert-base-uncased")
for param in bert.parameters():
    param.requires_grad = False

# Set device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Load custom model
model = BERT_Arch(bert)
model.load_state_dict(torch.load(model_path, map_location=device))
model.to(device)
model.eval()

# Load tokenizer
tokenizer = BertTokenizerFast.from_pretrained("bert-base-uncased")

# Initialize FastAPI
app = FastAPI()

@app.get("/")
def home():
    return {"message": "Phishing Detection API is running!"}

@app.post("/predict/")
def predict(request: TextRequest):
    try:
        text = request.text.strip()

        # Preprocess text
        text = remove_html(text)
        text = remove_links(text)

        # Tokenize input text
        tokens = tokenizer(
            text, return_tensors="pt", truncation=True, padding="max_length", max_length=512
        )
        
        input_ids = tokens["input_ids"].to(device)
        attention_mask = tokens["attention_mask"].to(device)

        # Perform inference
        with torch.no_grad():
            output = model(input_ids, attention_mask)

        prediction = torch.argmax(output.cpu(), dim=1).item()
        
        return {"prediction": "Phishing" if prediction == 1 else "Not Phishing"}

    except Exception as e:
        return {"error": str(e)}
