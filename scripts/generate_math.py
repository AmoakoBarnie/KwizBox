#!/usr/bin/env python3
"""Math Template Question Generator
Generates infinite curriculum-aligned math questions for Ghana B4–B9.
No API key needed — answers are computed, not guessed.
"""

import sqlite3, random, math, os, json
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "backend" / "trivia.db"
random.seed(42)

# ── helpers ───────────────────────────────────────────────────────────────────

def gcd(a, b):
    while b:
        a, b = b, a % b
    return a

def lcm(a, b):
    return a * b // gcd(a, b)

def shuffled_options(correct, distractors, explain=None):
    """Build 4 MCQ options with correct answer at a random position."""
    opts = [correct] + distractors[:3]
    seen = set()
    unique = []
    for o in opts:
        if o not in seen:
            seen.add(o)
            unique.append(o)
    # pad if we somehow got < 4 unique
    while len(unique) < 4:
        pad = random.randint(1, 100)
        if pad not in seen:
            seen.add(pad)
            unique.append(pad)
    opts = unique[:4]
    random.shuffle(opts)
    ans = opts.index(correct)
    letters = ["A", "B", "C", "D"]
    opt_strs = [f"{letters[i]}. {opts[i]}" for i in range(4)]
    return opt_strs, ans

def fmt(n):
    """Format a number: integer if whole, else 2 d.p."""
    if isinstance(n, float) and n == int(n):
        return str(int(n))
    if isinstance(n, float):
        return f"{n:.2f}"
    return str(n)

def qrow(class_level, subject, topic, strand, difficulty,
         question, opts, answer_index, explanation):
    """Return a tuple matching the questions table."""
    return (class_level, subject, topic, strand, difficulty,
            question, opts[0], opts[1], opts[2], opts[3],
            answer_index, explanation, "mcq", None, 1)

# ── TEMPLATES ────────────────────────────────────────────────────────────────
# Each returns (question_str, [4 option strings], answer_index, explanation_str)

def t_addition_easy():
    a, b = random.randint(2, 50), random.randint(2, 50)
    correct = a + b
    distractors = [correct + random.randint(1, 10), correct - random.randint(1, 10),
                   correct + random.randint(11, 20)]
    opts, ans = shuffled_options(correct, distractors)
    explain = f"{a} + {b} = {correct}."
    return f"What is {a} + {b}?", opts, ans, explain

def t_addition_medium():
    a, b, c = random.randint(10, 200), random.randint(10, 200), random.randint(10, 200)
    correct = a + b + c
    distractors = [correct + random.randint(5, 30), correct - random.randint(5, 30),
                   a + b - c]
    opts, ans = shuffled_options(correct, distractors)
    explain = f"{a} + {b} + {c} = {correct}."
    return f"What is {a} + {b} + {c}?", opts, ans, explain

def t_subtraction_easy():
    a = random.randint(10, 50)
    b = random.randint(1, a)
    correct = a - b
    distractors = [correct + random.randint(1, 5), correct - random.randint(1, 5),
                   a + b]
    opts, ans = shuffled_options(correct, distractors)
    explain = f"{a} − {b} = {correct}."
    return f"What is {a} − {b}?", opts, ans, explain

def t_subtraction_medium():
    a = random.randint(50, 500)
    b = random.randint(10, a - 1)
    correct = a - b
    distractors = [correct + random.randint(1, 20), correct - random.randint(1, 20),
                   a + b]
    opts, ans = shuffled_options(correct, distractors)
    explain = f"{a} − {b} = {correct}."
    return f"What is {a} − {b}?", opts, ans, explain

def t_multiplication_easy():
    a, b = random.randint(2, 12), random.randint(2, 12)
    correct = a * b
    distractors = [correct + a, correct - b, a + b]
    opts, ans = shuffled_options(correct, distractors)
    explain = f"{a} × {b} = {correct}."
    return f"What is {a} × {b}?", opts, ans, explain

def t_multiplication_medium():
    a, b = random.randint(3, 20), random.randint(3, 20)
    correct = a * b
    distractors = [correct + random.randint(5, 30), a * (b + 1), (a + 1) * b]
    opts, ans = shuffled_options(correct, distractors)
    explain = f"{a} × {b} = {correct}."
    return f"What is {a} × {b}?", opts, ans, explain

