# Generates ~10,000 "record yourself saying this" PRONUNCIATION prompts
# for a future AI pronunciation-analysis feature. Not wired into any
# page — pure data at rest.
#
# Unlike a grammar/vocab drill bank, every item here targets a specific
# French pronunciation feature: the R sound (by position), individual
# vowel qualities, nasal vowels, silent letters, liaison, rhythm and
# question intonation, minimal pairs, and classic tongue-twisters.
# Word lists are curated real vocabulary; volume comes from wrapping
# those words in carrier phrases and multi-word drill combos, not from
# grammar-sentence templates.

import itertools
import json
import random

random.seed(11)


def dedupe(seq):
    return list(dict.fromkeys(seq))


# ===========================
# CURATED WORD LISTS, BY TARGET SOUND
# ===========================

R_INITIAL = dedupe([
    "rue", "robe", "radio", "rouge", "riz", "rare", "roue", "rond", "rire",
    "raison", "rideau", "rivière", "ruban", "racine", "radis", "régime",
    "rentrée", "réveil", "réponse", "résultat", "restaurant", "région",
    "religion", "remède", "rencontre", "robinet", "rocher", "roman",
    "rosée", "route", "royaume", "ruche", "rumeur", "rythme", "ronde",
    "rouille", "rosier", "ruisseau", "radiateur", "raisin", "ramasser",
    "ranger", "rappeler", "raser", "rassurer", "rater", "rattraper",
    "ravir", "rayon", "réaliser", "recevoir", "réchauffer", "recommencer",
    "reconnaître", "refaire", "réfléchir", "refroidir", "refuser",
    "regarder", "remarquer", "remercier", "remplacer", "remplir",
    "rencontrer", "rendre", "renoncer", "rentrer", "réparer", "repartir",
    "répéter", "répondre", "reposer", "reprendre", "réserver", "résister",
    "respirer", "ressembler", "rester", "retenir", "retirer", "retourner",
    "retrouver", "réunir", "réussir", "rêver", "revenir", "réviser", "revoir",
])

R_MEDIAL = dedupe([
    "parler", "arriver", "direction", "orange", "garçon", "chercher",
    "marcher", "sourire", "préparer", "apporter", "voiture", "guitare",
    "journal", "ferme", "personne", "verre", "terre", "hier", "argent",
    "arbre", "carte", "farine", "garder", "jardin", "marché", "marque",
    "parfum", "partie", "partir", "sardine", "tarte", "vertu", "chariot",
    "soirée", "miroir", "histoire", "mémoire", "victoire", "territoire",
    "laboratoire", "tiroir", "armoire", "couloir", "pouvoir", "savoir",
    "devoir", "apercevoir", "décevoir", "farine", "ordinateur",
    "ordonnance", "corbeille", "corde", "corps", "gorge", "forge",
    "horloge", "orgue", "sorcière", "forcer", "porter", "sortir",
    "importer", "rapporter", "supporter", "transporter", "exporter",
    "ordinaire", "extraordinaire", "formidable", "orchestre", "norme",
    "forme", "terme", "charme", "alarme", "arme", "larme", "carreau",
    "arrêter", "arracher", "arranger", "arrondir",
])

R_FINAL = dedupe([
    "pour", "sur", "air", "mer", "cher", "professeur", "jour", "tour",
    "cœur", "fleur", "peur", "beurre", "leur", "sœur", "ordinateur",
    "ingénieur", "docteur", "acteur", "couleur", "chaleur", "majeur",
    "mineur", "meilleur", "supérieur", "extérieur", "intérieur",
    "antérieur", "postérieur", "ultérieur", "chauffeur", "vendeur",
    "acheteur", "joueur", "danseur", "chanteur", "nageur", "voyageur",
    "menteur", "moteur", "facteur", "secteur", "directeur", "inspecteur",
    "auteur", "hauteur", "largeur", "longueur", "épaisseur", "douceur",
    "chercheur", "serveur",
])

