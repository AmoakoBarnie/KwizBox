import re
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_LEFT
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                TableStyle, Preformatted, ListFlowable, ListItem,
                                HRFlowable, KeepTogether)
from reportlab.platypus.flowables import Flowable

SRC = "C:/Users/Amoako/ghana-stem-trivia/PAPER_Ghana_STEM_Trivia.md"
OUT = "C:/Users/Amoako/ghana-stem-trivia/PAPER_Ghana_STEM_Trivia.pdf"

GREEN = colors.HexColor("#006B3F")
GREEN_D = colors.HexColor("#00b36b")
GOLD = colors.HexColor("#FCD116")
DARK = colors.HexColor("#0b1f16")
INK = colors.HexColor("#15281f")
MUTED = colors.HexColor("#5f7a6c")
LIGHT = colors.HexColor("#eef6f1")

styles = getSampleStyleSheet()
def S(name, **kw):
    base = kw.pop("parent", styles["Normal"])
    return ParagraphStyle(name, parent=base, **kw)

title_st = S("title", parent=styles["Title"], fontName="Helvetica-Bold",
             fontSize=22, textColor=DARK, spaceAfter=4, leading=26)
sub_st = S("sub", fontSize=11, textColor=MUTED, alignment=TA_CENTER, spaceAfter=2)
h1 = S("h1", fontName="Helvetica-Bold", fontSize=15, textColor=GREEN,
       spaceBefore=14, spaceAfter=6, leading=18, borderPadding=0)
h2 = S("h2", fontName="Helvetica-Bold", fontSize=12.5, textColor=DARK,
       spaceBefore=10, spaceAfter=4, leading=15)
body = S("body", fontSize=10.5, textColor=INK, alignment=TA_JUSTIFY,
         leading=15, spaceAfter=6)
bullet = S("bullet", fontSize=10.5, textColor=INK, leading=14)
code_st = S("code", fontName="Courier", fontSize=8.5, textColor=colors.HexColor("#0b3d27"),
            backColor=LIGHT, leading=11, borderPadding=6, leftIndent=4)
small = S("small", fontSize=8.5, textColor=MUTED, leading=11)
quote_st = S("quote", fontSize=10.5, textColor=INK, leading=15, leftIndent=10,
             borderColor=GREEN, spaceAfter=6)

def inline(md):
    # bold, italic, code
    md = re.sub(r"`([^`]+)`", r'<font face="Courier" size="9">\1</font>', md)
    md = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", md)
    md = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<i>\1</i>", md)
    return md

def parse_table(lines):
    rows = []
    for ln in lines:
        ln = ln.strip()
        if ln.startswith("|"):
            cells = [c.strip() for c in ln.strip("|").split("|")]
            rows.append(cells)
    return rows

