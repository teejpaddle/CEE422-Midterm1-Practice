"""Parse source.md into questions.js."""
import json, re, sys

src = open("source.md", encoding="utf-8").read().split("\n")
sections, qs = {}, []
cur = None
sec = None
for line in src:
    m = re.match(r"# (\d+)\. (.+)", line)
    if m:
        sec = int(m.group(1))
        sections[sec] = re.sub(r"\s*\*\(.*\)\*", "", m.group(2)).strip()
        continue
    m = re.match(r"### (Q\d+\.\d+) \[([^\]]+)\] (.*)", line)
    if m:
        cur = {"id": m.group(1), "section": sec, "tag": m.group(2).split(",")[0].strip(),
               "text": m.group(3), "options": [], "answer": None, "explain": {}, "_stem": True}
        qs.append(cur)
        continue
    if cur is None:
        continue
    if line.startswith("---") or line.startswith("# "):
        cur = None
        continue
    m = re.match(r"- ([A-F])\. (.*)", line)
    if m:
        cur["_stem"] = False
        cur["options"].append({"k": m.group(1), "t": m.group(2)})
        continue
    m = re.match(r"\*\*Answer: ([A-F])\*\*", line)
    if m:
        cur["answer"] = m.group(1)
        continue
    m = re.match(r"- \*\*([A-F](?:, ?[A-F])*) — (.+?)\.?\*\* ?(.*)", line)
    if m:
        label = "Incorrect" if "Incorrect" in m.group(2) else m.group(2)
        for k in re.findall(r"[A-F]", m.group(1)):
            cur["explain"][k] = {"label": label, "t": m.group(3)}
        cur["_last"] = re.findall(r"[A-F]", m.group(1))
        continue
    if line.strip() and cur["_stem"]:
        cur["text"] += "\n" + line
    elif line.strip() and cur["explain"]:
        for k in cur["_last"]:
            cur["explain"][k]["t"] += " " + line.strip()

for q in qs:
    del q["_stem"]
    q.pop("_last", None)
    assert q["answer"] and len(q["options"]) >= 2, q["id"]
    assert q["answer"] in q["explain"], q["id"]
    assert all(o["k"] in q["explain"] for o in q["options"]), q["id"]
open("questions.js", "w", encoding="utf-8").write(
    "window.SECTIONS = " + json.dumps(sections, ensure_ascii=False) + ";\n"
    "window.QUESTIONS = " + json.dumps(qs, ensure_ascii=False, indent=1) + ";\n")
print(len(qs), "questions")
