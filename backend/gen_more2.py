#!/usr/bin/env python3
"""Generate targeted questions for thin Science + Computing sub-topics.
Target: get every sub-topic to at least 15 questions.
"""
import sqlite3, random, hashlib

db = sqlite3.connect('/media/stephen/FILES/MyShit/ghana-stem-trivia/backend/trivia.db')
conn = db

classes = ['B4', 'B5', 'B6', 'B7', 'B8', 'B9']

def insert_q(class_level, subject, topic, sub_topic, strand, difficulty, question, opts, answer_idx, explanation):
    max_id = conn.execute("SELECT COALESCE(MAX(id), 0) FROM questions").fetchone()[0]
    new_id = max_id + random.randint(1, 9999)
    while conn.execute("SELECT 1 FROM questions WHERE id=?", (new_id,)).fetchone():
        new_id += 1
    conn.execute("""
        INSERT INTO questions (id, class_level, subject, topic, sub_topic, strand, difficulty,
                              question, option_a, option_b, option_c, option_d,
                              answer_index, explanation, question_type, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    """, (new_id, class_level, subject, topic, sub_topic, strand, difficulty,
          question, opts[0], opts[1], opts[2], opts[3], answer_idx, explanation, "mcq"))

def pick(seq, idx):
    """Pick from a sequence based on id mod length."""
    return seq[idx % len(seq)]

generated = 0

# ══════════════════════════════════════════════════════════
# SCIENCE - thin sub-topics
# ══════════════════════════════════════════════════════════

# --- CONVERSION AND CONSERVATION OF ENERGY (1 → target 15+) ---
conv_energy = [
    ("What happens to energy when a ball falls?", ["It transforms from potential to kinetic energy", "It disappears", "It becomes lighter", "It stops moving"], 0, "Energy transforms from one form to another but is never lost."),
    ("A swinging pendulum demonstrates:", ["Energy transformation", "Energy creation", "Energy destruction", "Energy freezing"], 0, "A pendulum continuously converts between potential and kinetic energy."),
    ("When you rub your hands together, they get warm because:", ["Friction transforms kinetic energy to thermal energy", "Magic", "Hands produce cold", "Air warms them"], 0, "Friction converts mechanical energy into heat energy."),
    ("Which device converts electrical energy to light energy?", ["A lamp", "A heater", "A fan", "A radio"], 0, "A lamp converts electrical energy into light and some heat."),
    ("In a food chain, energy flows from:", ["Producers to consumers", "Consumers to producers", "Decomposers to producers", "Sun to decomposers only"], 0, "Energy flows from producers (plants) to consumers (animals)."),
    ("A car engine primarily converts:", ["Chemical energy to kinetic energy", "Kinetic to chemical", "Light to chemical", "Thermal to potential"], 0, "Car engines burn fuel (chemical) to produce motion (kinetic)."),
    ("The law of conservation of energy states:", ["Energy cannot be created or destroyed", "Energy can be created", "Energy disappears", "Energy is unlimited"], 0, "Energy can only be transformed from one form to another."),
    ("A toaster converts electrical energy mainly into:", ["Heat energy", "Light energy", "Sound energy", "Kinetic energy"], 0, "Toasters use resistance to convert electricity into heat."),
    ("When a battery powers a flashlight, energy transforms from:", ["Chemical to electrical to light", "Light to chemical", "Electrical to chemical", "Heat to light"], 0, "Battery chemical → electrical → light in a flashlight."),
    ("A hydroelectric dam converts:", ["Kinetic energy of water to electrical energy", "Electrical to water", "Light to water", "Heat to electricity"], 0, "Moving water turns turbines to generate electricity."),
    ("When a plant carries out photosynthesis, it converts:", ["Light energy to chemical energy", "Chemical to light", "Heat to chemical", "Sound to light"], 0, "Plants use sunlight to convert CO2 and water into chemical energy (glucose)."),
    ("A speaker converts electrical energy into:", ["Sound energy", "Light energy", "Chemical energy", "Nuclear energy"], 0, "Speakers use electromagnets to convert electricity into sound."),
    ("Friction always produces:", ["Heat", "Light", "Magnetism", "Electricity"], 0, "Friction between surfaces generates thermal energy (heat)."),
    ("A generator converts:", ["Mechanical energy to electrical energy", "Electrical to mechanical", "Chemical to light", "Light to chemical"], 0, "Generators use electromagnetic induction to produce electricity."),
    ("The total energy before and after a transformation:", ["Remains the same", "Decreases", "Increases", "Disappears"], 0, "Conservation of energy: total energy is constant in any transformation."),
    ("A bouncing ball eventually stops because:", ["Energy is transformed to heat and sound", "Energy is destroyed", "It runs out of mass", "Gravity stops it"], 0, "Bouncing converts kinetic energy to heat and sound through friction."),
    ("Which is an example of potential energy?", ["A book on a shelf", "A moving car", "A flowing river", "A spinning top"], 0, "A book on a shelf has stored gravitational potential energy."),
    ("Steam pushing a lid off a kettle shows:", ["Thermal energy doing work", "Cold energy", "Electrical energy", "Nuclear energy"], 0, "Steam (thermal energy) moves the lid (kinetic energy)."),
    ("A wind turbine transforms:", ["Kinetic energy of wind to electrical energy", "Electrical to wind", "Light to wind", "Chemical to wind"], 0, "Wind turbines capture kinetic energy of moving air to generate electricity."),
    ("Green plants are called producers because they:", ["Convert light to chemical energy", "Eat other organisms", "Break down dead matter", "Absorb minerals only"], 0, "Plants produce their own food using photosynthesis."),
]

for i, (q, opts, ans, exp) in enumerate(conv_energy):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    insert_q(cl, 'Science', 'CONVERSION AND CONSERVATION OF ENERGY', 'General', 'Energy', diff, q, opts, ans, exp)
    generated += 1

# --- CROP PRODUCTION (1 → target 15+) ---
crop = [
    ("Which of the following is a method of crop production?", ["Crop rotation", "Overwatering", "Burning crops", "Ignoring pests"], 0, "Crop rotation helps maintain soil fertility and reduce pests."),
    ("What is the purpose of irrigation in crop production?", ["To supply water to crops", "To remove weeds", "To fertilize soil", "To harvest crops"], 0, "Irrigation provides water to crops during dry periods."),
    ("Crop rotation helps to:", ["Maintain soil fertility", "Kill all insects", "Reduce water", "Remove nutrients"], 0, "Rotating crops prevents soil nutrient depletion."),
    ("Which nutrient is most important for plant growth?", ["Nitrogen", "Gold", "Silver", "Copper"], 0, "Nitrogen is essential for plant protein synthesis and growth."),
    ("A greenhouse is used in crop production to:", ["Control temperature and humidity", "Kill plants", "Block sunlight completely", "Store harvested crops"], 0, "Greenhouses provide a controlled environment for optimal plant growth."),
    ("Which of these is a reason for weeding?", ["Weeds compete with crops for nutrients", "Weeds add nutrients", "Weeds help crops grow", "Weeds improve soil"], 0, "Weeds compete with crops for water, nutrients, and sunlight."),
    ("Farmers add manure to soil to:", ["Add nutrients and organic matter", "Make soil lighter", "Kill plants", "Change soil color"], 0, "Manure adds nutrients and improves soil structure."),
    ("What is the advantage of using improved crop varieties?", ["Higher yields and disease resistance", "Lower nutritional value", "Shorter growing seasons only", "No care needed"], 0, "Improved varieties produce more food and resist diseases."),
    ("Which practice helps prevent soil erosion?", ["Planting cover crops", "Removing all vegetation", "Over-tilling", "Flooding fields"], 0, "Cover crops protect soil from wind and water erosion."),
    ("The process of planting seeds in rows is called:", ["Drilling", "Broadcasting", "Draining", "Harvesting"], 0, "Drilling places seeds at controlled depth and spacing."),
    ("Crop protection involves:", ["Managing pests and diseases", "Growing more weeds", "Removing all water", "Burning soil"], 0, "Crop protection manages pests, diseases, and weeds."),
    ("Which soil type holds the most water?", ["Clay soil", "Sand soil", "Silt soil", "Loamy soil"], 0, "Clay soil has fine particles that retain more water."),
    ("Intercropping means:", ["Growing two or more crops together", "Planting one crop at a time", "Growing crops in water", "Planting only trees"], 0, "Intercropping grows multiple crops simultaneously on the same land."),
    ("What is a benefit of crop diversification?", ["Reduces risk of crop failure", "Increases pest problems", "Uses more water", "Requires more labor only"], 0, "Diversifying crops reduces economic risk if one crop fails."),
    ("Organic farming avoids:", ["Synthetic chemicals", "Seeds", "Water", "Sunlight"], 0, "Organic farming relies on natural processes instead of synthetic inputs."),
]

