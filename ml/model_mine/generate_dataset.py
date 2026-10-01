from __future__ import annotations

import csv
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from preprocess import assign_priority_label
from augmentation import augment_rows

# Conservative curated real Hinglish / Hindi examples to seed augmentation
HINGLISH_EXAMPLES = [
    ("2 din se pani nahi aa raha hai, please dekho", "Water"),
    ("streetlight kharab hai raat ko andhera ho jata hai", "Public Services"),
    ("bijli kal raat se gayi hui hai, koi update nahi", "Electricity"),
    ("road pe bahut bada pothole hai, bike gir gayi", "Roads"),
    ("garbage pickup nahi hua aaj bhi", "Sanitation"),
    ("pani ki tanki khaali hai, bucket me kuch nahi aa raha", "Water"),
    ("bijli ka taar zameen par latka hua hai, khatra hai", "Electricity"),
]

HINDI_EXAMPLES = [
    ("कल से पानी नहीं आ रहा है", "Water"),
    ("सड़क पर गड्ढा बहुत बड़ा है", "Roads"),
    ("बिजली रात से चली गयी है", "Electricity"),
    ("कचरा उठाया नहीं गया", "Sanitation"),
    ("स्ट्रिट लाइट काम नहीं कर रही है", "Public Services"),
]


OUTPUT_PATH = Path(__file__).with_name("dataset.csv")
RANDOM_SEED = 42
TARGET_PER_LABEL = 200

LABELS = ["Electricity", "Water", "Sanitation", "Roads", "Public Services"]


INFORMAL_PATTERNS = {
    "Electricity": [
        "No power again, how long will this continue?",
        "Lights down again, fed up with this.",
        "Power failure since this morning, what is happening?",
        "Electricity gone, why is no one fixing this?",
        "Outage again today, this is ridiculous.",
        "Power cut for the third time this week.",
        "Why is electricity always cut at peak hours?",
        "Lights are off, no updates from authorities.",
    ],
    "Water": [
        "No water for 2 days, is anyone listening?",
        "Water supply is a joke here.",
        "Taps are dry, what are we supposed to do?",
        "Water gone again, this happens every day.",
        "Not enough water pressure, buckets half empty.",
        "No water in morning, how do we shower?",
        "Pressure so low, taps barely drip.",
        "Water gone since yesterday, still no explanation.",
    ],
    "Sanitation": [
        "Garbage piling up, smells terrible here.",
        "Drains are blocked and stink unbearably.",
        "Sewage everywhere, this is a health hazard.",
        "Dirt and waste all over the street.",
        "Filthy water on the road, no one cares.",
        "Smell is so bad, cannot open windows.",
        "Garbage collector never showed up.",
        "Drain overflow blocking the whole lane.",
    ],
    "Roads": [
        "Roads are destroyed, full of holes.",
        "Potholes everywhere, bikes keep falling.",
        "Road is broken for months, still no repair.",
        "Lane is flooded and muddy, can't drive.",
        "Uneven surface causing accidents daily.",
        "Can't walk on this road anymore.",
        "Road repair was started and abandoned.",
        "Broken road near school is dangerous.",
    ],
    "Public Services": [
        "Bus service is unreliable, always late.",
        "Park is filthy and neglected.",
        "Street lights don't work at night.",
        "Complaint center never responds.",
        "Government office is not cooperating.",
        "No one picks up the phone.",
        "Complaint portal down, no other way to report.",
        "Public amenities are in worst condition.",
    ],
}

