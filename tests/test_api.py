import unittest
from app import app

class APITestCase(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_phishing_detection(self):
        response = self.app.post('/api/detect', json={'url': 'http://example.com'})
        data = response.get_json()
        self.assertIn('phishing', data)

if __name__ == '__main__':
    unittest.main()
