#!/usr/bin/env python3
"""Extracts sound-card teaching content (symbol, word, gloss, description,
say-text) from the 6 existing IPA lesson HTML files into a flat JSON map,
for reuse as the "teach" step of each IPA Path level. Reuses the lesson
prose verbatim rather than re-authoring it, since it's already been
reviewed for accuracy.
"""

import json
import re
import os

LESSON_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lessons")
FILES = [
    "ipa-intro.html", "ipa-vowels.html", "ipa-nasal.html",
    "ipa-semivowels.html", "ipa-consonants.html", "ipa-reading.html"
]

CARD_RE = re.compile(
    r'<div class="sound-card ipa-sound-card">\s*'
    r'<span class="sound-symbol">\[?([^\]<]+)\]?</span>\s*'
    r'<div>\s*'
    r'<h3>(.*?)</h3>\s*'
    r'<p>\s*(.*?)\s*</p>',
    re.DOTALL
)

SAY_RE = re.compile(r'data-say="([^"]*)"')


def strip_tags(s):
    s = re.sub(r'<[^>]+>', '', s)
    s = s.replace("&mdash;", "—").replace("&rsquo;", "’")
    s = s.replace("&ldquo;", "“").replace("&rdquo;", "”")
    s = s.replace("&hellip;", "…")
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def main():
    results = {}

    for fname in FILES:
        path = os.path.join(LESSON_DIR, fname)
        with open(path, "r", encoding="utf-8") as f:
            html = f.read()

        for match in CARD_RE.finditer(html):
            symbol_raw, heading_html, desc_html = match.groups()
            symbol = symbol_raw.strip()

            heading_text = strip_tags(heading_html)
            description = strip_tags(desc_html)

            # Find the data-say within a bounded window after this card
            # (next ~500 chars covers the practice-buttons div reliably).
            window = html[match.end():match.end() + 500]
            say_match = SAY_RE.search(window)
            say_text = say_match.group(1) if say_match else None

            # heading_text looks like "word — gloss" (em-dash separated)
            if "—" in heading_text:
                word, gloss = heading_text.split("—", 1)
                word = word.strip()
                gloss = gloss.strip()
            else:
                word, gloss = heading_text, ""

            if symbol in results:
                # Already captured from an earlier file — keep first.
                continue

            results[symbol] = {
                "word": word,
                "gloss": gloss,
                "description": description,
                "say": say_text or word
            }

    print("extracted", len(results), "symbols")
    missing_say = [s for s, v in results.items() if not v["say"]]
    print("missing say:", missing_say)

    with open("teach_content.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    for sym, v in results.items():
        print(sym, "|", v["word"], "|", v["gloss"], "|", v["description"][:60])


if __name__ == "__main__":
    main()
