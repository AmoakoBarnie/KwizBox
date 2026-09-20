"""Remap all DB question topics to NaCCA strand › sub-strand format using SQL.
Also fix the 171 questions with empty topics.

The frontend (Play.jsx line 43) builds topics as:
  `${strand.name} › ${ss.name}`
So all topics in the DB should follow "Strand › Sub-strand" format.
"""
import sqlite3, json, re, os

DB_PATH = "/media/stephen/FILES/MyShit/ghana-stem-trivia/backend/trivia.db"

# Load manifest
with open("/media/stephen/FILES/MyShit/ghana-stem-trivia/backend/curriculum/output/nacca_manifest.json") as f:
    manifest = json.load(f)

# Build: subject_code -> {class -> {strand_name: {sub_strand_name: True}}}
manifest_topics = {}
for subj in manifest["subjects"]:
    code = subj["code"]
    manifest_topics[code] = {}
    for lvl in subj.get("levels", []):
        cl = lvl.get("level") or lvl.get("code") or ""
        if not cl:
            # Try to infer from indicator IDs
            for strand in lvl.get("strands", []):
                for ss in strand.get("sub_strands", []):
                    for cs in ss.get("content_standards", []):
                        for ind in cs.get("indicators", []):
                            iid = ind.get("indicator_id", "")
                            m = re.match(r'(B\d)\.(\d+)\.(\d+)', iid)
                            if m:
                                cl = m.group(1)
            if not cl:
                continue
        if cl not in manifest_topics[code]:
            manifest_topics[code][cl] = {}
        for strand in lvl.get("strands", []):
            s = strand.get("name", "").strip()
            if s not in manifest_topics[code][cl]:
                manifest_topics[code][cl][s] = set()
            for ss in strand.get("sub_strands", []):
                ss_n = ss.get("name", "").strip()
                if ss_n:
                    manifest_topics[code][cl][s].add(ss_n)

# Show what we have
print("Manifest topics available:")
for code in sorted(manifest_topics.keys()):
    print(f"  {code}:")
    for cl in sorted(manifest_topics[code].keys()):
        strands = manifest_topics[code][cl]
        print(f"    {cl}: {len(strands)} strands")
        for s, ss_set in sorted(strands.items()):
            ss_list = ", ".join(sorted(ss_set)[:4])
            if len(ss_set) > 4:
                ss_list += f" (+{len(ss_set)-4} more)"
            print(f"      {s} › {{{ss_list}}}")
print()

# Map subject names to manifest codes
SUBJ_MAP = {
    "Mathematics": "mathematics",
    "Science": "science",
    "Computing": "computing",
    "English": "english",
    "Social Studies": "social_studies",
    "French": "french",
    "Ghanaian Language": "ghanaian_language",
    "History": "history",
    "Our World and Our People": "owop",
    "Creative Arts": "creative_arts",
    "Physical Education": "physical_education",
    "Religious and Moral Education": "rme",
    "Career Technology": "career_technology",
    "Arabic": "arabic",
    "Mixed": None,
}

# Normalization map: old topic -> new "Strand › Sub-strand" (per subject)
# Built from manifest + heuristics
def get_new_topic(subject, old_topic, class_level):
    """Return new topic string or None if no mapping available."""
    code = SUBJ_MAP.get(subject)
    if not code:
        return None
    
    # If old_topic already in "Strand › Sub-strand" format, try to validate
    if " › " in old_topic:
        parts = old_topic.split(" › ", 1)
        s_name = parts[0].strip()
        ss_name = parts[1].strip() if len(parts) > 1 else ""
        
        # Check if this matches any manifest strand
        if code in manifest_topics and class_level in manifest_topics[code]:
            strands = manifest_topics[code][class_level]
            if s_name in strands:
                if ss_name and ss_name in strands[s_name]:
                    return old_topic  # Valid, keep as-is
                elif not ss_name:
                    return f"{s_name} › General"  # Fix missing sub-strand
        return None  # Don't know this format
    
    # Normalize simple topic names to NaCCA format
    if code == "mathematics":
        return _math_topic(old_topic, class_level)
    elif code == "science":
        return _science_topic(old_topic, class_level)
    elif code == "computing":
        return _computing_topic(old_topic, class_level)
    elif code == "arabic":
        return "Writing › General"
    elif code == "french":
        return "Écouter › General"
    elif code == "ghanaian_language":
        return "Integrating Grammar in Written Language(Conjunctions) › Reading Texts, Poems Narratives and Short Stories and Responding to them"
    elif code == "physical_education":
        return "Dance › General"
    elif code == "history":
        return "Ghana Gains Independence › MILITARY RULE"
    elif code == "english":
        return "General › General"
    elif code == "owop":
        return "VALUES AND PSYCHO-SOCIAL CONCEPTS, PRINCIPLES AND STRATEGIES › General"
    elif code == "rme":
        return "Commitment to the God › Roles, Relationships in the Family and Character Formation"
    elif code == "social_studies":
        return "General › General"
    elif code == "career_technology":
        return "General › General"
    return None


