"""NaCCA curriculum PDF extractor v7.

Comprehensive parser for all NaCCA curriculum PDF formats:
  1. Table format (Maths, Science): CONTENT STANDARDS / INDICATORS columns
  2. French format: Content standard + indicators in text
  3. PE format: Multi-column B1/B2/B3 layout
  4. Creative Arts: Compact format with Strand/Sub-strand headers

Uses plain text extraction with robust regex to find:
  - Content standards: B4.1.1.1 pattern with text
  - Indicators: B4.1.1.1.1 pattern with text
  - Levels: B4, B5, B6, B7, B8, B9
  - Strands: detected from known strand names or "Strand N: name" pattern
  - Sub-strands: detected from "Sub-strand N: name" pattern
"""

import re, json
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    pdfplumber = None

OUTPUT_DIR = Path('/media/stephen/FILES/MyShit/ghana-stem-trivia/backend/curriculum/output')

SUBJECT_CODE_MAP = {
    'Mathematics': 'mathematics',
    'Science': 'science',
    'English': 'english',
    'French': 'french',
    'Computing': 'computing',
    'Ghanaian Language': 'ghanaian_language',
    'History': 'history',
    'Our World and Our People': 'our_world_and_our_people',
    'Creative Arts': 'creative_arts',
    'Physical Education': 'physical_education',
    'Religious and Moral Education': 'religious_and_moral_education',
    'Career Technology': 'career_technology',
    'Arabic': 'arabic',
    'Social Studies': 'social_studies',
}