EDGE_CASES = [
    ("Water leakage is damaging the road surface and causing flooding.", "Roads"),
    ("Overflowing drainage is creating bad smell and blocking traffic.", "Sanitation"),
    ("A burst pipe has damaged the road and caused a water shortage.", "Water"),
    ("The sewer overflow is blocking the footpath and making it unsafe.", "Sanitation"),
    ("Water leakage from the main line is eroding the road structure.", "Roads"),
    ("Garbage piling up on the street is blocking the drainage system.", "Sanitation"),
    ("The road is flooded due to blocked drains creating a traffic jam.", "Roads"),
    ("Stagnant water near the road is damaging the asphalt layer.", "Sanitation"),
    ("The streetlight near the market has failed, and vendors complain.", "Electricity"),
    ("Power outage is affecting the water supply system in the area.", "Electricity"),
    ("The park is dark at night and flooded with water during rain.", "Public Services"),
    ("Street vendors are occupying the footpath and blocking water drainage.", "Public Services"),
    ("The bus shelter is broken and provides no protection from flooding.", "Public Services"),
    ("Road cracks are allowing sewage to escape near the main junction.", "Roads"),
    ("Electric wires are hanging low over the flooded road area.", "Electricity"),
    ("Garbage collection is delayed, and waste is attracting stray dogs.", "Public Services"),
    ("The transformer is near a clogged drain that could cause a short.", "Electricity"),
    ("Water is leaking into the electrical substation area.", "Electricity"),
    ("The road repair left a trench that is now collecting sewage.", "Roads"),
    ("Stray animals are roaming near the blocked drain spreading disease.", "Public Services"),
    ("Sewage backing up is damaging the newly repaired road.", "Sanitation"),
    ("Burst pipe caused road collapse and water contamination.", "Water"),
    ("Flooded street is preventing garbage trucks from collecting waste.", "Sanitation"),
    ("Electricity pole damaged by water erosion near the main road.", "Electricity"),
    ("Multiple issues at same location: power, water, and bad roads.", "Roads"),
    ("Park flooded and dark, safety concern for evening walkers.", "Public Services"),
    ("Broken water line is causing landslide on the hillside road.", "Roads"),
]

ENHANCED_PUBLIC_SERVICES = [
    "Government office ignoring complaints about poor infrastructure.",
    "Complaint portal is not working, no way to report issues.",
    "Municipal corporation delayed response to repeated requests.",
    "No proper coordination between water and electricity departments.",
    "Park maintenance contractor has abandoned the work.",
    "Traffic signals near the bus stop are broken.",
    "Street vendor encroachment is not being cleared by authorities.",
    "Public health inspector never visits the market area.",
    "Sanitation worker is not collecting garbage on assigned days.",
    "Bus shelter repair was promised but never completed.",
    "No street lights installed in new residential area.",
    "Traffic jam due to broken signal at main intersection.",
    "Poor coordination causing repeated digging in same street.",
    "Public restroom is locked and non-functional.",
    "Pedestrian crossing is missing near the school.",
    "Rain shelter on bus route is broken and dangerous.",
    "Pavement is uneven, wheelchair access is difficult.",
    "No information display at bus stop about schedule.",
    "Street naming sign is damaged or missing.",
    "Park benches are broken and unusable for elderly.",
    "Complaint lodged but case number never received.",
    "Delay in processing water connection application.",
    "Road widening project is stuck due to poor planning.",
    "No grievance redressal within promised timeframe.",
    "Public emergency numbers are not responding.",
]

NOISY_SAMPLES = [
    ("no watr sinse morning in our area", "Water"),
    ("bijli nahi aa rhi since 2 hrs y?", "Electricity"),
    ("grbg piling up on street bhut samons", "Sanitation"),
    ("riad bd condition pooholes evrywhere", "Roads"),
    ("bus always late, kya service h ye", "Public Services"),
    ("pani khhatam ho gya, buckets empty", "Water"),
    ("light faaal gyi, darkk outside", "Electricity"),
    ("sewage smell bohot badd", "Sanitation"),
    ("traffic jaam bcoz rd broken", "Roads"),
    ("office nahi sun rha complaint", "Public Services"),
    ("wtr supply band since morning wtf", "Water"),
    ("outage agin tmrw, fed up", "Electricity"),
    ("drain cloggd bad smell", "Sanitation"),
    ("potholes destroyed bike wheel", "Roads"),
    ("park lights off danger", "Public Services"),
    ("tank empty no taps working", "Water"),
    ("power gone 2 days y", "Electricity"),
    ("garbage evrywhere smelly area", "Sanitation"),
    ("lane flooded cant pass", "Roads"),
    ("no bus for 30 mins waiting", "Public Services"),
]