def _math_topic(old, cl):
    """Map simple math topics to NaCCA math strands/sub-strands."""
    t = old.lower().strip()
    
    # B4-B6 strands: Number, Number Operations, Fractions/Decimals/Percentages, Patterns/Relations, Algebraic Expressions, Variables/Equations, Shapes/Space, Measurement, Position/Transformation, Data, Chance/Probability
    # B7-B9: similar but more granular
    
    if any(w in t for w in ["fraction", "decimal", "percentage", "%", "percent"]):
        return "Fractions, Decimals and Percentages › General"
    if any(w in t for w in ["algebra", "algebra/patterns", "variable", "equation", "solve for", "factoris", "expand", "simplif"]):
        if "variable" in t or "equation" in t:
            return "Variables and Equations › General"
        return "Algebraic Expressions › General"
    if any(w in t for w in ["pattern", "sequence", "series", "relation"]):
        return "Patterns and Relations › General"
    if any(w in t for w in ["angle", "triangle", "circle", "polygon", "symmetry", "shape", "geometry", "pythagoras", "bearings", "trigonom", "transform"]):
        if "angle" in t or "triangle" in t or "polygon" in t or "symmetry" in t:
            return "Shapes and Space › General"
        if "circle" in t:
            return "Shapes and Space › General"
        if "pythagoras" in t or "trigonom" in t:
            return "Shapes and Space › General"
        if "bearings" in t:
            return "Position and Transformation › General"
        if "transform" in t:
            return "Position and Transformation › General"
        return "Shapes and Space › General"
    if any(w in t for w in ["area", "perimeter", "volume", "capacity", "length", "measure", "mass", "weight", "time", "speed", "rate"]):
        if "area" in t or "perimeter" in t:
            return "Measurement › General"
        if "volume" in t or "capacity" in t:
            return "Measurement › General"
        if "time" in t:
            return "Measurement › General"
        if "speed" in t or "rate" in t:
            return "Measurement › General"
        return "Measurement › General"
    if any(w in t for w in ["money", "ghs", "cost", "price", "discount", "profit", "interest", "finance", "add these amount"]):
        return "Number Operations › General"
    if any(w in t for w in ["addition", "subtraction", "multiplication", "division", "add", "subtract", "multiply", "divide", "sum", "product", "quotient", "+", "-"]):
        if "addition" in t:
            return "Number Operations › General"
        if "subtraction" in t:
            return "Number Operations › General"
        if "multiplication" in t:
            return "Number Operations › General"
        if "division" in t:
            return "Number Operations › General"
        return "Number Operations › General"
    if any(w in t for w in ["number", "counting", "place value", "digit", "compare", "order", "round", "odd", "even", "prime", "integer", "negative", "rational", "irrational", "standard form", "exponent", "power", "square root", "indices", "logarithm", "complex"]):
        if "number" in t or "counting" in t or "place value" in t or "digit" in t:
            return "Number and Numeration Systems › General"
        if "compare" in t or "order" in t:
            return "Number and Numeration Systems › General"
        if "round" in t:
            return "Number and Numeration Systems › General"
        if "odd" in t or "even" in t:
            return "Number and Numeration Systems › General"
        if "prime" in t:
            return "Number and Numeration Systems › General"
        if "integer" in t or "negative" in t:
            return "Number and Numeration Systems › General"
        if "standard form" in t:
            return "Number and Numeration Systems › General"
        if "exponent" in t or "power" in t or "indices" in t or "logarithm" in t:
            return "Number and Numeration Systems › General"
        if "square root" in t or "root" in t:
            return "Number and Numeration Systems › General"
        if "complex" in t:
            return "Number and Numeration Systems › General"
        if "rational" in t or "irrational" in t:
            return "Number and Numeration Systems › General"
        return "Number and Numeration Systems › General"
    if any(w in t for w in ["data", "statistics", "mean", "median", "mode", "range", "average", "graph", "chart", "tally"]):
        return "Data › General"
    if any(w in t for w in ["probability", "chance", "likely", "unlikely", "outcome", "event"]):
        return "Chance or Probability › General"
    if any(w in t for w in ["ratio", "proportion", "scale"]):
        return "Number: Ratios and Proportion › General"
    # Specific topic names
    if t in ["addition", "subtraction", "multiplication", "division", "counting", "number"]:
        return "Number Operations › General"
    if t in ["fractions", "decimals", "percentages", "percentage"]:
        return "Fractions, Decimals and Percentages › General"
    if t in ["patterns", "pattern"]:
        return "Patterns and Relations › General"
    if t in ["geometry", "shapes and angles"]:
        return "Shapes and Space › General"
    if t in ["measurement", "measuring length"]:
        return "Measurement › General"
    if t in ["money", "number/money"]:
        return "Number Operations › General"
    if t in ["time"]:
        return "Measurement › General"
    if t in ["number/fractions", "number/money", "number/ratio"]:
        return "Number: Ratios and Proportion › General"
    if t in ["exponents", "square roots", "negative numbers", "factors", "factors and multiples", "prime numbers", "order of operations"]:
        return "Number and Numeration Systems › General"
    if t in ["algebra", "algebra/patterns"]:
        return "Algebraic Expressions › General"
    if t in ["data", "statistics"]:
        return "Data › General"
    if t in ["angle", "angles"]:
        return "Shapes and Space › General"
    if t in ["area", "area and perimeter", "area of rectangles"]:
        return "Measurement › General"
    if t in ["comparison"]:
        return "Number and Numeration Systems › General"
    if t in ["even and odd numbers", "odd and even"]:
        return "Number and Numeration Systems › General"
    if t in ["logical reasoning"]:
        return "Patterns and Relations › General"
    if t in ["number/ratio", "ratio"]:
        return "Number: Ratios and Proportion › General"
    if t in ["bearings"]:
        return "Position and Transformation › General"
    if t in ["calculus"]:
        return "Variables and Equations › General"
    if t in ["complex numbers"]:
        return "Number and Numeration Systems › General"
    if t in ["expansion", "factorization"]:
        return "Algebraic Expressions › General"
    if t in ["inequalities"]:
        return "Variables and Equations › General"
    if t in ["logarithms"]:
        return "Number and Numeration Systems › General"
    if t in ["matrices"]:
        return "Algebraic Expressions › General"
    if t in ["probability", "probability "]:
        return "Chance or Probability › General"
    if t in ["sequences"]:
        return "Patterns and Relations › General"
    if t in ["simultaneous equations", "linear equations"]:
        return "Variables and Equations › General"
    if t in ["standard form"]:
        return "Number and Numeration Systems › General"
    if t in ["trigonometry"]:
        return "Shapes and Space › General"
    if t in ["number types"]:
        return "Number and Numeration Systems › General"
    if t in ["percentage increase"]:
        return "Fractions, Decimals and Percentages › General"
    if t in ["ratios and proportions"]:
        return "Number: Ratios and Proportion › General"
    if t in ["scale and maps"]:
        return "Position and Transformation › General"
    if t in ["speed"]:
        return "Measurement › General"
    if t in ["exponents and powers"]:
        return "Number and Numeration Systems › General"
    if t in ["number and numeration systems"]:
        return "Number and Numeration Systems › General"
    if t in ["number operations"]:
        return "Number Operations › General"
    if t in ["algebraic expressions"]:
        return "Algebraic Expressions › General"
    if t in ["variables and equations"]:
        return "Variables and Equations › General"
    if t in ["shapes and space"]:
        return "Shapes and Space › General"
    if t in ["position and transformation"]:
        return "Position and Transformation › General"
    if t in ["chance or probability"]:
        return "Chance or Probability › General"
    if t in ["fractions, decimals and percentages"]:
        return "Fractions, Decimals and Percentages › General"
    return "Number › General"


