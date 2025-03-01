import pickle
from sklearn.ensemble import RandomForestClassifier

# Load your dataset
# X, y = ...

# Train the model
model = RandomForestClassifier(n_estimators=100)
model.fit(X, y)

# Save the model
with open('phishing_model.pkl', 'wb') as file:
    pickle.dump(model, file)
