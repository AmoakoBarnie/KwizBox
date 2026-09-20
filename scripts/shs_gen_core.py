#!/usr/bin/env python3
"""Core SHS question generation — parameterized, curriculum-aligned.
Usage: python3 shs_gen_core.py <subject> <level> <topic> <count>
Writes to /tmp/shs_<subject>_<level>_<topic_slug>.json
All lambdas return lists of raw dicts with 'correct'/'wrong' keys.
generate() applies _shuffle_opts to each dict.
"""
import json, os, re, random, sys, hashlib

def _seed():
    if len(sys.argv) >= 4:
        random.seed(hashlib.md5(f"{sys.argv[1]}|{sys.argv[2]}|{sys.argv[3]}".encode()).hexdigest())
    else:
        random.seed(42)

_seed()

LEVEL, SUBJECT = (sys.argv[2], sys.argv[1]) if len(sys.argv) >= 3 else ("SHS 1", "Mathematics")

ELEMENTS = [("Hydrogen",1,1),("Helium",2,2),("Lithium",3,4),("Beryllium",4,5),("Boron",5,6),("Carbon",6,6),("Nitrogen",7,8),("Oxygen",8,8),("Fluorine",9,10),("Neon",10,10),("Sodium",11,12),("Magnesium",12,12),("Aluminium",13,14),("Silicon",14,14),("Phosphorus",15,16),("Sulfur",16,16),("Chlorine",17,18),("Argon",18,18),("Potassium",19,20),("Calcium",20,20)]
ORGANELLES = [("Mitochondria","energy production","ATP"),("Ribosome","protein synthesis","proteins"),("Nucleus","genetic material storage","DNA"),("Golgi apparatus","packaging and secretion","proteins"),("Endoplasmic reticulum","transport","proteins"),("Lysosome","digestion","enzymes"),("Chloroplast","photosynthesis","glucose"),("Vacuole","storage","water"),("Cell membrane","selective permeability","nutrients"),("Cytoplasm","chemical reactions","enzymes")]
DEVICES = [("keyboard","input","typing data into the computer"),("mouse","input","pointing and clicking"),("monitor","output","displaying visual information"),("printer","output","producing hard copies"),("speaker","output","producing sound"),("microphone","input","recording sound"),("scanner","input","converting physical documents to digital"),("webcam","input","capturing video")]
GRAMMAR = [("The cat sat on the mat","cat","noun"),("She runs quickly every morning","quickly","adverb"),("They are playing football","playing","verb"),("The book is on the table","book","noun"),("He speaks English fluently","fluently","adverb"),("The children are happy","happy","adjective"),("We went to the market yesterday","went","verb"),("The sun rises in the east","rises","verb"),("She is a beautiful singer","beautiful","adjective"),("The dog barked loudly","loudly","adverb")]
SHAPES = [("triangle",3,180),("quadrilateral",4,360),("pentagon",5,540),("hexagon",6,720),("heptagon",7,900),("octagon",8,1080)]

def _other_org(org, idx):
    others = [o for o, _, _ in ORGANELLES if o != org]
    return others[idx % len(others)]

def _other_dev(dev, idx):
    others = [d for d, _, _ in DEVICES if d != dev]
    return others[idx % len(others)]

def _other_pos(pos, idx):
    others = [p for p in ["verb","adjective","adverb","preposition"] if p != pos]
    return others[idx % len(others)]

def _other(items, item, idx):
    others = [x for x in items if x != item]
    return others[idx % len(others)]