def _science_topic(old, cl):
    """Map simple science topics to NaCCA science strands/sub-strands."""
    t = old.lower().strip()
    
    # B7-B9 manifest strands: HUMANS AND THE ENVIRONMENT, systems, diseases, solar system, ecosystem, electricity, the human body
    # B4-B6 pre-existing topics need mapping
    
    if any(w in t for w in ["cell", "mitosis", "meiosis", "microorganism"]):
        return "LIVING CELLS › General"
    if any(w in t for w in ["ecosystem", "food chain", "food web", "biodiversity", "ecology"]):
        return "ECOSYSTEM › General"
    if any(w in t for w in ["energy", "force", "motion", "momentum", "gravity", "speed", "displacement", "pressure"]):
        if "force" in t or "motion" in t or "momentum" in t or "gravity" in t or "pressure" in t:
            return "FORCE AND MOTION › General"
        if "energy" in t and "conservation" in t:
            return "CONVERSION AND CONSERVATION OF ENERGY › General"
        if "energy" in t:
            return "ENERGY › General"
        return "FORCE AND MOTION › General"
    if any(w in t for w in ["electricity", "circuit", "current", "voltage", "resistor", "cell"]):
        return "ELECTRICITY AND ELECTRONICS › General"
    if any(w in t for w in ["light", "reflection", "refraction", "lens", "mirror"]):
        return "ELECTRICITY AND ELECTRONICS › General"
    if any(w in t for w in ["sound", "wave", "frequency", "pitch"]):
        return "ELECTRICITY AND ELECTRONICS › General"
    if any(w in t for w in ["atom", "element", "periodic", "chemical", "acid", "base", "reaction", "ionization", "ion", "molecule", "compound"]):
        return "MATERIALS › General"
    if any(w in t for w in ["planet", "solar system", "moon", "star", "astronomy", "moon phase"]):
        return "THE SOLAR SYSTEM › General"
    if any(w in t for w in ["health", "disease", "virus", "vaccine", "nutrition", "diet", "digestion", "respiration", "circulation", "blood", "heart", "breath", "organ"]):
        if "digestion" in t or "nutrition" in t or "diet" in t or "blood" in t or "circulation" in t or "respiration" in t:
            return "THE HUMAN BODY SYSTEM › General"
        if "health" in t or "disease" in t or "virus" in t or "vaccine" in t:
            return "HUMAN HEALTH › General"
        return "THE HUMAN BODY SYSTEM › General"
    if any(w in t for w in ["climate", "weather", "environment", "pollution", "galamsey", "green", "sustainable", "waste", "3rs", "ewaste", "recycling"]):
        if "climate" in t or "green" in t or "sustainable" in t:
            return "CLIMATE CHANGE AND GREEN ECONOMY › General"
        if "waste" in t or "recycling" in t or "3rs" in t or "ewaste" in t:
            return "WASTE MANAGEMENT › General"
        if "weather" in t:
            return "UNDERSTANDING THE ENVIRONMENT › General"
        return "UNDERSTANDING THE ENVIRONMENT › General"
    if any(w in t for w in ["crop", "farm", "agriculture", "soil", "plant", "animal", "poultry", "livestock", "manure", "compost"]):
        if "crop" in t:
            return "CROP PRODUCTION › General"
        if "animal" in t or "poultry" in t or "livestock" in t:
            return "ANIMAL PRODUCTION › General"
        if "soil" in t or "farm" in t or "agriculture" in t:
            return "FARMING SYSTEMS › General"
        return "CROP PRODUCTION › General"
    if any(w in t for w in ["water", "cycle", "evaporation", "condensation", "transpiration", "water cycle", "carbon cycle"]):
        return "ENERGY › General"
    if any(w in t for w in ["reproduction", "heredity", "genetics", "inheritance", "gene", "dna", "protein", "evolution", "variation"]):
        return "LIFE CYCLE OF ORGANISMS › General"
    if any(w in t for w in ["rock", "soil", "mineral", "earth", "fossil", "geology", "weathering", "erosion"]):
        return "EARTH SCIENCE › General"
    if any(w in t for w in ["human body", "organ system", "skeleton", "muscle", "nervous", "sensory"]):
        if "nervous" in t:
            return "THE HUMAN BODY SYSTEM › General"
        return "THE HUMAN BODY SYSTEM › General"
    if any(w in t for w in ["photosynthesis"]):
        return "ENERGY › General"
    # Specific topic names
    specific_map = {
        "air": "UNDERSTANDING THE ENVIRONMENT › General",
        "animal habitats": "ECOSYSTEM › General",
        "animals": "LIFE CYCLE OF ORGANISMS › General",
        "astronomy": "THE SOLAR SYSTEM › General",
        "adaptation": "LIFE CYCLE OF ORGANISMS › General",
        "atoms": "MATERIALS › General",
        "atomic structure": "MATERIALS › General",
        "biodiversity": "ECOSYSTEM › General",
        "blood circulation": "THE HUMAN BODY SYSTEM › General",
        "carbon cycle": "ENERGY › General",
        "cells": "LIVING CELLS › General",
        "chemistry": "MATERIALS › General",
        "circuits": "ELECTRICITY AND ELECTRONICS › General",
        "climate": "CLIMATE CHANGE AND GREEN ECONOMY › General",
        "climate change": "CLIMATE CHANGE AND GREEN ECONOMY › General",
        "cycles": "ENERGY › General",
        "digestion": "THE HUMAN BODY SYSTEM › General",
        "diversity of matter": "MATERIALS › General",
        "ecology": "ECOSYSTEM › General",
        "electric circuits": "ELECTRICITY AND ELECTRONICS › General",
        "electricity": "ELECTRICITY AND ELECTRONICS › General",
        "energy": "ENERGY › General",
        "farming": "FARMING SYSTEMS › General",
        "forces": "FORCE AND MOTION › General",
        "forces and energy": "FORCE AND MOTION › General",
        "forces and machines": "FORCE AND MOTION › General",
        "health": "HUMAN HEALTH › General",
        "heat": "ENERGY › General",
        "heat transfer": "ENERGY › General",
        "human body": "THE HUMAN BODY SYSTEM › General",
        "human body system": "THE HUMAN BODY SYSTEM › General",
        "human reproduction": "LIFE CYCLE OF ORGANISMS › General",
        "humans and the environment": "UNDERSTANDING THE ENVIRONMENT › General",
        "ionization and ions": "MATERIALS › General",
        "life cycles": "LIFE CYCLE OF ORGANISMS › General",
        "light": "ELECTRICITY AND ELECTRONICS › General",
        "light and shadow": "ELECTRICITY AND ELECTRONICS › General",
        "living things": "LIFE CYCLE OF ORGANISMS › General",
        "living and non-living": "LIFE CYCLE OF ORGANISMS › General",
        "magnetism": "ELECTRICITY AND ELECTRONICS › General",
        "matter": "MATERIALS › General",
        "measurement": "ENERGY › General",
        "microorganisms": "LIVING CELLS › General",
        "mixing and separation": "MATERIALS › General",
        "moon phases": "THE SOLAR SYSTEM › General",
        "nutrition": "THE HUMAN BODY SYSTEM › General",
        "osmosis and diffusion": "LIVING CELLS › General",
        "periodic table": "MATERIALS › General",
        "photosynthesis": "ENERGY › General",
        "photosynthesis and respiration": "ENERGY › General",
        "photosynthesis equation": "ENERGY › General",
        "plants": "CROP PRODUCTION › General",
        "pressure": "FORCE AND MOTION › General",
        "reflection and refraction": "ELECTRICITY AND ELECTRONICS › General",
        "reproduction": "LIFE CYCLE OF ORGANISMS › General",
        "reproduction in animals": "LIFE CYCLE OF ORGANISMS › General",
        "respiration": "THE HUMAN BODY SYSTEM › General",
        "rocks": "EARTH SCIENCE › General",
        "rocks and soil": "EARTH SCIENCE › General",
        "scientific investigation": "SCIENCE AND INDUSTRY › General",
        "separation": "MATERIALS › General",
        "separation of mixtures": "MATERIALS › General",
        "sound": "ELECTRICITY AND ELECTRONICS › General",
        "sound waves": "ELECTRICITY AND ELECTRONICS › General",
        "speed": "FORCE AND MOTION › General",
        "soil": "CROP PRODUCTION › General",
        "systems": "UNDERSTANDING THE ENVIRONMENT › General",
        "the earth and space": "THE SOLAR SYSTEM › General",
        "the water cycle": "ENERGY › General",
        "variation": "LIFE CYCLE OF ORGANISMS › General",
        "waste management": "WASTE MANAGEMENT › General",
        "weather": "UNDERSTANDING THE ENVIRONMENT › General",
        "weathering and erosion": "EARTH SCIENCE › General",
        "waves": "ELECTRICITY AND ELECTRONICS › General",
    }
    if t in specific_map:
        return specific_map[t]
    if t in ["acids and bases", "agriculture", "astronomy", "body systems", "cell structure and function",
             "chemical reactions", "environmental science", "evolution", "farm", "forces and energy",
             "genetics", "genetics and inheritance", "heredity", "human reproduction", "organ systems",
             "protein synthesis", "quantum", "relativity", "renewable energy", "transpiration"]:
        return specific_map.get(t, "GENERAL › General")
    
    return "GENERAL › General"


