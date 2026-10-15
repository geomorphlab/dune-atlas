"""Word documents for the translation reviewers, and applying their edits.

  python scripts/translations/review_docx.py build fr out.docx      # docs/translations/fr.md -> Word
  python scripts/translations/review_docx.py apply fr edited.docx   # edited Word -> docs/translations/fr.md
then run `npm run i18n` in app/ and commit.

One row per distinct English string (Earth and Mars copies of the same English share a row; the ID cell lists
every key). Columns: ID, English, translation (edited by the reviewer), comments. `apply` writes the
translation cells back to every key of the row and reports rows with comments and rows whose English cell was
changed (the English is never taken from the document). Needs python-docx.
"""
import re
import sys
from collections import OrderedDict
from pathlib import Path

from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[2]
LANGS = {"fr": ("FR", "French", "Français"), "zh-Hans": ("ZH", "Simplified Chinese", "简体中文")}
ORDER = ["Interface", "Help panel", "Guided tour", "Layer groups", "Layers and legends", "Basemaps", "Concepts",
         "Layer panel", "Layer popovers", "About", "Cell panel", "Tool panels", "Search and messages",
         "Exported images", "Other interface", "Other", "Screen-reader labels and tooltips"]


def parse_md(path, tag):
    out = []
    for block in re.split(r"^## ", path.read_text(encoding="utf-8"), flags=re.M)[1:]:
        lines = block.split("\n")
        m = re.match(r"^(\S+)(\s+STALE)?(?:\s+\((.*)\))?\s*$", lines[0].strip())
        get = lambda p: next((l[len(p) + 1:].strip() for l in lines if l.startswith(p + ":")), "")
        out.append({"key": m.group(1), "stale": bool(m.group(2)), "area": m.group(3) or "", "en": get("EN"), "text": get(tag)})
    return out


def rows_of(entries):
    rows = OrderedDict()
    for e in entries:
        if e["area"].startswith("Unused"):
            continue
        r = rows.setdefault(e["en"], {"keys": [], "en": e["en"], "text": e["text"], "area": e["area"], "stale": False})
        r["keys"].append(e["key"]); r["stale"] |= e["stale"]
        if not r["text"]:
            r["text"] = e["text"]
    by_area = OrderedDict((a, []) for a in ORDER)
    for r in rows.values():
        by_area.setdefault(r["area"], []).append(r)
    return by_area


def set_font(run, size, east_asian=None, color=None, bold=False):
    run.font.size = Pt(size); run.font.bold = bold
    if color: run.font.color.rgb = RGBColor(*color)
    if east_asian:
        rpr = run._element.get_or_add_rPr(); fonts = rpr.find(qn("w:rFonts"))
        if fonts is None:
            fonts = OxmlElement("w:rFonts"); rpr.append(fonts)
        fonts.set(qn("w:eastAsia"), east_asian)


def repeat_header(row):
    trpr = row._tr.get_or_add_trPr(); h = OxmlElement("w:tblHeader"); h.set(qn("w:val"), "true"); trpr.append(h)