def _shuffle_opts(q_dict):
    """Take a dict with 'correct' and 'wrong' keys, shuffle into 4 options."""
    opts = [q_dict["correct"]] + q_dict["wrong"][:3]
    seen = set()
    unique_opts = []
    for o in opts:
        key = str(o).strip().lower()
        if key not in seen:
            seen.add(key)
            unique_opts.append(o)
    i = 1
    while len(unique_opts) < 4:
        candidate = f"{q_dict['correct']} (alt {i})"
        if str(candidate).strip().lower() not in seen:
            seen.add(str(candidate).strip().lower())
            unique_opts.append(candidate)
        i += 1
    random.shuffle(unique_opts)
    ans = unique_opts.index(q_dict["correct"])
    return {
        "class_level": q_dict["class_level"], "subject": q_dict["subject"],
        "topic": q_dict["topic"], "sub_topic": q_dict["sub_topic"],
        "strand": q_dict["strand"], "difficulty": q_dict["difficulty"],
        "question": q_dict["question"],
        "option_a": unique_opts[0], "option_b": unique_opts[1],
        "option_c": unique_opts[2], "option_d": unique_opts[3],
        "answer_index": ans,
        "explanation": q_dict["explanation"],
        "question_type": q_dict["question_type"],
        "image_url": q_dict["image_url"], "is_active": q_dict["is_active"],
    }


def _params(n, kind):
    if kind == "algebra":
        out = []
        for a in range(2, 30):
            for b in range(1, 50):
                for c in range(b+2, 80):
                    if (c-b) % a == 0 and (c-b)//a > 0 and len(set([a,b,c,(c-b)//a])) >= 3:
                        out.append((a, b, c))
                        if len(out) >= n:
                            return out
        return out
    if kind == "geometry":
        out = []
        for s, sides, total in SHAPES:
            for ang in range(30, 170, 10):
                if total - ang > 0:
                    out.append((s, sides, total, ang))
                    if len(out) >= n:
                        return out
        return out
    if kind == "mechanics":
        out = []
        for m in range(1, 30):
            for f in range(m, 100, m):
                if f % m == 0 and f//m > 0:
                    out.append((m, f))
                    if len(out) >= n:
                        return out
        return out
    if kind == "elements":
        return [ELEMENTS[i % len(ELEMENTS)] for i in range(n)]
    if kind == "organelles":
        return [ORGANELLES[i % len(ORGANELLES)] for i in range(n)]
    if kind == "devices":
        return [DEVICES[i % len(DEVICES)] for i in range(n)]
    if kind == "grammar":
        return [GRAMMAR[i % len(GRAMMAR)] for i in range(n)]
    return []