def t_division_easy():
    b = random.randint(2, 12)
    correct = random.randint(2, 12)
    a = b * correct
    distractors = [correct + 1, correct - 1, a + b]
    opts, ans = shuffled_options(correct, distractors)
    explain = f"{a} ÷ {b} = {correct} because {b} × {correct} = {a}."
    return f"What is {a} ÷ {b}?", opts, ans, explain

def t_division_medium():
    b = random.randint(3, 15)
    correct = random.randint(5, 25)
    a = b * correct
    distractors = [correct + random.randint(2, 6), correct - random.randint(1, 4),
                   a - b]
    opts, ans = shuffled_options(correct, distractors)
    explain = f"{a} ÷ {b} = {correct} because {b} × {correct} = {a}."
    return f"What is {a} ÷ {b}?", opts, ans, explain

def t_fraction_simplify():
    # pick a simple fraction that simplifies
    num_base = random.randint(1, 5)
    den_base = random.randint(2, 6)
    mult = random.randint(2, 4)
    num = num_base * mult
    den = den_base * mult
    g = gcd(num, den)
    correct_num = num // g
    correct_den = den // g
    correct = f"{correct_num}/{correct_den}"
    distractors = [f"{num}/{den}", f"{correct_num + 1}/{correct_den}",
                   f"{correct_num}/{correct_den + 1}"]
    opts, ans = shuffled_options(correct, distractors)
    explain = f"The greatest common divisor of {num} and {den} is {g}. So {num}/{den} = {correct}."
    return f"Simplify the fraction {num}/{den}.", opts, ans, explain

def t_fraction_to_decimal():
    den = random.choice([2, 4, 5, 10, 20, 25, 50])
    num = random.randint(1, den - 1)
    correct = num / den
    correct_str = fmt(correct)
    distractors = [fmt(correct + 0.1), fmt(correct - 0.05), fmt(num + den)]
    opts, ans = shuffled_options(correct_str, distractors)
    explain = f"{num}/{den} = {correct_str} because {num} ÷ {den} = {correct_str}."
    return f"What is {num}/{den} as a decimal?", opts, ans, explain

def t_percentage_of():
    pct = random.choice([10, 15, 20, 25, 30, 40, 50, 75])
    total = random.choice([20, 40, 50, 60, 80, 100, 120, 150, 200])
    correct = pct / 100 * total
    correct_str = fmt(correct)
    distractors = [fmt(correct + total * 0.05), fmt(correct - total * 0.05),
                   fmt(correct * 2)]
    opts, ans = shuffled_options(correct_str, distractors)
    explain = f"{pct}% of {total} = ({pct}/100) × {total} = {correct_str}."
    return f"What is {pct}% of {total}?", opts, ans, explain

def t_ratio_share():
    a, b = random.randint(1, 5), random.randint(1, 5)
    total = (a + b) * random.randint(5, 20)
    share_a = total * a / (a + b)
    share_b = total * b / (a + b)
    correct = fmt(share_a)
    distractors = [fmt(share_b), fmt(total - share_a + random.randint(1, 10)),
                   fmt(share_a + random.randint(1, 10))]
    opts, ans = shuffled_options(correct, distractors)
    explain = f"Share {total} in ratio {a}:{b} → total parts = {a}+{b} = {a+b}. One part = {total}/{a+b} = {total/(a+b):.0f}. {a} parts = {a} × {total/(a+b):.0f} = {correct}."
    return f"Share {total} in the ratio {a}:{b}. How much is the smaller share?", opts, ans, explain

def t_algebra_solve():
    # x + a = b  or  ax + b = c
    if random.random() < 0.5:
        a = random.randint(1, 20)
        correct = random.randint(1, 20)
        b = correct + a
        distractors = [correct + 1, correct - 1, b + a]
        opts, ans = shuffled_options(correct, distractors)
        explain = f"x + {a} = {b} → x = {b} − {a} = {correct}."
        return f"If x + {a} = {b}, what is x?", opts, ans, explain
    else:
        a = random.randint(2, 6)
        correct = random.randint(2, 12)
        b = random.randint(1, 10)
        c = a * correct + b
        distractors = [correct + 1, correct - 1, c - b]
        opts, ans = shuffled_options(correct, distractors)
        explain = f"{a}x + {b} = {c} → {a}x = {c} − {b} = {c - b} → x = {c - b}/{a} = {correct}."
        return f"If {a}x + {b} = {c}, what is x?", opts, ans, explain

