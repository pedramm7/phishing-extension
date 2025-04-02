from preprocess_data import remove_html,remove_links
import torch
from model import BERT_Arch
from transformers import AutoModel,BertTokenizerFast
import numpy as np




def evaluate(data,device):
    bert = AutoModel.from_pretrained('bert-base-uncased')
    data = [data]
    for param in bert.parameters():
        param.requires_grad = False

    model = BERT_Arch(bert)

    map_location = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model.load_state_dict(torch.load("/content/model.pth", weights_only=True,map_location=map_location))
    model = model.to(device)
    data = [remove_html(i) for i in data]
    data = [remove_links(i) for i in data]

    tokenizer = BertTokenizerFast.from_pretrained('bert-base-uncased')
    tokenized = tokenizer.batch_encode_plus(data,
                                            max_length = 25,
                                            pad_to_max_length=True,
                                            truncation=True
                                            )
    tokenized_seq = torch.tensor(tokenized['input_ids'])
    tokenized_mask = torch.tensor(tokenized['attention_mask'])

    with torch.no_grad():
        preds = model(tokenized_seq.to(device), tokenized_mask.to(device))
        preds = preds.detach().cpu().numpy()
    pred = np.argmax(preds, axis = 1)
    return pred