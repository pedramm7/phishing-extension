# phishing-extension
Advanced Software Technology course project

This Chrome extension detects phishing websites in real-time using an AI-based detection model.

## Features
- Real-time phishing detection
- Alerts users of suspicious websites
- Easy-to-use popup interface

## Installation
1. Clone the repository:
    ```bash
    git clone https://github.com/pedramm7/phishing-extension.git
    ```
2. Navigate to the project directory:
    ```bash
    cd phishing-extension
    ```
3. Install the backend dependencies:
    ```bash
    pip install -r api/requirements.txt
    ```
4. Run the backend server:
    ```bash
    python api/app.py
    ```
5. Load the extension in Chrome:
    - Go to `chrome://extensions/`
    - Enable "Developer mode"
    - Click "Load unpacked"
    - Select the project directory

## Usage
1. Click the extension icon in the Chrome toolbar.
2. Click "Scan Again" to scan the current website for phishing.

## Development
- Modify the source code as needed.
- Write and run tests to ensure the extension works as expected.
- Update the documentation in the `docs/` directory.

## License
This project is licensed under the MIT License.