def build():
    flow = []
    with open(SRC, encoding="utf-8") as f:
        lines = f.read().split("\n")

    i = 0
    first = True
    table_buf = []
    in_table = False
    code_buf = []
    in_code = False

    def flush_table():
        nonlocal table_buf
        if len(table_buf) >= 2:
            data = [table_buf[0]]
            aligns = table_buf[1]
            for r in table_buf[2:]:
                data.append(r)
            tbl = Table(data, hAlign="LEFT")
            ts = [
                ("BACKGROUND", (0,0), (-1,0), GREEN),
                ("TEXTCOLOR", (0,0), (-1,0), colors.white),
                ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
                ("FONTSIZE", (0,0), (-1,-1), 8.5),
                ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
                ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, LIGHT]),
                ("GRID", (0,0), (-1,-1), 0.5, colors.HexColor("#cfe0d8")),
                ("TOPPADDING", (0,0), (-1,-1), 5),
                ("BOTTOMPADDING", (0,0), (-1,-1), 5),
                ("LEFTPADDING", (0,0), (-1,-1), 6),
                ("RIGHTPADDING", (0,0), (-1,-1), 6),
            ]
            tbl.setStyle(TableStyle(ts))
            flow.append(tbl)
            flow.append(Spacer(1, 8))
        table_buf = []

    while i < len(lines):
        line = lines[i]
        # code fences
        if line.strip().startswith("```"):
            if in_code:
                code = "\n".join(code_buf)
                flow.append(Preformatted(code, code_st))
                flow.append(Spacer(1, 6))
                code_buf = []
                in_code = False
            else:
                if in_table: flush_table(); in_table=False; table_buf=[]
                in_code = True
            i += 1
            continue
        if in_code:
            code_buf.append(line)
            i += 1
            continue
        # tables
        if line.strip().startswith("|") and ("---" in line or set(line.strip()) <= set("|-: ")):
            # header or separator
            if not in_table:
                in_table = True
            table_buf.append([c.strip() for c in line.strip("|").split("|")])
            i += 1
            continue
        if in_table and line.strip().startswith("|"):
            table_buf.append([inline(c.strip()) for c in line.strip("|").split("|")])
            i += 1
            continue
        if in_table and not line.strip().startswith("|"):
            flush_table(); in_table=False; table_buf=[]
            # fall through (do not skip)
        # headings
        if line.startswith("# "):
            if first:
                first = False
            txt = inline(line[2:].strip())
            flow.append(Paragraph(txt, title_st))
            i += 1
            continue
        if line.startswith("## "):
            flow.append(Paragraph(inline(line[3:].strip()), h1))
            flow.append(HRFlowable(width="100%", thickness=1, color=GOLD,
                                  spaceBefore=0, spaceAfter=6))
            i += 1
            continue
        if line.startswith("### "):
            flow.append(Paragraph(inline(line[4:].strip()), h2))
            i += 1
            continue
        # horizontal rule
        if line.strip() == "---" or line.strip() == "***":
            flow.append(HRFlowable(width="100%", thickness=0.6, color=LIGHT,
                                  spaceBefore=4, spaceAfter=6))
            i += 1
            continue
        # blockquote (italic author lines)
        if line.startswith("> "):
            flow.append(Paragraph(inline(line[2:].strip()), quote_st))
            i += 1
            continue
        # bullet lists
        if re.match(r"^\s*[-*] ", line):
            items = []
            while i < len(lines) and re.match(r"^\s*[-*] ", lines[i]):
                items.append(ListItem(Paragraph(inline(re.sub(r"^\s*[-*] ", "", lines[i])), bullet),
                                      leftIndent=12))
                i += 1
            flow.append(ListFlowable(items, bulletType="bullet",
                                     start="•", leftIndent=14, bulletColor=GREEN))
            flow.append(Spacer(1, 4))
            continue
        # numbered lists
        if re.match(r"^\s*\d+\. ", line):
            items = []
            while i < len(lines) and re.match(r"^\s*\d+\. ", lines[i]):
                items.append(ListItem(Paragraph(inline(re.sub(r"^\s*\d+\. ", "", lines[i])), bullet),
                                      leftIndent=12))
                i += 1
            flow.append(ListFlowable(items, bulletType="1", leftIndent=16, bulletColor=GREEN))
            flow.append(Spacer(1, 4))
            continue
        # blank
        if line.strip() == "":
            i += 1
            continue
        # normal paragraph
        # merge consecutive non-special lines
        para = line.strip()
        i += 1
        while i < len(lines) and lines[i].strip() != "" \
                and not lines[i].startswith(("#","|","- ","* ","> ","```")) \
                and not re.match(r"^\s*\d+\. ", lines[i]) \
                and not lines[i].strip().startswith("---"):
            para += " " + lines[i].strip()
            i += 1
        if para:
            flow.append(Paragraph(inline(para), body))
    if in_table: flush_table()
    return flow

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LIGHT); canvas.setLineWidth(0.5)
    canvas.line(20*mm, 15*mm, 190*mm, 15*mm)
    canvas.setFont("Helvetica", 8); canvas.setFillColor(MUTED)
    canvas.drawString(20*mm, 10*mm, "Ghana STEM Trivia — Technical Paper")
    canvas.drawRightString(190*mm, 10*mm, "Page %d" % doc.page)
    canvas.restoreState()

doc = SimpleDocTemplate(OUT, pagesize=A4,
                        leftMargin=20*mm, rightMargin=20*mm,
                        topMargin=18*mm, bottomMargin=20*mm,
                        title="Ghana STEM Trivia — Technical Paper",
                        author="Stephen Barnie Amoako")
doc.build(build(), onFirstPage=footer, onLaterPages=footer)
print("PDF written to", OUT)
