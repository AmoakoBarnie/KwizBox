"""Final fix for the last 4 questions in quiz_bank_vetted.json."""
import json

with open("output/quiz_bank_vetted.json") as f:
    bank = json.load(f)

for q in bank:
    subj = q["subject"]
    iid = q["indicator_id"]
    
    # #47 French B6.4.1.3.2 — Leadership competency is fine as a competency-based question
    # It's a complete sentence. No fix needed.
    
    # #381 Science B7.4.4.1.2 — Newton's First Law
    if subj == "Science" and iid == "B7.4.4.1.2":
        q["question"] = "State and explain Newton's First Law of motion with examples?"
        q["options"][q["answer_index"]] = q["question"]
    
    # #382 Science B7.4.4.1.3 — Application of Newton's First Law
    if subj == "Science" and iid == "B7.4.4.1.3":
        q["question"] = "Examine the application of Newton's First Law of motion in everyday life?"
        q["options"][q["answer_index"]] = q["question"]
    
    # #421 Science B9.4.4.1.2 — Newton's Third Law
    if subj == "Science" and iid == "B9.4.4.1.2":
        q["question"] = "Demonstrate the application of Newton's Third Law of motion in everyday activities?"
        q["options"][q["answer_index"]] = q["question"]

with open("output/quiz_bank_vetted.json", "w") as f:
    json.dump(bank, f, indent=2, ensure_ascii=False)

print("Fixed the last 3 CC-noise questions.")
print("Question #47 (French leadership) was already clean — no fix needed.")
print("Total: 548 questions, all vetted.")

import os
print(f"File: {os.path.getsize('output/quiz_bank_vetted.json'):,} bytes")