ADDITIONAL_EDGE_CASES = [
    ("A leaking water line has weakened the road base and sewage now pools there.", "Roads"),
    ("Roadside drain overflow has cracked the carriageway and blocked one lane.", "Roads"),
    ("Repeated waterlogging has broken the asphalt and caused dangerous potholes.", "Roads"),
    ("Sewer overflow is cutting into the shoulder and the road is collapsing.", "Roads"),
    ("Drain backflow is eroding the road edge near the market turn.", "Roads"),
    ("A burst pipeline washed away the road patch done last week.", "Roads"),
    ("Stagnant runoff from drains has made the road surface peel off.", "Roads"),
    ("Water seepage under the road has caused fresh cracks and subsidence.", "Roads"),
    ("Road flooding mixed with sewage is creating a strong foul smell.", "Sanitation"),
    ("Blocked drains are pushing dirty water into homes and onto the street.", "Sanitation"),
    ("Garbage near the culvert is causing both waterlogging and mosquito breeding.", "Sanitation"),
    ("Sewage overflow after rain has made the entire lane unhygienic.", "Sanitation"),
    ("Water from broken pipelines is mixing with waste and spreading contamination.", "Sanitation"),
    ("Drainage choke points are creating stagnant black water near shops.", "Sanitation"),
    ("Overflowing bins are clogging drains and worsening sanitation conditions.", "Sanitation"),
    ("Storm water mixed with sewage is standing for days near the houses.", "Sanitation"),
    ("A damaged pipeline reduced supply and also contaminated the drinking water.", "Water"),
    ("Water tanker delay plus low pressure has left the block without usable water.", "Water"),
    ("Pipeline leakage is reducing supply while dirty water enters the line.", "Water"),
    ("Intermittent supply and line damage are forcing residents to buy water daily.", "Water"),
    ("Burst main has cut supply and left taps dry across two streets.", "Water"),
    ("The overhead tank is empty because feeder water is not reaching it.", "Water"),
    ("Water line contamination started after nearby repair and trench work.", "Water"),
    ("Poor pressure and frequent cuts are making water unusable for households.", "Water"),
    ("Drain overflow near the transformer is creating short-circuit risk.", "Electricity"),
    ("Water seepage into junction box is causing repeated electrical trips.", "Electricity"),
    ("Street lights fail whenever roadside flooding increases after rain.", "Electricity"),
    ("Wet cable trench is causing low voltage across the neighborhood.", "Electricity"),
    ("Power panel near drain is exposed and outages keep happening.", "Electricity"),
    ("Floodwater has reached the feeder cabinet and supply keeps dropping.", "Electricity"),
    ("Moisture near distribution pole is triggering frequent power cuts.", "Electricity"),
    ("Water leak near underground cable route is causing unstable power.", "Electricity"),
    ("Complaint portal is down while multiple civic issues remain unresolved.", "Public Services"),
    ("Government office delay is blocking permits needed for road restoration.", "Public Services"),
    ("No response from helpline despite repeated complaints on civic services.", "Public Services"),
    ("Bus delays and broken shelters are affecting daily commuters badly.", "Public Services"),
    ("Encroached footpath and absent enforcement are risking pedestrian safety.", "Public Services"),
    ("Document processing delay is preventing utility connection activation.", "Public Services"),
    ("Coordination failure across departments is delaying all local repairs.", "Public Services"),
    ("Public grievance center keeps closing tickets without resolution.", "Public Services"),
]

ADDITIONAL_NOISY_SAMPLES = [
    ("no watr 2day taps dry plz hlp", "Water"),
    ("pani aa hi nhi rha frm mrng", "Water"),
    ("low presure in tap cant fill balti", "Water"),
    ("tankr not came agn today", "Water"),
    ("bijli gyi fir se since nght", "Electricity"),
    ("voltage up down all day, applncs dmg", "Electricity"),
    ("light cut 3rd tym this week", "Electricity"),
    ("stret light off full andhera", "Electricity"),
    ("drain jam badbu too much", "Sanitation"),
    ("kuda collect nhi hua 3 din", "Sanitation"),
    ("sewer overflw near ghar", "Sanitation"),
    ("gandgi pani road pe jama", "Sanitation"),
    ("rd toot gyi poora gadda hi gadda", "Roads"),
    ("pothol se bike skid ho gyi", "Roads"),
    ("road ka kaam adhura chhod diya", "Roads"),
    ("lane me pani bhar gya drive nhi hota", "Roads"),
    ("portal open hi nhi ho rha", "Public Services"),
    ("ofc wale reply hi nhi krte", "Public Services"),
    ("bus tym ka koi scene nhi", "Public Services"),
    ("complaint dali but koi action nhi", "Public Services"),
]