R_CLUSTERS = dedupe([
    "trois", "gris", "prendre", "français", "libre", "entre", "autre",
    "quatre", "montre", "ministre", "propre", "chambre", "membre",
    "nombre", "ordre", "sucre", "titre", "votre", "notre", "arbre",
    "triste", "trouver", "travailler", "train", "trop", "très", "trait",
    "tranquille", "transport", "traduire", "tracer", "trancher",
    "trembler", "tresse", "trier", "triompher", "tromper", "trône",
    "tronc", "truite", "truc", "prix", "présent", "printemps", "prince",
    "prison", "problème", "produit", "programme", "projet", "promesse",
    "prononcer", "province", "prudent", "brun", "bras", "brave", "bref",
    "brique", "brosse", "brouillard", "bruit", "brûler", "brume",
    "cravate", "crayon", "crème", "crevette", "cri", "crime", "croire",
    "croix", "croquer", "cru", "cuivre", "gramme", "grand", "grange",
    "gras", "gratter", "grave", "grec", "grenier", "grenouille", "griffe",
    "gronder", "gros", "groupe", "fraise", "franc", "frapper", "frère",
    "frire", "frite", "froid", "fromage", "front", "frontière", "fruit",
    "drap", "drame", "drapeau", "droit", "dragon",
])

I_WORDS = dedupe([
    "si", "il", "lit", "ami", "ici", "vie", "rire", "midi", "tapis",
    "souris", "fourmi", "riz", "prix", "mari", "nid", "ski", "pyjama",
    "style", "île", "cri", "ni", "qui", "dix", "six", "fils", "habit",
    "appétit", "esprit", "profit", "circuit", "biscuit", "minuit",
    "produit", "conduit", "ravi", "joli", "poli", "uni", "fini", "petit",
    "sortie", "partie", "envie", "dormir", "sourire", "plaisir", "désir",
    "avenir", "souvenir", "tenir", "venir", "ainsi",
])

Y_WORDS = dedupe([
    "tu", "rue", "sur", "lune", "musique", "mur", "pur", "jus", "vue",
    "statue", "minute", "voiture", "nature", "culture", "aventure", "du",
    "su", "vu", "nu", "cru", "bu", "lu", "plus", "dur", "mûr", "sûr",
    "futur", "musée", "humain", "humeur", "humide", "une", "usine",
    "usage", "utile", "unique", "univers", "urgent", "usure", "tulipe",
    "bulle", "cube", "tube", "lutte", "habitude", "altitude", "attitude",
    "gratitude", "solitude", "longitude",
])

U_WORDS = dedupe([
    "vous", "tout", "nous", "rouge", "amour", "jour", "cou", "bijou",
    "genou", "poule", "roule", "boule", "foule", "coude", "moule",
    "ouvert", "outil", "source", "course", "couvert", "couleur", "coupe",
    "couple", "courage", "courrier", "cousin", "coussin", "doux",
    "tousser", "trouver", "toucher", "toujours", "tourner", "tour",
    "boucher", "bouche", "bouger", "bougie", "boulanger", "bouquet",
    "bourse", "boussole", "bout", "bouteille", "doute", "écoute",
    "goutte", "joue", "loue", "moulin", "mousse", "moustache", "nouveau",
    "pousser", "rousse", "souple", "soupe", "sourd",
])

E_WORDS = dedupe([
    "été", "étoile", "éléphant", "énergie", "écouter", "écrire", "élève",
    "échelle", "économie", "égal", "église", "employer", "enfermer",
    "épaule", "épice", "épingle", "éponge", "équipe", "escalier",
    "espace", "étage", "étang", "étoffe", "étroit", "événement", "évier",
    "être", "tête", "fête", "bête", "forêt", "arrêt", "intérêt",
    "honnête", "conquête", "enquête", "mère", "père", "frère", "sœur",
    "lumière", "première", "dernière", "entière", "matière", "rivière",
    "carrière", "manière", "cimetière", "mystère", "système", "problème",
    "poème", "chèque", "crème", "modèle", "siècle", "ficelle", "fidèle",
    "grêle", "zèle", "pièce", "chèvre", "lièvre",
])