STRAND_PATTERNS = {
    'Mathematics': [
        r'Strand\s*1[:\s]*Number', r'Strand\s*2[:\s]*Algebra', r'Strand\s*3[:\s]*Measurement',
        r'Strand\s*4[:\s]*Geometry', r'Strand\s*5[:\s]*Statistics', r'Strand\s*6[:\s]*Data',
        r'Number', r'Algebra', r'Measurement', r'Geometry', r'Statistics', r'Data',
        r'Handling Data', r'Number and Numeration Systems', r'Whole Numbers Operations',
        r'Fractions, Decimals and Percentages', r'Patterns and Relations',
        r'Counting', r'Representation', r'Cardinality', r'Place Value',
        r'Addition', r'Subtraction', r'Multiplication', r'Division',
        r'Fraction', r'Decimal', r'Percent', r'Ratio', r'Proportion',
        r'Angle', r'Shape', r'Space', r'Position', r'Movement',
        r'Probability', r'Graph', r'Table', r'Data Handling',
    ],
    'Science': [
        r'Strand\s*1[:\s]*Diversity of Matter', r'Strand\s*2[:\s]*Cycles',
        r'Strand\s*3[:\s]*Systems', r'Strand\s*4[:\s]*Forces and Energy',
        r'Strand\s*5[:\s]*Humans and the Environment',
        r'Diversity of Matter', r'Cycles', r'Systems', r'Forces and Energy',
        r'Humans and the Environment', r'Living and Non-Living', r'Materials',
        r'Earth Science', r'Life Cycles', r'The Human Body', r'Solar System',
        r'Ecosystem', r'Sources and Forms of Energy', r'Electricity',
        r'Forces and Movement', r'Personal Hygiene', r'Diseases',
        r'Science and Industry', r'Classification', r'Organisation',
    ],
    'English': [
        r'Strand\s*1[:\s]*Listening', r'Strand\s*2[:\s]*Speaking',
        r'Strand\s*3[:\s]*Reading', r'Strand\s*4[:\s]*Writing',
        r'Strand\s*5[:\s]*Language Studies', r'Strand\s*6[:\s]*Literature',
        r'Listening', r'Speaking', r'Reading', r'Writing',
        r'Language Studies', r'Literature', r'Comprehension',
        r'Grammar', r'Vocabulary', r'Composition', r'Text Types',
    ],
    'French': [
        r'Strand\s*1[:\s]*Listening', r'Strand\s*2[:\s]*Speaking',
        r'Strand\s*3[:\s]*Reading', r'Strand\s*4[:\s]*Writing',
        r'Compréhension', r'Production', r'Écouter', r'Parler', r'Lire', r'Écrire',
        r'Listening', r'Speaking', r'Reading', r'Writing',
        r'Language Studies', r'Literature',
    ],
    'Computing': [
        r'Strand\s*1[:\s]*Computer Basics', r'Strand\s*2[:\s]*Coding',
        r'Strand\s*3[:\s]*Internet', r'Strand\s*4[:\s]*Digital Citizenship',
        r'Computer Basics', r'Coding', r'Internet', r'Digital Citizenship',
        r'Data Handling', r'Safety', r'Ethics', r'Technology',
    ],
    'Ghanaian Language': [
        r'Strand\s*1[:\s]*Listening', r'Strand\s*2[:\s]*Speaking',
        r'Strand\s*3[:\s]*Reading', r'Strand\s*4[:\s]*Writing',
        r'Listening', r'Speaking', r'Reading', r'Writing', r'Literature',
    ],
    'History': [
        r'Strand\s*1[:\s]*Ghanaian History', r'Strand\s*2[:\s]*African History',
        r'Strand\s*3[:\s]*World History', r'Strand\s*4[:\s]*Historical Skills',
        r'Ghanaian History', r'African History', r'World History', r'Historical Skills',
    ],
    'Our World and Our People': [
        r'Strand\s*1[:\s]*Our Environment', r'Strand\s*2[:\s]*Our Community',
        r'Strand\s*3[:\s]*Our Nation', r'Strand\s*4[:\s]*Our World',
        r'Our Environment', r'Our Community', r'Our Nation', r'Our World',
    ],
    'Creative Arts': [
        r'Strand\s*1[:\s]*Visual Arts', r'Strand\s*2[:\s]*Music',
        r'Strand\s*3[:\s]*Dance', r'Strand\s*4[:\s]*Drama',
        r'Visual Arts', r'Music', r'Dance', r'Drama', r'Creative Expression',
        r'Performing Arts', r'Appreciating', r'Creating',
    ],
    'Physical Education': [
        r'Strand\s*1[:\s]*Motor Skills', r'Strand\s*2[:\s]*Health-Related Fitness',
        r'Strand\s*3[:\s]*Recreation', r'Strand\s*4[:\s]*Safety',
        r'Motor Skills', r'Movement', r'Games', r'Fitness', r'Safety',
        r'Health', r'Athletics', r'Gymnastics', r'Dance', r'Swimming',
    ],
    'Religious and Moral Education': [
        r'Strand\s*1[:\s]*Moral Values', r'Strand\s*2[:\s]*Religious Beliefs',
        r'Strand\s*3[:\s]*Practices', r'Strand\s*4[:\s]*Social Interaction',
        r'Moral Values', r'Religious Beliefs', r'Practices', r'Social Interaction',
        r'Values', r'Ethics', r'Spirituality',
    ],
    'Career Technology': [
        r'Strand\s*1[:\s]*Home Economics', r'Strand\s*2[:\s]*Agriculture',
        r'Strand\s*3[:\s]*Technology', r'Strand\s*4[:\s]*Business Education',
        r'Home Economics', r'Agriculture', r'Technology', r'Business Education',
        r'Art and Design', r'Entrepreneurship',
    ],
    'Arabic': [
        r'Strand\s*1[:\s]*Listening', r'Strand\s*2[:\s]*Speaking',
        r'Strand\s*3[:\s]*Reading', r'Strand\s*4[:\s]*Writing',
        r'Listening', r'Speaking', r'Reading', r'Writing', r'Literature',
    ],
    'Social Studies': [
        r'Strand\s*1[:\s]*Our Surroundings', r'Strand\s*2[:\s]*Our Community',
        r'Strand\s*3[:\s]*Our Nation', r'Strand\s*4[:\s]*Our World',
        r'Our Surroundings', r'Our Community', r'Our Nation', r'Our World',
    ],
}

SUB_STRAND_PATTERNS = [
    r'Sub-strand\s*(\d+)[\.\s]*[:]*\s*(.+)',
    r'Sub-Strand\s*(\d+)[\.\s]*[:]*\s*(.+)',
]