for i, (q, opts, ans, exp) in enumerate(crop):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    insert_q(cl, 'Science', 'CROP PRODUCTION', 'General', 'Agriculture', diff, q, opts, ans, exp)
    generated += 1

# --- UNDERSTANDING THE ENVIRONMENT (Classification) - 1 → target 15+ ---
env_class = [
    ("Which of the following is a living thing?", ["A mushroom", "A rock", "A river", "A cloud"], 0, "Mushrooms are fungi - living organisms that grow and reproduce."),
    ("Which is NOT a living thing?", ["A car", "A dog", "A tree", "A bird"], 0, "A car is man-made and does not display characteristics of life."),
    ("All living things need:", ["Water and food", "Cars", "Electricity", "Buildings"], 0, "Living organisms require water, nutrients, and energy."),
    ("Which characteristic shows something is alive?", ["It can grow and reproduce", "It is heavy", "It is colorful", "It is cold"], 0, "Growth and reproduction are key characteristics of living things."),
    ("Plants are classified as:", ["Producers", "Consumers", "Decomposers", "Predators"], 0, "Plants make their own food and are called producers."),
    ("Animals that eat plants are called:", ["Herbivores", "Carnivores", "Omnivores", "Decomposers"], 0, "Herbivores feed directly on plants."),
    ("Which is an example of a decomposer?", ["A mushroom", "A lion", "A tree", "A fish"], 0, "Mushrooms break down dead organic matter as decomposers."),
    ("In a food chain, the first organism is always a:", ["Producer", "Consumer", "Decomposer", "Predator"], 0, "Producers (plants) form the base of food chains."),
    ("Which is a producer?", ["A maize plant", "A cow", "A mushroom", "A beetle"], 0, "Maize plants produce their own food through photosynthesis."),
    ("Decomposers are important because they:", ["Break down dead matter and recycle nutrients", "Eat living plants", "Block sunlight", "Cool the soil"], 0, "Decomposers recycle nutrients back into the soil."),
    ("Which is a consumer?", ["A lion", "A tree", "A mushroom", "A bacterium"], 0, "A lion eats other organisms - it is a consumer."),
    ("An omnivore eats:", ["Both plants and animals", "Only plants", "Only animals", "Only fungi"], 0, "Omnivores have a diet of both plant and animal matter."),
    ("A food web shows:", ["Multiple interconnected food chains", "Only one food chain", "Energy loss only", "Water cycles"], 0, "A food web is a network of interconnected food chains."),
    ("Which is a carnivore?", ["A cheetah", "A cow", "A rabbit", "A caterpillar"], 0, "A cheetah eats only other animals - it is a carnivore."),
    ("Living things are classified based on:", ["Their characteristics", "Their color", "Their size only", "Their location"], 0, "Classification is based on observable characteristics and features."),
]

for i, (q, opts, ans, exp) in enumerate(env_class):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    insert_q(cl, 'Science', 'UNDERSTANDING THE ENVIRONMENT', 'Classification', 'Biology', diff, q, opts, ans, exp)
    generated += 1

# --- CLIMATE CHANGE AND GREEN ECONOMY (2 → target 15+) ---
climate = [
    ("What is climate change primarily caused by?", ["Greenhouse gas emissions", "Ocean tides", "Moon phases", "Animal migration"], 0, "Burning fossil fuels increases greenhouse gases, causing global warming."),
    ("Which gas contributes most to the greenhouse effect?", ["Carbon dioxide", "Oxygen", "Nitrogen", "Helium"], 0, "CO2 is the primary greenhouse gas from human activities."),
    ("Rising global temperatures can lead to:", ["Melting ice caps and rising sea levels", "Cooler winters", "More oxygen", "Less wind"], 0, "Melting ice raises sea levels and alters weather patterns."),
    ("Which is a renewable energy source?", ["Solar energy", "Coal", "Natural gas", "Oil"], 0, "Solar energy comes from the sun and is naturally replenished."),
    ("Deforestation contributes to climate change by:", ["Reducing CO2 absorption", "Adding oxygen", "Cooling the Earth", "Cleaning the air"], 0, "Trees absorb CO2; cutting them increases atmospheric CO2."),
    ("Recycling helps the environment by:", ["Reducing waste and resource use", "Creating more trash", "Using more energy", "Increasing pollution"], 0, "Recycling reduces the need for raw materials and energy."),
    ("A carbon footprint measures:", ["CO2 emissions from activities", "Oxygen levels", "Water purity", "Soil depth"], 0, "A carbon footprint is the total greenhouse gas emissions from an individual or activity."),
    ("Which is an example of reducing carbon emissions?", ["Using public transport", "Driving alone", "Using coal power", "Burning trash"], 0, "Public transport reduces per-person emissions compared to individual cars."),
    ("Global warming can cause:", ["More extreme weather events", "Milder hurricanes", "Less rainfall everywhere", "Cooler summers"], 0, "Climate change intensifies storms, droughts, and floods."),
    ("Green buildings aim to:", ["Reduce energy consumption", "Use more electricity", "Block all sunlight", "Increase waste"], 0, "Green buildings use less energy and water through efficient design."),
    ("Which is NOT an effect of climate change?", ["More extreme weather", "Rising sea levels", "More stable seasons", "Shifting habitats"], 0, "Climate change makes seasons and weather less predictable, not more stable."),
    ("The Paris Agreement aims to:", ["Limit global temperature rise", "Increase fossil fuel use", "Remove all forests", "Stop all cars"], 0, "The Paris Agreement targets keeping warming well below 2°C."),
    ("Climate change affects agriculture by:", ["Changing growing seasons and rainfall", "Making all crops grow faster", "Eliminating pests", "Increasing soil fertility"], 0, "Unpredictable weather and shifting seasons affect crop yields."),
    ("Melting polar ice caps cause:", ["Rising sea levels", "Lower temperatures", "More fish", "Less sunlight"], 0, "Melting ice adds water to oceans, raising sea levels."),
    ("Which practice helps reduce greenhouse gases?", ["Planting trees", "Burning forests", "Using coal", "Driving more"], 0, "Trees absorb CO2 from the atmosphere, helping offset emissions."),
]