EU_WORDS = dedupe([
    "peu", "jeu", "deux", "feu", "lieu", "milieu", "adieu", "bleu",
    "cheveux", "yeux", "vieux", "joyeux", "heureux", "nombreux",
    "dangereux", "sérieux", "curieux", "ennuyeux", "généreux",
    "silencieux", "précieux", "courageux", "merveilleux", "chanceux",
    "peureux", "cœur", "sœur", "heure", "beurre", "fleur", "professeur",
    "docteur", "acteur", "chaleur", "couleur", "largeur", "longueur",
    "peur", "leur", "meilleur", "majeur", "jeune", "jeudi", "neuf",
    "œuf", "bœuf", "nœud", "veut", "peut", "peuvent",
])

AN_WORDS = dedupe([
    "dans", "temps", "enfant", "chambre", "blanc", "grand", "maman",
    "dimanche", "décembre", "novembre", "ensemble", "entendre", "penser",
    "chanter", "danser", "commencer", "quarante", "cinquante", "vacances",
    "banc", "camp", "champ", "chance", "danger", "dent", "gant", "lampe",
    "ange", "orange", "plante", "rampe", "tante", "vent", "ventre",
    "vendre", "entrer", "enfance", "enseigne", "enterrer", "entier",
    "grande", "branche", "tranche", "avalanche", "blanche", "manche",
    "marchand", "méchant", "gendarme", "pendant", "cependant",
    "maintenant", "important", "suivant", "avant", "devant", "autant",
    "tant", "cent", "sans", "dedans",
])

IN_WORDS = dedupe([
    "vin", "pain", "main", "plein", "matin", "jardin", "cousin", "voisin",
    "magasin", "chemin", "dessin", "lapin", "moulin", "requin", "train",
    "bain", "faim", "demain", "américain", "africain", "mexicain",
    "ancien", "bien", "rien", "tien", "sien", "chien", "combien",
    "moyen", "citoyen", "examen", "européen", "lycéen", "quinze", "cinq",
    "imperméable", "impossible", "incroyable", "indien", "individu",
    "information", "ingénieur", "instant", "instrument", "intéressant",
    "intelligent", "intérieur", "invité", "timbre", "simple", "symbole",
    "syndicat", "synthèse", "thym",
])

ON_WORDS = dedupe([
    "bon", "maison", "nom", "avion", "garçon", "poisson", "saison",
    "oncle", "ombre", "nombre", "réponse", "concombre", "ongle",
    "plafond", "salon", "ballon", "citron", "savon", "bonbon", "bonjour",
    "combien", "fonction", "fontaine", "front", "horizon", "long",
    "monde", "monsieur", "montre", "oignon", "opinion", "pardon",
    "poumon", "pont", "prison", "profond", "raison", "ronde", "rond",
    "son", "ton", "bouton", "carton", "coton", "mouton", "béton",
])

UN_WORDS = dedupe([
    "un", "brun", "lundi", "parfum", "humble", "chacun", "aucun",
    "commun", "défunt", "emprunt", "opportun", "importun", "à jeun",
])

FINAL_SILENT_CONSONANT = dedupe([
    "petit", "trop", "beaucoup", "nid", "chat", "gris", "nez", "pied",
    "corps", "tabac", "estomac", "respect", "aspect", "exact", "gros",
    "dos", "repos", "propos", "discours", "velours", "bijoux", "doigt",
    "sang", "rang", "banc", "blanc", "franc", "camp", "champ", "temps",
    "poids", "plomb", "croc", "matelas", "verglas", "bras", "embarras",
    "repas", "compas", "radis", "colis", "avis", "permis", "paradis",
    "souris", "dessous", "dessus", "tapis", "puits", "circuit",
    "biscuit", "minuit", "produit", "conduit", "fruit", "lit", "nuit",
    "cuit", "habit", "appétit", "esprit", "profit",
])