def extract_text_plain(path: Path) -> str:
    """Extract plain text from all pages."""
    if pdfplumber is None:
        raise RuntimeError('pdfplumber is required')
    all_text = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            txt = page.extract_text() or ''
            if txt.strip():
                all_text.append(txt)
    return '\n'.join(all_text)


def extract_tables(path: Path) -> list:
    """Extract all tables from a PDF."""
    if pdfplumber is None:
        raise RuntimeError('pdfplumber is required')
    results = []
    with pdfplumber.open(path) as pdf:
        for pi, page in enumerate(pdf.pages):
            tables = page.extract_tables()
            if tables:
                for t in tables:
                    if t and len(t) > 1:
                        results.append((pi, t))
    return results


def detect_strand(line: str, known_strands: list) -> str:
    """Detect strand name from a line."""
    for pattern in known_strands:
        m = re.search(pattern, line, re.IGNORECASE)
        if m:
            return m.group(1) if m.lastindex else m.group(0)
    # Also check for "Strand N: name" format
    m = re.search(r'Strand\s*\d+[:\s]*(.+)', line)
    if m:
        return m.group(1).strip()
    return None


def detect_sub_strand(line: str) -> str:
    """Detect sub-strand name from a line."""
    for pattern in SUB_STRAND_PATTERNS:
        m = re.search(pattern, line, re.IGNORECASE)
        if m:
            return m.group(2).strip()
    return None


def parse_pdf(path: Path, subject_name: str) -> dict:
    """Parse any NaCCA PDF into subject data.
    
    Handles multiple formats by:
    1. Extracting plain text
    2. Finding all B-pattern content standards and indicators
    3. Detecting strand/sub-strand names from known patterns
    """
    text = extract_text_plain(path)
    subject = {'subject': subject_name, 'levels': []}

    known_strands = STRAND_PATTERNS.get(subject_name, [])

    # Regex patterns
    cs_re = re.compile(r'^(B\d+\.\d+\.\d+\.\d+)\s+(.*)', re.MULTILINE)
    ind_re = re.compile(r'^(B\d+\.\d+\.\d+\.\d+\.\d+)\s*(?:[:\s]+)?(.*)', re.MULTILINE)

    lines = text.split('\n')
    current_cs_id = None
    current_cs_text = ''
    current_indicators = []
    current_level = None
    current_strand = None
    current_sub_strand = None
    strand_names = []

    # Detect level from filename
    fname = str(path)
    for lvl in ['B4', 'B5', 'B6', 'B7', 'B8', 'B9']:
        if lvl in fname:
            current_level = lvl
            break

    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue

        # Skip annotation/explanation pages
        if line.startswith('ANNOTATION') or line.startswith('A unique annotation'):
            i += 1
            continue

        # Check for level change in the line
        level_match = re.search(r'\b(B[4-9])\b', line)
        if level_match:
            new_level = level_match.group(1)
            if new_level != current_level:
                current_level = new_level

        # Check for strand
        strand = detect_strand(line, known_strands)
        if strand and strand not in strand_names:
            strand_names.append(strand)
            current_strand = strand
            current_sub_strand = None  # Reset sub-strand when new strand found
            i += 1
            continue

        # Check for sub-strand
        sub = detect_sub_strand(line)
        if sub:
            current_sub_strand = sub
            i += 1
            continue

        # Check for content standard (B4.1.1.1 at line start)
        m = cs_re.match(line)
        if m and re.match(r'^B\d+\.\d+\.\d+\.\d+$', m.group(1)):
            if current_cs_id and current_level:
                _add_cs(subject, current_level, current_strand, current_sub_strand,
                        current_cs_id, current_cs_text, current_indicators)
            current_cs_id = m.group(1)
            current_cs_text = m.group(2).strip()
            current_indicators = []
            i += 1
            continue

        # Check for indicator (B4.1.1.1.1 at line start)
        m2 = ind_re.match(line)
        if m2 and current_cs_id:
            ind_id = m2.group(1)
            ind_text = m2.group(2).strip()
            if re.match(r'^B\d+\.\d+\.\d+\.\d+\.\d+$', ind_id):
                # Clean up indicator text
                ind_text = re.sub(r'\s+', ' ', ind_text)
                # Remove leading colon or whitespace
                ind_text = ind_text.lstrip(': ').strip()
                current_indicators.append({'indicator_id': ind_id, 'text': ind_text})
                i += 1
                continue
            elif ind_text and current_indicators:
                # Continuation text for last indicator
                current_indicators[-1]['text'] += ' ' + ind_text
                i += 1
                continue

        # If line is a continuation of the CS text (not a new CS or indicator)
        if current_cs_id and line and not line.startswith('©') and not line.startswith('E.g') and not line.startswith('Ex.'):
            if len(line) > 5 and not re.match(r'^B\d+\.', line):
                # Could be continuation of CS text - but only append if it seems meaningful
                if not line[0].isdigit() or len(line) > 30:
                    pass  # Skip to avoid noise; CS text from col0 is already captured

        i += 1

    # Flush last
    if current_cs_id and current_level:
        _add_cs(subject, current_level, current_strand, current_sub_strand,
                current_cs_id, current_cs_text, current_indicators)

    return subject


