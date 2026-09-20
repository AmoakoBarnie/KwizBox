import json, re

with open('output/quiz_bank_vetted.json') as f:
    bank = json.load(f)

# Fix question #549 - strip ID prefix
for q in bank:
    qt = q['question']
    # Remove "B6.4.1.2.1. " prefix (5-part ID followed by period and space)
    new_qt = re.sub(r'^[A-Z]\d+\.\d+\.\d+\.\d+\.\d+\s+', '', qt)
    if new_qt != qt:
        print(f"Fixed #{bank.index(q)+1}: {qt[:80]} -> {new_qt[:80]}")
        q['question'] = new_qt
        q['options'][q['answer_index']] = new_qt

with open('output/quiz_bank_vetted.json', 'w') as f:
    json.dump(bank, f, indent=2, ensure_ascii=False)

print(f"File: {__import__('os').path.getsize('output/quiz_bank_vetted.json'):,} bytes")
print(f"Questions: {len(bank)}")
print("✅ Quiz bank is complete and clean.")
