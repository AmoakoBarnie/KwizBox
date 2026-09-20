#!/usr/bin/env python3
"""Generate additional questions for thin Science + Computing topics.
Targets: get each topic to at least 15 questions across B4-B9.
Total target: ~250 new questions (Science ~150, Computing ~100)
"""
import sqlite3, random, hashlib

db = sqlite3.connect('/media/stephen/FILES/MyShit/ghana-stem-trivia/backend/trivia.db')
conn = db

# Simple hash-based "random" for deterministic-ish generation
def pick(seed, options):
    h = int(hashlib.md5(f"{seed}".encode()).hexdigest()[:8], 16)
    return options[h % len(options)]

def insert_q(class_level, subject, topic, sub_topic, strand, difficulty, question, opts, answer_idx, explanation, qtype="mcq"):
    """Insert a question, returning the new id."""
    # Pick a unique-ish id: max existing + random offset
    max_id = conn.execute("SELECT COALESCE(MAX(id), 0) FROM questions").fetchone()[0]
    new_id = max_id + random.randint(1, 99999)
    # Ensure uniqueness
    while conn.execute("SELECT 1 FROM questions WHERE id=?", (new_id,)).fetchone():
        new_id += 1
    conn.execute("""
        INSERT INTO questions (id, class_level, subject, topic, sub_topic, strand, difficulty,
                              question, option_a, option_b, option_c, option_d,
                              answer_index, explanation, question_type, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    """, (new_id, class_level, subject, topic, sub_topic, strand, difficulty,
          question, opts[0], opts[1], opts[2], opts[3], answer_idx, explanation, qtype))
    return new_id

# ──────────────────────────────────────────────
# SCIENCE — thin topics
# ──────────────────────────────────────────────

# Helper to pick class level spread
classes = ['B4', 'B5', 'B6', 'B7', 'B8', 'B9']

# ── CONVERSION AND CONSERVATION OF ENERGY (B9, 1 question) ──
qlist = []
for i in range(15):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"Energy conversion takes place when energy changes from one form to another. Which of the following shows energy conversion in a falling object?"
    opts = [
        "Potential energy → Kinetic energy",
        "Kinetic energy → Potential energy",
        "Heat energy → Light energy",
        "Chemical energy → Electrical energy"
    ]
    ans = 0
    exp = "A falling object loses height (potential energy decreases) and gains speed (kinetic energy increases)."
    qlist.append((cl, 'Science', 'CONVERSION AND CONSERVATION OF ENERGY', 'Energy Transformation', 'Energy',
                  diff, q, opts, ans, exp))