ADDITIONAL_INFORMAL_ANGRY = [
    ("No water again? This is beyond frustrating.", "Water"),
    ("Seriously, no supply since morning. What are we paying for?", "Water"),
    ("Water pressure is a joke here, fix this now.", "Water"),
    ("Another day, another dry tap. Ridiculous service.", "Water"),
    ("Power gone again, this is ridiculous.", "Electricity"),
    ("How many outages in one week? This is unacceptable.", "Electricity"),
    ("Voltage keeps jumping and our appliances are suffering.", "Electricity"),
    ("No electricity all evening, totally fed up.", "Electricity"),
    ("The smell from the drain is disgusting, do something now.", "Sanitation"),
    ("Garbage is everywhere, are we supposed to live like this?", "Sanitation"),
    ("Sewage on the road again, this is a health nightmare.", "Sanitation"),
    ("Drain cleaning never happens here, we are done waiting.", "Sanitation"),
    ("These potholes are insane, someone will get hurt.", "Roads"),
    ("Road repair has been pending forever, enough is enough.", "Roads"),
    ("Driving here feels dangerous every single day.", "Roads"),
    ("Road work started and vanished, what kind of planning is this?", "Roads"),
    ("Complaint office never responds, what is the point?", "Public Services"),
    ("Your portal is always broken, how do we report issues?", "Public Services"),
    ("Public service here is hopeless, nobody follows up.", "Public Services"),
    ("Buses are always late and nobody seems to care.", "Public Services"),
]