def build(lang, out):
    tag, name, native = LANGS[lang]
    ea = "Microsoft YaHei" if lang == "zh-Hans" else None
    by_area = rows_of(parse_md(ROOT / "docs/translations" / f"{lang}.md", tag))
    doc = Document()
    sec = doc.sections[0]
    sec.orientation = WD_ORIENT.LANDSCAPE; sec.page_width, sec.page_height = sec.page_height, sec.page_width
    for side in ("left_margin", "right_margin", "top_margin", "bottom_margin"):
        setattr(sec, side, Cm(1.6))
    doc.styles["Normal"].font.name = "Calibri"; doc.styles["Normal"].font.size = Pt(10)
    doc.add_heading(f"Dune Atlas: {name} text for review ({native})", 0)
    n = sum(len(v) for v in by_area.values())
    for para in [
        f"These are all the {name} texts of the Dune Atlas (map.geomorphlab.org and map.geomorphlab.org/mars/, button 中文 / FR "
        f"below the planet button on the map). They are a first, machine-drafted version that is already live. Please correct anything "
        f"that is wrong, unclear or unidiomatic for a geomorphologist reading in {name}.",
        "How to edit: change only the third column (the translation). Write questions or doubts in the fourth column (Comments). "
        "Do not change the ID or English columns. Track Changes on or off are both fine. Rows marked STALE: the English changed "
        "after the translation was made; please check them first.",
        "Keep unchanged: formulas between $ signs (e.g. $u_{*,th}$, shown on the site as symbols); markers such as ⟦0⟧, ⟦1⟧ (a formula, "
        "name, live number or button is put there; write them attached exactly as in the English) and ⟦#0⟧ (a number); HTML tags such as "
        "<br>, <strong>…</strong> and <a href=\"…\">…</a> (translate only the words between them); {placeholders}; acronyms (DP, RDP, "
        "RDD, VU, αT …), names of datasets, products and people, and references.",
        f"The areas follow the site from the most visible to the least: interface, help and tour, layer names and legends, Concepts, "
        f"popovers, About, cell panel, then messages, exported images and, last and optional, screen-reader labels and tooltips. "
        f"{n} rows in total. Thank you!",
    ]:
        p = doc.add_paragraph(para)
    doc.add_heading("Agreed terms (glossary)", 1)
    import csv
    gl = list(csv.DictReader((ROOT / "docs/translations/translation-glossary.csv").open(encoding="utf-8")))
    t = doc.add_table(rows=1, cols=3); t.style = "Light Grid Accent 1"
    for c, h in zip(t.rows[0].cells, ["English", name, "Notes"]):
        c.text = h
    repeat_header(t.rows[0])
    for g in gl:
        cells = t.add_row().cells
        cells[0].text = g["en"]; cells[1].text = g[lang]; cells[2].text = g.get("source/notes", "") or ""
        for c in cells:
            for r in c.paragraphs[0].runs: set_font(r, 8, ea)
    widths = [Cm(3.0), Cm(10.6), Cm(10.6), Cm(2.4)]
    for area, rows in by_area.items():
        if not rows:
            continue
        doc.add_page_break()
        doc.add_heading(area + (" (optional)" if area.startswith("Screen-reader") else ""), 1)
        t = doc.add_table(rows=1, cols=4); t.style = "Table Grid"; t.alignment = WD_TABLE_ALIGNMENT.CENTER
        for c, h, w in zip(t.rows[0].cells, ["ID", "English", f"{name} (edit here)", "Comments"], widths):
            c.text = ""; set_font(c.paragraphs[0].add_run(h), 9, ea, bold=True); c.width = w
        repeat_header(t.rows[0])
        for r in rows:
            cells = t.add_row().cells
            set_font(cells[0].paragraphs[0].add_run("\n".join(r["keys"]) + ("\nSTALE" if r["stale"] else "")), 6, None, (0x80, 0x80, 0x80))
            set_font(cells[1].paragraphs[0].add_run(r["en"]), 9, ea)
            set_font(cells[2].paragraphs[0].add_run(r["text"]), 10, ea)
            for c, w in zip(cells, widths):
                c.width = w
    doc.save(out)
    print(f"{out}: {n} rows")


def apply(lang, docx_path):
    tag, name, _ = LANGS[lang]
    md = ROOT / "docs/translations" / f"{lang}.md"
    entries = parse_md(md, tag)
    by_key = {e["key"]: e for e in entries}
    changed, comments, en_edits = 0, [], []
    for t in Document(docx_path).tables:
        if len(t.columns) != 4:
            continue
        for row in t.rows[1:]:
            cells = [c.text.strip() for c in row.cells]
            keys = [k for k in cells[0].split("\n") if k and k != "STALE"]
            if not keys or keys[0] not in by_key:
                continue
            if cells[1] != by_key[keys[0]]["en"]:
                en_edits.append(keys[0])
            if cells[3]:
                comments.append((keys[0], cells[3]))
            new = re.sub(r"\s*\n\s*", " ", cells[2]).strip()
            for k in keys:
                e = by_key.get(k)
                if e and new and new != e["text"]:
                    e["text"] = new; e["stale"] = False; changed += 1
    text = md.read_text(encoding="utf-8")
    def sub(m):
        e = by_key.get(m.group(1))
        return m.group(0) if not e else f"## {e['key']}{' STALE' if e['stale'] else ''} ({e['area']})\nEN: {e['en']}\n{tag}: {e['text']}"
    text = re.sub(rf"^## (\S+)[^\n]*\nEN: [^\n]*\n{tag}: [^\n]*", sub, text, flags=re.M)
    md.write_text(text, encoding="utf-8")
    print(f"{changed} translation(s) updated in {md.name}")
    for k, c in comments:
        print(f"comment {k}: {c}")
    if en_edits:
        print(f"English cells changed (ignored): {', '.join(en_edits)}")


if __name__ == "__main__":
    {"build": build, "apply": apply}[sys.argv[1]](sys.argv[2], sys.argv[3])