def _computing_topic(old, cl):
    """Map simple computing topics to NaCCA computing strands."""
    t = old.lower().strip()
    
    if any(w in t for w in ["algorithm", "programming", "code", "variable", "function", "loop", "boolean", "flowchart", "computational", "debug"]):
        return "Programming › General"
    if any(w in t for w in ["hardware", "cpu", "ram", "storage", "mouse", "keyboard", "monitor", "printer", "component", "input", "output"]):
        return "Hardware › General"
    if any(w in t for w in ["software", "application", "program", "word processor", "spreadsheet", "presentation", "powerpoint", "excel", "microsoft", "operating system", "app"]):
        if "spreadsheet" in t or "excel" in t:
            return "Productivity Software › General"
        if "presentation" in t or "powerpoint" in t:
            return "Productivity Software › General"
        return "Software Applications › General"
    if any(w in t for w in ["internet", "web", "browser", "url", "website", "search engine", "search engines", "email"]):
        return "Digital Literacy › General"
    if any(w in t for w in ["network", "lan", "wan", "bandwidth", "dns", "communication network", "communication networks"]):
        return "Networking › General"
    if any(w in t for w in ["security", "password", "virus", "cyber", "phishing", "privacy", "malware", "encrypt", "information security", "data security"]):
        return "Cybersecurity › General"
    if any(w in t for w in ["data", "database", "binary", "file", "storage", "data representation", "data analysis", "data type", "data types"]):
        if "database" in t or "data" in t and "type" in t:
            return "Data Representation › General"
        if "binary" in t:
            return "Data Representation › General"
        return "Data Representation › General"
    if any(w in t for w in ["artificial intelligence", "ai", "machine learning", "robot", "cloud", "machine learning", "ml", "emerging"]):
        return "Emerging Technologies › General"
    if any(w in t for w in ["safety", "privacy", "stranger", "online", "digital safety", "internet safety", "internet safety", "digital citizenship", "digital citizen"]):
        return "Digital Citizenship › General"
    if any(w in t for w in ["generation", "computer generation"]):
        return "Computer Systems › General"
    
    specific_map = {
        "ai": "Emerging Technologies › General",
        "algorithms": "Programming › General",
        "algorithms and logic": "Programming › General",
        "artificial intelligence": "Emerging Technologies › General",
        "binary numbers": "Data Representation › General",
        "boolean logic": "Programming › General",
        "cloud": "Emerging Technologies › General",
        "cloud computing": "Emerging Technologies › General",
        "communication networks": "Networking › General",
        "communication networks ": "Networking › General",
        "computational thinking": "Programming › General",
        "data": "Data Representation › General",
        "data analysis": "Data Representation › General",
        "data representation": "Data Representation › General",
        "data security": "Cybersecurity › General",
        "email": "Digital Literacy › General",
        "file management": "Data Representation › General",
        "files": "Data Representation › General",
        "flowcharts": "Programming › General",
        "hardware": "Hardware › General",
        "health": "Digital Citizenship › General",
        "input": "Hardware › General",
        "input and output devices": "Hardware › General",
        "internet": "Digital Literacy › General",
        "internet safety": "Digital Citizenship › General",
        "internet safety ": "Digital Citizenship › General",
        "introduction to computing": "Introduction to Computing › General",
        "keyboard shortcuts": "Hardware › General",
        "machine learning": "Emerging Technologies › General",
        "mouse and cursor": "Hardware › General",
        "network": "Networking › General",
        "networks": "Networking › General",
        "networks and the internet": "Networking › General",
        "operating systems": "Software Applications › General",
        "passwords": "Cybersecurity › General",
        "presentation": "Productivity Software › General",
        "productivity software": "Productivity Software › General",
        "programming": "Programming › General",
        "robotics": "Emerging Technologies › General",
        "safety": "Digital Citizenship › General",
        "search engines": "Digital Literacy › General",
        "search engines ": "Digital Literacy › General",
        "security": "Cybersecurity › General",
        "software": "Software Applications › General",
        "software and applications": "Software Applications › General",
        "software applications": "Software Applications › General",
        "spreadsheets": "Productivity Software › General",
        "technology": "Introduction to Computing › General",
        "web": "Digital Literacy › General",
        "web technologies": "Digital Literacy › General",
    }
    if t in specific_map:
        return specific_map[t]
    return "Introduction to Computing › General"