ENT_VERBS = dedupe([
    "parlent", "mangent", "jouent", "habitent", "regardent", "écoutent",
    "chantent", "dansent", "cherchent", "trouvent", "donnent", "montrent",
    "ferment", "dessinent", "lavent", "préparent", "invitent", "visitent",
    "continuent", "tournent", "aident", "apportent", "désirent",
    "gagnent", "gardent", "goûtent", "oublient", "plantent", "portent",
    "posent", "poussent", "présentent", "prêtent", "quittent",
    "racontent", "refusent", "rencontrent", "signent", "souhaitent",
    "terminent", "tirent", "touchent", "utilisent", "arrivent", "entrent",
    "restent", "tombent", "passent", "montent", "sortent", "partent",
    "dorment", "sentent", "viennent", "tiennent", "prennent", "mettent",
    "lisent", "écrivent", "connaissent", "comprennent", "boivent",
    "voient", "disent", "veulent", "peuvent", "doivent", "savent",
])

S_PLURAL_WORDS = dedupe([
    "chats", "tables", "roses", "livres", "chiens", "maisons", "voitures",
    "enfants", "amis", "portes", "fenêtres", "jardins", "arbres",
    "fleurs", "oiseaux", "animaux", "chevaux", "chapeaux", "gâteaux",
    "cadeaux", "bureaux", "tableaux", "morceaux", "journaux", "hôpitaux",
    "châteaux", "rideaux", "plateaux",
])

H_MUET_PHRASES = dedupe([
    "l'hôtel", "l'homme", "l'heure", "l'hiver", "l'histoire",
    "l'habitude", "l'horloge", "l'hôpital", "l'horizon", "l'humeur",
])

H_ASPIRE_PHRASES = dedupe([
    "le héros", "le haricot", "le hasard", "la honte", "le hibou",
    "la hauteur", "le hockey", "le hall", "le hamac", "le homard",
])

LIAISON_POSITIVE = dedupe([
    "les amis", "les enfants", "un ami", "un homme", "vous êtes",
    "ils ont", "nous avons", "deux heures", "trois ans", "petit ami",
    "grand homme", "mon ami", "ton ami", "son ami", "très intéressant",
    "plus important", "quand il pleut", "comment allez-vous", "chez elle",
    "dans un jardin", "sous un arbre", "chez eux", "en avion", "en hiver",
    "aux amis", "des amis", "ces amis", "ses amis", "nos amis",
    "vos amis", "leurs amis", "premier amour", "dernier arrivé",
    "grand arbre", "petit enfant", "bon appétit", "tout à fait",
    "c'est un ami", "il est arrivé", "elle est allée", "nous sommes ici",
    "vous avez appris", "ils vont arriver", "elles ont oublié",
])

LIAISON_NO_LIAISON_CONTRAST = dedupe([
    "les chats", "un chien", "deux femmes", "trois garçons", "les tables",
])

MINIMAL_PAIRS = [
    ("tu", "tout"), ("su", "sous"), ("pu", "pou"), ("vu", "vous"),
    ("dessus", "dessous"), ("pur", "pour"),
    ("été", "être"), ("thé", "tête"), ("les", "lait"), ("chez", "chaise"),
    ("ses", "sept"), ("mes", "mais"),
    ("peu", "peur"), ("jeu", "jeune"),
    ("bon", "bonne"), ("fin", "fine"), ("plein", "pleine"),
    ("brun", "brune"), ("certain", "certaine"), ("moyen", "moyenne"),
    ("ancien", "ancienne"),
    ("pain", "bain"), ("vin", "vain"), ("son", "sont"),
    ("dans", "don"), ("banc", "bon"), ("vent", "vont"),
]