for i, (q, opts, ans, exp) in enumerate(climate):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    insert_q(cl, 'Science', 'CLIMATE CHANGE AND GREEN ECONOMY', 'General', 'Environment', diff, q, opts, ans, exp)
    generated += 1

# --- WASTE MANAGEMENT (2 → target 15+) ---
waste = [
    ("Which is an example of recyclable waste?", ["Paper and glass", "Expired food", "Used tissues", "Broken ceramics"], 0, "Paper and glass can be processed and reused as recyclable materials."),
    ("Composting converts:", ["Organic waste to nutrient-rich soil", "Plastic to fuel", "Metal to glass", "Glass to plastic"], 0, "Composting breaks down organic matter into natural fertilizer."),
    ("Landfills are places where:", ["Waste is buried underground", "Recycling happens", "Incineration occurs", "Water is purified"], 0, "Landfills are designed sites for burying waste."),
    ("Which is a benefit of recycling?", ["Conserves natural resources", "Creates more waste", "Uses more energy", "Pollutes more"], 0, "Recycling reduces need for raw materials and saves energy."),
    ("Electronic waste (e-waste) includes:", ["Old phones and computers", "Banana peels", "Wood scraps", "Glass bottles"], 0, "E-waste consists of discarded electronic devices."),
    ("Reduce, Reuse, Recycle is a principle of:", ["Waste management", "Food cooking", "Exercise", "Music"], 0, "The three Rs guide sustainable waste management."),
    ("Which waste type is most harmful to the environment?", ["Non-biodegradable waste", "Banana peels", "Water", "Soil"], 0, "Non-biodegradable waste like plastic persists and harms ecosystems."),
    ("Incineration of waste:", ["Burns waste to reduce volume", "Recycles waste", "Composts waste", "Stores waste"], 0, "Incineration reduces waste volume through controlled burning."),
    ("Which practice helps reduce waste?", ["Buying products with less packaging", "Buying more packaged items", "Using disposable plastics", "Throwing everything away"], 0, "Less packaging means less waste generated."),
    ("Hazardous waste includes:", ["Chemicals and batteries", "Food scraps", "Paper", "Garden clippings"], 0, "Chemicals and batteries require special disposal as hazardous waste."),
    ("What happens to non-biodegradable plastic?", ["It persists in the environment for hundreds of years", "It decomposes quickly", "It dissolves in water", "It turns to soil"], 0, "Plastic waste can take hundreds of years to break down."),
    ("Biodegradable waste includes:", ["Food scraps and leaves", "Plastic bottles", "Metal cans", "Glass shards"], 0, "Food scraps and leaves naturally decompose."),
    ("Waste segregation means:", ["Separating waste by type for proper disposal", "Mixing all waste together", "Burning all waste", "Ignoring waste"], 0, "Segregation sorts waste for recycling, composting, or disposal."),
    ("A sewage treatment plant:", ["Treats wastewater before release", "Creates more pollution", "Produces clean drinking water directly", "Stores solid waste"], 0, "Treatment plants clean wastewater before returning it to the environment."),
    ("Vermicomposting uses:", ["Worms to decompose organic waste", "Fire to burn waste", "Chemicals to dissolve waste", "Water to wash waste"], 0, "Earthworms break down organic matter into nutrient-rich compost."),
]

for i, (q, opts, ans, exp) in enumerate(waste):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    insert_q(cl, 'Science', 'WASTE MANAGEMENT', 'General', 'Environment', diff, q, opts, ans, exp)
    generated += 1

# --- ANIMAL PRODUCTION (3 → target 15+) ---
animal_prod = [
    ("Which is an example of animal production?", ["Keeping chickens for eggs", "Planting tomatoes", "Mining iron", "Building houses"], 0, "Animal production involves raising animals for food, fiber, or labor."),
    ("Cattle farming provides which products?", ["Meat, milk, and hides", "Grains and fruits", "Fish and seaweed", "Eggs and honey"], 0, "Cattle provide meat, milk, leather, and other products."),
    ("Which is a benefit of poultry farming?", ["Provides eggs and meat", "Produces wheat", "Makes furniture", "Generates electricity"], 0, "Poultry farming produces eggs and meat efficiently."),
    ("Fish farming (aquaculture) involves:", ["Raising fish in controlled environments", "Hunting wild fish", "Growing plants in water", "Mining fish bones"], 0, "Aquaculture raises fish in ponds, tanks, or cages."),
    ("Which is a common disease in poultry?", ["Newcastle disease", "Malaria", "Cholera", "Typhoid"], 0, "Newcastle disease is a serious viral disease affecting poultry."),
    ("Animal feeds are classified as:", ["Concentrates and roughages", "Rocks and minerals", "Plastics and metals", "Gases and vapors"], 0, "Concentrates are nutrient-dense; roughages are high-fiber feeds."),
    ("Which is a benefit of goat farming?", ["Provides meat and milk", "Produces silk", "Grows wheat", "Produces wool only"], 0, "Goats provide meat, milk, and hide products."),
    ("Overcrowding in animal pens can lead to:", ["Disease spread and stress", "Better growth", "More meat", "Happier animals"], 0, "Overcrowding increases disease risk and animal stress."),
    ("Which is a sign of a healthy animal?", ["Bright eyes and clean coat", "Lethargy and dull coat", "Loss of appetite", "Isolation from group"], 0, "Healthy animals have bright eyes, clean coats, and active behavior."),
    ("Animal housing should provide:", ["Shelter and ventilation", "No space at all", "Direct sunlight only", "Standing water"], 0, "Proper housing protects animals from weather and allows airflow."),
    ("Which is a parasite that affects livestock?", ["Tick", "Asteroid", "Tornado", "Rainfall"], 0, "Ticks are external parasites that feed on livestock blood."),
    ("Fish pond water should be:", ["Well-aerated", "Completely still", "Filled with waste", "Untreated sewage"], 0, "Aeration provides dissolved oxygen necessary for fish survival."),
    ("Which is a reason for dipping livestock?", ["To control external parasites", "To increase weight", "To change color", "To reduce feeding"], 0, "Dipping livestock in pesticide solutions controls ticks and mites."),
    ("Animal breeding aims to:", ["Improve offspring quality", "Reduce farm size", "Eliminate all animals", "Stop reproduction"], 0, "Selective breeding improves desirable traits in livestock."),
    ("Which is an example of a scavenger in animal production?", ["Vulture", "Cow", "Chicken", "Pig"], 0, "Vultures are scavengers that feed on dead animals."),
]

for i, (q, opts, ans, exp) in enumerate(animal_prod):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    insert_q(cl, 'Science', 'ANIMAL PRODUCTION', 'General', 'Agriculture', diff, q, opts, ans, exp)
    generated += 1