def _add_cs(subject, level_code, strand_name, sub_strand_name, cs_id, cs_text, indicators):
    """Add a content standard to the subject data structure."""
    if not level_code:
        return
    levels = subject['levels']
    level_entry = None
    for lv in levels:
        if lv['code'] == level_code:
            level_entry = lv
            break
    if level_entry is None:
        level_entry = {'code': level_code, 'strands': []}
        levels.append(level_entry)
    strand_entry = None
    for st in level_entry['strands']:
        if st['name'] == strand_name:
            strand_entry = st
            break
    if strand_entry is None:
        strand_entry = {'name': strand_name or 'General', 'sub_strands': []}
        level_entry['strands'].append(strand_entry)
    sub_entry = None
    for ss in strand_entry['sub_strands']:
        if ss['name'] == sub_strand_name:
            sub_entry = ss
            break
    if sub_entry is None:
        sub_entry = {'name': sub_strand_name or 'General', 'content_standards': []}
        strand_entry['sub_strands'].append(sub_entry)
    sub_entry['content_standards'].append({
        'id': cs_id,
        'text': cs_text,
        'indicators': indicators
    })


def main():
    import sys
    if len(sys.argv) < 2:
        print('Usage: parse_nacca.py --url <pdf_path> --subject-name <name>')
        sys.exit(1)

    url = None
    subject_name = 'Science'

    args = sys.argv[1:]
    for i, arg in enumerate(args):
        if arg == '--url' and i + 1 < len(args):
            url = args[i + 1]
        elif arg == '--subject-name' and i + 1 < len(args):
            subject_name = args[i + 1]

    if not url:
        print('Error: --url required')
        sys.exit(1)

    path = Path(url)
    if not path.exists():
        print(f'Error: {path} not found')
        sys.exit(1)

    data = parse_pdf(path, subject_name)

    # Save per-subject JSON
    safe_name = subject_name.lower().replace(' ', '_')
    output_path = OUTPUT_DIR / f'{safe_name}.json'
    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2)
    print(f'Wrote {output_path}')

    # Count stats
    total_inds = 0
    total_stds = 0
    total_levels = len(data.get('levels', []))
    for lv in data.get('levels', []):
        for st in lv.get('strands', []):
            for ss in st.get('sub_strands', []):
                for cs in ss.get('content_standards', []):
                    total_stds += 1
                    total_inds += len(cs.get('indicators', []))
    print(f'Stats: {total_levels} levels, {total_stds} standards, {total_inds} indicators')

    # Update manifest
    manifest_path = OUTPUT_DIR / 'nacca_manifest.json'
    if manifest_path.exists():
        with open(manifest_path) as f:
            manifest = json.load(f)
    else:
        manifest = {'subjects': []}

    code = SUBJECT_CODE_MAP.get(subject_name, subject_name.lower().replace(' ', '_'))
    manifest['subjects'] = [s for s in manifest['subjects'] if s['code'] != code]
    manifest['subjects'].append({
        'code': code,
        'name': subject_name,
        'levels': data.get('levels', [])
    })

    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)
    print(f'Manifest updated: {len(manifest["subjects"])} subjects')


if __name__ == '__main__':
    main()