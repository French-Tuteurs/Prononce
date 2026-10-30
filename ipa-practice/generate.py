#!/usr/bin/env python3
"""Generates a large bank of IPA multiple-choice practice questions.

Builds two question types from a curated per-word phoneme inventory
(WORD_SOUNDS): every word used anywhere in the bank is mapped to the
*complete* set of target-inventory symbols it contains (not just the
symbol it happens to illustrate), so distractors can be filtered to
guarantee each generated question has exactly one defensible answer:

  - word-to-symbol: "Which IPA symbol is the target sound in <word>?"
    Distractor symbols are drawn from the same phonetic family (other
    oral vowels, other nasal vowels, etc.) and excluded if the word
    *also* happens to contain that symbol.
  - symbol-to-word: "Which word contains the sound [symbol]?"
    Distractor words are drawn from other symbols' word lists and
    excluded if they *also* happen to contain the target symbol.
"""

import json
import random

random.seed(20261030)

WORDS = {
    # Oral vowels
    "i": [("si", "if"), ("lit", "bed"), ("vie", "life"), ("ici", "here"), ("midi", "noon"),
          ("riz", "rice"), ("fini", "finished"), ("qui", "who"), ("ami", "friend"), ("Paris", "Paris")],
    "e": [("été", "summer"), ("nez", "nose"), ("thé", "tea"), ("café", "coffee"), ("pied", "foot"),
          ("chez", "at the home of"), ("les", "the (plural)"), ("mes", "my (plural)"), ("clé", "key"), ("allez", "go")],
    "ɛ": [("fête", "party"), ("tête", "head"), ("même", "same"), ("reine", "queen"), ("lait", "milk"),
          ("mère", "mother"), ("père", "father"), ("aime", "loves"), ("terre", "earth"), ("elle", "she")],
    "a": [("chat", "cat"), ("sac", "bag"), ("patte", "paw"), ("rat", "rat"), ("table", "table"),
          ("salade", "salad"), ("carte", "map"), ("place", "square"), ("gare", "station"), ("ça", "that")],
    "y": [("tu", "you"), ("rue", "street"), ("vue", "view"), ("sur", "on"), ("mur", "wall"),
          ("nu", "naked"), ("bu", "drunk"), ("vu", "seen"), ("pur", "pure"), ("jus", "juice")],
    "ø": [("peu", "little"), ("deux", "two"), ("bleu", "blue"), ("jeu", "game"), ("eux", "them"),
          ("queue", "tail"), ("voeu", "wish"), ("feu", "fire"), ("adieu", "farewell"), ("ceux", "those")],
    "œ": [("soeur", "sister"), ("coeur", "heart"), ("peur", "fear"), ("fleur", "flower"), ("heure", "hour"),
          ("beurre", "butter"), ("jeune", "young"), ("oeuf", "egg"), ("professeur", "professor"), ("acteur", "actor")],
    "ɑ": [("pâte", "dough"), ("âme", "soul"), ("âge", "age"), ("pas", "step"), ("tard", "late"),
          ("gâteau", "cake"), ("château", "castle"), ("âne", "donkey"), ("mâle", "male"), ("pâle", "pale")],
    "ɔ": [("porte", "door"), ("robe", "dress"), ("comme", "like"), ("école", "school"), ("bonne", "good"),
          ("votre", "your"), ("homme", "man"), ("note", "grade"), ("pomme", "apple"), ("sport", "sport")],
    "o": [("mot", "word"), ("eau", "water"), ("chaud", "hot"), ("beau", "beautiful"), ("gros", "big"),
          ("vélo", "bike"), ("stylo", "pen"), ("rose", "pink"), ("dos", "back"), ("zéro", "zero")],
    "u": [("vous", "you"), ("nous", "we"), ("tout", "everything"), ("doux", "soft"), ("rouge", "red"),
          ("amour", "love"), ("jour", "day"), ("cours", "course"), ("toujours", "always"), ("genou", "knee")],
    "ə": [("le", "the"), ("je", "I"), ("ce", "this"), ("de", "of"), ("que", "that"),
          ("petit", "small"), ("regarder", "to watch"), ("venir", "to come"), ("cheval", "horse"), ("demain", "tomorrow")],

    # Nasal vowels
    "ɑ̃": [("blanc", "white"), ("grand", "big"), ("dans", "in"), ("temps", "time"), ("enfant", "child"),
           ("maman", "mom"), ("chambre", "room"), ("cent", "hundred"), ("vent", "wind"), ("lent", "slow")],
    "ɛ̃": [("vin", "wine"), ("pain", "bread"), ("main", "hand"), ("fin", "end"), ("matin", "morning"),
           ("chien", "dog"), ("bien", "well"), ("rien", "nothing"), ("vingt", "twenty"), ("faim", "hunger")],
    "ɔ̃": [("bon", "good"), ("nom", "name"), ("son", "sound"), ("maison", "house"), ("mouton", "sheep"),
           ("oncle", "uncle"), ("ombre", "shadow"), ("long", "long"), ("non", "no"), ("pont", "bridge")],
    "œ̃": [("un", "a"), ("brun", "brown"), ("lundi", "Monday"), ("parfum", "perfume"), ("emprunt", "loan"),
           ("aucun", "none"), ("chacun", "each one"), ("défunt", "deceased"), ("opportun", "opportune"), ("commun", "common")],

    # Semivowels
    "j": [("yeux", "eyes"), ("fille", "daughter"), ("famille", "family"), ("travail", "work"), ("soleil", "sun"),
          ("bien", "well"), ("pied", "foot"), ("chien", "dog"), ("payer", "to pay"), ("crayon", "pencil")],
    "ɥ": [("huit", "eight"), ("lui", "him"), ("nuit", "night"), ("suis", "am"), ("cuisine", "kitchen"),
          ("juin", "June"), ("puis", "then"), ("pluie", "rain"), ("fruit", "fruit"), ("ensuite", "next")],
    "w": [("oui", "yes"), ("moi", "me"), ("toi", "you"), ("trois", "three"), ("loi", "law"),
          ("soir", "evening"), ("roi", "king"), ("voiture", "car"), ("pourquoi", "why"), ("mois", "month")],

    # Consonants
    "p": [("pain", "bread"), ("pomme", "apple"), ("porte", "door"), ("père", "father"), ("petit", "small"),
          ("plage", "beach"), ("papier", "paper"), ("parler", "to speak"), ("pour", "for"), ("prix", "price")],
    "b": [("beau", "beautiful"), ("bleu", "blue"), ("bas", "low"), ("banque", "bank"), ("beurre", "butter"),
          ("bonbon", "candy"), ("bateau", "boat"), ("bébé", "baby"), ("bras", "arm"), ("bureau", "desk")],
    "t": [("tasse", "cup"), ("table", "table"), ("temps", "time"), ("tout", "everything"), ("tard", "late"),
          ("train", "train"), ("thé", "tea"), ("type", "type"), ("tour", "tower"), ("tante", "aunt")],
    "d": [("dos", "back"), ("danse", "dance"), ("demain", "tomorrow"), ("docteur", "doctor"), ("deux", "two"),
          ("droit", "straight"), ("dame", "lady"), ("doigt", "finger"), ("dur", "hard"), ("dormir", "to sleep")],
    "k": [("cave", "cellar"), ("carte", "map"), ("comme", "like"), ("café", "coffee"), ("quatre", "four"),
          ("quartier", "neighborhood"), ("kilo", "kilo"), ("cours", "course"), ("corps", "body"), ("cuisine", "kitchen")],
    "ɡ": [("gare", "station"), ("gros", "big"), ("grand", "big"), ("gâteau", "cake"), ("guide", "guide"),
          ("garçon", "boy"), ("golf", "golf"), ("langue", "tongue"), ("gomme", "eraser"), ("guerre", "war")],
    "f": [("fête", "party"), ("fleur", "flower"), ("famille", "family"), ("fin", "end"), ("faim", "hunger"),
          ("femme", "woman"), ("fort", "strong"), ("fromage", "cheese"), ("feu", "fire"), ("facile", "easy")],
    "v": [("vous", "you"), ("vue", "view"), ("vin", "wine"), ("ville", "city"), ("voiture", "car"),
          ("vert", "green"), ("vieux", "old"), ("vite", "fast"), ("voix", "voice"), ("vendredi", "Friday")],
    "s": [("sac", "bag"), ("salade", "salad"), ("sur", "on"), ("soleil", "sun"), ("science", "science"),
          ("soir", "evening"), ("sport", "sport"), ("silence", "silence"), ("sept", "seven"), ("sous", "under")],
    "z": [("zéro", "zero"), ("maison", "house"), ("zone", "zone"), ("onze", "eleven"), ("douze", "twelve"),
          ("treize", "thirteen"), ("rose", "pink"), ("chaise", "chair"), ("magasin", "store"), ("raison", "reason")],
    "ʃ": [("chat", "cat"), ("chaud", "hot"), ("chambre", "room"), ("chaise", "chair"), ("chien", "dog"),
          ("chose", "thing"), ("chercher", "to look for"), ("cheveux", "hair"), ("chemise", "shirt"), ("chance", "luck")],
    "ʒ": [("je", "I"), ("jour", "day"), ("jeune", "young"), ("genou", "knee"), ("jus", "juice"),
          ("jeu", "game"), ("jaune", "yellow"), ("joli", "pretty"), ("jardin", "garden"), ("jamais", "never")],
    "m": [("merci", "thank you"), ("maison", "house"), ("main", "hand"), ("mer", "sea"), ("mot", "word"),
          ("mur", "wall"), ("matin", "morning"), ("monde", "world"), ("musique", "music"), ("même", "same")],
    "n": [("nez", "nose"), ("non", "no"), ("nous", "we"), ("nom", "name"), ("neuf", "nine"),
          ("nuit", "night"), ("nature", "nature"), ("nord", "north"), ("numéro", "number"), ("nouveau", "new")],
    "ɲ": [("montagne", "mountain"), ("campagne", "countryside"), ("espagnol", "Spanish"), ("agneau", "lamb"), ("signe", "sign"),
          ("ligne", "line"), ("oignon", "onion"), ("baignoire", "bathtub"), ("gagner", "to win"), ("peigne", "comb")],
    "ŋ": [("camping", "campsite"), ("parking", "parking lot"), ("jogging", "jogging"), ("shopping", "shopping"), ("caravaning", "RV camping"),
          ("footing", "jogging"), ("swing", "swing"), ("marketing", "marketing"), ("planning", "schedule"), ("casting", "casting")],
    "l": [("lune", "moon"), ("lait", "milk"), ("langue", "tongue"), ("long", "long"), ("livre", "book"),
          ("lundi", "Monday"), ("loi", "law"), ("lourd", "heavy"), ("lire", "to read"), ("liste", "list")],
    "ʁ": [("rouge", "red"), ("robe", "dress"), ("rue", "street"), ("riz", "rice"), ("rat", "rat"),
          ("rose", "pink"), ("rien", "nothing"), ("roi", "king"), ("rapide", "fast"), ("raison", "reason")],
}