NASAL_QUADRUPLET_SENTENCES = [
    "Un bon vin blanc.", "Un bon pain blanc.", "Cinq cents ans.",
    "Un grand vin blanc et un bon pain.", "Vingt-cinq ans.",
]

STATEMENT_QUESTION_PAIRS = [
    ("Tu viens.", "Tu viens ?"), ("Il est là.", "Il est là ?"),
    ("Elle a fini.", "Elle a fini ?"), ("Vous partez.", "Vous partez ?"),
    ("C'est vrai.", "C'est vrai ?"), ("Il pleut.", "Il pleut ?"),
    ("Tu as faim.", "Tu as faim ?"), ("Ça va.", "Ça va ?"),
    ("Il fait beau.", "Il fait beau ?"), ("Tu es prêt.", "Tu es prêt ?"),
]

INVERSION_QUESTIONS = [
    "Viens-tu ?", "Est-il là ?", "Avez-vous fini ?",
    "Parlez-vous français ?", "Peux-tu m'aider ?", "Veux-tu manger ?",
    "Sais-tu nager ?", "Voulez-vous danser ?", "Aimez-vous voyager ?",
    "Es-tu prêt ?", "Sommes-nous en retard ?", "Vont-ils venir ?",
    "A-t-elle compris ?", "Ont-ils mangé ?", "Pouvez-vous répéter ?",
]

EXCLAMATIONS = [
    "Quelle belle journée !", "Comme c'est beau !", "Quel dommage !",
    "Quelle bonne idée !", "Comme tu as grandi !", "Quelle surprise !",
    "Bravo, c'est magnifique !", "Quel beau temps !",
    "Comme c'est gentil !", "Quelle horreur !",
]

BREATH_GROUP_SENTENCES = [
    "Je voudrais, s'il vous plaît, une baguette.",
    "Alors, qu'est-ce qu'on fait ce soir ?",
    "Écoute, je pense que c'est une bonne idée.",
    "En fait, je ne suis pas sûr.", "Bon, on y va ?",
    "Franchement, je ne sais pas.", "D'accord, on se voit demain.",
    "Bien sûr, je peux t'aider.", "Enfin, nous sommes arrivés.",
    "Donc, tu es d'accord ?",
]

TONGUE_TWISTERS = [
    "Un chasseur sachant chasser sait chasser sans son chien.",
    "Les chaussettes de l'archiduchesse sont-elles sèches, archi-sèches ?",
    "Si six scies scient six cyprès, six cent six scies scient six cent six cyprès.",
    "Ces cerises sont si sûres qu'on ne sait pas si c'en sont.",
    "Le ver vert va vers le verre vert.",
    "Cinq chiens chassent six chats.",
    "Trois tortues trottaient sur trois toits très étroits.",
    "Didon dîna, dit-on, du dos d'un dodu dindon.",
    "Rat vit riz, rat mit patte à ras, riz cuit patte à rat.",
    "Je veux et j'exige d'exquises excuses.",
    "Un dragon gradé dégrada un gradé dragon.",
    "Douze douches douces.",
    "La roue tourne, tourne, tourne autour de la route.",
    "Combien de sous sont ces six saucissons-ci ? Six sous, ces six saucissons-ci.",
    "Fruits frais, fruits frits, fruits cuits, fruits crus.",
    "Natacha n'attacha pas son chat Pacha qui s'échappa.",
    "Poisson sans boisson est poison.",
    "Ton thé t'a-t-il ôté ta toux ?",
    "Seize chaises sèchent ici, seize chaises sèchent là.",
    "Le chasseur, sachant chasser, doit savoir chasser sans son chien.",
    "Suis-je bien chez ce cher Serge ?",
    "Un chien qui chante fait fuir les chats qui chassent.",
    "Trois gros rats gris rongent trois gros rats gris.",
    "Que lit Lili sous ces lilas-là ? Lili lit l'Iliade.",
    "Zazie causait avec sa cousine en cousant.",
    "Pauvre petit pêcheur, prends patience pour pouvoir prendre plusieurs poissons.",
    "Il était une fois, dans la ville de Foix, une marchande de foie.",
    "Buvez peu et bien, mangez peu et bien.",
    "Ciel, si ceci se sait, ces soins sont sans succès.",
    "Où niche la pie ? La pie niche haut.",
    "Bonjour madame la saucissonnière, combien vendez-vous ces six saucissons-là ?",
    "Chasseur, sachez chasser sans chien.",
    "Trois petites truites cuites, trois petites truites crues.",
    "Un ver de terre vert qui va vers un verre vert.",
    "Six saucisses sèches suffisent.",
    "Je suis ce que je suis, et si je suis ce que je suis, qu'est-ce que je suis ?",
    "Le fisc fixe exprès chaque taxe fixe excessive exclusivement au luxe et à l'exquis.",
    "Pie niche haut, oie niche bas, mais où niche l'hibou ?",
]


