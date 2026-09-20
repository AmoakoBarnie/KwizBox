import sqlite3, json, os
db = r"C:\Users\Amoako\ghana-stem-trivia\backend\trivia.db"
c = sqlite3.connect(db)
print("tables:", c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall())
print("---schema---")
for row in c.execute("SELECT sql FROM sqlite_master WHERE type='table'"):
    print(row[0])
    print()
print("---columns questions if exists---")
try:
    print(c.execute("PRAGMA table_info(questions)").fetchall())
except Exception as e:
    print(e)