# --- EARTH SCIENCE (3 → target 15+) ---
earth_sci = [
    ("Which layer of the Earth is the hottest?", ["The core", "The crust", "The mantle surface", "The lithosphere"], 0, "The Earth's core has the highest temperatures, reaching over 5000°C."),
    ("What causes earthquakes?", ["Movement of tectonic plates", "Ocean tides", "Wind erosion", "Rainfall"], 0, "Tectonic plate movement creates seismic waves that cause earthquakes."),
    ("Which is a type of rock formed from cooled magma?", ["Igneous rock", "Sedimentary rock", "Metamorphic rock", "Limestone"], 0, "Igneous rocks form when magma or lava cools and solidifies."),
    ("The water cycle includes which processes?", ["Evaporation, condensation, precipitation", "Photosynthesis, respiration", "Erosion, deposition", "Weathering, melting"], 0, "Evaporation, condensation, and precipitation are key water cycle stages."),
    ("Soil erosion is mainly caused by:", ["Water and wind", "Plants", "Animals", "Sunlight"], 0, "Water runoff and wind are primary causes of soil erosion."),
    ("Which mineral is the hardest on Earth?", ["Diamond", "Gold", "Copper", "Talc"], 0, "Diamond is the hardest natural mineral on Earth."),
    ("A volcano erupts when:", ["Magma rises to the surface", "Rain falls on rocks", "Wind blows hard", "Ice melts"], 0, "Volcanic eruptions occur when magma reaches the Earth's surface."),
    ("Which is a sedimentary rock?", ["Sandstone", "Granite", "Marble", "Basalt"], 0, "Sandstone forms from compressed sediment layers."),
    ("The ozone layer is important because it:", ["Blocks harmful UV radiation", "Produces oxygen", "Creates rain", "Stores heat"], 0, "The ozone layer absorbs harmful ultraviolet radiation from the sun."),
    ("Fossil fuels were formed from:", ["Ancient plants and animals", "Rocks and minerals", "Water and air", "Electricity"], 0, "Fossil fuels formed from ancient organic matter over millions of years."),
    ("Which natural resource is non-renewable?", ["Petroleum", "Solar energy", "Wind energy", "Forests"], 0, "Petroleum takes millions of years to form and cannot be replenished quickly."),
    ("A delta is formed by:", ["River sediment deposition", "Volcanic eruption", "Glacial movement", "Wind erosion"], 0, "Deltas form where rivers deposit sediment at their mouths."),
    ("The rock cycle describes:", ["Transformation between rock types", "How rocks are sold", "The color of rocks", "The weight of rocks"], 0, "The rock cycle explains how rocks change between igneous, sedimentary, and metamorphic forms."),
    ("Which is an example of weathering?", ["A rock breaking down by wind and water", "A river flowing", "A volcano erupting", "A glacier moving"], 0, "Weathering breaks down rocks in place through physical or chemical processes."),
    ("Earth's atmosphere is composed mainly of:", ["Nitrogen and oxygen", "Carbon dioxide and helium", "Hydrogen and ozone", "Argon and methane"], 0, "Nitrogen (~78%) and oxygen (~21%) make up most of Earth's atmosphere."),
]

for i, (q, opts, ans, exp) in enumerate(earth_sci):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    insert_q(cl, 'Science', 'EARTH SCIENCE', 'General', 'Earth Science', diff, q, opts, ans, exp)
    generated += 1

# --- THE SOLAR SYSTEM (3 → target 15+) ---
solar = [
    ("What is the asteroid belt?", ["A region between Mars and Jupiter with many small rocky bodies", "A belt around Earth", "A ring of comets", "A group of stars"], 0, "The asteroid belt lies between Mars and Jupiter and contains numerous small rocky bodies."),
    ("Which planet has the most moons?", ["Jupiter", "Saturn", "Mars", "Venus"], 0, "Jupiter has the most known moons of any planet in our solar system."),
    ("Which is the smallest planet?", ["Mercury", "Venus", "Mars", "Pluto"], 0, "Mercury is the smallest planet in the solar system."),
    ("What is a comet made of?", ["Ice, dust, and rocky material", "Pure rock", "Liquid water", "Metal and glass"], 0, "Comets are composed of ice, dust, and rocky material."),
    ("Which planet has the Great Red Spot?", ["Jupiter", "Mars", "Saturn", "Mercury"], 0, "Jupiter's Great Red Spot is a giant storm that has lasted centuries."),
    ("What separates the inner planets from the outer planets?", ["The asteroid belt", "The Kuiper belt", "The Oort cloud", "The Milky Way"], 0, "The asteroid belt divides the terrestrial inner planets from the gas giant outer planets."),
    ("Which planet is tilted on its side?", ["Uranus", "Neptune", "Mars", "Venus"], 0, "Uranus has an extreme axial tilt of about 98 degrees."),
    ("What is the Kuiper belt?", ["A region beyond Neptune containing icy bodies", "A belt around the Sun", "A ring of moons", "A cluster of stars"], 0, "The Kuiper belt is a region beyond Neptune with many icy dwarf planets."),
    ("Which planet has rings made mostly of ice?", ["Saturn", "Jupiter", "Mars", "Mercury"], 0, "Saturn's rings are the most prominent, made mostly of ice particles."),
    ("What is a meteor shower?", ["Many meteors entering Earth's atmosphere at once", "A shower of rocks from the Moon", "A solar flare", "A comet collision"], 0, "Meteor showers occur when Earth passes through debris from comets."),
    ("Which is the largest moon in the solar system?", ["Ganymede", "Titan", "Europa", "Our Moon"], 0, "Ganymede, a moon of Jupiter, is the largest moon in the solar system."),
    ("How many planets in our solar system?", ["8", "7", "9", "10"], 0, "There are 8 recognized planets in our solar system."),
    ("The Sun is classified as what type of star?", ["Yellow dwarf", "Red giant", "Blue supergiant", "White dwarf"], 0, "The Sun is a G-type main-sequence star, commonly called a yellow dwarf."),
    ("Which planet takes the longest to orbit the Sun?", ["Neptune", "Uranus", "Saturn", "Jupiter"], 0, "Neptune, being the farthest planet, has the longest orbital period at ~165 years."),
    ("A light-year is a measure of:", ["Distance", "Time", "Speed", "Temperature"], 0, "A light-year is the distance light travels in one year (~9.46 trillion km)."),
]

for i, (q, opts, ans, exp) in enumerate(solar):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    insert_q(cl, 'Science', 'THE SOLAR SYSTEM', 'General', 'Astronomy', diff, q, opts, ans, exp)
    generated += 1

# --- LIVING CELLS (4 → target 15+) ---
living_cells = [
    ("The basic unit of life is:", ["A cell", "A tissue", "An organ", "A molecule"], 0, "Cells are the smallest structural and functional units of living organisms."),
    ("Which organelle produces energy in a cell?", ["Mitochondria", "Nucleus", "Ribosome", "Vacuole"], 0, "Mitochondria are the powerhouses of the cell, producing ATP."),
    ("Plant cells have which structure that animal cells do not?", ["Cell wall and chloroplasts", "Nucleus", "Mitochondria", "Cytoplasm"], 0, "Plant cells have cell walls and chloroplasts for photosynthesis."),
    ("Which controls cell activities?", ["The nucleus", "The cell membrane", "The cytoplasm", "The ribosome"], 0, "The nucleus contains DNA and controls all cell functions."),
    ("Diffusion is the movement of:", ["Molecules from high to low concentration", "Molecules from low to high", "Water only", "Heat only"], 0, "Diffusion is the net movement of molecules down their concentration gradient."),
    ("Osmosis is the movement of:", ["Water across a semi-permeable membrane", "Sugar molecules", "Oxygen out of cells", "Proteins into the nucleus"], 0, "Osmosis is the diffusion of water through a selectively permeable membrane."),
    ("Which is found in both plant and animal cells?", ["Nucleus", "Chloroplast", "Cell wall", "Large central vacuole"], 0, "The nucleus is present in both plant and animal cells."),
    ("A cell membrane is:", ["Selectively permeable", "Completely solid", "Non-existent", "Always rigid"], 0, "The cell membrane controls what enters and leaves the cell."),
    ("Which organelle packages and ships proteins?", ["Golgi apparatus", "Mitochondria", "Lysosome", "Vacuole"], 0, "The Golgi apparatus modifies, packages, and distributes proteins."),
    ("What is the function of ribosomes?", ["Protein synthesis", "Energy production", "Waste disposal", "Cell division"], 0, "Ribosomes are the sites of protein synthesis in the cell."),
    ("Which is a characteristic of all living cells?", ["They contain DNA", "They have cell walls", "They are green", "They are multicellular"], 0, "All living cells contain DNA as their genetic material."),
    ("Enzymes are:", ["Biological catalysts", "Structural proteins", "Cell walls", "Genetic material"], 0, "Enzymes speed up chemical reactions in living organisms."),
    ("A concentration gradient exists when:", ["Solute concentrations differ across a membrane", "All concentrations are equal", "No molecules move", "Cells are dead"], 0, "A concentration gradient is a difference in solute concentration across a space."),
    ("Endocytosis is a process where:", ["Cells engulf large particles", "Cells release waste", "Cells divide", "Cells produce energy"], 0, "Endocytosis is the cellular uptake of materials by engulfing them."),
    ("Which is a difference between prokaryotic and eukaryotic cells?", ["Eukaryotes have a nucleus", "Prokaryotes are larger", "Eukaryotes lack DNA", "Prokaryotes have organelles"], 0, "Eukaryotic cells have a membrane-bound nucleus; prokaryotes do not."),
]