# ===========================
# CARRIER PHRASES (word-level -> phrase-level, meaning stays neutral)
# ===========================

WORD_CARRIERS = [
    lambda w: w,
    lambda w: "Dites « " + w + " ».",
    lambda w: "Répétez « " + w + " ».",
    lambda w: "Écoutez et répétez : " + w + ".",
    lambda w: "Peux-tu dire « " + w + " » ?",
    lambda w: "Prononcez lentement : " + w + ".",
]


def capitalize_sentence(s):
    return s[0].upper() + s[1:]


def word_items(word_list, category, target, n_bare, n_carrier, n_pairs, n_triples):
    items = []
    words = word_list[:]
    random.shuffle(words)

    for w in words[:n_bare]:
        items.append({"text": w, "category": category, "target": target, "type": "word"})

    carrier_combos = list(itertools.product(words, WORD_CARRIERS[1:]))
    random.shuffle(carrier_combos)
    for w, carrier in carrier_combos[:n_carrier]:
        items.append({"text": carrier(w), "category": category, "target": target, "type": "carrier_phrase"})

    if len(words) >= 2:
        pair_combos = list(itertools.combinations(words, 2))
        random.shuffle(pair_combos)
        for a, b in pair_combos[:n_pairs]:
            text = capitalize_sentence(a + ", " + b + ".")
            items.append({"text": text, "category": category, "target": target, "type": "pair_drill"})

    if len(words) >= 3:
        triple_combos = list(itertools.combinations(words, 3))
        random.shuffle(triple_combos)
        for a, b, c in triple_combos[:n_triples]:
            text = capitalize_sentence(a + ", " + b + ", " + c + ".")
            items.append({"text": text, "category": category, "target": target, "type": "triple_drill"})

    return items


# ===========================
# ASSEMBLE
# ===========================

all_items = []

WORD_SUBCATEGORIES = [
    (R_INITIAL, "r_sound", "r_initial"),
    (R_MEDIAL, "r_sound", "r_medial"),
    (R_FINAL, "r_sound", "r_final"),
    (R_CLUSTERS, "r_sound", "r_cluster"),
    (I_WORDS, "vowel", "i"),
    (Y_WORDS, "vowel", "y_u_sound"),
    (U_WORDS, "vowel", "ou_sound"),
    (E_WORDS, "vowel", "e_open_closed"),
    (EU_WORDS, "vowel", "eu_sound"),
    (AN_WORDS, "nasal_vowel", "an_en"),
    (IN_WORDS, "nasal_vowel", "in_ain"),
    (ON_WORDS, "nasal_vowel", "on"),
    (UN_WORDS, "nasal_vowel", "un"),
    (FINAL_SILENT_CONSONANT, "silent_letter", "final_consonant"),
    (ENT_VERBS, "silent_letter", "verb_ent_ending"),
    (S_PLURAL_WORDS, "silent_letter", "plural_marker"),
]