def t_area_rectangle():
    l = random.randint(3, 20)
    w = random.randint(2, 15)
    correct = l * w
    distractors = [l + w, 2 * (l + w), l * w + random.randint(1, 10)]
    opts, ans = shuffled_options(correct, distractors)
    explain = f"Area of rectangle = length × width = {l} × {w} = {correct} cm²."
    return f"What is the area of a rectangle {l} cm by {w} cm?", opts, ans, explain

def t_perimeter_rectangle():
    l = random.randint(3, 20)
    w = random.randint(2, 15)
    correct = 2 * (l + w)
    distractors = [l * w, l + w, 2 * l + w]
    opts, ans = shuffled_options(correct, distractors)
    explain = f"Perimeter of rectangle = 2 × (length + width) = 2 × ({l} + {w}) = {correct} cm."
    return f"What is the perimeter of a rectangle {l} cm by {w} cm?", opts, ans, explain

def t_area_triangle():
    b = random.randint(4, 20)
    h = random.randint(3, 12)
    correct = 0.5 * b * h
    correct_str = fmt(correct)
    distractors = [fmt(b * h), fmt(correct + 2), fmt(correct - 1)]
    opts, ans = shuffled_options(correct_str, distractors)
    explain = f"Area of triangle = ½ × base × height = ½ × {b} × {h} = {correct_str} cm²."
    return f"A triangle has base {b} cm and height {h} cm. What is its area?", opts, ans, explain

def t_mean():
    nums = sorted(random.sample(range(2, 30), 5))
    correct = sum(nums) / len(nums)
    correct_str = fmt(correct)
    distractors = [fmt(correct + 1), fmt(correct - 1), fmt(sum(nums))]
    opts, ans = shuffled_options(correct_str, distractors)
    nums_str = ", ".join(str(n) for n in nums)
    explain = f"Mean = ({nums_str}) ÷ 5 = {sum(nums)} ÷ 5 = {correct_str}."
    return f"What is the mean of these numbers: {nums_str}?", opts, ans, explain

def t_mode():
    nums = [random.randint(2, 15) for _ in range(3)]
    mode_val = random.choice(nums)
    nums.append(mode_val)
    nums.append(mode_val)
    random.shuffle(nums)
    correct = mode_val
    distractors = [correct + 1, correct - 1, correct + 2]
    opts, ans = shuffled_options(correct, distractors)
    nums_str = ", ".join(str(n) for n in nums)
    explain = f"The mode is the number that appears most often. {correct} appears most frequently in {nums_str}."
    return f"What is the mode of these numbers: {nums_str}?", opts, ans, explain

def t_rounding():
    n = round(random.uniform(10, 100), random.randint(2, 3))
    correct = round(n)
    distractors = [math.ceil(n), math.floor(n), round(n, 1)]
    opts, ans = shuffled_options(correct, distractors)
    explain = f"{n} rounded to the nearest whole number is {correct}."
    return f"Round {n} to the nearest whole number.", opts, ans, explain