# Full phoneme inventory for every word above: every target-alphabet
# symbol the word actually contains, not just the one it illustrates.
# This is what makes distractor selection safe — a word or symbol is
# only ever offered as a *wrong* answer when it provably doesn't also
# satisfy the question.
WORD_SOUNDS = {
    "si": {"s", "i"}, "lit": {"l", "i"}, "vie": {"v", "i"}, "ici": {"i", "s"}, "midi": {"m", "i", "d"},
    "riz": {"ʁ", "i"}, "fini": {"f", "i", "n"}, "qui": {"k", "i"}, "ami": {"a", "m", "i"}, "Paris": {"p", "a", "ʁ", "i"},

    "été": {"e", "t"}, "nez": {"n", "e"}, "thé": {"t", "e"}, "café": {"k", "a", "f", "e"}, "pied": {"p", "j", "e"},
    "chez": {"ʃ", "e"}, "les": {"l", "e"}, "mes": {"m", "e"}, "clé": {"k", "l", "e"}, "allez": {"a", "l", "e"},

    "fête": {"f", "ɛ", "t"}, "tête": {"t", "ɛ"}, "même": {"m", "ɛ"}, "reine": {"ʁ", "ɛ", "n"}, "lait": {"l", "ɛ"},
    "mère": {"m", "ɛ", "ʁ"}, "père": {"p", "ɛ", "ʁ"}, "aime": {"ɛ", "m"}, "terre": {"t", "ɛ", "ʁ"}, "elle": {"ɛ", "l"},

    "chat": {"ʃ", "a"}, "sac": {"s", "a", "k"}, "patte": {"p", "a", "t"}, "rat": {"ʁ", "a"}, "table": {"t", "a", "b", "l"},
    "salade": {"s", "a", "l", "d"}, "carte": {"k", "a", "ʁ", "t"}, "place": {"p", "l", "a", "s"}, "gare": {"ɡ", "a", "ʁ"}, "ça": {"s", "a"},

    "tu": {"t", "y"}, "rue": {"ʁ", "y"}, "vue": {"v", "y"}, "sur": {"s", "y", "ʁ"}, "mur": {"m", "y", "ʁ"},
    "nu": {"n", "y"}, "bu": {"b", "y"}, "vu": {"v", "y"}, "pur": {"p", "y", "ʁ"}, "jus": {"ʒ", "y"},

    "peu": {"p", "ø"}, "deux": {"d", "ø"}, "bleu": {"b", "l", "ø"}, "jeu": {"ʒ", "ø"}, "eux": {"ø"},
    "queue": {"k", "ø"}, "voeu": {"v", "ø"}, "feu": {"f", "ø"}, "adieu": {"a", "d", "j", "ø"}, "ceux": {"s", "ø"},

    "soeur": {"s", "œ", "ʁ"}, "coeur": {"k", "œ", "ʁ"}, "peur": {"p", "œ", "ʁ"}, "fleur": {"f", "l", "œ", "ʁ"}, "heure": {"œ", "ʁ"},
    "beurre": {"b", "œ", "ʁ"}, "jeune": {"ʒ", "œ", "n"}, "oeuf": {"œ", "f"},
    "professeur": {"p", "ʁ", "o", "f", "ɛ", "s", "œ"}, "acteur": {"a", "k", "t", "œ", "ʁ"},

    "pâte": {"p", "ɑ", "t"}, "âme": {"ɑ", "m"}, "âge": {"ɑ", "ʒ"}, "pas": {"p", "ɑ"}, "tard": {"t", "ɑ", "ʁ"},
    "gâteau": {"ɡ", "ɑ", "t", "o"}, "château": {"ʃ", "ɑ", "t", "o"}, "âne": {"ɑ", "n"}, "mâle": {"m", "ɑ", "l"}, "pâle": {"p", "ɑ", "l"},

    "porte": {"p", "ɔ", "ʁ", "t"}, "robe": {"ʁ", "ɔ", "b"}, "comme": {"k", "ɔ", "m"}, "école": {"e", "k", "ɔ", "l"}, "bonne": {"b", "ɔ", "n"},
    "votre": {"v", "ɔ", "t", "ʁ"}, "homme": {"ɔ", "m"}, "note": {"n", "ɔ", "t"}, "pomme": {"p", "ɔ", "m"}, "sport": {"s", "p", "ɔ", "ʁ", "t"},

    "mot": {"m", "o"}, "eau": {"o"}, "chaud": {"ʃ", "o"}, "beau": {"b", "o"}, "gros": {"ɡ", "ʁ", "o"},
    "vélo": {"v", "e", "l", "o"}, "stylo": {"s", "t", "i", "l", "o"}, "rose": {"ʁ", "o", "z"}, "dos": {"d", "o"}, "zéro": {"z", "e", "ʁ", "o"},

    "vous": {"v", "u"}, "nous": {"n", "u"}, "tout": {"t", "u"}, "doux": {"d", "u"}, "rouge": {"ʁ", "u", "ʒ"},
    "amour": {"a", "m", "u", "ʁ"}, "jour": {"ʒ", "u", "ʁ"}, "cours": {"k", "u", "ʁ"}, "toujours": {"t", "u", "ʒ", "ʁ"}, "genou": {"ʒ", "ə", "n", "u"},

    "le": {"l", "ə"}, "je": {"ʒ", "ə"}, "ce": {"s", "ə"}, "de": {"d", "ə"}, "que": {"k", "ə"},
    "petit": {"p", "ə", "t", "i"}, "regarder": {"ʁ", "ə", "ɡ", "a", "d", "e"}, "venir": {"v", "ə", "n", "i", "ʁ"},
    "cheval": {"ʃ", "ə", "v", "a", "l"}, "demain": {"d", "ə", "m", "ɛ̃"},

    "blanc": {"b", "l", "ɑ̃"}, "grand": {"ɡ", "ʁ", "ɑ̃"}, "dans": {"d", "ɑ̃"}, "temps": {"t", "ɑ̃"}, "enfant": {"ɑ̃", "f"},
    "maman": {"m", "a", "ɑ̃"}, "chambre": {"ʃ", "ɑ̃", "b", "ʁ"}, "cent": {"s", "ɑ̃"}, "vent": {"v", "ɑ̃"}, "lent": {"l", "ɑ̃"},

    "vin": {"v", "ɛ̃"}, "pain": {"p", "ɛ̃"}, "main": {"m", "ɛ̃"}, "fin": {"f", "ɛ̃"}, "matin": {"m", "a", "t", "ɛ̃"},
    "chien": {"ʃ", "j", "ɛ̃"}, "bien": {"b", "j", "ɛ̃"}, "rien": {"ʁ", "j", "ɛ̃"}, "vingt": {"v", "ɛ̃"}, "faim": {"f", "ɛ̃"},

    "bon": {"b", "ɔ̃"}, "nom": {"n", "ɔ̃"}, "son": {"s", "ɔ̃"}, "maison": {"m", "ɛ", "z", "ɔ̃"}, "mouton": {"m", "u", "t", "ɔ̃"},
    "oncle": {"ɔ̃", "k", "l"}, "ombre": {"ɔ̃", "b", "ʁ"}, "long": {"l", "ɔ̃"}, "non": {"n", "ɔ̃"}, "pont": {"p", "ɔ̃"},

    "un": {"œ̃"}, "brun": {"b", "ʁ", "œ̃"}, "lundi": {"l", "œ̃", "d", "i"}, "parfum": {"p", "a", "ʁ", "f", "œ̃"},
    "emprunt": {"ɑ̃", "p", "ʁ", "œ̃"}, "aucun": {"o", "k", "œ̃"}, "chacun": {"ʃ", "a", "k", "œ̃"},
    "défunt": {"d", "e", "f", "œ̃"}, "opportun": {"ɔ", "p", "ʁ", "t", "œ̃"}, "commun": {"k", "ɔ", "m", "œ̃"},

    "yeux": {"j", "ø"}, "fille": {"f", "i", "j"}, "famille": {"f", "a", "m", "i", "j"}, "travail": {"t", "ʁ", "a", "v", "j"},
    "soleil": {"s", "ɔ", "l", "ɛ", "j"}, "payer": {"p", "ɛ", "j", "e"}, "crayon": {"k", "ʁ", "ɛ", "j", "ɔ̃"},

    "huit": {"ɥ", "i", "t"}, "lui": {"l", "ɥ", "i"}, "nuit": {"n", "ɥ", "i"}, "suis": {"s", "ɥ", "i"},
    "cuisine": {"k", "ɥ", "i", "z", "n"}, "juin": {"ʒ", "ɥ", "ɛ̃"}, "puis": {"p", "ɥ", "i"}, "pluie": {"p", "l", "ɥ", "i"},
    "fruit": {"f", "ʁ", "ɥ", "i"}, "ensuite": {"ɑ̃", "s", "ɥ", "i", "t"},

    "oui": {"w", "i"}, "moi": {"m", "w", "a"}, "toi": {"t", "w", "a"}, "trois": {"t", "ʁ", "w", "a"}, "loi": {"l", "w", "a"},
    "soir": {"s", "w", "a", "ʁ"}, "roi": {"ʁ", "w", "a"}, "voiture": {"v", "w", "a", "t", "y", "ʁ"},
    "pourquoi": {"p", "u", "ʁ", "k", "w", "a"}, "mois": {"m", "w", "a"},

    "plage": {"p", "l", "a", "ʒ"}, "papier": {"p", "a", "j", "e"}, "parler": {"p", "a", "ʁ", "l", "e"},
    "pour": {"p", "u", "ʁ"}, "prix": {"p", "ʁ", "i"},

    "bas": {"b", "ɑ"}, "banque": {"b", "ɑ̃", "k"}, "bonbon": {"b", "ɔ̃"}, "bateau": {"b", "a", "t", "o"},
    "bébé": {"b", "e"}, "bras": {"b", "ʁ", "a"}, "bureau": {"b", "y", "ʁ", "o"},

    "tasse": {"t", "a", "s"}, "train": {"t", "ʁ", "ɛ̃"}, "type": {"t", "i", "p"}, "tour": {"t", "u", "ʁ"}, "tante": {"t", "ɑ̃"},

    "danse": {"d", "ɑ̃", "s"}, "docteur": {"d", "ɔ", "k", "t", "œ", "ʁ"}, "droit": {"d", "ʁ", "w", "a"},
    "dame": {"d", "a", "m"}, "doigt": {"d", "w", "a"}, "dur": {"d", "y", "ʁ"}, "dormir": {"d", "ɔ", "ʁ", "m", "i"},

    "cave": {"k", "a", "v"}, "quatre": {"k", "a", "t", "ʁ"}, "quartier": {"k", "a", "ʁ", "t", "j", "e"},
    "kilo": {"k", "i", "l", "o"}, "corps": {"k", "ɔ", "ʁ"},

    "guide": {"ɡ", "i", "d"}, "garçon": {"ɡ", "a", "ʁ", "s", "ɔ̃"}, "golf": {"ɡ", "ɔ", "l", "f"},
    "langue": {"l", "ɑ̃", "ɡ"}, "gomme": {"ɡ", "ɔ", "m"}, "guerre": {"ɡ", "ɛ", "ʁ"},

    "femme": {"f", "a", "m"}, "fort": {"f", "ɔ", "ʁ"}, "fromage": {"f", "ʁ", "ɔ", "m", "a", "ʒ"}, "facile": {"f", "a", "s", "i", "l"},

    "ville": {"v", "i", "l"}, "vert": {"v", "ɛ", "ʁ"}, "vieux": {"v", "j", "ø"}, "vite": {"v", "i", "t"},
    "voix": {"v", "w", "a"}, "vendredi": {"v", "ɑ̃", "d", "ʁ", "ə", "i"},

    "science": {"s", "j", "ɑ̃"}, "silence": {"s", "i", "l", "ɑ̃"}, "sept": {"s", "ɛ", "t"}, "sous": {"s", "u"},

    "zone": {"z", "o", "n"}, "onze": {"ɔ̃", "z"}, "douze": {"d", "u", "z"}, "treize": {"t", "ʁ", "ɛ", "z"},
    "chaise": {"ʃ", "ɛ", "z"}, "magasin": {"m", "a", "ɡ", "z", "ɛ̃"},

    "chose": {"ʃ", "o", "z"}, "chercher": {"ʃ", "ɛ", "ʁ", "e"}, "cheveux": {"ʃ", "ə", "v", "ø"},
    "chemise": {"ʃ", "ə", "m", "i", "z"}, "chance": {"ʃ", "ɑ̃", "s"},

    "jaune": {"ʒ", "o", "n"}, "joli": {"ʒ", "ɔ", "l", "i"}, "jardin": {"ʒ", "a", "ʁ", "d", "ɛ̃"}, "jamais": {"ʒ", "a", "m", "ɛ"},

    "merci": {"m", "ɛ", "ʁ", "s", "i"}, "mer": {"m", "ɛ", "ʁ"}, "monde": {"m", "ɔ̃", "d"}, "musique": {"m", "y", "z", "i", "k"},

    "neuf": {"n", "ø", "f"}, "nature": {"n", "a", "t", "y", "ʁ"}, "nord": {"n", "ɔ", "ʁ"},
    "numéro": {"n", "y", "m", "e", "ʁ", "o"}, "nouveau": {"n", "u", "v", "o"},

    "montagne": {"m", "ɔ̃", "t", "a", "ɲ"}, "campagne": {"k", "ɑ̃", "p", "a", "ɲ"}, "espagnol": {"ɛ", "s", "p", "a", "ɲ", "ɔ", "l"},
    "agneau": {"a", "ɲ", "o"}, "signe": {"s", "i", "ɲ"}, "ligne": {"l", "i", "ɲ"}, "oignon": {"ɔ", "ɲ", "ɔ̃"},
    "baignoire": {"b", "ɛ", "ɲ", "w", "a", "ʁ"}, "gagner": {"ɡ", "a", "ɲ", "e"}, "peigne": {"p", "ɛ", "ɲ"},

    "camping": {"k", "ɑ̃", "p", "i", "ŋ"}, "parking": {"p", "a", "ʁ", "k", "i", "ŋ"}, "jogging": {"ʒ", "ɔ", "ɡ", "i", "ŋ"},
    "shopping": {"ʃ", "ɔ", "p", "i", "ŋ"}, "caravaning": {"k", "a", "ʁ", "v", "a", "n", "i", "ŋ"},
    "footing": {"f", "u", "t", "i", "ŋ"}, "swing": {"s", "w", "i", "ŋ"}, "marketing": {"m", "a", "ʁ", "k", "ə", "t", "i", "ŋ"},
    "planning": {"p", "l", "a", "n", "i", "ŋ"}, "casting": {"k", "a", "s", "t", "i", "ŋ"},

    "lune": {"l", "y", "n"}, "livre": {"l", "i", "v", "ʁ"}, "lourd": {"l", "u", "ʁ"}, "lire": {"l", "i", "ʁ"}, "liste": {"l", "i", "s", "t"},

    "rapide": {"ʁ", "a", "p", "i", "d"}, "raison": {"ʁ", "ɛ", "z", "ɔ̃"},
}