for word_list, category, target in WORD_SUBCATEGORIES:
    all_items.extend(word_items(
        word_list, category, target,
        n_bare=len(word_list),
        n_carrier=220,
        n_pairs=260,
        n_triples=220,
    ))

# h muet / h aspiré, as short phrases (lighter carrier set)
for phrase in H_MUET_PHRASES:
    all_items.append({"text": capitalize_sentence(phrase) + ".", "category": "silent_letter", "target": "h_muet", "type": "phrase"})
    all_items.append({"text": "Dites « " + phrase + " ».", "category": "silent_letter", "target": "h_muet", "type": "carrier_phrase"})
    all_items.append({"text": "Répétez « " + phrase + " ».", "category": "silent_letter", "target": "h_muet", "type": "carrier_phrase"})

for phrase in H_ASPIRE_PHRASES:
    all_items.append({"text": capitalize_sentence(phrase) + ".", "category": "silent_letter", "target": "h_aspire", "type": "phrase"})
    all_items.append({"text": "Dites « " + phrase + " ».", "category": "silent_letter", "target": "h_aspire", "type": "carrier_phrase"})
    all_items.append({"text": "Répétez « " + phrase + " ».", "category": "silent_letter", "target": "h_aspire", "type": "carrier_phrase"})

# Liaison
for phrase in LIAISON_POSITIVE:
    all_items.append({"text": capitalize_sentence(phrase) + ".", "category": "liaison", "target": "liaison_present", "type": "phrase"})
    all_items.append({"text": "Répétez, avec la liaison : " + phrase + ".", "category": "liaison", "target": "liaison_present", "type": "carrier_phrase"})
    all_items.append({"text": "Dites « " + phrase + " ».", "category": "liaison", "target": "liaison_present", "type": "carrier_phrase"})

for phrase in LIAISON_NO_LIAISON_CONTRAST:
    all_items.append({"text": capitalize_sentence(phrase) + ".", "category": "liaison", "target": "no_liaison", "type": "phrase"})
    all_items.append({"text": "Répétez, sans liaison : " + phrase + ".", "category": "liaison", "target": "no_liaison", "type": "carrier_phrase"})

# Minimal pairs
for a, b in MINIMAL_PAIRS:
    text = capitalize_sentence(a + " / " + b + ".")
    all_items.append({"text": text, "category": "minimal_pair", "target": a + "_vs_" + b, "type": "minimal_pair"})
    all_items.append({"text": "Dites « " + a + " », puis « " + b + " ».", "category": "minimal_pair", "target": a + "_vs_" + b, "type": "carrier_phrase"})
    all_items.append({"text": "Comparez : " + a + ", " + b + ".", "category": "minimal_pair", "target": a + "_vs_" + b, "type": "carrier_phrase"})

# Nasal quadruplets
for s in NASAL_QUADRUPLET_SENTENCES:
    all_items.append({"text": s, "category": "nasal_vowel", "target": "an_in_on_un_contrast", "type": "sentence"})
    all_items.append({"text": "Répétez : " + s, "category": "nasal_vowel", "target": "an_in_on_un_contrast", "type": "carrier_phrase"})

# Rhythm / intonation
for statement, question in STATEMENT_QUESTION_PAIRS:
    all_items.append({"text": statement, "category": "rhythm_intonation", "target": "statement_intonation", "type": "sentence"})
    all_items.append({"text": question, "category": "rhythm_intonation", "target": "question_intonation", "type": "sentence"})

for s in INVERSION_QUESTIONS:
    all_items.append({"text": s, "category": "rhythm_intonation", "target": "inversion_question", "type": "sentence"})
    all_items.append({"text": "Répétez : " + s, "category": "rhythm_intonation", "target": "inversion_question", "type": "carrier_phrase"})

for s in EXCLAMATIONS:
    all_items.append({"text": s, "category": "rhythm_intonation", "target": "exclamation", "type": "sentence"})
    all_items.append({"text": "Répétez avec enthousiasme : " + s, "category": "rhythm_intonation", "target": "exclamation", "type": "carrier_phrase"})