def t_angles_shape():
    shapes = [("triangle", 180), ("quadrilateral", 360), ("pentagon", 540),
              ("hexagon", 720), ("octagon", 1080)]
    shape, correct = random.choice(shapes)
    distractors = [correct - 180, correct + 180, correct // 2]
    opts, ans = shuffled_options(correct, distractors)
    explain = f"The sum of interior angles of a {shape} is {correct}°."
    return f"What is the sum of the interior angles of a {shape}?", opts, ans, explain

def t_place_value():
    n = random.randint(1000, 9999)
    pos = random.choice(["thousands", "hundreds", "tens", "units"])
    digits = [int(d) for d in str(n)]
    pos_map = {"thousands": 0, "hundreds": 1, "tens": 2, "units": 3}
    idx = pos_map[pos]
    digit = digits[idx]
    place_val = digit * (10 ** (3 - idx))
    correct = place_val
    distractors = [digit, place_val * 10, place_val + digit]
    opts, ans = shuffled_options(correct, distractors)
    explain = f"In {n}, the digit {digit} is in the {pos} place, so its value is {place_val}."
    return f"What is the value of the digit in the {pos} place in {n}?", opts, ans, explain

def t_pythagoras():
    a = random.randint(3, 12)
    b = random.randint(3, 12)
    c = math.sqrt(a*a + b*b)
    correct = fmt(c)
    distractors = [fmt(a + b), fmt(abs(a - b)), fmt(math.sqrt(a + b))]
    opts, ans = shuffled_options(correct, distractors)
    explain = f"Pythagoras: c² = a² + b² = {a}² + {b}² = {a*a + b*b} → c = √{a*a + b*b} ≈ {correct} cm."
    return f"A right triangle has legs {a} cm and {b} cm. What is the length of the hypotenuse? (to 2 d.p.)", opts, ans, explain

def t_exponent():
    base = random.randint(2, 5)
    exp = random.randint(2, 4)
    correct = base ** exp
    distractors = [base * exp, base + exp, correct + base]
    opts, ans = shuffled_options(correct, distractors)
    explain = f"{base}^{exp} = {correct}."
    return f"What is {base}^{exp}?", opts, ans, explain

def t_speed():
    dist = random.randint(20, 200)
    time = random.randint(1, 5)
    correct = dist / time
    correct_str = fmt(correct)
    distractors = [fmt(dist * time), fmt(dist + time), fmt(dist - time)]
    opts, ans = shuffled_options(correct_str, distractors)
    explain = f"Speed = distance ÷ time = {dist} km ÷ {time} h = {correct_str} km/h."
    return f"A car travels {dist} km in {time} hours. What is its average speed?", opts, ans, explain

def t_money_total():
    items = random.randint(2, 4)
    prices = [random.choice([1, 2, 3, 5, 10, 15, 20]) for _ in range(items)]
    correct = sum(prices)
    distractors = [correct + random.randint(1, 5), correct - 1, max(prices)]
    opts, ans = shuffled_options(correct, distractors)
    item_str = " + ".join(f"GHS {p}" for p in prices)
    explain = f"Total = {item_str} = GHS {correct}."
    return f"Add these amounts: {item_str}.", opts, ans, explain

def t_time_minutes():
    hours = random.randint(1, 4)
    mins = random.choice([15, 30, 45])
    correct = hours * 60 + mins
    distractors = [hours * 60, hours * 60 + 30, hours + mins]
    opts, ans = shuffled_options(correct, distractors)
    explain = f"{hours} hours = {hours * 60} minutes. {hours * 60} + {mins} = {correct} minutes."
    return f"How many minutes are there in {hours} hours {mins} minutes?", opts, ans, explain

# ── TOPIC → TEMPLATES MAP ────────────────────────────────────────────────────
# Each (class, topic, strand, difficulty) maps to a list of template functions

TOPIC_MAP = {
    "Addition":        [t_addition_easy, t_addition_medium],
    "Subtraction":     [t_subtraction_easy, t_subtraction_medium],
    "Multiplication":  [t_multiplication_easy, t_multiplication_medium],
    "Division":        [t_division_easy, t_division_medium],
    "Fractions":       [t_fraction_simplify, t_fraction_to_decimal],
    "Percentages":     [t_percentage_of],
    "Ratio":           [t_ratio_share],
    "Algebra":         [t_algebra_solve],
    "Geometry":        [t_area_rectangle, t_perimeter_rectangle, t_area_triangle, t_angles_shape],
    "Measurement":     [t_speed, t_time_minutes, t_money_total],
    "Statistics":      [t_mean, t_mode, t_rounding],
    "Exponents":       [t_exponent],
    "Pythagoras":      [t_pythagoras],
    "Number":          [t_place_value, t_rounding, t_addition_easy, t_multiplication_easy],
    "Data":            [t_mean, t_mode],
    "Money":           [t_money_total],
    "Time":            [t_time_minutes],
}

# ── CLASS TOPIC RANGES (which topics appear at which class level) ────────────
CLASS_TOPICS = {
    "B4": ["Addition", "Subtraction", "Multiplication", "Number", "Measurement", "Time", "Money", "Data", "Geometry"],
    "B5": ["Addition", "Subtraction", "Multiplication", "Division", "Fractions", "Number", "Measurement", "Geometry", "Data", "Statistics"],
    "B6": ["Addition", "Subtraction", "Multiplication", "Division", "Fractions", "Percentages", "Ratio", "Algebra", "Geometry", "Measurement", "Data", "Statistics"],
    "B7": ["Fractions", "Percentages", "Ratio", "Algebra", "Geometry", "Measurement", "Statistics", "Exponents", "Number", "Data"],
    "B8": ["Algebra", "Geometry", "Percentages", "Ratio", "Exponents", "Pythagoras", "Statistics", "Measurement", "Data"],
    "B9": ["Algebra", "Geometry", "Trigonometry", "Exponents", "Pythagoras", "Statistics", "Data", "Ratio"],
}

# For topics not explicitly mapped, fall back to a generic arithmetic pool
FALLBACK_TOPICS = ["Addition", "Subtraction", "Multiplication", "Division", "Number"]

def generate_questions(target_per_topic=10, max_questions=5000):
    """Generate math questions for thin topics and insert into the DB."""
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row

    # Find thin math topics (< target_per_topic questions)
    gaps = db.execute("""
        SELECT class_level, topic, strand, COUNT(*) as n
        FROM questions
        WHERE subject = 'Mathematics' AND is_active = 1
        GROUP BY class_level, topic, strand
        HAVING COUNT(*) < ?
        ORDER BY COUNT(*) ASC
    """, (target_per_topic,)).fetchall()

    print(f"Found {len(gaps)} math topics with < {target_per_topic} questions each")

    generated = 0
    seen_questions = set()  # avoid duplicates within this run

    for gap in gaps:
        cls = gap["class_level"]
        topic = gap["topic"]
        strand = gap["strand"]
        current_n = gap["n"]
        need = target_per_topic - current_n

        if need <= 0:
            continue

        # Find matching templates
        templates = TOPIC_MAP.get(topic)
        if not templates:
            # Try partial match
            for key in TOPIC_MAP:
                if key.lower() in topic.lower() or topic.lower() in key.lower():
                    templates = TOPIC_MAP[key]
                    break
        if not templates:
            templates = TOPIC_MAP.get("Number", [t_addition_easy])

        print(f"  {cls} | {topic} [{strand}]: have {current_n}, need {need} more")

        attempts = 0
        max_attempts = need * 10
        while need > 0 and attempts < max_attempts:
            attempts += 1
            tpl = random.choice(templates)
            try:
                q_text, opts, ans_idx, explain = tpl()
            except Exception as e:
                continue

            # Skip duplicates
            if q_text in seen_questions:
                continue

            # Validate: all options present, answer_index valid
            if len(opts) != 4 or ans_idx < 0 or ans_idx > 3:
                continue
            if ans_idx >= len(opts):
                continue

            seen_questions.add(q_text)
            need -= 1
            generated += 1

            db.execute("""
                INSERT INTO questions
                (class_level, subject, topic, strand, difficulty,
                 question, option_a, option_b, option_c, option_d,
                 answer_index, explanation, question_type, image_url, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'mcq', NULL, 1)
            """, (cls, "Mathematics", topic, strand, "Medium",
                  q_text, opts[0], opts[1], opts[2], opts[3],
                  ans_idx, explain))

            if generated >= max_questions:
                break

        if generated >= max_questions:
            break

    db.commit()

    # Final count
    total_math = db.execute("SELECT COUNT(*) FROM questions WHERE subject='Mathematics'").fetchone()[0]
    print(f"\nGenerated {generated} new math questions")
    print(f"Total math questions: {total_math}")

    # Show updated thin topics
    thin = db.execute("""
        SELECT class_level, topic, COUNT(*) as n
        FROM questions WHERE subject='Mathematics'
        GROUP BY class_level, topic HAVING n < 5
    """).fetchall()
    print(f"Topics still thin (< 5): {len(thin)}")

    db.close()

if __name__ == "__main__":
    generate_questions(target_per_topic=10)
