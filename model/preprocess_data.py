from load_data import load_dataset_
from bs4 import BeautifulSoup as bs4
import re

def remove_html(text):
    if text is None:
      return None
    if "<" not in text and ">" not in text:
        return text

    # Otherwise, parse and clean the HTML
    soup = bs4(text, "html.parser")
    return soup.get_text()

def remove_links(text):

    if text is None:
      return None
    pattern = r'https?://\S+|www\.\S+'
    clean_text = re.sub(pattern, '', text).lower().strip()
    return clean_text

def preprocess(dataset):

   texts, labels = zip(*[
    (remove_links(remove_html(i['text'])).lower().strip(), i['label'])
    for i in dataset['train']
    if i and i.get('text') and remove_links(remove_html(i['text'])).strip()
    ])
   return texts, labels