for s in BREATH_GROUP_SENTENCES:
    all_items.append({"text": s, "category": "rhythm_intonation", "target": "breath_group", "type": "sentence"})
    all_items.append({"text": "Répétez, en respectant les pauses : " + s, "category": "rhythm_intonation", "target": "breath_group", "type": "carrier_phrase"})

# Tongue twisters
for s in TONGUE_TWISTERS:
    all_items.append({"text": s, "category": "tongue_twister", "target": "tongue_twister", "type": "sentence"})
    all_items.append({"text": "Répétez trois fois : " + s, "category": "tongue_twister", "target": "tongue_twister", "type": "carrier_phrase"})


# ===========================
# DE-DUPLICATE, TOP UP / TRIM TO EXACTLY 10,000
# ===========================

TOTAL_TARGET = 10000

seen = set()
unique_items = []
for item in all_items:
    if item["text"] in seen:
        continue
    seen.add(item["text"])
    unique_items.append(item)

random.shuffle(unique_items)

if len(unique_items) < TOTAL_TARGET:
    # Top up with denser pair/triple drills from the biggest word lists —
    # still genuinely pronunciation-targeted, just more combinations.
    topup_sources = [
        (R_INITIAL, "r_sound", "r_initial"), (R_MEDIAL, "r_sound", "r_medial"),
        (R_FINAL, "r_sound", "r_final"), (R_CLUSTERS, "r_sound", "r_cluster"),
        (AN_WORDS, "nasal_vowel", "an_en"), (IN_WORDS, "nasal_vowel", "in_ain"),
        (ON_WORDS, "nasal_vowel", "on"), (FINAL_SILENT_CONSONANT, "silent_letter", "final_consonant"),
        (U_WORDS, "vowel", "ou_sound"), (E_WORDS, "vowel", "e_open_closed"),
    ]
    src_idx = 0
    while len(unique_items) < TOTAL_TARGET:
        word_list, category, target = topup_sources[src_idx % len(topup_sources)]
        words = word_list[:]
        random.shuffle(words)
        quad = words[:4]
        if len(quad) == 4:
            text = capitalize_sentence(", ".join(quad) + ".")
            if text not in seen:
                seen.add(text)
                unique_items.append({"text": text, "category": category, "target": target, "type": "quad_drill"})
        src_idx += 1
        if src_idx > 200000:
            break

unique_items = unique_items[:TOTAL_TARGET]

for i, item in enumerate(unique_items):
    item["id"] = "pb-%05d" % (i + 1)

# ===========================
# VALIDATION
# ===========================

assert len(unique_items) == TOTAL_TARGET, f"expected {TOTAL_TARGET}, got {len(unique_items)}"
assert len(set(i["text"] for i in unique_items)) == TOTAL_TARGET, "duplicate text found"
for item in unique_items:
    assert item["text"].strip() == item["text"]
    assert len(item["text"]) > 0
    assert item["category"] in {
        "r_sound", "vowel", "nasal_vowel", "silent_letter", "liaison",
        "minimal_pair", "rhythm_intonation", "tongue_twister",
    }

by_category = {}
for item in unique_items:
    by_category[item["category"]] = by_category.get(item["category"], 0) + 1

print("Total items:", len(unique_items))
print("By category:")
for cat, n in sorted(by_category.items()):
    print(f"  {cat}: {n}")

print("\nSample items:")
for item in random.sample(unique_items, 20):
    print(" ", item["category"], "/", item["target"], "->", item["text"])

OUT_PATH = "/tmp/claude-0/-home-user-Prononce/2bce692f-ac19-55cb-b223-31ce8fb4b2fd/scratchpad/pronunciation_bank.json"
with open(OUT_PATH, "w", encoding="utf-8") as f:
    json.dump(unique_items, f, ensure_ascii=False, indent=2)

print("\nWrote", OUT_PATH)
