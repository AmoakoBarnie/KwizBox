import json, re

IN = r"C:\Users\Amoako\ghana-stem-trivia\scripts\incoming_100.json"
data = json.load(open(IN, encoding="utf-8"))

INCONSISTENCY_KW = [
    "doesn't match", "does not match", "inconsistent", "i think there's an error",
    "let me reconsider", "hmm", "schema says", "i'll set answer", "set answer to",
    "no valid", "none work", "error in my setup", "could be wrong",
]

def is_consistent(q):
    """answer letter matches answer_index matches options length."""
    opts = q["options"]
    ai = q["answer_index"]
    letter = q["answer"]
    if q.get("question_type") == "true_false":
        exp = "AB"
    else:
        exp = "ABCD"
    if ai is None or ai < 0 or ai >= len(opts):
        return False, f"answer_index {ai} out of range (opts={len(opts)})"
    if letter != exp[ai]:
        return False, f"letter {letter} != index {ai} ({exp[ai]})"
    if any(not str(o).strip() for o in opts):
        return False, "empty option slot"
    return True, ""

def has_inconsistency_text(q):
    e = q.get("explanation", "").lower()
    hits = [k for k in INCONSISTENCY_KW if k in e]
    return hits

def recompute(q):
    """Return (ok, note) for arithmetic we can verify programmatically."""
    qid = q["id"]; subj = q["subject"]; opts = q["options"]; ai = q["answer_index"]
    qtext = q["question"]
    try:
        if subj == "Mathematics":
            # fractions word problem: "3/4 of a number is 18"
            m = re.search(r"(\d+)/(\d+)\s+of\s+a\s+number\s+is\s+(\d+)", qtext)
            if m and "what is" in qtext and "of that number" in qtext:
                a, b, val = int(m.group(1)), int(m.group(2)), int(m.group(3))
                n = val * b // a
                m2 = re.search(r"what is (\d+)/(\d+)\s+of\s+that\s+number", qtext)
                if m2:
                    c, d = int(m2.group(1)), int(m2.group(2))
                    correct = n * c // d
                    if opts[ai] != str(correct):
                        return False, f"frac: expected {correct}, got {opts[ai]}"
            # simple multiplication a × b
            m = re.search(r"What is (\d+)\s*[×x]\s*(\d+)\??$", qtext)
            if m:
                correct = int(m.group(1)) * int(m.group(2))
                if opts[ai] != str(correct):
                    return False, f"mul: expected {correct}, got {opts[ai]}"
            # division
            m = re.search(r"What is (\d+)\s*÷\s*(\d+)", qtext)
            if m:
                correct = int(m.group(1)) // int(m.group(2))
                if opts[ai] != str(correct):
                    return False, f"div: expected {correct}, got {opts[ai]}"
            # addition
            m = re.search(r"What is (\d+)\s*\+\s*(\d+)", qtext)
            if m and "×" not in qtext:
                correct = int(m.group(1)) + int(m.group(2))
                if opts[ai] != str(correct):
                    return False, f"add: expected {correct}, got {opts[ai]}"
            # subtraction
            m = re.search(r"What is (\d+)\s*-\s*(\d+)", qtext)
            if m:
                correct = int(m.group(1)) - int(m.group(2))
                if opts[ai] != str(correct):
                    return False, f"sub: expected {correct}, got {opts[ai]}"
            # percentage profit: buys X sells Y profit %
            m = re.search(r"buys an item for (\d+).*sells it for (\d+).*profit percentage", qtext, re.S)
            if m:
                cost, sell = int(m.group(1)), int(m.group(2))
                correct = (sell - cost) * 100 // cost
                if opts[ai] != f"{correct}%":
                    return False, f"profit%: expected {correct}%, got {opts[ai]}"
            # percentage increase from X to Y
            m = re.search(r"increases from (\d+).*to (\d+).*percentage increase", qtext, re.S)
            if m:
                a, b = int(m.group(1)), int(m.group(2))
                correct = (b - a) * 100 // a
                if opts[ai] != f"{correct}%":
                    return False, f"inc%: expected {correct}%, got {opts[ai]}"
            # ratio flour:sugar = p:q, flour = F -> sugar
            m = re.search(r"ratio.*?(\d+):(\d+).*?(\d+)\w*\s+of\s+(\w+)\s+is\s+used", qtext, re.S)
            if m and ("sugar" in qtext.lower()):
                p, q, flour, _ = int(m.group(1)), int(m.group(2)), int(m.group(3)), m.group(4)
                if flour % p == 0:
                    correct = flour // p * q
                    # match option like "112g"
                    matches = [o for o in opts if o.startswith(str(correct))]
                    if matches and opts[ai] != matches[0]:
                        return False, f"ratio: expected {matches[0]}, got {opts[ai]}"
            # 2^n
            m = re.search(r"What is 2\^(\d+)", qtext)
            if m:
                correct = 2 ** int(m.group(1))
                if opts[ai] != str(correct):
                    return False, f"pow2: expected {correct}, got {opts[ai]}"
            # log10
            m = re.search(r"log.*?\((\d+)\)", qtext)
            if m and "log" in qtext.lower():
                v = int(m.group(1))
                import math
                correct = round(math.log10(v))
                if opts[ai] != str(correct):
                    return False, f"log10: expected {correct}, got {opts[ai]}"
            # area rectangle l x w
            m = re.search(r"length (\d+).*width (\d+).*area", qtext, re.S)
            if m:
                correct = int(m.group(1)) * int(m.group(2))
                if opts[ai] != f"{correct} m²":
                    return False, f"area: expected {correct} m², got {opts[ai]}"
            # perimeter rectangle l x w
            m = re.search(r"length (\d+).*width (\d+).*perimeter", qtext, re.S)
            if m:
                correct = 2 * (int(m.group(1)) + int(m.group(2)))
                if opts[ai] != f"{correct}m":
                    return False, f"perim: expected {correct}m, got {opts[ai]}"
            # volume box a x b x c
            m = re.search(r"dimensions (\d+)cm.*?(\d+)cm.*?(\d+)cm.*volume", qtext, re.S)
            if m:
                correct = int(m.group(1)) * int(m.group(2)) * int(m.group(3))
                if opts[ai] != f"{correct} cm³":
                    return False, f"vol: expected {correct} cm³, got {opts[ai]}"
            # meters to cm
            m = re.search(r"(\d+\.?\d*)\s*meters.*centimeters", qtext)
            if m:
                correct = int(float(m.group(1)) * 100)
                if opts[ai] != str(correct):
                    return False, f"m->cm: expected {correct}, got {opts[ai]}"
            # hours in N days
            m = re.search(r"(\d+)\s*days.*hours", qtext)
            if m:
                correct = int(m.group(1)) * 24
                if opts[ai] != str(correct):
                    return False, f"days->hrs: expected {correct}, got {opts[ai]}"
            # 1/2 + 1/3 style
            m = re.search(r"What is (\d+)/(\d+)\s*\+\s*(\d+)/(\d+)", qtext)
            if m:
                from fractions import Fraction
                f = Fraction(int(m.group(1)), int(m.group(2))) + Fraction(int(m.group(3)), int(m.group(4)))
                if opts[ai] != str(f):
                    return False, f"fracadd: expected {f}, got {opts[ai]}"
            # sum of roots x^2 - Sx + P
            m = re.search(r"sum of the roots of.*?x.2\s*-\s*(\d+)x\s*\+\s*(\d+)", qtext, re.S)
            if m:
                correct = int(m.group(1))
                if opts[ai] != str(correct):
                    return False, f"sumroots: expected {correct}, got {opts[ai]}"
            # circumference d=10 pi=3.14
            m = re.search(r"circumference.*diameter (\d+)cm", qtext, re.S)
            if m:
                correct = round(3.14 * int(m.group(1)), 2)
                if opts[ai] != f"{correct}cm":
                    return False, f"circ: expected {correct}cm, got {opts[ai]}"
            # average speed dist/time
            m = re.search(r"travels (\d+)\s*km.*?(\d+)\s*hours.*average speed", qtext, re.S)
            if m:
                correct = int(m.group(1)) // int(m.group(2))
                if opts[ai] != f"{correct} km/h":
                    return False, f"speed: expected {correct} km/h, got {opts[ai]}"
            # simultaneous x+y / x-y
            m = re.search(r"x \+ y = (\d+).*x - y = (\d+).*what is x", qtext, re.S)
            if m:
                s, d = int(m.group(1)), int(m.group(2))
                x = (s + d) // 2
                if opts[ai] != str(x):
                    return False, f"simx: expected {x}, got {opts[ai]}"
            # GCF
            m = re.search(r"greatest common factor.*?(\d+).*?(\d+)", qtext, re.S)
            if m:
                import math
                correct = math.gcd(int(m.group(1)), int(m.group(2)))
                if opts[ai] != str(correct):
                    return False, f"gcf: expected {correct}, got {opts[ai]}"
            # binary of N
            m = re.search(r"What is (\d+) in binary", qtext)
            if m:
                correct = bin(int(m.group(1)))[2:]
                if opts[ai] != correct:
                    return False, f"bin: expected {correct}, got {opts[ai]}"
    except Exception as ex:
        return None, f"recompute error: {ex}"
    return None, ""

broken = []
clean = []
for q in data:
    reasons = []
    ok, note = is_consistent(q)
    if not ok:
        reasons.append("CONSISTENCY: " + note)
    hits = has_inconsistency_text(q)
    if hits:
        reasons.append("TEXT-ADMITS-ERROR: " + ", ".join(hits))
    ok2, note2 = recompute(q)
    if ok2 is False:
        reasons.append("MATH: " + note2)
    if reasons:
        broken.append((q["id"], reasons))
    else:
        clean.append(q)

print("TOTAL:", len(data))
print("BROKEN:", len(broken))
for qid, r in broken:
    print(f"  id={qid}: {r}")
print("CLEAN:", len(clean))
print("Clean ids:", [q['id'] for q in clean])