for i, (q, opts, ans, exp) in enumerate(living_cells):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    insert_q(cl, 'Science', 'LIVING CELLS', 'General', 'Biology', diff, q, opts, ans, exp)
    generated += 1

# --- HUMAN HEALTH (6 → target 15+) ---
health = [
    ("Which is a sign of a healthy diet?", ["Eating fruits and vegetables", "Eating only meat", "Skipping meals", "Eating only sugar"], 0, "Fruits and vegetables provide essential vitamins and minerals for health."),
    ("Vitamin C deficiency causes:", ["Scurvy", "Rickets", "Night blindness", "Anemia"], 0, "Scurvy results from insufficient vitamin C intake."),
    ("Which is a waterborne disease?", ["Cholera", "Malaria", "Ringworm", "Asthma"], 0, "Cholera spreads through contaminated water."),
    ("Exercise strengthens the:", ["Heart and lungs", "Bones only", "Hair", "Fingernails"], 0, "Regular exercise improves cardiovascular and respiratory fitness."),
    ("Which is an indicator of malnutrition?", ["Being underweight or overweight", "Having a fever", "Feeling tired", "Having a headache"], 0, "Malnutrition can manifest as underweight or overweight conditions."),
    ("The human body needs approximately how many glasses of water daily?", ["8", "1", "20", "50"], 0, "About 8 glasses (2 liters) of water is recommended daily."),
    ("Antibiotics treat:", ["Bacterial infections", "Viral infections", "Fungal infections", "All diseases"], 0, "Antibiotics target bacteria but are ineffective against viruses."),
    ("Which is a mental health condition?", ["Anxiety", "Broken bone", "Sunburn", "Sprained ankle"], 0, "Anxiety is a mental health disorder affecting mood and behavior."),
    ("HIV attacks which cells in the body?", ["Immune system cells", "Red blood cells", "Muscle cells", "Skin cells"], 0, "HIV targets CD4 cells (T-cells) of the immune system."),
    ("What is the function of the immune system?", ["Defending against pathogens", "Digesting food", "Producing hormones", "Circulating blood"], 0, "The immune system protects the body from infections and diseases."),
    ("Which nutrient provides the most energy per gram?", ["Fats", "Carbohydrates", "Proteins", "Vitamins"], 0, "Fats provide about 9 kcal per gram, more than carbs or protein."),
    ("A balanced diet includes:", ["All food groups in proper proportions", "Only protein", "Only carbohydrates", "Only fats"], 0, "A balanced diet includes carbohydrates, proteins, fats, vitamins, and minerals."),
    ("Which disease is caused by a virus?", ["Influenza", "Tuberculosis", "Malaria", "Cholera"], 0, "Influenza (the flu) is caused by the influenza virus."),
    ("The recommended daily intake of fruits and vegetables is at least:", ["400g or 5 portions", "50g or 1 portion", "1kg or 10 portions", "10g or 0.5 portion"], 0, "WHO recommends at least 400g (5 portions) of fruits and vegetables daily."),
    ("Personal hygiene includes:", ["Regular handwashing and bathing", "Eating junk food", "Avoiding sleep", "Drinking soda"], 0, "Regular handwashing prevents the spread of infectious diseases."),
]

for i, (q, opts, ans, exp) in enumerate(health):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    insert_q(cl, 'Science', 'HUMAN HEALTH', 'General', 'Health', diff, q, opts, ans, exp)
    generated += 1

# --- FARMING SYSTEMS (7 → target 15+) ---
farming = [
    ("What is the difference between subsistence and commercial farming?", ["Subsistence grows food for the farmer; commercial for sale", "They are the same", "Subsistence is bigger", "Commercial uses no tools"], 0, "Subsistence farming feeds the farmer's family; commercial farming sells produce."),
    ("Which is a factor of production in farming?", ["Land, labor, and capital", "Only money", "Only seeds", "Only machinery"], 0, "Factors of production include land, labor, capital, and entrepreneurship."),
    ("Mixed farming involves:", ["Growing crops and raising animals", "Growing only one crop", "Raising only animals", "Fishing only"], 0, "Mixed farming combines crop cultivation with livestock rearing."),
    ("Which is a benefit of irrigation?", ["Increases crop yield in dry areas", "Drowns crops", "Kills beneficial insects", "Wastes all water"], 0, "Irrigation ensures water supply for crops, increasing yields."),
    ("Mechanized farming uses:", ["Machines like tractors and harvesters", "Only hand tools", "Only animals", "Only human labor"], 0, "Mechanization uses machines to improve farming efficiency."),
    ("Soil fertility can be improved by:", ["Adding manure and crop rotation", "Removing all plants", "Burning soil", "Adding plastic"], 0, "Organic manure and crop rotation naturally replenish soil nutrients."),
    ("Which is a disadvantage of monoculture?", ["Soil nutrient depletion", "Higher profits", "Less labor", "More biodiversity"], 0, "Growing one crop repeatedly depletes specific soil nutrients."),
    ("What does extension service provide to farmers?", ["Training and advice", "Government only", "Money only", "Machinery only"], 0, "Extension services provide farmers with technical training and advice."),
    ("Which is a type of irrigation?", ["Drip irrigation", "Rain irrigation", "Snow irrigation", "Cloud irrigation"], 0, "Drip irrigation delivers water directly to plant roots efficiently."),
    ("Farm records help farmers to:", ["Track expenses and production", "Forget their yields", "Ignore prices", "Avoid taxes"], 0, "Farm records help track costs, yields, and profitability."),
    ("Which is an advantage of large-scale farming?", ["Lower cost per unit produced", "Less machinery", "Fewer workers", "Smaller fields"], 0, "Economies of scale reduce the cost per unit in large farming operations."),
    ("Pest control methods include:", ["Biological, chemical, and cultural methods", "Only chemical sprays", "Only manual removal", "Only burning"], 0, "Integrated pest management uses biological, chemical, and cultural approaches."),
    ("What is agro-processing?", ["Adding value to farm products", "Planting more crops", "Killing pests", "Watering fields"], 0, "Agro-processing transforms raw farm products into finished goods."),
    ("Which is a benefit of greenhouse farming?", ["Year-round production regardless of weather", "More pest problems", "Higher water usage", "Less control"], 0, "Greenhouses provide controlled conditions for continuous production."),
    ("Cooperative farming involves:", ["Farmers pooling resources together", "Farming alone", "Government farming only", "Importing food"], 0, "Cooperatives allow farmers to share resources and market together."),
]