CATEGORIES = {
    "oral_vowel": ["i", "e", "ɛ", "a", "y", "ø", "œ", "ɑ", "ɔ", "o", "u", "ə"],
    "nasal_vowel": ["ɑ̃", "ɛ̃", "ɔ̃", "œ̃"],
    "semivowel": ["j", "ɥ", "w"],
    "consonant": ["p", "b", "t", "d", "k", "ɡ", "f", "v", "s", "z", "ʃ", "ʒ", "m", "n", "ɲ", "ŋ", "l", "ʁ"],
}

SYMBOL_CATEGORY = {}
for cat, symbols in CATEGORIES.items():
    for sym in symbols:
        SYMBOL_CATEGORY[sym] = cat

ALL_SYMBOLS = list(WORDS.keys())
assert set(ALL_SYMBOLS) == set(SYMBOL_CATEGORY.keys()), "symbol/category mismatch"

# Sanity: every word referenced in WORDS must have a phoneme inventory,
# and that inventory must actually contain the symbol it's filed under.
for symbol, pairs in WORDS.items():
    for word, gloss in pairs:
        assert word in WORD_SOUNDS, f"missing WORD_SOUNDS entry for {word!r}"
        assert symbol in WORD_SOUNDS[word], f"{word!r} filed under {symbol!r} but WORD_SOUNDS[{word!r}] = {WORD_SOUNDS[word]}"


