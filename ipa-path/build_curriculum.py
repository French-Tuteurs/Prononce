#!/usr/bin/env python3
"""Builds the IPA Path curriculum: an ordered sequence of ~90 small
levels mixing "teach one symbol", "drill that symbol", periodic
"review" (recently taught symbols), category "milestone" levels, and
a closing pair of cumulative "final" levels — similar in spirit to how
Duolingo interleaves short lessons and practice rounds rather than one
big lesson per topic.
"""

import json

with open("teach_content.json", encoding="utf-8") as f:
    TEACH_CONTENT = json.load(f)

INTRO_PARAGRAPHS = [
    "French spelling lies to you. The letters “eau” can sound like a single simple vowel, and the same letter “s” can be two totally different sounds depending on where it sits in a word. The IPA (International Phonetic Alphabet) fixes that: one symbol always means exactly one sound, no exceptions.",
    "Each level ahead teaches you one new symbol, lets you practice it immediately, and periodically circles back to review everything you've learned so far — the same way a good class builds up a skill over many short sessions instead of one long lecture.",
    "By the end you'll have all thirty-seven sounds of spoken French, each tied to a symbol you can read at a glance.",
]

ORDER = [
    ("oral_vowel", ["i", "e", "ɛ", "a", "y", "ø", "œ", "ɑ", "ɔ", "o", "u", "ə"]),
    ("nasal_vowel", ["ɑ̃", "ɛ̃", "ɔ̃", "œ̃"]),
    ("semivowel", ["j", "ɥ", "w"]),
    ("consonant_stop", ["p", "b", "t", "d", "k", "ɡ"]),
    ("consonant_fricative", ["f", "v", "s", "z", "ʃ", "ʒ"]),
    ("consonant_nasal_liquid", ["m", "n", "ɲ", "ŋ", "l", "ʁ"]),
]

CATEGORY_LABELS = {
    "oral_vowel": "Oral Vowels",
    "nasal_vowel": "Nasal Vowels",
    "semivowel": "Semivowels",
    "consonant_stop": "Stops",
    "consonant_fricative": "Fricatives",
    "consonant_nasal_liquid": "Nasals, Liquids & R",
}

REVIEW_EVERY = 4  # insert a review level every N newly-taught symbols


def main():
    levels = []

    levels.append({
        "type": "intro",
        "title": "What Is the IPA?",
        "paragraphs": INTRO_PARAGRAPHS,
    })

    taught = []  # all symbols taught so far, in order
    since_review = 0

    for cat_key, symbols in ORDER:
        for symbol in symbols:

            levels.append({
                "type": "teach",
                "symbol": symbol,
                "title": f"Learn {symbol}",
                "teach": TEACH_CONTENT[symbol],
                "checkCount": 2,
                "symbols": [symbol],
            })
            levels.append({
                "type": "drill",
                "symbol": symbol,
                "title": f"Practice {symbol}",
                "count": 6,
                "symbols": [symbol],
            })

            taught.append(symbol)
            since_review += 1

            is_category_end = symbol == symbols[-1]

            if is_category_end:
                # Milestone: mostly this category, with a light sprinkle
                # of everything taught before it for long-term retention.
                recent = list(symbols)
                older = [s for s in taught if s not in recent]
                sprinkle = older[-6:] if len(older) > 6 else older
                levels.append({
                    "type": "milestone",
                    "title": f"{CATEGORY_LABELS[cat_key]} Mastery",
                    "count": 12,
                    "symbols": recent + sprinkle,
                })
                since_review = 0
            elif since_review >= REVIEW_EVERY:
                recent = taught[-REVIEW_EVERY:]
                levels.append({
                    "type": "review",
                    "title": "Review",
                    "count": 8,
                    "symbols": recent,
                })
                since_review = 0

    levels.append({
        "type": "final",
        "title": "Final Review I",
        "count": 15,
        "symbols": list(taught),
    })
    levels.append({
        "type": "final",
        "title": "Final Review II",
        "count": 15,
        "symbols": list(taught),
    })

    for i, level in enumerate(levels, start=1):
        level["id"] = i

    by_type = {}
    for level in levels:
        by_type[level["type"]] = by_type.get(level["type"], 0) + 1

    print("total levels:", len(levels))
    print("by type:", by_type)

    with open("curriculum.json", "w", encoding="utf-8") as f:
        json.dump({"levels": levels}, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