for i, (q, opts, ans, exp) in enumerate(farming):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    insert_q(cl, 'Science', 'FARMING SYSTEMS', 'General', 'Agriculture', diff, q, opts, ans, exp)
    generated += 1

# --- THE HUMAN BODY SYSTEM (7 → target 15+) ---
body_sys = [
    ("Which system pumps blood throughout the body?", ["Circulatory system", "Respiratory system", "Digestive system", "Nervous system"], 0, "The heart, part of the circulatory system, pumps blood."),
    ("Where does gas exchange occur in the body?", ["Lungs", "Stomach", "Brain", "Kidneys"], 0, "The lungs are the site of oxygen and carbon dioxide exchange."),
    ("Which organ produces insulin?", ["Pancreas", "Liver", "Stomach", "Kidney"], 0, "The pancreas produces insulin to regulate blood sugar."),
    ("Food is digested mainly in the:", ["Small intestine", "Large intestine", "Esophagus", "Stomach only"], 0, "The small intestine is where most digestion and nutrient absorption occurs."),
    ("Which part of the brain controls balance?", ["Cerebellum", "Cerebrum", "Brain stem", "Hypothalamus"], 0, "The cerebellum coordinates movement and balance."),
    ("Which is a function of the skin?", ["Temperature regulation and protection", "Blood production", "Food digestion", "Breathing"], 0, "Skin regulates body temperature and protects against pathogens."),
    ("The skeletal system provides:", ["Support and structure", "Digestion", "Hormones", "Senses"], 0, "Bones provide structural support and protect internal organs."),
    ("Which is a function of the kidneys?", ["Filtering waste from blood", "Producing insulin", "Digesting food", "Circulating blood"], 0, "Kidneys filter metabolic wastes from the blood to form urine."),
    ("Muscles contract to produce:", ["Movement", "Digestion", "Thoughts", "Vision"], 0, "Muscle contraction enables movement, from walking to heartbeat."),
    ("Which system breaks down food?", ["Digestive system", "Circulatory system", "Nervous system", "Excretory system"], 0, "The digestive system breaks down food into absorbable nutrients."),
    ("The right side of the heart pumps blood to:", ["The lungs", "The brain", "The stomach", "The kidneys"], 0, "The right ventricle pumps deoxygenated blood to the lungs."),
    ("Which is a function of the respiratory system?", ["Bringing oxygen into the body", "Digesting food", "Producing hormones", "Filtering blood"], 0, "The respiratory system exchanges oxygen and carbon dioxide."),
    ("Which cells carry oxygen in the blood?", ["Red blood cells", "White blood cells", "Platelets", "Plasma"], 0, "Red blood cells contain hemoglobin which carries oxygen."),
    ("The largest organ in the body is:", ["Skin", "Liver", "Brain", "Heart"], 0, "Skin is the body's largest organ by surface area."),
    ("Which is a function of the nervous system?", ["Coordinating body activities", "Digesting food", "Circulating blood", "Filtering waste"], 0, "The nervous system coordinates and controls all body functions."),
]

for i, (q, opts, ans, exp) in enumerate(body_sys):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    insert_q(cl, 'Science', 'THE HUMAN BODY SYSTEM', 'General', 'Biology', diff, q, opts, ans, exp)
    generated += 1

# ══════════════════════════════════════════════════════════
# COMPUTING - thin sub-topics
# ══════════════════════════════════════════════════════════

# --- Computer Systems (General) - 1 → target 15+ ---
cs_gen = [
    ("What does CPU stand for?", ["Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Core Processing Unit"], 0, "CPU stands for Central Processing Unit - the main processor."),
    ("Which of the following is an input device?", ["Keyboard", "Monitor", "Speaker", "Printer"], 0, "A keyboard sends data to the computer - it is an input device."),
    ("RAM is a type of:", ["Memory", "Storage", "Processor", "Network"], 0, "RAM (Random Access Memory) is temporary working memory."),
    ("What is the function of an operating system?", ["Managing hardware and software resources", "Playing music only", "Browsing the web only", "Printing documents"], 0, "An OS manages hardware, software, and provides services for applications."),
    ("Which is an example of software?", ["Microsoft Word", "Keyboard", "Monitor", "Hard drive"], 0, "Microsoft Word is a program - software that runs on hardware."),
    ("Binary code uses which digits?", ["0 and 1", "0 through 9", "A through F", "Letters only"], 0, "Binary is a base-2 number system using only 0 and 1."),
    ("What does ROM stand for?", ["Read-Only Memory", "Random Operational Memory", "Read-Output Module", "Run-Only Memory"], 0, "ROM is Read-Only Memory - non-volatile storage."),
    ("A motherboard is:", ["The main circuit board of a computer", "An output device", "A type of software", "A network cable"], 0, "The motherboard connects all computer components together."),
    ("Which is an output device?", ["Monitor", "Keyboard", "Mouse", "Scanner"], 0, "A monitor displays information - it is an output device."),
    ("What is a bit?", ["Binary digit (0 or 1)", "A type of software", "A storage device", "A network protocol"], 0, "A bit is the smallest unit of data - either 0 or 1."),
    ("What does Wi-Fi stand for?", ["Wireless Fidelity", "Worldwide Internet", "Wireless Function", "Workplace Fiber"], 0, "Wi-Fi stands for Wireless Fidelity - a wireless networking technology."),
    ("Which storage device uses flash memory?", ["USB flash drive", "CD-ROM", "Floppy disk", "Hard disk platter"], 0, "USB drives use flash memory - no moving parts, portable."),
    ("The ALU (Arithmetic Logic Unit) performs:", ["Arithmetic and logical operations", "Display rendering", "Network routing", "Audio playback"], 0, "The ALU handles all mathematical and logical computations."),
    ("What is a compiler?", ["Translates high-level code to machine code", "A type of hardware", "A network tool", "A storage format"], 0, "A compiler converts source code into machine-executable code."),
    ("Which of the following is hardware?", ["Router", "Operating system", "Browser", "Word processor"], 0, "A router is a physical networking device - hardware."),
]

for i, (q, opts, ans, exp) in enumerate(cs_gen):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    insert_q(cl, 'Computing', 'Computer Systems', 'General', 'Computer Systems', diff, q, opts, ans, exp)
    generated += 1