# Connect to DB and update
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# First, count what we'll change
cur.execute("SELECT id, subject, class_level, topic FROM questions WHERE topic = '' OR topic IS NULL OR topic = '(no topic)' OR topic = '(no topic / unspecified)'")
empty_qs = cur.fetchall()
print(f"Questions with empty topics: {len(empty_qs)}")

cur.execute("SELECT id, subject, class_level, topic FROM questions WHERE topic != '' AND topic IS NOT NULL AND topic != '(no topic)' AND topic != '(no topic / unspecified)'")
has_topic_qs = cur.fetchall()
print(f"Questions with existing topics: {len(has_topic_qs)}")

# Check how many existing topics need remapping (not in "Strand › Sub-strand" format)
need_remap = []
for qid, subj, cl, old_topic in has_topic_qs:
    if " › " not in old_topic:
        need_remap.append((qid, subj, cl, old_topic))

print(f"Questions needing topic remap (not in Strand › Sub-strand format): {len(need_remap)}")

# Show sample
print("\nSample topics needing remap:")
seen = set()
for qid, subj, cl, old_topic in need_remap:
    key = (subj, old_topic)
    if key not in seen:
        seen.add(key)
        print(f"  [{subj}] {old_topic} -> ?")

print(f"\nUnique topics needing remap: {len(seen)}")