TOPIC_GENERATORS = {
    ("Mathematics", "Algebra"): lambda n: [{
            "class_level": LEVEL, "subject": SUBJECT, "topic": "Algebra",
            "sub_topic": None, "strand": "Algebra",
            "difficulty": "Easy" if a < 10 else ("Medium" if a < 20 else "Hard"),
            "question": f"Solve for x: {a}x + {b} = {c}.",
            "correct": f"x = {(c-b)//a}",
            "wrong": [f"x = {(c-b)//a+1}", f"x = {(c-b)//a-1}" if (c-b)//a > 1 else f"x = {(c-b)//a+2}", f"x = {(c-b)//a+2}"],
            "explanation": f"Subtract {b} from both sides: {a}x = {c-b}. Divide by {a}: x = {(c-b)//a}.",
            "question_type": "mcq", "image_url": None, "is_active": True,
        } for a, b, c in _params(n, "algebra")],

    ("Mathematics", "Geometry"): lambda n: [{
            "class_level": LEVEL, "subject": SUBJECT, "topic": "Geometry",
            "sub_topic": None, "strand": "Geometry",
            "difficulty": "Easy",
            "question": f"One interior angle of a {shape} is {angle}°. What is the sum of the remaining interior angles?",
            "correct": f"{angle_sum-angle}°",
            "wrong": [f"{angle_sum-angle+10}°", f"{angle_sum-angle-10}°" if angle_sum-angle > 10 else f"{angle_sum-angle+20}°", f"{angle_sum}°"],
            "explanation": f"Sum of interior angles in a {shape} is {angle_sum}°. Remaining = {angle_sum} − {angle} = {angle_sum-angle}°.",
            "question_type": "mcq", "image_url": None, "is_active": True,
        } for shape, sides, angle_sum, angle in _params(n, "geometry")],

    ("Mathematics", "Statistics"): lambda n: [
        {
            "class_level": LEVEL, "subject": SUBJECT, "topic": "Statistics",
            "sub_topic": None, "strand": "Statistics",
            "difficulty": "Easy",
            "question": f"What is the mean of {', '.join(map(str, data))}?",
            "correct": str(mean),
            "wrong": [
                str(mean + 1),
                str(mean - 1) if mean > 1 else str(mean + 2),
                str(mean + 2),
            ],
            "explanation": f"Mean = ({'+'.join(map(str, data))})/{len(data)} = {sum(data)}/{len(data)} = {mean}.",
            "question_type": "mcq", "image_url": None, "is_active": True,
        }
        for base in range(n)
        for data in [[base + 1, base + 2, base + 3, base + 4, base + 5]]
        for mean in [sum(data) // len(data)]
    ],

    ("Mathematics", "Number and Numeration"): lambda n: [
        {
            "class_level": LEVEL, "subject": SUBJECT, "topic": "Number and Numeration",
            "sub_topic": "Sets", "strand": "Number",
            "difficulty": "Easy" if op == "union" else ("Medium" if op == "intersection" else "Hard"),
            "question": f"If A = {{{', '.join(map(str, A))}}} and B = {{{', '.join(map(str, B))}}}, find A {op_symbol} B.",
            "correct": str(sorted(union_set)),
            "wrong": [
                str(sorted(union_set + [max(union_set)+1])),
                str(sorted(union_set[:-1])),
                str(sorted([x for x in union_set if random.random() > 0.5]) or [union_set[0]]),
            ],
            "explanation": f"A {op} B = {{{', '.join(map(str, union_set))}}}. {'All elements in both sets.' if op=='union' else 'Elements common to both sets.' if op=='intersection' else 'Elements in A but not in B.'}",
            "question_type": "mcq", "image_url": None, "is_active": True,
        }
        for _a in range(2, 8)
        for _b in range(2, 8)
        for op, op_symbol in [("union","∪"),("intersection","∩"),("difference","−")]
        for A in [list(range(1, _a+1))]
        for B in [list(range(max(1,_b), _b+_a))]
        for union_set in [sorted(set(A) | set(B)) if op=="union" else sorted(set(A) & set(B)) if op=="intersection" else sorted(set(A) - set(B))]
        if union_set and len(union_set) >= 1
    ][:n],

    ("Physics", "Mechanics"): lambda n: [{
            "class_level": LEVEL, "subject": SUBJECT, "topic": "Mechanics",
            "sub_topic": None, "strand": "Mechanics",
            "difficulty": "Easy" if mass < 10 else "Medium",
            "question": f"A force of {force} N acts on a mass of {mass} kg. Calculate the acceleration produced.",
            "correct": f"{force//mass} m/s²",
            "wrong": [f"{force//mass+1} m/s²", f"{force//mass-1} m/s²" if force//mass > 1 else f"{force//mass+2} m/s²", f"{force//mass+2} m/s²"],
            "explanation": f"Using Newton's second law: a = F/m = {force}/{mass} = {force//mass} m/s².",
            "question_type": "mcq", "image_url": None, "is_active": True,
        } for mass, force in _params(n, "mechanics")],

    ("Physics", "Waves"): lambda n: [
        {
            "class_level": LEVEL, "subject": SUBJECT, "topic": "Waves",
            "sub_topic": "Wave properties", "strand": "Waves",
            "difficulty": "Easy",
            "question": f"A wave travels at {speed} m/s with a frequency of {freq} Hz. What is its wavelength?",
            "correct": f"{wavelength} m",
            "wrong": [
                f"{wavelength+1} m",
                f"{wavelength-1} m" if wavelength > 1 else f"{wavelength+2} m",
                f"{wavelength+2} m",
            ],
            "explanation": f"Wave speed v = fλ, so λ = v/f = {speed}/{freq} = {wavelength} m.",
            "question_type": "mcq", "image_url": None, "is_active": True,
        }
        for speed in range(10, 100, 5)
        for freq in range(2, 20)
        for wavelength in [speed // freq]
        if speed % freq == 0 and wavelength > 0
    ][:n],

    ("Physics", "Current Electricity"): lambda n: [
        {
            "class_level": LEVEL, "subject": SUBJECT, "topic": "Current Electricity",
            "sub_topic": "Ohm's law", "strand": "Electricity",
            "difficulty": "Easy",
            "question": f"A current of {current} A flows through a resistor of {resistance} Ω. What is the voltage across it?",
            "correct": f"{voltage} V",
            "wrong": [
                f"{voltage+1} V",
                f"{voltage-1} V" if voltage > 1 else f"{voltage+2} V",
                f"{voltage+2} V",
            ],
            "explanation": f"By Ohm's law: V = IR = {current} × {resistance} = {voltage} V.",
            "question_type": "mcq", "image_url": None, "is_active": True,
        }
        for current in range(1, 10) for resistance in range(1, 20)
        for voltage in [current * resistance]
    ][:n],

    ("Chemistry", "Chemical Bonding"): lambda n: [
        {
            "class_level": LEVEL, "subject": SUBJECT, "topic": "Chemical Bonding",
            "sub_topic": "Ionic bonding", "strand": "Bonding",
            "difficulty": "Easy",
            "question": f"What type of bond is formed between {el1} (Group {g1}) and {el2} (Group {g2})?",
            "correct": "Ionic bond",
            "wrong": ["Covalent bond", "Metallic bond", "Hydrogen bond"],
            "explanation": f"{el1} (Group {g1}) transfers electrons to {el2} (Group {g2}), forming an ionic bond through electrostatic attraction between oppositely charged ions.",
            "question_type": "mcq", "image_url": None, "is_active": True,
        }
        for el1, g1 in [("Sodium",1),("Magnesium",2),("Aluminium",3),("Calcium",2),("Potassium",1)]
        for el2, g2 in [("Chlorine",7),("Oxygen",6),("Nitrogen",5),("Fluorine",7),("Sulfur",6)]
    ][:n],

    ("Chemistry", "The Mole Concept"): lambda n: [
        {
            "class_level": LEVEL, "subject": SUBJECT, "topic": "The Mole Concept",
            "sub_topic": "Molar mass", "strand": "Stoichiometry",
            "difficulty": "Easy",
            "question": f"What is the molar mass of {compound} given H=1, C=12, O=16, Na=23, Ca=40, Cl=35.5?",
            "correct": str(mm),
            "wrong": [
                str(mm + 1),
                str(mm - 1) if mm > 1 else str(mm + 2),
                str(mm + 2),
            ],
            "explanation": f"Molar mass = sum of atomic masses = {details}. Total = {mm} g/mol.",
            "question_type": "mcq", "image_url": None, "is_active": True,
        }
        for compound, mm, details in [
            ("H₂O", 18, "2×1 + 16 = 2 + 16"),
            ("CO₂", 44, "12 + 2×16 = 12 + 32"),
            ("NaCl", 58.5, "23 + 35.5"),
            ("CaCO₃", 100, "40 + 12 + 3×16 = 40 + 12 + 48"),
            ("CH₄", 16, "12 + 4×1 = 12 + 4"),
            ("H₂SO₄", 98, "2×1 + 32 + 4×16 = 2 + 32 + 64"),
            ("NaOH", 40, "23 + 16 + 1 = 23 + 17"),
            ("Ca(OH)₂", 74, "40 + 2×(16+1) = 40 + 34"),
        ]
    ][:n],

    ("Biology", "Genetics"): lambda n: [
        {
            "class_level": LEVEL, "subject": SUBJECT, "topic": "Genetics",
            "sub_topic": "Mendelian inheritance", "strand": "Genetics",
            "difficulty": "Medium",
            "question": q_text,
            "correct": correct_ans,
            "wrong": wrong_ans,
            "explanation": explanation,
            "question_type": "mcq", "image_url": None, "is_active": True,
        }
        for organism, trait_a, trait_b in [
            ("pea plants", "tall", "short"),
            ("mice", "black fur", "brown fur"),
            ("chickens", "white feathers", "coloured feathers"),
            ("cattle", "horned", "hornless"),
            ("guinea pigs", "smooth coat", "rough coat"),
            ("rabbits", "floppy ears", "straight ears"),
            ("snails", "banded shell", "unbanded shell"),
        ]
        for cross_type, q_text, correct_ans, wrong_ans, explanation in [
            (
                "monohybrid",
                f"In a monohybrid cross between two heterozygous {organism} (Aa × Aa), what is the expected phenotypic ratio of the offspring?",
                "3:1",
                ["1:1", "1:2:1", "9:3:3:1"],
                f"Aa × Aa produces AA, Aa, Aa, aa — three {trait_a} and one {trait_b}, giving a 3:1 ratio.",
            ),
            (
                "testcross",
                f"A {organism} with the {trait_a} phenotype (unknown genotype) is crossed with a homozygous recessive {organism} (aa). If the offspring are 50% {trait_a} and 50% {trait_b}, what was the genotype of the unknown parent?",
                "Aa",
                ["AA", "aa", "AABB"],
                "The 1:1 ratio in the offspring indicates the unknown parent was heterozygous (Aa). A test cross with aa reveals the genotype.",
            ),
            (
                "ss",
                f"In a monohybrid cross between two homozygous {organism} (AA × aa), what phenotypic ratio is expected in the F1 generation?",
                "1:0",
                ["3:1", "1:1", "1:2:1"],
                "AA × aa produces all Aa offspring, which all show the dominant {trait_a} phenotype. The ratio is 100% {trait_a}:0% {trait_b}, written as 1:0.",
            ),
        ]
        for _ in range(1)
    ][:n],

    ("Biology", "Ecology"): lambda n: [
        {
            "class_level": LEVEL, "subject": SUBJECT, "topic": "Ecology",
            "sub_topic": "Ecosystems", "strand": "Ecology",
            "difficulty": "Easy",
            "question": f"In a food chain, what is the role of {organism} in the ecosystem?",
            "correct": role,
            "wrong": [_other(["producer","primary consumer","secondary consumer","decomposer"], role, i) for i in range(3)],
            "explanation": f"{organism} acts as a {role} in the ecosystem, {'converting sunlight into chemical energy through photosynthesis' if role=='producer' else 'feeding directly on producers (plants)' if role=='primary consumer' else 'feeding on primary consumers' if role=='secondary consumer' else 'breaking down dead organic matter and recycling nutrients'}.",
            "question_type": "mcq", "image_url": None, "is_active": True,
        }
        for organism, role in [
            ("Grass", "producer"), ("Cattle", "primary consumer"),
            ("Lion", "secondary consumer"), ("Fungi", "decomposer"),
            ("Green plants", "producer"), ("Goat", "primary consumer"),
            ("Snake", "secondary consumer"), ("Bacteria", "decomposer"),
            ("Maize", "producer"), ("Hen", "primary consumer"),
        ]
    ][:n],

    ("ICT", "Programming"): lambda n: [
        {
            "class_level": LEVEL, "subject": SUBJECT, "topic": "Programming",
            "sub_topic": "Algorithms", "strand": "Programming",
            "difficulty": "Medium",
            "question": f"What is the output of this algorithm? Step 1: Set x = {x}. Step 2: Set y = {y}. Step 3: Calculate z = x + y. Step 4: Display z.",
            "correct": str(z),
            "wrong": [str(z+1), str(z-1) if z > 1 else str(z+2), str(z+2)],
            "explanation": f"The algorithm adds x and y: z = {x} + {y} = {z}. The output is {z}.",
            "question_type": "mcq", "image_url": None, "is_active": True,
        }
        for x in range(1, 15) for y in range(1, 15)
        for z in [x + y]
    ][:n],

    ("English", "Literature"): lambda n: [
        {
            "class_level": LEVEL, "subject": SUBJECT, "topic": "Literature",
            "sub_topic": "Literary devices", "strand": "Literature",
            "difficulty": "Medium",
            "question": f"Identify the literary device used in: '{phrase}'.",
            "correct": device_name,
            "wrong": [_other(
                ["metaphor","simile","personification","hyperbole","alliteration","oxymoron","irony","imagery"],
                device_name, i
            ) for i in range(3)],
            "explanation": f'The phrase "{phrase}" uses {device_name} because {"it makes a direct comparison without like or as" if device_name=="metaphor" else "it compares two things using like or as" if device_name=="simile" else "it gives human qualities to non-human things" if device_name=="personification" else "it uses extreme exaggeration for effect" if device_name=="hyperbole" else "it repeats the same initial consonant sound" if device_name=="alliteration" else "it combines contradictory terms" if device_name=="oxymoron" else "it says the opposite of what is meant" if device_name=="irony" else "it creates vivid sensory descriptions"}.',
            "question_type": "mcq", "image_url": None, "is_active": True,
        }
        for phrase, device_name in [
            ("The wind whispered through the trees","personification"),
            ("Her smile was a beacon of hope","metaphor"),
            ("He runs as fast as the wind","simile"),
            ("I have told you a million times","hyperbole"),
            ("Peter Piper picked a peck of pickled peppers","alliteration"),
            ("The bitter sweetness of victory","oxymoron"),
            ("The fire station burned down","irony"),
            ("The golden sun melted into the purple horizon","imagery"),
        ]
    ][:n],

    ("Chemistry", "Atomic structure"): lambda n: [
        {
            "class_level": LEVEL, "subject": SUBJECT, "topic": "Atomic structure",
            "sub_topic": "Subatomic particles", "strand": "Atomic Structure",
            "difficulty": "Easy",
            "question": q_format,
            "correct": correct_ans,
            "wrong": wrong_ans,
            "explanation": explanation,
            "question_type": "mcq", "image_url": None, "is_active": True,
        }
        for name, p, ne in ELEMENTS
        for q_format, correct_ans, wrong_ans, explanation in [
            (
                f"Given that {name} has atomic number {p}, what is its mass number?",
                str(p + ne),
                [str(p + ne + 1), str(p + ne - 1) if p + ne > 1 else str(p + ne + 2), str(p + ne + 2)],
                f"Mass number = protons + neutrons = {p} + {ne} = {p + ne}.",
            ),
            (
                f"How many protons does {name} have if its mass number is {p + ne}?",
                str(p),
                [str(p + 1), str(p - 1) if p > 1 else str(p + 2), str(p + 2)],
                f"The atomic number equals the number of protons. {name} has atomic number {p}, so it has {p} protons.",
            ),
            (
                f"How many neutrons does {name} have if its atomic number is {p} and mass number is {p + ne}?",
                str(ne),
                [str(ne + 1), str(ne - 1) if ne > 1 else str(ne + 2), str(ne + 2)],
                f"Neutrons = Mass number - Atomic number = {p + ne} - {p} = {ne}.",
            ),
            (
                f"An atom of {name} has {p} protons and {ne} neutrons. What is its mass number?",
                str(p + ne),
                [str(p + ne + 1), str(p + ne - 1) if p + ne > 1 else str(p + ne + 2), str(p + ne + 2)],
                f"Mass number = protons + neutrons = {p} + {ne} = {p + ne}.",
            ),
            (
                f"Which subatomic particle determines the identity of {name}?",
                "Proton",
                ["Neutron", "Electron", "Nucleus"],
                f"The number of protons (atomic number) determines the element's identity. {name} has {p} protons.",
            ),
        ]
    ][:n],

    ("Biology", "Cell biology"): lambda n: [
        {
            "class_level": LEVEL, "subject": SUBJECT, "topic": "Cell biology",
            "sub_topic": "Cell organelles", "strand": "Cell biology",
            "difficulty": "Easy",
            "question": q_format,
            "correct": correct_ans,
            "wrong": [_other_org(org, i) for i in range(3)],
            "explanation": f"The {org} is the organelle responsible for {func}, where {prod} takes place.",
            "question_type": "mcq", "image_url": None, "is_active": True,
        }
        for org, func, prod in ORGANELLES
        for q_format, correct_ans in [
            (f"Which organelle is responsible for {func} in the cell?", org),
            (f"What is the main function of the {org} in a cell?", func),
            (f"The {org} is primarily involved in which cellular process?", func),
            (f"In which organelle does {func} primarily occur?", org),
            (f"Deficiency of {org} function leads to impaired {func}. Which organelle is affected?", org),
        ]
    ][:n],

    ("ICT", "Computer fundamentals"): lambda n: [
        {
            "class_level": LEVEL, "subject": SUBJECT, "topic": "Computer fundamentals",
            "sub_topic": "Input/Output devices", "strand": "Computer Fundamentals",
            "difficulty": "Easy",
            "question": q_format,
            "correct": correct_ans,
            "wrong": [_other_dev(dev, i) for i in range(3)],
            "explanation": f"A {dev} is an {io_type} device used for {purpose}.",
            "question_type": "mcq", "image_url": None, "is_active": True,
        }
        for dev, io_type, purpose in DEVICES
        for q_format, correct_ans in [
            (f"Which computer device is used for {purpose}?", dev),
            (f"What type of device is a {dev}?", io_type),
            (f"The {dev} is an example of which category of computer device?", io_type),
            (f"Which device would you use to {purpose}?", dev),
            (f"A {dev} is primarily used for:", purpose),
        ]
    ][:n],

    ("English", "Grammar"): lambda n: [
        {
            "class_level": LEVEL, "subject": SUBJECT, "topic": "Grammar",
            "sub_topic": "Parts of speech", "strand": "Grammar",
            "difficulty": "Easy",
            "question": q_format,
            "correct": correct_ans,
            "wrong": [_other_pos(pos, i) for i in range(3)],
            "explanation": f"The word '{word}' functions as a {pos} in this sentence.",
            "question_type": "mcq", "image_url": None, "is_active": True,
        }
        for sentence, word, pos in GRAMMAR
        for q_format, correct_ans in [
            (f"In the sentence '{sentence}', what part of speech is the word '{word}'?", pos),
            (f"What is the main function of the {word} in the sentence '{sentence}'?", pos),
            (f"The word '{word}' in '{sentence}' functions as which part of speech?", pos),
            (f"Identify the {pos} in this sentence: '{sentence}'?", word),
            (f"Select the {pos} from: '{sentence}'?", word),
        ]
    ][:n],
}


def generate(subject, level, topic, count):
    # Case-insensitive topic lookup
    key = (subject, topic)
    if key in TOPIC_GENERATORS:
        raw_qs = TOPIC_GENERATORS[key](count)
    else:
        # Try case-insensitive match
        topic_lower = topic.lower()
        for k, gen_fn in TOPIC_GENERATORS.items():
            if k[0].lower() == subject.lower() and k[1].lower() == topic_lower:
                raw_qs = gen_fn(count)
                break
        else:
            return []
    qs = [_shuffle_opts(q) for q in raw_qs]
    for q in qs:
        q["class_level"] = level
    return qs


if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("Usage: python3 shs_gen_core.py <subject> <level> <topic> <count>")
        sys.exit(1)
    subject, level, topic, count = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
    LEVEL, SUBJECT = level, subject
    qs = generate(subject, level, topic, count)
    slug = f"{subject}_{level}_{topic}".lower().replace(" ", "_")
    out = f"/tmp/shs_{slug}.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(qs, f, ensure_ascii=False, indent=2)
    print(f"Generated {len(qs)} questions → {out}")
