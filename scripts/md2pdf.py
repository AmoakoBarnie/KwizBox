import sys, os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors

SRC = sys.argv[1]
OUT = sys.argv[2]

with open(SRC, encoding='utf-8') as f:
    lines = f.read().split('\n')

styles = getSampleStyleSheet()
styles.add(ParagraphStyle('H1b', parent=styles['Heading1'], fontSize=16, spaceAfter=8))
styles.add(ParagraphStyle('H2b', parent=styles['Heading2'], fontSize=13, spaceBefore=10, spaceAfter=4))
styles.add(ParagraphStyle('H3b', parent=styles['Heading3'], fontSize=11, spaceBefore=6, spaceAfter=2))
styles.add(ParagraphStyle('Body', parent=styles['BodyText'], fontSize=9.5, leading=13))
styles.add(ParagraphStyle('Mono', parent=styles['BodyText'], fontName='Courier', fontSize=8.5, leading=11))
styles.add(ParagraphStyle('BulletX', parent=styles['BodyText'], fontSize=9.5, leading=13, leftIndent=12))

def esc(t):
    return (t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'))

TBL_STYLE = TableStyle([
    ('FONTSIZE', (0,0), (-1,-1), 8.5),
    ('GRID', (0,0), (-1,-1), 0.4, colors.grey),
    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0b7a4b')),
    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#eef7f1')]),
])

flow = []
pending = []          # list of rows for a table being built
def flush_table():
    global pending
    if pending:
        tbl = Table([[Paragraph(esc(c), styles['Body']) for c in r] for r in pending], hAlign='LEFT')
        tbl.setStyle(TBL_STYLE)
        flow.append(tbl)
        flow.append(Spacer(1, 4))
        pending = []

in_code = False
code_buf = []
for ln in lines:
    s = ln.rstrip()
    if s.strip().startswith('```'):
        if in_code:
            flush_table()
            flow.append(Paragraph(esc('\n'.join(code_buf)), styles['Mono']))
            flow.append(Spacer(1, 4))
            code_buf = []
            in_code = False
        else:
            flush_table()
            in_code = True
        continue
    if in_code:
        code_buf.append(ln); continue
    if s.startswith('|') and s.endswith('|'):
        cells = [c.strip() for c in s.strip('|').split('|')]
        # skip markdown separator row (---|---)
        if all(set(c) <= set('-: ') for c in cells):
            continue
        pending.append(cells)
        continue
    # non-table line -> flush any pending table
    flush_table()
    if s.startswith('# '):
        flow.append(Paragraph(esc(s[2:]), styles['H1b']))
    elif s.startswith('## '):
        flow.append(Paragraph(esc(s[3:]), styles['H2b']))
    elif s.startswith('### '):
        flow.append(Paragraph(esc(s[4:]), styles['H3b']))
    elif s == '':
        flow.append(Spacer(1, 6))
    elif s.startswith('- '):
        flow.append(Paragraph('• ' + esc(s[2:]), styles['BulletX']))
    else:
        flow.append(Paragraph(esc(s), styles['Body']))
flush_table()

doc = SimpleDocTemplate(OUT, pagesize=A4, topMargin=1.6*cm, bottomMargin=1.6*cm,
                        leftMargin=1.8*cm, rightMargin=1.8*cm,
                        title=os.path.basename(SRC))
doc.build(flow)
print('wrote', OUT)