def family_pool(symbol):
    return CATEGORIES[SYMBOL_CATEGORY[symbol]]


def gen_word_to_symbol(symbol, variations_per_word=7):
    """'Which IPA symbol is the sound in <word>?' — distractors from the
    same phonetic family as the target symbol, excluding any symbol the
    word also happens to contain."""
    items = []
    words = WORDS[symbol]

    for word, gloss in words:
        word_sounds = WORD_SOUNDS[word]
        pool = [s for s in family_pool(symbol) if s != symbol and s not in word_sounds]
        if len(pool) < 2:
            continue

        seen_pairs = set()
        attempts = 0
        made = 0
        while made < variations_per_word and attempts < variations_per_word * 8:
            attempts += 1
            distractors = tuple(sorted(random.sample(pool, 2)))
            if distractors in seen_pairs:
                continue
            seen_pairs.add(distractors)
            made += 1

            options = [symbol, distractors[0], distractors[1]]
            random.shuffle(options)
            correct_index = options.index(symbol)

            items.append({
                "symbol": symbol,
                "category": SYMBOL_CATEGORY[symbol],
                "type": "word-to-symbol",
                "prompt": f"Which IPA symbol represents the target sound in “{word}” ({gloss})?",
                "options": [f"[{o}]" for o in options],
                "correctIndex": correct_index,
            })
    return items


