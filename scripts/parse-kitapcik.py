import json
import os
import re

import pymupdf

DOWNLOADS = r"C:\Users\umut.agyuz\Downloads"
OUT = r"C:\Users\umut.agyuz\Desktop\COP31 SB hazilrk\web\data\kitapcik-20261103.json"

DATE = re.compile(
    r"^(\d{1,2})\s+KASIM(?:\s+(\d{1,2})[.:](\d{2})\s*[-–]\s*(\d{1,2})[.:](\d{2}))?$",
    re.I,
)
TIME = re.compile(r"^(\d{1,2})[.:](\d{2})\s*[-–]\s*(\d{1,2})[.:](\d{2})$")
OTURUM = re.compile(r"^[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ ]*OTURUM$")
HEADER = "COP31 T.C. SAĞLIK BAKANLIĞI"


def pdf_path():
    for name in os.listdir(DOWNLOADS):
        if name.startswith("COP-31") and name.endswith(".pdf") and "2026" in name:
            return os.path.join(DOWNLOADS, name)
    raise SystemExit("pdf yok")


def lines_of(page, page_no):
    rows = []
    for block in page.get_text("dict")["blocks"]:
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            text = "".join(span["text"] for span in line["spans"]).strip()
            if not text:
                continue
            x0 = min(span["bbox"][0] for span in line["spans"])
            y0 = min(span["bbox"][1] for span in line["spans"])
            rows.append({"page": page_no, "x": x0, "y": y0, "text": text})
    rows.sort(key=lambda row: (row["y"], row["x"]))
    return rows


def skip(row):
    text = row["text"]
    if text.startswith(HEADER):
        return True
    if row["y"] > 550 and len(text) <= 6:
        return True
    if text in {"PANEL VE SUNUM ÖZETLERİ", "PANEL VE SUNUM", "ÖZETLERİ", "PAVİLYON DIŞI YEŞİL ALAN ETKİNLİKLERİ", "PAVİLYON DIŞI", "YEŞİL ALAN", "ETKİNLİKLERİ"}:
        return True
    return False


def section_of(text):
    t = text.strip()
    low = t.lower()
    if t in {"Moderatör", "Moderatörü"}:
        return "moderator"
    if t in {"Panelistler", "Konuşmacılar"}:
        return "panelists"
    if "açılış konuşmac" in low:
        return "opening"
    if "panel yeri" in low or t.startswith("Panel Yeri"):
        return "place"
    if t == "Panel Konuşmacıları" or (re.match(r"^1\.", t) and "konuşmac" in low):
        return "speakers"
    if re.match(r"^1\.", t) and ("yürüten" in low or "paydaş" in low):
        return "orgs"
    if re.match(r"^2\.", t) and "özet" in low:
        return "summary"
    if re.match(r"^2\.", t):
        return "orgs"
    if re.match(r"^3\.", t) and "özet" in low:
        return "summary"
    if re.match(r"^3\.", t) or re.match(r"^4\.", t):
        return "climate"
    return None


def clock(hour, minute):
    return f"{int(hour):02d}:{minute}"


def main():
    doc = pymupdf.open(pdf_path())
    sessions = []
    current = None
    section = None
    pending = ""
    paused = False

    def blank(page, day, start, end):
        return {
            "page": page,
            "date": f"2026-11-{day:02d}",
            "start": start,
            "end": end,
            "label": "",
            "title": [],
            "speakers": [],
            "opening": [],
            "moderator": [],
            "panelists": [],
            "orgs": [],
            "summary": [],
            "climate": [],
            "place": [],
        }

    def close():
        nonlocal current, section
        if current and (current["title"] or current["summary"] or current["speakers"] or current["panelists"]):
            sessions.append(current)
        current = None
        section = None

    for index in range(31, min(doc.page_count, 93)):
        for row in lines_of(doc[index], index + 1):
            if skip(row):
                continue
            text = re.sub(r"\s+", " ", row["text"]).strip()
            if text.startswith("ETKİNLİK ALANLARI") or text == "NOTLAR":
                close()
                paused = True
                continue
            if paused and not (text.startswith("P-D") or DATE.match(text)):
                continue
            if paused and (text.startswith("P-D") or DATE.match(text)):
                paused = False
            if OTURUM.match(text):
                pending = text
                continue
            found = DATE.match(text)
            if found:
                close()
                day = int(found.group(1))
                start = clock(found.group(2), found.group(3)) if found.group(2) else ""
                end = clock(found.group(4), found.group(5)) if found.group(4) else ""
                current = blank(row["page"], day, start, end)
                current["label"] = pending
                pending = ""
                section = "title"
                continue
            timed = TIME.match(text)
            if timed and current is not None and not current["start"]:
                current["start"] = clock(timed.group(1), timed.group(2))
                current["end"] = clock(timed.group(3), timed.group(4))
                continue
            if text.startswith("P-D"):
                if current is None:
                    current = blank(row["page"], 1, "", "")
                    current["date"] = ""
                    section = "title"
                code, _, title = text.partition("–")
                if not title:
                    _, _, title = text.partition("-")
                current["label"] = code.strip()
                if title.strip():
                    current["title"] = [title.strip()]
                section = "title"
                continue
            if current is None:
                continue
            nxt = section_of(text)
            if nxt:
                section = nxt
                continue
            bucket = {
                "title": "title",
                "speakers": "speakers",
                "opening": "opening",
                "moderator": "moderator",
                "panelists": "panelists",
                "orgs": "orgs",
                "summary": "summary",
                "climate": "climate",
                "place": "place",
            }[section or "summary"]
            current[bucket].append(text)
    close()

    def join_prose(parts):
        if not parts:
            return ""
        text = re.sub(r"\s+", " ", " ".join(parts)).strip()
        return re.sub(r"\s+[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ ]*OTURUM$", "", text).strip()

    def join_people(parts):
        rows = []
        for part in parts:
            text = part.strip()
            if not text:
                continue
            if rows and (
                rows[-1].endswith((",", "–", "-", "(", " ve", " ile"))
                or text[:1].islower()
                or text.startswith(("Derneği", "Su ", "ve ", "ile ", "Lokal "))
            ):
                rows[-1] = f"{rows[-1]} {text}".strip()
            else:
                rows.append(text)
        return rows

    clean = []
    for row in sessions:
        title = join_prose(row["title"]).strip(" :")
        if len(title) < 8 and not row["label"].startswith("P-"):
            continue
        clean.append(
            {
                "page": row["page"],
                "date": row["date"],
                "start": row["start"],
                "end": row["end"],
                "label": row["label"],
                "title": title or row["label"],
                "opening": join_people(row["opening"]),
                "moderator": join_people(row["moderator"]),
                "panelists": join_people(row["panelists"]),
                "speakers": join_people(row["speakers"]),
                "orgs": join_people([part.strip(" ") for part in row["orgs"] if part.strip()]),
                "place": join_prose(row["place"]),
                "summary": join_prose(row["summary"]),
                "climate": join_prose(row["climate"]),
            }
        )
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as handle:
        json.dump(clean, handle, ensure_ascii=False, indent=2)
    print("sessions", len(clean))
    for row in clean:
        people = len(row["speakers"]) + len(row["moderator"]) + len(row["panelists"]) + len(row["opening"])
        print(f"{row['date']} {row['start']}-{row['end']} | {row['title'][:70]} | kisi {people} | ozet {len(row['summary'])}")


if __name__ == "__main__":
    main()