CORE_BANK = {
    "Electricity": {
        "hard_examples": [
            "The transformer keeps tripping after rain, and the whole block goes dark.",
            "Power fluctuations are damaging appliances and making the street lights unstable.",
            "The main feeder is faulty, so even the water pumps are not running.",
            "Street lights near the market fail every week, making nights unsafe.",
            "The power cut started during peak hours and has still not been restored.",
            "A broken connection near the colony entrance is causing repeated outages.",
            "The voltage keeps dropping in the evening, and fans barely work.",
            "Frequent tripping in the neighborhood is creating constant inconvenience.",
            "Street lights near the bus stop are not working, making the area unsafe after dark.",
        ],
        "places": [
            "in our block",
            "in the colony",
            "near the main market",
            "around the residential area",
            "by the bus stop",
            "near the park road",
            "in the neighborhood",
            "on the main street",
        ],
        "times": [
            "since morning",
            "since last night",
            "for hours",
            "all evening",
            "for two days",
            "for several days",
            "since yesterday",
            "since early today",
        ],
        "patterns": [
            "There has been a power cut {place} {time}.",
            "Residents are facing repeated outages {place}.",
            "The voltage keeps dropping {place}, and appliances are getting damaged.",
            "Street lights {place} are not working, making the area unsafe after dark.",
            "A transformer fault {place} has left the neighborhood in darkness.",
            "Frequent tripping {place} is causing a lot of inconvenience.",
            "The feeder line {place} keeps failing after rain.",
            "A faulty connection {place} is disrupting daily life.",
            "The power supply {place} has been unstable for days.",
            "An electric line issue {place} needs urgent repair.",
        ],
        "modifiers": [
            "Please look into this urgently.",
            "Residents are frustrated and want a quick fix.",
            "This has been ignored for too long.",
            "The issue is getting worse every day.",
        ],
    },
    "Water": {
        "hard_examples": [
            "The tanker was skipped again, and several homes have no drinking water.",
            "A leak in the main pipeline has reduced supply to the whole street.",
            "The colony has no water in the morning, and the pumps are failing.",
            "The tap water is coming for only a few minutes, which is not enough for anyone.",
            "Water supply has been irregular for days, and residents cannot plan basic chores.",
            "The pressure is so low that buckets take forever to fill.",
            "A burst pipe has left the area without enough water.",
            "The water line is contaminated after repair work.",
        ],
        "places": [
            "in our lane",
            "in the colony",
            "in this locality",
            "in the apartment block",
            "around the residential area",
            "in the neighborhood",
            "near the school",
            "near the market",
        ],
        "times": [
            "since morning",
            "since last night",
            "for hours",
            "all morning",
            "for two days",
            "for several days",
            "since yesterday",
            "since early today",
        ],
        "patterns": [
            "There has been no water supply {place} {time}.",
            "Water pressure is very low {place}, so buckets take forever to fill.",
            "The pipeline leak {place} has reduced supply to the whole street.",
            "The tanker did not arrive {place} today, leaving several homes without drinking water.",
            "Water supply is irregular {place}, and daily chores are being disrupted.",
            "The tap water stopped suddenly {place} {time}.",
            "Families are getting water only for a few minutes in the morning {place}.",
            "The water line {place} is contaminated after repair work.",
            "A burst pipe {place} has left the area without enough water.",
            "The supply {place} has been unreliable all week.",
        ],
        "modifiers": [
            "Please look into this urgently.",
            "Residents are frustrated and want a quick fix.",
            "This has been ignored for too long.",
            "The issue is getting worse every day.",
        ],
    },
    "Sanitation": {
        "hard_examples": [
            "Water leakage has damaged the road and created a hygiene issue.",
            "Rainwater is standing on the road because the drain is clogged.",
            "A blocked sewer line has caused dirty water to collect near the houses.",
            "Garbage piled up on the street is now blocking the footpath.",
            "The drain overflowed after the rain, and the smell is unbearable.",
            "Wastewater is entering the street from a damaged drain.",
            "Sewage is backing up near the houses and spreading foul smell.",
            "The garbage collection has been skipped for days, and the area is becoming unsanitary.",
        ],
        "places": [
            "on our street",
            "near the market",
            "around the drain",
            "in the lane",
            "at the corner",
            "near the footpath",
            "in the residential lane",
            "around the bus stand",
        ],
        "times": [
            "since morning",
            "since last night",
            "for hours",
            "all day",
            "for two days",
            "for several days",
            "since yesterday",
            "after the rain",
        ],
        "patterns": [
            "Garbage has not been collected {place} {times}.",
            "The drain is blocked {place}, and dirty water is overflowing onto the road.",
            "Sewage is backing up {place}, and the smell is unbearable.",
            "Rainwater mixed with waste is stagnating {place} {times}.",
            "The sewer line overflowed again {place}, creating a hygiene issue.",
            "Overflowing bins are spreading waste {place}.",
            "A clogged drain {place} is causing a serious sanitation problem.",
            "Wastewater is entering the street {place} from a damaged drain.",
            "The area {place} is full of garbage and foul smell.",
            "Drain cleaning has been ignored {place} for days.",
        ],
        "modifiers": [
            "Please look into this urgently.",
            "Residents are frustrated and want a quick fix.",
            "This has been ignored for too long.",
            "The issue is getting worse every day.",
        ],
    },
    "Roads": {
        "hard_examples": [
            "The road is flooded after a drain overflow, and travel is unsafe.",
            "The road has collapsed after repeated water leakage from a broken pipe.",
            "A broken road near the school is causing frequent accidents.",
            "The market approach road has been dug up and not restored.",
            "A waterlogged road has become dangerous for cyclists.",
            "The main road is full of potholes and has become unsafe for two-wheelers.",
            "Road repairs were left incomplete after the rain damage.",
            "The junction has become clogged because of road damage.",
        ],
        "places": [
            "on the main road",
            "near the school",
            "at the junction",
            "on the approach road",
            "in the inner lane",
            "near the market",
            "around the bus route",
            "by the residential stretch",
        ],
        "times": [
            "since morning",
            "since last night",
            "for hours",
            "all day",
            "for two days",
            "for several weeks",
            "since yesterday",
            "after the rain",
        ],
        "patterns": [
            "The main road {place} is full of potholes.",
            "A broken stretch {place} is slowing traffic every morning.",
            "Road repairs were left incomplete {place}.",
            "Heavy rain damaged the lane {place}, and vehicles keep bouncing through the potholes.",
            "The road surface {place} is uneven and cracked.",
            "The approach road to the market {place} has collapsed in parts.",
            "Water leakage has damaged the road surface {place}.",
            "A waterlogged road {place} has become dangerous for cyclists.",
            "The junction {place} is clogged because of road damage.",
            "The road work {place} was stopped halfway.",
        ],
        "modifiers": [
            "Please look into this urgently.",
            "Residents are frustrated and want a quick fix.",
            "This has been ignored for too long.",
            "The issue is getting worse every day.",
        ],
    },
    "Public Services": {
        "hard_examples": [
            "The bus stop is overcrowded because buses keep arriving late.",
            "Footpath encroachment is forcing pedestrians into traffic.",
            "Stray dogs are stopping children from entering the park safely.",
            "The public park is neglected, and the walking path is covered in litter.",
            "Auto drivers are refusing short trips, causing daily inconvenience.",
            "Unauthorized stalls on the footpath are blocking public access.",
            "The neighborhood park has not been maintained for weeks.",
            "The colony entrance is crowded because vendors have occupied the roadside.",
            "The bus shelter near the market is broken and offers no shade.",
        ],
        "places": [
            "in our area",
            "near the bus stop",
            "around the park",
            "by the footpath",
            "at the colony entrance",
            "near the school gate",
            "in the neighborhood",
            "along the roadside",
        ],
        "times": [
            "since morning",
            "since last night",
            "for hours",
            "all day",
            "for two days",
            "for several weeks",
            "since yesterday",
            "for months",
        ],
        "patterns": [
            "The bus service {place} is unreliable.",
            "Stray dogs are roaming {place}, and parents are worried.",
            "The public park {place} has not been maintained.",
            "Footpaths {place} are being occupied by shops.",
            "Buses keep arriving late {place}.",
            "The neighborhood park {place} is neglected.",
            "Unauthorized encroachment {place} is blocking public access.",
            "Auto drivers are refusing short trips {place}.",
            "The bus shelter {place} is broken and offers no shade.",
        ],
        "modifiers": [
            "Please look into this urgently.",
            "Residents are frustrated and want a quick fix.",
            "This has been ignored for too long.",
            "The issue is getting worse every day.",
        ],
    },
}