def gen_symbol_to_word(symbol, variations_per_word=13):
    """'Which word contains the sound [symbol]?' — distractor words come
    from other symbols' lists, excluding any word that also happens to
    contain the target symbol."""
    items = []
    distractor_pool = [
        (w, g, s) for s, pairs in WORDS.items() if s != symbol
        for (w, g) in pairs if symbol not in WORD_SOUNDS[w]
    ]

    for word, gloss in WORDS[symbol]:
        seen_pairs = set()
        attempts = 0
        made = 0
        while made < variations_per_word and attempts < variations_per_word * 8:
            attempts += 1
            d1, d2 = random.sample(distractor_pool, 2)
            if d1[0] == d2[0] or d1[0] == word or d2[0] == word:
                continue
            pair_key = tuple(sorted([d1[0], d2[0]]))
            if pair_key in seen_pairs:
                continue
            seen_pairs.add(pair_key)
            made += 1

            options = [word, d1[0], d2[0]]
            random.shuffle(options)
            correct_index = options.index(word)

            items.append({
                "symbol": symbol,
                "category": SYMBOL_CATEGORY[symbol],
                "type": "symbol-to-word",
                "prompt": f"Which word contains the sound [{symbol}]?",
                "options": options,
                "correctIndex": correct_index,
            })
    return items