# --- Productivity Software (General) - 4 → target 15+ ---
prod_sw = [
    ("Which software is used for creating presentations?", ["Presentation software", "Spreadsheet software", "Database software", "Web browser"], 0, "Presentation software like PowerPoint creates slideshows."),
    ("What is a spreadsheet used for?", ["Organizing data in rows and columns", "Writing essays", "Editing photos", "Playing music"], 0, "Spreadsheets organize numerical data in tabular form."),
    ("In a spreadsheet, what does a cell contain?", ["A value or formula", "A paragraph", "A picture only", "A video file"], 0, "A spreadsheet cell holds a value, text, or formula."),
    ("Which is a feature of word processing software?", ["Spell check and formatting", "Data analysis", "Web browsing", "Video editing"], 0, "Spell check and text formatting are core word processing features."),
    ("Mail merge is a feature of:", ["Word processing software", "Spreadsheet software", "Presentation software", "Web browser"], 0, "Mail merge in word processors generates letters from a data source."),
    ("A template in document software is:", ["A pre-designed format", "A virus", "A network cable", "A printer"], 0, "Templates provide pre-designed layouts for quick document creation."),
    ("Which is a chart type in spreadsheet software?", ["Bar chart", "Email", "Firewall", "Router"], 0, "Bar charts are a common visualization type in spreadsheets."),
    ("To insert a table in a word processor, you use:", ["Insert menu", "Network settings", "Hardware buttons", "Audio controls"], 0, "The Insert menu provides options for tables, images, and more."),
    ("Desktop publishing software is used for:", ["Creating printed materials like brochures", "Playing games", "Managing databases", "Configuring networks"], 0, "Desktop publishing creates professional printed layouts."),
    ("Which software helps organize and analyze numerical data?", ["Spreadsheet software", "Text editor", "Music player", "Web browser"], 0, "Spreadsheets are designed for numerical data organization and analysis."),
    ("In presentation software, slide transitions are:", ["Animations between slides", "Network protocols", "File formats", "Hardware settings"], 0, "Slide transitions add visual effects when moving between slides."),
    ("A mail merge consists of:", ["A main document and a data source", "Two databases", "A website and a server", "A printer and a scanner"], 0, "Mail merge combines a template with a data source for mass communication."),
    ("Which is NOT a productivity software?", ["Video game", "Word processor", "Spreadsheet", "Presentation tool"], 0, "Video games are entertainment software, not productivity tools."),
    ("Collaborative editing tools allow:", ["Multiple users to edit a document simultaneously", "One user only", "Printing only", "Scanning only"], 0, "Collaborative editing enables real-time co-authoring of documents."),
    ("Which file format is commonly used for word documents?", [".docx", ".jpg", ".mp3", ".htm"], 0, ".docx is the standard format for Microsoft Word documents."),
]

for i, (q, opts, ans, exp) in enumerate(prod_sw):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    insert_q(cl, 'Computing', 'Productivity Software', 'General', 'Software Applications', diff, q, opts, ans, exp)
    generated += 1

# --- Digital Citizenship (General) - 6 → target 15+ ---
dc = [
    ("What is cyberbullying?", ["Using digital platforms to harass or harm others", "Using a computer", "Playing online games", "Watching videos"], 0, "Cyberbullying is the use of digital technology to intimidate or harass."),
    ("Which is an example of online etiquette?", ["Being respectful in comments", "Posting insults", "Sharing passwords", "Spreading rumors"], 0, "Online etiquette involves respectful and considerate communication."),
    ("A strong password should contain:", ["Letters, numbers, and symbols", "Only your name", "Simple numbers like 123", "Your birthday only"], 0, "Strong passwords combine letters, numbers, and special characters."),
    ("What should you do if you receive a suspicious email?", ["Do not click suspicious links", "Click all links", "Forward it to everyone", "Reply asking for more"], 0, "Suspicious emails may be phishing - do not click unknown links."),
    ("Which is a principle of digital citizenship?", ["Respecting others online", "Hacking websites", "Spreading false information", "Stealing digital content"], 0, "Digital citizenship involves responsible and respectful online behavior."),
    ("What is the purpose of digital footprints?", ["They show your online activity trail", "They clean your computer", "They delete browsing history", "They block websites"], 0, "A digital footprint is the record of your online activities."),
    ("Plagiarism in the digital age means:", ["Using others' work without credit", "Sharing your own work", "Downloading free software", "Using open-source content"], 0, "Plagiarism is presenting someone else's work as your own without attribution."),
    ("Which is safe to share online?", ["Your favorite hobby", "Your home address", "Your phone number", "Your school password"], 0, "Personal interests are safe to share; personal data should be private."),
    ("Digital literacy means:", ["Having the skills to use digital technology effectively", "Being able to break into systems", "Knowing how to hack", "Avoiding all technology"], 0, "Digital literacy is the ability to effectively and safely use digital tools."),
    ("What is phishing?", ["Fraudulent attempts to obtain sensitive information", "Fishing online", "Installing antivirus", "Updating software"], 0, "Phishing tricks users into revealing passwords or personal data."),
    ("Online safety for children includes:", ["Parental controls and supervision", "No rules", "Unrestricted access", "Sharing passwords"], 0, "Parental controls help protect children from online risks."),
    ("Copyright means:", ["Legal protection for original works", "Free use of any content", "Downloading anything", "Sharing all files"], 0, "Copyright protects creators' original works from unauthorized use."),
    ("Which is a responsible use of social media?", ["Sharing educational content", "Posting personal info of others", "Cyberbullying", "Spreading fake news"], 0, "Sharing educational content is a positive use of social media."),
    ("Which is NOT a cybercrime?", ["Helping a friend online", "Hacking accounts", "Spreading malware", "Identity theft"], 0, "Helping a friend online is not a cybercrime."),
    ("The Golden Rule of digital communication is:", ["Treat others online as you want to be treated", "Always disagree", "Never share anything", "Ignore everyone"], 0, "The Golden Rule applies to digital communication - be respectful."),
]

for i, (q, opts, ans, exp) in enumerate(dc):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    insert_q(cl, 'Computing', 'Digital Citizenship', 'General', 'Digital Citizenship', diff, q, opts, ans, exp)
    generated += 1

# --- Cybersecurity (General) - 7 → target 15+ ---
cyber = [
    ("What is a firewall?", ["A system that blocks unauthorized network access", "A physical wall", "A type of software for writing", "A printer feature"], 0, "A firewall monitors and controls incoming and outgoing network traffic."),
    ("Malware is:", ["Malicious software", "A type of hardware", "A network cable", "A programming language"], 0, "Malware is software designed to harm or exploit computer systems."),
    ("A virus is a type of:", ["Malware", "Hardware", "Network", "Printer"], 0, "Computer viruses are malicious programs that replicate and spread."),
    ("What does SSL stand for?", ["Secure Sockets Layer", "Super Secure Link", "System Security Level", "Safe Socket Layer"], 0, "SSL (Secure Sockets Layer) encrypts web communications."),
    ("Which is the best defense against phishing?", ["Being cautious with emails and links", "Never using the internet", "Disabling antivirus", "Sharing passwords"], 0, "Vigilance with emails and links is the best defense against phishing."),
    ("Two-factor authentication adds:", ["An extra layer of security", "More passwords to forget", "Slower internet", "More hardware"], 0, "2FA requires a second verification step beyond just a password."),
    ("A strong password is:", ["Long and includes varied characters", "Easy to remember like 123", "The same as your username", "Your birthdate"], 0, "Strong passwords are long, complex, and unique."),
    ("Ransomware is:", ["Software that locks files until a ransom is paid", "A type of hardware", "A network protocol", "A printer driver"], 0, "Ransomware encrypts files and demands payment for their release."),
    ("Which helps protect against data breaches?", ["Encryption", "Sharing passwords", "Using simple passwords", "Ignoring updates"], 0, "Encryption scrambles data to protect it from unauthorized access."),
    ("A security update (patch) is:", ["Software that fixes vulnerabilities", "A new feature", "A hardware upgrade", "A network cable"], 0, "Security patches fix known vulnerabilities in software."),
    ("What is social engineering?", ["Manipulating people to reveal confidential information", "Learning social skills", "Making friends online", "Using social media"], 0, "Social engineering manipulates people into divulging sensitive information."),
    ("Which is a type of malware that records keystrokes?", ["Keylogger", "Firewall", "Antivirus", "Browser"], 0, "Keyloggers secretly record keystrokes to steal passwords."),
    ("Why should you not use public Wi-Fi for banking?", ["It may be insecure", "It is always safe", "It is faster", "It is free"], 0, "Public Wi-Fi networks are often unsecured and vulnerable to eavesdropping."),
    ("Which is a biometric security measure?", ["Fingerprint scanner", "PIN code", "Password", "Security question"], 0, "Fingerprint scanners use unique physical traits for authentication."),
    ("An antivirus software is used to:", ["Detect and remove malware", "Create documents", "Browse the web", "Play music"], 0, "Antivirus software scans for and removes malicious programs."),
]

