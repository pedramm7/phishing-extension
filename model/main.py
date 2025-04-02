from preprocess_data import preprocess
from load_data import load_dataset_
from model import BERT_Arch

import pandas as pd
import numpy as np
import torch
from torch.utils.data import TensorDataset, DataLoader, RandomSampler, SequentialSampler
from torch import nn
from torch.optim import AdamW
from sklearn.utils.class_weight import compute_class_weight



from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from imblearn.under_sampling import RandomUnderSampler


device = torch.device("cuda" if torch.cuda.is_available() else 'cpu')

import transformers
from transformers import AutoModel, BertTokenizerFast
from transformers import AutoTokenizer

# texts, labels = preprocess()

dataset = load_dataset_()

texts,labels = preprocess(dataset)

df = pd.DataFrame({"texts":texts, "labels":labels})
df = df.iloc[:-40000][["texts","labels"]]

rus = RandomUnderSampler(random_state=42)
X_res, y_res = rus.fit_resample(pd.DataFrame(df['texts']), pd.DataFrame(df['labels']))

train_text, temp_text, train_labels, temp_labels = train_test_split(X_res,y_res,
                                                                    random_state=2018,
                                                                    test_size=0.3,
                                                                    stratify=y_res)


val_text, test_text, val_labels, test_labels = train_test_split(temp_text, temp_labels,
                                                                random_state=2018,
                                                                test_size=0.5,
                                                                stratify=temp_labels)

bert = AutoModel.from_pretrained('bert-base-uncased')

tokenizer = BertTokenizerFast.from_pretrained('bert-base-uncased')

tokens_train = tokenizer.batch_encode_plus(
    train_text['texts'].tolist(),
    max_length = 25,
    pad_to_max_length=True,
    truncation=True
)

tokens_val = tokenizer.batch_encode_plus(
    val_text['texts'].tolist(),
    max_length = 25,
    pad_to_max_length=True,
    truncation=True
)

tokens_test = tokenizer.batch_encode_plus(
    test_text['texts'].tolist(),
    max_length = 25,
    pad_to_max_length=True,
    truncation=True
)

train_seq = torch.tensor(tokens_train['input_ids'])
train_mask = torch.tensor(tokens_train['attention_mask'])
train_y = torch.tensor(train_labels['labels'].tolist())

val_seq = torch.tensor(tokens_val['input_ids'])
val_mask = torch.tensor(tokens_val['attention_mask'])
val_y = torch.tensor(val_labels['labels'].tolist())

test_seq = torch.tensor(tokens_test['input_ids'])
test_mask = torch.tensor(tokens_test['attention_mask'])
test_y = torch.tensor(test_labels['labels'].tolist())

batch_size = 32

train_data = TensorDataset(train_seq, train_mask, train_y)

train_sampler = RandomSampler(train_data)

train_dataloader = DataLoader(train_data, sampler=train_sampler, batch_size=batch_size)

val_data = TensorDataset(val_seq, val_mask, val_y)

val_sampler = SequentialSampler(val_data)

val_dataloader = DataLoader(val_data, sampler = val_sampler, batch_size=batch_size)

for param in bert.parameters():
    param.requires_grad = False

model = BERT_Arch(bert)

model = model.to(device)


optimizer = AdamW(model.parameters(),lr = 1e-5)

class_weights = compute_class_weight("balanced",classes = np.unique(train_labels),y =train_labels['labels'] )

weights= torch.tensor(class_weights,dtype=torch.float)

weights = weights.to(device)

cross_entropy  = nn.NLLLoss(weight=weights)

epochs = 10

def train():

    model.train()
    total_loss, total_accuracy = 0, 0

    total_preds=[]

    for step,batch in enumerate(train_dataloader):

        if step % 50 == 0 and not step == 0:
            print('  Batch {:>5,}  of  {:>5,}.'.format(step, len(train_dataloader)))

        batch = [r.to(device) for r in batch]

        sent_id, mask, labels = batch

        model.zero_grad()

        preds = model(sent_id, mask)

        loss = cross_entropy(preds, labels)

        total_loss = total_loss + loss.item()

        loss.backward()

        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)

        optimizer.step()

        preds=preds.detach().cpu().numpy()

    total_preds.append(preds)

    avg_loss = total_loss / len(train_dataloader)

    total_preds  = np.concatenate(total_preds, axis=0)

    return avg_loss, total_preds

def evaluate():

    print("\nEvaluating...")

    model.eval()

    total_loss, total_accuracy = 0, 0

    total_preds = []

    for step,batch in enumerate(val_dataloader):


        batch = [t.to(device) for t in batch]

        sent_id, mask, labels = batch

        with torch.no_grad():

            preds = model(sent_id, mask)

            loss = cross_entropy(preds,labels)

            total_loss = total_loss + loss.item()

            preds = preds.detach().cpu().numpy()

            total_preds.append(preds)

    avg_loss = total_loss / len(val_dataloader)

    total_preds  = np.concatenate(total_preds, axis=0)

    return avg_loss, total_preds

best_valid_loss = float('inf')

epochs = 50

train_losses=[]
valid_losses=[]

for epoch in range(epochs):

    print('\n Epoch {:} / {:}'.format(epoch + 1, epochs))

    train_loss, _ = train()

    valid_loss, _ = evaluate()

    if valid_loss < best_valid_loss:
        best_valid_loss = valid_loss
        torch.save(model.state_dict(), 'saved_weights.pt')

    train_losses.append(train_loss)
    valid_losses.append(valid_loss)

    print(f'\nTraining Loss: {train_loss:.3f}')
    print(f'Validation Loss: {valid_loss:.3f}')

# get predictions for test data
with torch.no_grad():
    preds = model(test_seq.to(device), test_mask.to(device))
    preds = preds.detach().cpu().numpy()


# model's performance
preds = np.argmax(preds, axis = 1)
print(classification_report(test_y, preds))

torch.save(model.state_dict(),'model.pth')