def main():
    all_items = []
    for symbol in ALL_SYMBOLS:
        all_items.extend(gen_word_to_symbol(symbol))
        all_items.extend(gen_symbol_to_word(symbol))

    random.shuffle(all_items)

    target = 10000
    if len(all_items) > target:
        all_items = all_items[:target]
    else:
        extra = []
        guard = 0
        while len(all_items) + len(extra) < target and guard < 20:
            guard += 1
            for symbol in ALL_SYMBOLS:
                extra.extend(gen_word_to_symbol(symbol, variations_per_word=3))
                extra.extend(gen_symbol_to_word(symbol, variations_per_word=4))
        random.shuffle(extra)
        all_items.extend(extra[:max(0, target - len(all_items))])

    for i, item in enumerate(all_items):
        item["id"] = f"ipa-{i + 1:05d}"

    print("total items:", len(all_items))
    by_symbol = {}
    for item in all_items:
        by_symbol[item["symbol"]] = by_symbol.get(item["symbol"], 0) + 1
    print("symbols covered:", len(by_symbol), "/", len(ALL_SYMBOLS))
    print("min per symbol:", min(by_symbol.values()), "max per symbol:", max(by_symbol.values()))

    # Correctness self-check: for every generated item, verify exactly
    # one option satisfies the question against WORD_SOUNDS.
    bad = 0
    for item in all_items:
        if item["type"] == "word-to-symbol":
            word = item["prompt"].split("“")[1].split("”")[0]
            sounds = WORD_SOUNDS[word]
            valid = [i for i, opt in enumerate(item["options"]) if opt.strip("[]") in sounds]
        else:
            target_symbol = item["symbol"]
            valid = [i for i, opt in enumerate(item["options"]) if target_symbol in WORD_SOUNDS[opt]]
        if valid != [item["correctIndex"]]:
            bad += 1
            if bad <= 5:
                print("AMBIGUOUS/WRONG:", item)
    print("ambiguous or incorrect items:", bad)

    with open("ipa_practice_questions.json", "w", encoding="utf-8") as f:
        json.dump(all_items, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