for i, (q, opts, ans, exp) in enumerate(cyber):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    insert_q(cl, 'Computing', 'Cybersecurity', 'General', 'Cybersecurity', diff, q, opts, ans, exp)
    generated += 1

# --- Emerging Technologies (General) - 7 → target 15+ ---
emerging = [
    ("What is artificial intelligence (AI)?", ["Machines simulating human intelligence", "A type of hardware", "A network cable", "A programming language"], 0, "AI enables machines to mimic human cognitive functions like learning."),
    ("Machine learning is a subset of:", ["Artificial intelligence", "Hardware design", "Networking", "Printing"], 0, "Machine learning is a branch of AI where systems learn from data."),
("Which is an example of IoT (Internet of Things)?", ["A smart thermostat", "A textbook", "A pencil", "A bicycle"], 0, "Smart thermostats connect to the internet - they are IoT devices."),
    ("Blockchain is used for:", ["Secure digital transactions", "Making coffee", "Printing documents", "Playing games"], 0, "Blockchain provides a secure, decentralized ledger for transactions."),
    ("Cloud computing allows:", ["Storing data on remote servers accessed via the internet", "Storing data only locally", "Using only floppy disks", "Disconnecting from the internet"], 0, "Cloud computing delivers computing resources over the internet."),
    ("A robot is an example of:", ["AI and automation", "A network", "A database", "A spreadsheet"], 0, "Robots use AI and automation to perform tasks autonomously."),
    ("Virtual Reality (VR) is used for:", ["Immersive simulated experiences", "Basic text editing", "Simple calculations", "Printing documents"], 0, "VR creates immersive digital environments for training and entertainment."),
    ("5G technology provides:", ["Faster mobile internet speeds", "Slower internet", "Fewer websites", "Less bandwidth"], 0, "5G offers significantly faster data speeds and lower latency."),
    ("Big Data refers to:", ["Extremely large datasets that require advanced tools to process", "Small files", "Old books", "Manual records"], 0, "Big Data involves massive datasets requiring specialized processing."),
    ("Which is a characteristic of cloud computing?", ["On-demand resource access", "Physical storage only", "No internet needed", "Slow processing"], 0, "Cloud computing provides on-demand access to computing resources."),
    ("What does IoT stand for?", ["Internet of Things", "Internet of Technology", "Integrated Online Tools", "Internal Operating System"], 0, "IoT stands for Internet of Things - connected devices."),
    ("Which technology uses sensors and connectivity?", ["IoT", "Typewriter", "Slide rule", "Fax machine"], 0, "IoT devices use sensors and network connectivity to collect and share data."),
    ("Blockchain is a type of:", ["Distributed ledger technology", "Database software only", "Hardware device", "Operating system"], 0, "Blockchain is a distributed ledger that records transactions across many computers."),
    ("Augmented Reality (AR):", ["Overlays digital content on the real world", "Replaces reality entirely", "Blocks the real world", "Deletes digital content"], 0, "AR adds digital elements to the user's view of the real world."),
    ("Which is NOT an emerging technology?", ["Traditional mail", "Artificial intelligence", "Blockchain", "Internet of Things"], 0, "Traditional mail is a conventional technology, not an emerging one."),
]

for i, (q, opts, ans, exp) in enumerate(emerging):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    insert_q(cl, 'Computing', 'Emerging Technologies', 'General', 'Computer Systems', diff, q, opts, ans, exp)
    generated += 1

# --- Data Representation (General) - 8 → target 15+ ---
data_rep = [
    ("Which is an example of structured data?", ["A spreadsheet with rows and columns", "A poem", "A painting", "A song"], 0, "Spreadsheets organize data into structured rows and columns."),
    ("What is a database?", ["An organized collection of data", "A type of software only", "A keyboard", "A printer"], 0, "A database stores and organizes data systematically."),
    ("Which is an example of qualitative data?", ["The color of a car", "The temperature in Celsius", "The height in cm", "The weight in kg"], 0, "Qualitative data describes qualities like color, texture, or appearance."),
    ("Which is quantitative data?", ["A student's test score of 85", "The color of a car", "The taste of food", "The smell of perfume"], 0, "Quantitative data is numerical - test scores are measurable."),
    ("A bar chart is used to represent:", ["Categorical data with bars", "Continuous data only", "Text data", "Audio data"], 0, "Bar charts display categorical data using rectangular bars."),
    ("What does 'CSV' stand for?", ["Comma-Separated Values", "Computer Saved Values", "Central System Variables", "Compiled Software Version"], 0, "CSV stands for Comma-Separated Values - a common data format."),
    ("Which chart type shows trends over time?", ["Line chart", "Pie chart", "Bar chart", "Table"], 0, "Line charts display data trends and changes over time periods."),
    ("A pie chart shows:", ["Proportions of a whole", "Trends over time", "Data distributions", "Relationships between variables"], 0, "Pie charts display each category's proportion of the total."),
    ("Data validation is used to:", ["Ensure data entered meets certain criteria", "Delete all data", "Create charts", "Format text"], 0, "Data validation restricts input to values that meet defined criteria."),
    ("A variable in programming is:", ["A named storage location for data", "A type of hardware", "A network protocol", "A printer"], 0, "Variables store data values that can change during program execution."),
    ("Which is an example of unstructured data?", ["A handwritten letter", "A database table", "A spreadsheet", "A CSV file"], 0, "A handwritten letter has no pre-defined structure - unstructured data."),
    ("What is a data set?", ["A collection of related data", "A type of software", "A hardware component", "A network cable"], 0, "A data set is a collection of related data values for analysis."),
    ("Which is a disadvantage of paper-based data?", ["Hard to update and share", "Easy to carry", "No electricity needed", "Tangible"], 0, "Paper records are difficult to update quickly and share."),
    ("What is metadata?", ["Data about data", "A type of software", "A hardware device", "A network cable"], 0, "Metadata provides information about other data - like file size or date."),
    ("A histogram differs from a bar chart because:", ["It shows continuous numerical data", "It is only for text", "It uses colors only", "It has no title"], 0, "Histograms represent continuous numerical data with adjacent bars."),
]

for i, (q, opts, ans, exp) in enumerate(data_rep):
    cl = classes[i % 6]
    diff = ['Easy', 'Medium', 'Hard'][i % 3]
    insert_q(cl, 'Computing', 'Data Representation', 'General', 'Data Representation', diff, q, opts, ans, exp)
    generated += 1

conn.commit()
print(f"Generated {generated} new questions")

# Verify counts
for s in ['Computing', 'Science']:
    print(f"\n{s}:")
    for row in conn.execute("""
        SELECT topic, sub_topic, COUNT(*) as n
        FROM questions WHERE subject=? AND is_active=1
        GROUP BY topic, sub_topic
        ORDER BY n ASC LIMIT 15
    """, (s,)):
        print(f"  {row[0]:40s} | {row[1]:40s} | {row[2]:3d}")

conn.close()
print("\nDone.")