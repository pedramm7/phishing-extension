import pickle
from sklearn.dummy import DummyClassifier

# Create a dummy classifier (random predictions)
dummy_model = DummyClassifier(strategy="uniform")  # Randomly classifies phishing or not
dummy_model.fit([[0], [1]], [0, 1])  # Fake training data

# Save the dummy model
with open('model/phishing_model.pkl', 'wb') as file:
    pickle.dump(dummy_model, file)

print("Dummy phishing model saved successfully!")
