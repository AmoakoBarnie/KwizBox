import requests, json
from collections import Counter

r = requests.post('http://localhost:8001/admin/token', json={'username':'admin','password':'Admin@1234'}, timeout=5)
token = r.json()['access_token']
print(f"Logged in, token: {token[:30]}...")

# Count questions
r2 = requests.get('http://localhost:8001/admin/questions?limit=1000', headers={'Authorization': f'Bearer {token}'}, timeout=10)
qs = r2.json()
print(f"Total questions in DB: {len(qs)}")
print(Counter(q['subject'] for q in qs))