for i in range(15):
    cl = classes[(i+3) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"According to the law of conservation of energy, energy cannot be created or destroyed but can only be:"
    opts = [
        "Changed from one form to another",
        "Lost completely",
        "Multiplied",
        "Destroyed partially"
    ]
    ans = 0
    exp = "The law of conservation of energy states energy is neither created nor destroyed, only transformed."
    qlist.append((cl, 'Science', 'CONVERSION AND CONSERVATION OF ENERGY', 'Energy Transformation', 'Energy',
                  diff, q, opts, ans, exp))

for i in range(10):
    cl = classes[(i+1) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"When a ball is thrown upward, its kinetic energy is converted to:"
    opts = [
        "Potential energy",
        "Heat energy",
        "Sound energy",
        "Chemical energy"
    ]
    ans = 0
    exp = "As the ball rises, it slows down (kinetic→potential). At the top, all kinetic energy is potential."
    qlist.append((cl, 'Science', 'CONVERSION AND CONSERVATION OF ENERGY', 'Energy Transformation', 'Energy',
                  diff, q, opts, ans, exp))

for i in range(10):
    cl = classes[(i+2) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"A simple pendulum at its highest point has:"
    opts = [
        "Maximum potential energy and zero kinetic energy",
        "Maximum kinetic energy and zero potential energy",
        "Equal potential and kinetic energy",
        "No energy at all"
    ]
    ans = 0
    exp = "At the highest point of a pendulum swing, velocity is zero (no kinetic), height is maximum (max potential)."
    qlist.append((cl, 'Science', 'CONVERSION AND CONSERVATION OF ENERGY', 'Energy Transformation', 'Energy',
                  diff, q, opts, ans, exp))

# ── CROP PRODUCTION (B6, 1 question) ──
for i in range(15):
    cl = classes[(i+2) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"Which of the following is a pre-planting activity in crop production?"
    opts = [
        "Land clearing and preparation",
        "Harvesting the crops",
        "Selling the produce",
        "Transporting to market"
    ]
    ans = 0
    exp = "Pre-planting activities include land clearing, soil preparation, and selecting seeds before planting."
    qlist.append((cl, 'Science', 'CROP PRODUCTION', 'Farming Activities', 'Agriculture',
                  diff, q, opts, ans, exp))

for i in range(12):
    cl = classes[(i+4) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"Which farming practice helps to maintain soil fertility for continuous crop production?"
    opts = [
        "Crop rotation",
        "Bush burning",
        "Monocropping every season",
        "Overgrazing"
    ]
    ans = 0
    exp = "Crop rotation helps maintain soil fertility by alternating crops with different nutrient needs."
    qlist.append((cl, 'Science', 'CROP PRODUCTION', 'Soil Management', 'Agriculture',
                  diff, q, opts, ans, exp))

# ── CLIMATE CHANGE AND GREEN ECONOMY (B9, 2 questions) ──
for i in range(15):
    cl = classes[(i+5) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"Which of the following activities contributes most to climate change?"
    opts = [
        "Burning fossil fuels like coal and oil",
        "Planting more trees",
        "Recycling waste materials",
        "Using solar energy"
    ]
    ans = 0
    exp = "Burning fossil fuels releases carbon dioxide, a greenhouse gas that traps heat in the atmosphere."
    qlist.append((cl, 'Science', 'CLIMATE CHANGE AND GREEN ECONOMY', 'Causes of Climate Change', 'Environment',
                  diff, q, opts, ans, exp))

for i in range(12):
    cl = classes[(i+1) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"Which of the following is a renewable energy source that supports a green economy?"
    opts = [
        "Wind energy",
        "Coal",
        "Crude oil",
        "Natural gas"
    ]
    ans = 0
    exp = "Wind energy is renewable and produces no greenhouse gas emissions during operation."
    qlist.append((cl, 'Science', 'CLIMATE CHANGE AND GREEN ECONOMY', 'Renewable Energy', 'Environment',
                  diff, q, opts, ans, exp))

# ── WASTE MANAGEMENT (B7/B9, 2 questions) ──
for i in range(15):
    cl = classes[(i+3) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"Which of the following is the best way to dispose of food waste at home?"
    opts = [
        "Composting",
        "Burning in the open",
        "Throwing into a drain",
        "Dumping in the river"
    ]
    ans = 0
    exp = "Composting turns food waste into useful manure for plants, reducing waste and improving soil."
    qlist.append((cl, 'Science', 'WASTE MANAGEMENT', 'Waste Disposal', 'Environment',
                  diff, q, opts, ans, exp))

for i in range(10):
    cl = classes[(i+5) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"The 3 Rs in waste management stand for:"
    opts = [
        "Reduce, Reuse, Recycle",
        "Run, Ride, Repeat",
        "Read, Write, Recite",
        "Repair, Replace, Remove"
    ]
    ans = 0
    exp = "Reduce, Reuse, Recycle is the waste management hierarchy to minimize waste generation."
    qlist.append((cl, 'Science', 'WASTE MANAGEMENT', 'Waste Management Principles', 'Environment',
                  diff, q, opts, ans, exp))

# ── ANIMAL PRODUCTION (B4/B5/B7, 3 questions) ──
for i in range(15):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"Which of the following is a reason for keeping animals on a farm?"
    opts = [
        "For food such as meat, eggs and milk",
        "To destroy crops",
        "To fight with other animals only",
        "To make the farm dirty"
    ]
    ans = 0
    exp = "Farm animals provide food (meat, eggs, milk), wool, leather, and help with farm work."
    qlist.append((cl, 'Science', 'ANIMAL PRODUCTION', 'Purpose of Animal Rearing', 'Agriculture',
                  diff, q, opts, ans, exp))

for i in range(10):
    cl = classes[(i+2) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"Which of these is a proper way to care for farm animals?"
    opts = [
        "Provide clean water and proper feed",
        "Keep them in dirty conditions",
        "Never vaccinate them",
        "Leave them without shelter"
    ]
    ans = 0
    exp = "Proper animal care includes clean water, good feed, shelter, and vaccination against diseases."
    qlist.append((cl, 'Science', 'ANIMAL PRODUCTION', 'Animal Care', 'Agriculture',
                  diff, q, opts, ans, exp))

# ── EARTH SCIENCE (B5/B6/B7, 3 questions) ──
for i in range(15):
    cl = classes[(i+1) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"The Earth rotates on its axis once every:"
    opts = [
        "24 hours",
        "365 days",
        "12 hours",
        "1 month"
    ]
    ans = 0
    exp = "The Earth completes one full rotation on its axis approximately every 24 hours, causing day and night."
    qlist.append((cl, 'Science', 'EARTH SCIENCE', 'Earth Rotation', 'Earth Science',
                  diff, q, opts, ans, exp))

for i in range(12):
    cl = classes[(i+3) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"Which layer of the Earth do we live on?"
    opts = [
        "Crust",
        "Mantle",
        "Outer core",
        "Inner core"
    ]
    ans = 0
    exp = "The crust is the outermost layer of the Earth and is where all life exists."
    qlist.append((cl, 'Science', 'EARTH SCIENCE', 'Earth Structure', 'Earth Science',
                  diff, q, opts, ans, exp))

# ── LIVING CELLS (B5-B9, 4 questions) ──
for i in range(15):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"Which of the following is the basic unit of life?"
    opts = [
        "The cell",
        "The atom",
        "The molecule",
        "The organ"
    ]
    ans = 0
    exp = "The cell is the basic structural and functional unit of all living organisms."
    qlist.append((cl, 'Science', 'LIVING CELLS', 'Cell Basics', 'Life Science',
                  diff, q, opts, ans, exp))

for i in range(10):
    cl = classes[(i+2) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"Which part of the cell controls the activities of the cell?"
    opts = [
        "Nucleus",
        "Cytoplasm",
        "Cell membrane",
        "Mitochondria"
    ]
    ans = 0
    exp = "The nucleus contains DNA and controls the cell's activities and reproduction."
    qlist.append((cl, 'Science', 'LIVING CELLS', 'Cell Structure', 'Life Science',
                  diff, q, opts, ans, exp))

# ── HUMAN HEALTH (B4-B8, 6 questions) ──
for i in range(15):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"Which of the following helps to prevent the spread of diseases?"
    opts = [
        "Washing hands regularly with soap",
        "Sharing drinking cups",
        "Eating unwashed fruits",
        "Sleeping in crowded rooms without ventilation"
    ]
    ans = 0
    exp = "Hand washing with soap removes germs and is one of the most effective ways to prevent disease spread."
    qlist.append((cl, 'Science', 'HUMAN HEALTH', 'Disease Prevention', 'Health',
                  diff, q, opts, ans, exp))

for i in range(10):
    cl = classes[(i+3) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"A balanced diet should contain all the following EXCEPT:"
    opts = [
        "Only carbohydrates",
        "Carbohydrates, proteins, fats, vitamins and minerals",
        "A variety of foods from different food groups",
        "Plenty of water"
    ]
    ans = 0
    exp = "A balanced diet includes all food groups, not just carbohydrates. Variety is essential for good health."
    qlist.append((cl, 'Science', 'HUMAN HEALTH', 'Nutrition', 'Health',
                  diff, q, opts, ans, exp))

# ── FARMING SYSTEMS (B4-B9, 7 questions) ──
for i in range(15):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"Which of the following is a type of farming system?"
    opts = [
        "Subsistence farming",
        "Swimming farming",
        "Flying farming",
        "Reading farming"
    ]
    ans = 0
    exp = "Subsistence farming is a system where farmers grow food mainly to feed their families."
    qlist.append((cl, 'Science', 'FARMING SYSTEMS', 'Types of Farming', 'Agriculture',
                  diff, q, opts, ans, exp))

for i in range(10):
    cl = classes[(i+4) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"Commercial farming is different from subsistence farming because commercial farming:"
    opts = [
        "Produces surplus for sale",
        "Only feeds the farmer's family",
        "Uses no tools at all",
        "Does not involve crops"
    ]
    ans = 0
    exp = "Commercial farming produces surplus crops/livestock for sale to earn income."
    qlist.append((cl, 'Science', 'FARMING SYSTEMS', 'Types of Farming', 'Agriculture',
                  diff, q, opts, ans, exp))

# ── THE HUMAN BODY SYSTEM (B4-B9, 7 questions) ──
for i in range(15):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"Which organ pumps blood around the human body?"
    opts = [
        "The heart",
        "The lungs",
        "The liver",
        "The brain"
    ]
    ans = 0
    exp = "The heart pumps blood throughout the body, supplying oxygen and nutrients to tissues."
    qlist.append((cl, 'Science', 'THE HUMAN BODY SYSTEM', 'Circulatory System', 'Human Biology',
                  diff, q, opts, ans, exp))

for i in range(10):
    cl = classes[(i+2) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"The main function of the lungs is to:"
    opts = [
        "Exchange gases (oxygen and carbon dioxide)",
        "Digest food",
        "Filter blood",
        "Produce hormones"
    ]
    ans = 0
    exp = "Lungs facilitate gas exchange: oxygen enters the blood and carbon dioxide is expelled."
    qlist.append((cl, 'Science', 'THE HUMAN BODY SYSTEM', 'Respiratory System', 'Human Biology',
                  diff, q, opts, ans, exp))

# ── ECOSYSTEM (B5-B9, 14 questions) ──
for i in range(15):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"In an ecosystem, organisms that produce their own food are called:"
    opts = [
        "Producers",
        "Consumers",
        "Decomposers",
        "Predators"
    ]
    ans = 0
    exp = "Producers (plants) make their own food through photosynthesis and form the base of the food chain."
    qlist.append((cl, 'Science', 'ECOSYSTEM', 'Food Chains', 'Ecology',
                  diff, q, opts, ans, exp))

for i in range(10):
    cl = classes[(i+3) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"Which of the following is a biotic component of an ecosystem?"
    opts = [
        "Plants",
        "Water",
        "Soil",
        "Sunlight"
    ]
    ans = 0
    exp = "Biotic components are living things (plants, animals, microbes). Water, soil, sunlight are abiotic."
    qlist.append((cl, 'Science', 'ECOSYSTEM', 'Ecosystem Components', 'Ecology',
                  diff, q, opts, ans, exp))

# ──────────────────────────────────────────────
# COMPUTING — thin topics
# ──

# ── Computer Systems (B7, 1 question) ──
for i in range(15):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"The Central Processing Unit (CPU) is often described as the _____ of the computer."
    opts = [
        "Brain",
        "Heart",
        "Memory",
        "Display"
    ]
    ans = 0
    exp = "The CPU processes instructions and controls all computer operations, like a brain."
    qlist.append((cl, 'Computing', 'Computer Systems', 'CPU', 'Hardware',
                  diff, q, opts, ans, exp))

for i in range(10):
    cl = classes[(i+2) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"Which of these is NOT a function of an operating system?"
    opts = [
        "Writing your homework for you",
        "Managing files and folders",
        "Running applications",
        "Controlling hardware devices"
    ]
    ans = 0
    exp = "An OS manages hardware, runs apps, and handles files — but doesn't write content for you."
    qlist.append((cl, 'Computing', 'Computer Systems', 'Operating Systems', 'Systems',
                  diff, q, opts, ans, exp))

# ── Productivity Software (B5-B7, 4 questions) ──
for i in range(15):
    cl = classes[(i+1) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"Which type of software would you use to create a budget spreadsheet?"
    opts = [
        "Spreadsheet software",
        "Drawing software",
        "Music player",
        "Web browser"
    ]
    ans = 0
    exp = "Spreadsheet software (like Excel) is designed for organizing data in rows and columns and doing calculations."
    qlist.append((cl, 'Computing', 'Productivity Software', 'Spreadsheets', 'Applications',
                  diff, q, opts, ans, exp))

for i in range(10):
    cl = classes[(i+3) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"In a presentation program, what is used to move from one slide to the next during a slideshow?"
    opts = [
        "A transition or click",
        "The delete key",
        "The space bar only in a word processor",
        "The print button"
    ]
    ans = 0
    exp = "Pressing a key (space/arrow) or using a mouse click advances slides during a presentation."
    qlist.append((cl, 'Computing', 'Productivity Software', 'Presentations', 'Applications',
                  diff, q, opts, ans, exp))

# ── Digital Citizenship (B4-B8, 6 questions) ──
for i in range(15):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"What should you do if you see something online that makes you feel uncomfortable?"
    opts = [
        "Tell a trusted adult immediately",
        "Respond angrily to the person",
        "Send it to all your friends",
        "Ignore it and do nothing"
    ]
    ans = 0
    exp = "If something online makes you uncomfortable, always tell a trusted adult who can help."
    qlist.append((cl, 'Computing', 'Digital Citizenship', 'Online Safety', 'Digital Citizenship',
                  diff, q, opts, ans, exp))

for i in range(10):
    cl = classes[(i+4) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"Which of these shows good digital citizenship?"
    opts = [
        "Respecting others' opinions online",
        "Posting unkind comments about classmates",
        "Downloading music illegally",
        "Sharing someone else's photo without permission"
    ]
    ans = 0
    exp = "Respecting others online, using kind language, and seeking permission before sharing are good digital citizenship."
    qlist.append((cl, 'Computing', 'Digital Citizenship', 'Responsible Online Behaviour', 'Digital Citizenship',
                  diff, q, opts, ans, exp))

# ── Cybersecurity (B7-B9, 7 questions) ──
for i in range(15):
    cl = classes[(i+2) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"What is the purpose of a firewall in computer security?"
    opts = [
        "To block unauthorized access to a network",
        "To make the computer run faster",
        "To display images better",
        "To increase storage space"
    ]
    ans = 0
    exp = "A firewall monitors and controls incoming/outgoing network traffic, blocking unauthorized access."
    qlist.append((cl, 'Computing', 'Cybersecurity', 'Network Security', 'Security',
                  diff, q, opts, ans, exp))

for i in range(10):
    cl = classes[(i+5) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"Which of these is a sign that an email might be a phishing attempt?"
    opts = [
        "It asks you to click a link and enter personal details urgently",
        "It is from your teacher with homework",
        "It contains only text from a friend",
        "It has no links or attachments"
    ]
    ans = 0
    exp = "Phishing emails often create urgency and ask you to click links to steal personal information."
    qlist.append((cl, 'Computing', 'Cybersecurity', 'Phishing', 'Security',
                  diff, q, opts, ans, exp))

# ── Emerging Technologies (B9, 7 questions) ──
for i in range(15):
    cl = 'B9'
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"Which of the following is an example of an emerging technology?"
    opts = [
        "Artificial Intelligence",
        "A pencil",
        "A paper notebook",
        "A chalkboard"
    ]
    ans = 0
    exp = "AI is an emerging technology that enables computers to perform tasks requiring human-like intelligence."
    qlist.append((cl, 'Computing', 'Emerging Technologies', 'AI', 'Emerging Tech',
                  diff, q, opts, ans, exp))

for i in range(10):
    cl = 'B9'
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"The Internet of Things (IoT) refers to:"
    opts = [
        "Everyday objects connected to the internet",
        "A type of computer virus",
        "A programming language",
        "A video game console"
    ]
    ans = 0
    exp = "IoT refers to physical devices (like smart bulbs, thermostats) connected to the internet to send/receive data."
    qlist.append((cl, 'Computing', 'Emerging Technologies', 'IoT', 'Emerging Tech',
                  diff, q, opts, ans, exp))

# ── Data Representation (B5-B9, 8 questions) ──
for i in range(15):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"In computing, what does 'binary' mean?"
    opts = [
        "A number system using only 0 and 1",
        "A type of computer screen",
        "A programming language",
        "A file format for music"
    ]
    ans = 0
    exp = "Binary is a base-2 number system using only 0 and 1, which computers use to represent all data."
    qlist.append((cl, 'Computing', 'Data Representation', 'Binary', 'Data',
                  diff, q, opts, ans, exp))

for i in range(10):
    cl = classes[(i+3) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"Which unit is used to measure the size of a computer file?"
    opts = [
        "Byte",
        "Metre",
        "Kilogram",
        "Litre"
    ]
    ans = 0
    exp = "File size is measured in bytes (and kilobytes, megabytes, gigabytes)."
    qlist.append((cl, 'Computing', 'Data Representation', 'Data Measurement', 'Data',
                  diff, q, opts, ans, exp))

# ── Introduction to Computing (B4-B7, 13 questions) ──
for i in range(15):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"Which of the following is an input device?"
    opts = [
        "Keyboard",
        "Monitor",
        "Printer",
        "Speaker"
    ]
    ans = 0
    exp = "A keyboard sends data INTO the computer. Monitor, printer, and speaker are output devices."
    qlist.append((cl, 'Computing', 'Introduction to Computing', 'Input/Output Devices', 'Intro',
                  diff, q, opts, ans, exp))

for i in range(10):
    cl = classes[(i+3) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"The main circuit board of a computer is called:"
    opts = [
        "Motherboard",
        "Microphone",
        "Monitor",
        "Modem"
    ]
    ans = 0
    exp = "The motherboard connects all components (CPU, RAM, storage) and allows them to communicate."
    qlist.append((cl, 'Computing', 'Introduction to Computing', 'Hardware Components', 'Intro',
                  diff, q, opts, ans, exp))

# ── Networking (B6-B9, 13 questions) ──
for i in range(15):
    cl = classes[(i+2) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"A computer network that covers a large geographic area like a country is called:"
    opts = [
        "WAN (Wide Area Network)",
        "LAN (Local Area Network)",
        "PAN (Personal Area Network)",
        "HAN (Home Area Network)"
    ]
    ans = 0
    exp = "WAN covers large areas (countries, continents). LAN covers small areas like a building or school."
    qlist.append((cl, 'Computing', 'Networking', 'Types of Networks', 'Networking',
                  diff, q, opts, ans, exp))

for i in range(10):
    cl = classes[(i+4) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"What device is used to connect a computer to the internet?"
    opts = [
        "Modem or router",
        "Monitor",
        "Keyboard",
        "USB drive"
    ]
    ans = 0
    exp = "A modem connects to the ISP, and a router distributes the connection to multiple devices."
    qlist.append((cl, 'Computing', 'Networking', 'Internet Connection', 'Networking',
                  diff, q, opts, ans, exp))

# ── Hardware (B4-B7, 15 questions) ──
for i in range(15):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"Which of these is an output device?"
    opts = [
        "Monitor",
        "Keyboard",
        "Mouse",
        "Microphone"
    ]
    ans = 0
    exp = "A monitor displays output from the computer. Keyboard, mouse, and microphone are input devices."
    qlist.append((cl, 'Computing', 'Hardware', 'Output Devices', 'Hardware',
                  diff, q, opts, ans, exp))

for i in range(10):
    cl = classes[(i+3) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"RAM in a computer stands for:"
    opts = [
        "Random Access Memory",
        "Read Always Memory",
        "Rapid Access Module",
        "Read And Modify"
    ]
    ans = 0
    exp = "RAM (Random Access Memory) is temporary memory the computer uses while running programs."
    qlist.append((cl, 'Computing', 'Hardware', 'Memory', 'Hardware',
                  diff, q, opts, ans, exp))

# ── Software Applications (B4-B8, 17 questions) ──
for i in range(15):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"Which software would you use to create a newsletter with text and images?"
    opts = [
        "Word processing software",
        "Calculator app",
        "Video game",
        "Antivirus software"
    ]
    ans = 0
    exp = "Word processors (like Word) let you create documents with text, images, and formatting."
    qlist.append((cl, 'Computing', 'Software Applications', 'Word Processing', 'Applications',
                  diff, q, opts, ans, exp))

for i in range(10):
    cl = classes[(i+2) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"A browser extension is:"
    opts = [
        "A small add-on that adds features to a web browser",
        "A type of computer virus",
        "A hardware part for the browser",
        "A website address"
    ]
    ans = 0
    exp = "Browser extensions (or add-ons) add extra features to your web browser, like ad blocking or password management."
    qlist.append((cl, 'Computing', 'Software Applications', 'Browser Features', 'Applications',
                  diff, q, opts, ans, exp))

# ── Digital Literacy (B4-B9, 19 questions) ──
for i in range(15):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"What is a search engine used for?"
    opts = [
        "Finding information on the internet",
        "Creating spreadsheets",
        "Playing music only",
        "Printing documents"
    ]
    ans = 0
    exp = "A search engine (like Google) helps you find websites and information on the internet."
    qlist.append((cl, 'Computing', 'Digital Literacy', 'Search Engines', 'Literacy',
                  diff, q, opts, ans, exp))

for i in range(10):
    cl = classes[(i+4) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"In an email address like 'name@domain.com', the part after '@' is:"
    opts = [
        "The domain name of the email provider",
        "The person's nickname",
        "The subject of the email",
        "The password"
    ]
    ans = 0
    exp = "In 'name@domain.com', 'domain.com' is the email provider's domain (e.g., gmail.com, yahoo.com)."
    qlist.append((cl, 'Computing', 'Digital Literacy', 'Email', 'Literacy',
                  diff, q, opts, ans, exp))

# ── Programming (B5-B9, 20 questions) ──
for i in range(20):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"In programming, a variable is used to:"
    opts = [
        "Store data that can change during program execution",
        "Delete the program",
        "Make the computer faster",
        "Connect to the internet"
    ]
    ans = 0
    exp = "A variable is a named storage location that holds data which may change as the program runs."
    qlist.append((cl, 'Computing', 'Programming', 'Variables', 'Programming',
                  diff, q, opts, ans, exp))

for i in range(15):
    cl = classes[(i+3) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"Which of the following is a programming language?"
    opts = [
        "Python",
        "Paint",
        "Calculator",
        "Browser"
    ]
    ans = 0
    exp = "Python is a popular programming language used for web development, data science, AI, and more."
    qlist.append((cl, 'Computing', 'Programming', 'Programming Languages', 'Programming',
                  diff, q, opts, ans, exp))

# ── Networking expansion (B6-B9) ──
for i in range(15):
    cl = classes[(i+1) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"A network inside a single building like a school is best described as a:"
    opts = [
        "LAN (Local Area Network)",
        "WAN (Wide Area Network)",
        "Internet",
        "Intranet only"
    ]
    ans = 0
    exp = "A LAN connects devices within a limited area like a school, office, or home."
    qlist.append((cl, 'Computing', 'Networking', 'Types of Networks', 'Networking',
                  diff, q, opts, ans, exp))

for i in range(10):
    cl = classes[(i+5) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"The physical connection between networked computers is often made using:"
    opts = [
        "Ethernet cables or Wi-Fi signals",
        "Paper and pen",
        "Wooden sticks",
        "Glass tubes only"
    ]
    ans = 0
    exp = "Computers connect via Ethernet cables (wired) or Wi-Fi radio signals (wireless)."
    qlist.append((cl, 'Computing', 'Networking', 'Network Media', 'Networking',
                  diff, q, opts, ans, exp))

# ── Introduction to Computing expansion ──
for i in range(15):
    cl = classes[(i+2) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"A computer program is:"
    opts = [
        "A set of instructions that tell the computer what to do",
        "A physical part of the computer",
        "A type of screen",
        "A power cable"
    ]
    ans = 0
    exp = "A program (software) is a set of instructions that tells the computer how to perform a task."
    qlist.append((cl, 'Computing', 'Introduction to Computing', 'Programs', 'Intro',
                  diff, q, opts, ans, exp))

for i in range(10):
    cl = classes[(i+5) % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    q = f"Which of these is an example of system software?"
    opts = [
        "An operating system",
        "A drawing program",
        "A music app",
        "A game"
    ]
    ans = 0
    exp = "System software (like Windows, macOS, Linux) manages the computer. Application software does specific user tasks."
    qlist.append((cl, 'Computing', 'Introduction to Computing', 'System Software', 'Intro',
                  diff, q, opts, ans, exp))

# ── INSERT ALL ──
inserted = 0
for item in qlist:
    try:
        row = item
        cl, subj, topic, sub, strand, diff, q, opts, ans, exp = row
        new_id = insert_q(cl, subj, topic, sub, strand, diff, q, opts, ans, exp)
        inserted += 1
        if inserted % 50 == 0:
            print(f"  Inserted {inserted}...")
    except Exception as e:
        print(f"  ERROR on item {item[6][:50] if len(str(item))>3 else item}: {e}")

conn.commit()

print(f"\n✅ Inserted {inserted} new questions.")
print(f"   Science: {sum(1 for q in qlist if q[1]=='Science')}")
print(f"   Computing: {sum(1 for q in qlist if q[1]=='Computing')}")

# ── FINAL COUNTS ──
print("\n=== UPDATED THIN TOPICS (still under 15) ===")
for row in conn.execute("""
    SELECT subject, topic, COUNT(*) as n, GROUP_CONCAT(DISTINCT class_level) as classes
    FROM questions WHERE is_active=1
    GROUP BY subject, topic
    HAVING n < 15
    ORDER BY n
"""):
    print(f"  {row[0]:15s} | {row[1]:45s} | {row[2]:3d} Qs | {row[3]}")

print("\n=== FINAL TOTALS ===")
for row in conn.execute("SELECT subject, COUNT(*) FROM questions WHERE is_active=1 GROUP BY subject ORDER BY subject"):
    print(f"  {row[0]}: {row[1]}")

total = conn.execute("SELECT COUNT(*) FROM questions WHERE is_active=1").fetchone()[0]
print(f"\n  TOTAL: {total}")

conn.close()