def build_sentence(label: str) -> str:
    bank = CORE_BANK[label]
    template = random.choice(bank["patterns"])
    sentence = template.format(
        place=random.choice(bank["places"]),
        times=random.choice(bank["times"]),
        time=random.choice(bank["times"]),
    )

    if random.random() < 0.35:
        sentence = f"{sentence} {random.choice(bank['modifiers'])}"

    return " ".join(sentence.split())


def build_rows() -> list[tuple[str, str]]:
    random.seed(RANDOM_SEED)
    rows: list[tuple[str, str]] = []
    seen: set[tuple[str, str]] = set()

    for label in LABELS:
        for text in CORE_BANK[label]["hard_examples"]:
            pair = (text, label)
            if pair not in seen:
                rows.append(pair)
                seen.add(pair)

    for text, label in EDGE_CASES:
        pair = (text, label)
        if pair not in seen:
            rows.append(pair)
            seen.add(pair)

    for text in ENHANCED_PUBLIC_SERVICES:
        pair = (text, "Public Services")
        if pair not in seen:
            rows.append(pair)
            seen.add(pair)

    for text, label in NOISY_SAMPLES:
        pair = (text, label)
        if pair not in seen:
            rows.append(pair)
            seen.add(pair)

    for text, label in ADDITIONAL_EDGE_CASES:
        pair = (text, label)
        if pair not in seen:
            rows.append(pair)
            seen.add(pair)

    for text, label in ADDITIONAL_NOISY_SAMPLES:
        pair = (text, label)
        if pair not in seen:
            rows.append(pair)
            seen.add(pair)

    for text, label in ADDITIONAL_INFORMAL_ANGRY:
        pair = (text, label)
        if pair not in seen:
            rows.append(pair)
            seen.add(pair)

    counts = {label: sum(1 for _, row_label in rows if row_label == label) for label in LABELS}

    while any(counts[label] < TARGET_PER_LABEL for label in LABELS):
        for label in LABELS:
            if counts[label] >= TARGET_PER_LABEL:
                continue

            if random.random() < 0.25 and label in INFORMAL_PATTERNS:
                text = random.choice(INFORMAL_PATTERNS[label])
            else:
                text = build_sentence(label)
            pair = (text, label)
            if pair in seen:
                continue

            rows.append(pair)
            seen.add(pair)
            counts[label] += 1

    random.shuffle(rows)
    return rows


def write_dataset(rows: list[tuple[str, str]]) -> None:
    # Augment rows with multilingual and noisy variants conservatively
    rows = rows + HINGLISH_EXAMPLES + HINDI_EXAMPLES
    augmented = augment_rows(rows, add_hinglish=240, add_hindi=160, add_mixed=160, add_noisy=240)

    with OUTPUT_PATH.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["text", "label", "priority"])
        for text, label in augmented:
            writer.writerow([text, label, assign_priority_label(text)])


def main() -> None:
    rows = build_rows()
    write_dataset(rows)
    print(f"Wrote {len(rows)} rows to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()