# Now do the actual updates using SQL
updated = 0
failed = 0
skipped = 0

# Update empty topics
for qid, subj, cl, old_topic in empty_qs:
    new_topic = get_new_topic(subj, "(empty)", cl)
    if new_topic:
        try:
            cur.execute("UPDATE questions SET topic=? WHERE id=?", (new_topic, qid))
            updated += 1
        except Exception as e:
            failed += 1
            print(f"  FAIL id={qid}: {e}")
    else:
        skipped += 1

# Remap existing non-compliant topics
for qid, subj, cl, old_topic in need_remap:
    new_topic = get_new_topic(subj, old_topic, cl)
    if new_topic and new_topic != old_topic:
        try:
            cur.execute("UPDATE questions SET topic=? WHERE id=?", (new_topic, qid))
            updated += 1
        except Exception as e:
            failed += 1
            print(f"  FAIL id={qid}: {e}")
    else:
        skipped += 1

conn.commit()
conn.close()

print(f"\n{'='*60}")
print(f"RESULTS")
print(f"{'='*60}")
print(f"Updated:      {updated}")
print(f"Skipped:      {skipped}")
print(f"Failed:       {failed}")

# Verify
conn2 = sqlite3.connect(DB_PATH)
total = conn2.execute("SELECT count(*) FROM questions").fetchone()[0]
with_topic = conn2.execute("SELECT count(*) FROM questions WHERE topic != '' AND topic IS NOT NULL AND topic NOT IN ('(no topic)', '(no topic / unspecified)')").fetchone()[0]
without_topic = conn2.execute("SELECT count(*) FROM questions WHERE topic = '' OR topic IS NULL OR topic IN ('(no topic)', '(no topic / unspecified)')").fetchone()[0]
conn2.close()

print(f"\nVerification:")
print(f"  Total questions: {total}")
print(f"  With topic:      {with_topic}")
print(f"  Without topic:   {without_topic}")

# Show final topic distribution per subject
print(f"\nTopics per subject (sample):")
conn3 = sqlite3.connect(DB_PATH)
for subj in ["Mathematics", "Science", "Computing", "Arabic", "French", "Ghanaian Language", "Physical Education", "History", "English", "Our World and Our People", "Religious and Moral Education"]:
    rows = conn3.execute(
        "SELECT topic, count(*) FROM questions WHERE subject=? AND topic != '' AND topic IS NOT NULL AND topic NOT IN ('(no topic)', '(no topic / unspecified)') GROUP BY topic ORDER BY topic LIMIT 15",
        (subj,)
    ).fetchall()
    total_subj = conn3.execute("SELECT count(*) FROM questions WHERE subject=?", (subj,)).fetchone()[0]
    print(f"\n  {subj} ({total_subj} qs):")
    for topic, cnt in rows:
        print(f"    {topic:<60} → {cnt}")
conn3.close()
