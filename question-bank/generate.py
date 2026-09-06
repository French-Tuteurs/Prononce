# Generates ~10,000 "record yourself saying this" French prompts for a
# future AI-pronunciation-analysis feature. Not wired into any page —
# pure data at rest. Grammatical correctness is guaranteed by
# construction (explicit conjugation tables, explicit gender/number
# agreement) rather than by hand-typing thousands of unique sentences.

import json
import random

random.seed(7)

# ===========================
# 1. VOCAB WORDS
# ===========================

def number_to_french(n):
    ones = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept",
            "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze",
            "quinze", "seize"]
    if n <= 16:
        return ones[n]
    if n < 20:
        return "dix-" + ones[n - 10]
    tens_words = {20: "vingt", 30: "trente", 40: "quarante", 50: "cinquante",
                  60: "soixante"}
    if n < 70:
        tens = (n // 10) * 10
        rem = n % 10
        if rem == 0:
            return tens_words[tens]
        if rem == 1:
            return tens_words[tens] + " et un"
        return tens_words[tens] + "-" + ones[rem]
    if n < 80:
        rem = n - 60
        if rem == 11:
            return "soixante et onze"
        return "soixante-" + number_to_french(rem).replace("soixante-", "")
    if n < 100:
        rem = n - 80
        prefix = "quatre-vingt" if rem == 0 else "quatre-vingt-"
        if rem == 0:
            return "quatre-vingts"
        if rem == 1:
            return "quatre-vingt-un"
        return "quatre-vingt-" + number_to_french(rem)
    if n == 100:
        return "cent"
    raise ValueError(n)


NUMBERS = [number_to_french(n) for n in range(0, 101)]

DAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet",
          "août", "septembre", "octobre", "novembre", "décembre"]
SEASONS = ["le printemps", "l'été", "l'automne", "l'hiver"]
COLORS = ["rouge", "bleu", "vert", "jaune", "noir", "blanc", "gris",
          "orange", "violet", "rose", "marron", "beige", "doré", "argenté"]

VOCAB_CATEGORIES = {
    "family": ["la mère", "le père", "la sœur", "le frère", "la fille",
               "le fils", "la grand-mère", "le grand-père", "la tante",
               "l'oncle", "la cousine", "le cousin", "les parents",
               "le bébé", "la famille", "le mari", "la femme",
               "la belle-mère", "le beau-père", "les enfants"],
    "food": ["le pain", "le fromage", "le lait", "l'eau", "le vin",
             "la viande", "le poisson", "le poulet", "les légumes",
             "les fruits", "la pomme", "la banane", "l'orange",
             "la fraise", "la carotte", "la pomme de terre", "le riz",
             "les pâtes", "la soupe", "le sucre", "le sel", "le poivre",
             "le beurre", "l'huile", "le café", "le thé", "le jus",
             "le gâteau", "le chocolat", "la glace", "l'œuf", "la salade",
             "la tomate", "le citron", "la confiture", "le miel"],
    "animals": ["le chat", "le chien", "le cheval", "la vache", "le mouton",
                "le cochon", "la poule", "le canard", "l'oiseau",
                "le poisson", "le lapin", "la souris", "le lion",
                "le tigre", "l'éléphant", "le singe", "l'ours",
                "le loup", "le renard", "la chèvre", "l'abeille",
                "le papillon", "l'araignée", "la grenouille", "le serpent"],
    "body": ["la tête", "les cheveux", "le visage", "les yeux", "le nez",
             "la bouche", "les oreilles", "le cou", "les épaules",
             "le bras", "la main", "les doigts", "le dos", "le ventre",
             "la jambe", "le pied", "le genou", "le cœur", "les dents"],
    "house": ["la maison", "l'appartement", "la chambre", "la cuisine",
              "le salon", "la salle de bain", "le jardin", "la porte",
              "la fenêtre", "le toit", "le mur", "l'escalier",
              "la table", "la chaise", "le lit", "l'armoire", "le canapé",
              "la lampe", "le miroir", "le tapis", "l'étagère"],
    "clothing": ["la chemise", "le pantalon", "la robe", "la jupe",
                 "les chaussures", "le manteau", "le chapeau", "les gants",
                 "l'écharpe", "le pull", "les chaussettes", "la ceinture",
                 "le costume", "les lunettes", "le sac"],
    "school": ["l'école", "le professeur", "l'élève", "le livre",
               "le cahier", "le stylo", "le crayon", "la règle",
               "la salle de classe", "la leçon", "le devoir", "l'examen",
               "la note", "le tableau", "la bibliothèque"],
    "weather_nature": ["le soleil", "la lune", "les étoiles", "le ciel",
                       "la pluie", "la neige", "le vent", "le nuage",
                       "la mer", "la montagne", "la rivière", "la forêt",
                       "le lac", "la plage", "l'arbre", "la fleur",
                       "l'herbe", "la pierre", "le sable"],
    "professions": ["le médecin", "l'infirmière", "le professeur",
                    "l'avocat", "le policier", "le pompier", "le boulanger",
                    "le boucher", "le facteur", "le chauffeur",
                    "l'ingénieur", "le cuisinier", "le vendeur",
                    "l'artiste", "le musicien"],
    "transport": ["la voiture", "le vélo", "le train", "l'avion",
                  "le bateau", "le bus", "le métro", "la moto",
                  "le taxi", "la route", "l'aéroport", "la gare"],
    "adjectives": ["grand", "petit", "beau", "joli", "jeune", "vieux",
                   "nouveau", "bon", "mauvais", "gros", "long", "court",
                   "gentil", "méchant", "heureux", "triste", "fatigué",
                   "content", "fâché", "calme", "rapide", "lent",
                   "facile", "difficile", "chaud", "froid", "propre",
                   "sale", "cher", "riche", "pauvre", "fort", "faible",
                   "intelligent", "drôle", "sérieux", "timide", "poli"],
    "verbs_infinitive": ["parler", "manger", "boire", "dormir", "courir",
                         "marcher", "nager", "voler", "chanter", "danser",
                         "écrire", "lire", "dessiner", "peindre", "jouer",
                         "travailler", "étudier", "voyager", "cuisiner",
                         "nettoyer", "réparer", "construire", "acheter",
                         "vendre", "payer", "économiser", "rire", "pleurer",
                         "crier", "chuchoter", "sourire", "réfléchir",
                         "espérer", "rêver", "essayer"],
}

vocab_words = []
vocab_words.extend(NUMBERS)
vocab_words.extend(DAYS)
vocab_words.extend(MONTHS)
vocab_words.extend(SEASONS)
vocab_words.extend(COLORS)
for words in VOCAB_CATEGORIES.values():
    vocab_words.extend(words)

vocab_words = list(dict.fromkeys(vocab_words))  # de-dupe, keep order


# ===========================
# 2. NOUN PHRASES (gender + number agreement)
# ===========================

# (singular, plural, gender) — gender only affects which adjective form
# is picked; the article is always definite (le/la/les).
NOUNS = [
    ("chat", "chats", "m"), ("chien", "chiens", "m"),
    ("maison", "maisons", "f"), ("voiture", "voitures", "f"),
    ("livre", "livres", "m"), ("table", "tables", "f"),
    ("fenêtre", "fenêtres", "f"), ("porte", "portes", "f"),
    ("jardin", "jardins", "m"), ("fleur", "fleurs", "f"),
    ("arbre", "arbres", "m"), ("montagne", "montagnes", "f"),
    ("rivière", "rivières", "f"), ("ville", "villes", "f"),
    ("route", "routes", "f"), ("pont", "ponts", "m"),
    ("château", "châteaux", "m"), ("village", "villages", "m"),
    ("enfant", "enfants", "m"), ("homme", "hommes", "m"),
    ("femme", "femmes", "f"), ("ami", "amis", "m"),
    ("amie", "amies", "f"), ("professeur", "professeurs", "m"),
    ("étudiant", "étudiants", "m"), ("chanson", "chansons", "f"),
    ("histoire", "histoires", "f"), ("idée", "idées", "f"),
    ("question", "questions", "f"), ("réponse", "réponses", "f"),
    ("problème", "problèmes", "m"), ("solution", "solutions", "f"),
    ("gâteau", "gâteaux", "m"), ("pomme", "pommes", "f"),
    ("orange", "oranges", "f"), ("banane", "bananes", "f"),
    ("robe", "robes", "f"), ("chemise", "chemises", "f"),
    ("chapeau", "chapeaux", "m"), ("sac", "sacs", "m"),
    ("valise", "valises", "f"), ("clé", "clés", "f"),
    ("lettre", "lettres", "f"), ("photo", "photos", "f"),
    ("image", "images", "f"), ("film", "films", "m"),
    ("musique", "musiques", "f"), ("guitare", "guitares", "f"),
    ("piano", "pianos", "m"), ("oiseau", "oiseaux", "m"),
    ("poisson", "poissons", "m"), ("cheval", "chevaux", "m"),
    ("lapin", "lapins", "m"), ("étoile", "étoiles", "f"),
    ("lune", "lunes", "f"), ("plage", "plages", "f"),
    ("forêt", "forêts", "f"), ("lac", "lacs", "m"),
    ("île", "îles", "f"), ("nuage", "nuages", "m"),
    ("chambre", "chambres", "f"), ("cuisine", "cuisines", "f"),
    ("lit", "lits", "m"), ("chaise", "chaises", "f"),
    ("lampe", "lampes", "f"), ("miroir", "miroirs", "m"),
    ("tapis", "tapis", "m"), ("boîte", "boîtes", "f"),
    ("bouteille", "bouteilles", "f"), ("tasse", "tasses", "f"),
    ("assiette", "assiettes", "f"), ("cuillère", "cuillères", "f"),
    ("couteau", "couteaux", "m"), ("magasin", "magasins", "m"),
    ("marché", "marchés", "m"), ("restaurant", "restaurants", "m"),
    ("hôtel", "hôtels", "m"), ("hôpital", "hôpitaux", "m"),
    ("école", "écoles", "f"), ("bureau", "bureaux", "m"),
    ("usine", "usines", "f"), ("ferme", "fermes", "f"),
    ("jardinier", "jardiniers", "m"), ("boulanger", "boulangers", "m"),
    ("étudiante", "étudiantes", "f"), ("écrivain", "écrivains", "m"),
]

# (masc, fem, masc_pl, fem_pl, position, special_before_vowel_m) —
# position is "before" or "after"; special_before_vowel_m is the
# liaison form (bel/vieil/nouvel) used only for masc. singular
# "before" adjectives immediately in front of a vowel-initial noun —
# None for every adjective that doesn't have one.
ADJECTIVES = [
    ("petit", "petite", "petits", "petites", "before", None),
    ("grand", "grande", "grands", "grandes", "before", None),
    ("beau", "belle", "beaux", "belles", "before", "bel"),
    ("joli", "jolie", "jolis", "jolies", "before", None),
    ("jeune", "jeune", "jeunes", "jeunes", "before", None),
    ("vieux", "vieille", "vieux", "vieilles", "before", "vieil"),
    ("nouveau", "nouvelle", "nouveaux", "nouvelles", "before", "nouvel"),
    ("bon", "bonne", "bons", "bonnes", "before", None),
    ("mauvais", "mauvaise", "mauvais", "mauvaises", "before", None),
    ("gros", "grosse", "gros", "grosses", "before", None),
    ("long", "longue", "longs", "longues", "before", None),
    ("court", "courte", "courts", "courtes", "after", None),
    ("rouge", "rouge", "rouges", "rouges", "after", None),
    ("bleu", "bleue", "bleus", "bleues", "after", None),
    ("vert", "verte", "verts", "vertes", "after", None),
    ("noir", "noire", "noirs", "noires", "after", None),
    ("blanc", "blanche", "blancs", "blanches", "after", None),
    ("chaud", "chaude", "chauds", "chaudes", "after", None),
    ("froid", "froide", "froids", "froides", "after", None),
    ("propre", "propre", "propres", "propres", "after", None),
    ("sale", "sale", "sales", "sales", "after", None),
    ("cher", "chère", "chers", "chères", "after", None),
    ("calme", "calme", "calmes", "calmes", "after", None),
    ("rapide", "rapide", "rapides", "rapides", "after", None),
    ("lent", "lente", "lents", "lentes", "after", None),
    ("facile", "facile", "faciles", "faciles", "after", None),
    ("difficile", "difficile", "difficiles", "difficiles", "after", None),
    ("intelligent", "intelligente", "intelligents", "intelligentes", "after", None),
    ("heureux", "heureuse", "heureux", "heureuses", "after", None),
    ("fort", "forte", "forts", "fortes", "after", None),
]


def build_noun_phrase(noun, adjective, plural):
    sing, pl, gender = noun
    m, f, mpl, fpl, position, special_m = adjective

    if plural:
        noun_word = pl
        adj_word = mpl if gender == "m" else fpl
        words = [adj_word, noun_word] if position == "before" else [noun_word, adj_word]
        phrase = "les " + " ".join(words)

    else:
        noun_word = sing
        adj_word = m if gender == "m" else f

        if position == "before":
            starts_vowel = noun_word[0].lower() in "aeiouhéèêàâîïôûù"
            if gender == "m" and starts_vowel and special_m:
                adj_word = special_m
            first, second = adj_word, noun_word
        else:
            first, second = noun_word, adj_word

        starts_vowel_at_article = first[0].lower() in "aeiouhéèêàâîïôûù"

        if starts_vowel_at_article:
            phrase = "l'" + first + " " + second
        else:
            article = "le" if gender == "m" else "la"
            phrase = article + " " + first + " " + second

    return phrase[0].upper() + phrase[1:] + "."


noun_phrase_combos = [(n, a, p) for n in NOUNS for a in ADJECTIVES for p in (False, True)]
random.shuffle(noun_phrase_combos)


# ===========================
# 3. DECLARATIVE SENTENCES (full conjugation engine)
# ===========================

PRONOUNS = ["je", "tu", "il", "elle", "nous", "vous", "ils", "elles"]

REGULAR_ER_VERBS = [
    "aimer", "regarder", "écouter", "chercher", "trouver", "donner",
    "montrer", "fermer", "dessiner", "chanter", "laver", "préparer",
    "inviter", "visiter", "continuer", "tourner", "aider", "apporter",
    "désirer", "gagner", "garder", "goûter", "oublier", "planter",
    "porter", "poser", "pousser", "présenter", "prêter", "quitter",
    "raconter", "refuser", "rencontrer", "signer", "souhaiter",
    "terminer", "tirer", "toucher", "utiliser",
]

ER_ENDINGS = ["e", "es", "e", "e", "ons", "ez", "ent", "ent"]

IRREGULAR_VERBS = {
    # infinitive: (je, tu, il, elle, nous, vous, ils, elles, participle)
    "avoir": ("ai", "as", "a", "a", "avons", "avez", "ont", "ont", "eu"),
    "faire": ("fais", "fais", "fait", "fait", "faisons", "faites", "font", "font", "fait"),
    "vouloir": ("veux", "veux", "veut", "veut", "voulons", "voulez", "veulent", "veulent", "voulu"),
    "prendre": ("prends", "prends", "prend", "prend", "prenons", "prenez", "prennent", "prennent", "pris"),
    "voir": ("vois", "vois", "voit", "voit", "voyons", "voyez", "voient", "voient", "vu"),
    "dire": ("dis", "dis", "dit", "dit", "disons", "dites", "disent", "disent", "dit"),
    "mettre": ("mets", "mets", "met", "met", "mettons", "mettez", "mettent", "mettent", "mis"),
    "lire": ("lis", "lis", "lit", "lit", "lisons", "lisez", "lisent", "lisent", "lu"),
    "écrire": ("écris", "écris", "écrit", "écrit", "écrivons", "écrivez", "écrivent", "écrivent", "écrit"),
    "connaître": ("connais", "connais", "connaît", "connaît", "connaissons", "connaissez", "connaissent", "connaissent", "connu"),
    "comprendre": ("comprends", "comprends", "comprend", "comprend", "comprenons", "comprenez", "comprennent", "comprennent", "compris"),
    "boire": ("bois", "bois", "boit", "boit", "buvons", "buvez", "boivent", "boivent", "bu"),
}

ALLER_PRESENT = ["vais", "vas", "va", "va", "allons", "allez", "vont", "vont"]

OBJECTS = [
    "le café", "la musique", "un livre", "une pomme", "le film",
    "la lettre", "un gâteau", "la porte", "la fenêtre", "le jardin",
    "la maison", "le vélo", "une chanson", "la guitare", "le piano",
    "la voiture", "une valise", "le sac", "la table", "la chaise",
    "la ville", "la montagne", "la plage", "le chemin", "une carte",
    "la lampe", "la lumière", "un dessin", "la question", "la réponse",
    "un ami", "une histoire", "le journal", "un cadeau", "la vérité",
    "un chapeau", "un chat", "un problème", "le prix", "la salade",
]

VOWEL_START = "aeiouhéèêàâîïôûù"


def subject_and_verb(pronoun, verb_form, capitalize=True):
    if pronoun == "je" and verb_form[0].lower() in VOWEL_START:
        text = "j'" + verb_form
    else:
        text = pronoun + " " + verb_form
    return text[0].upper() + text[1:] if capitalize else text


def er_present_form(verb, idx):
    stem = verb[:-2]
    return stem + ER_ENDINGS[idx]


def conjugate_present(verb, idx):
    if verb in IRREGULAR_VERBS:
        return IRREGULAR_VERBS[verb][idx]
    return er_present_form(verb, idx)


def participle(verb):
    if verb in IRREGULAR_VERBS:
        return IRREGULAR_VERBS[verb][8]
    return verb[:-2] + "é"


def declarative_sentence(pronoun, verb, tense, obj):
    idx = PRONOUNS.index(pronoun)

    if tense == "present":
        form = conjugate_present(verb, idx)
        return subject_and_verb(pronoun, form) + " " + obj + "."

    if tense == "passe_compose":
        aux = IRREGULAR_VERBS["avoir"][idx]
        lead = subject_and_verb(pronoun, aux)
        return lead + " " + participle(verb) + " " + obj + "."

    if tense == "futur_proche":
        aux = ALLER_PRESENT[idx]
        lead = subject_and_verb(pronoun, aux)
        return lead + " " + verb + " " + obj + "."

    raise ValueError(tense)


ALL_VERBS = REGULAR_ER_VERBS + list(IRREGULAR_VERBS.keys())
TENSES = ["present", "passe_compose", "futur_proche"]

decl_combos = [(p, v, t, o) for p in PRONOUNS for v in ALL_VERBS for t in TENSES for o in OBJECTS]
random.shuffle(decl_combos)


# ===========================
# 4. QUESTIONS
# ===========================

QUE_VOWEL_PRONOUNS = {"il", "elle", "ils", "elles", "on"}


def est_ce_que_question(pronoun, verb, obj):
    idx = PRONOUNS.index(pronoun)
    form = conjugate_present(verb, idx)

    if pronoun in QUE_VOWEL_PRONOUNS:
        lead = "Est-ce qu'" + pronoun
    else:
        lead = "Est-ce que " + pronoun

    subj_verb = subject_and_verb(pronoun, form, capitalize=False)
    # subj_verb already handles je -> j' elision; strip the leading
    # pronoun word since "lead" already supplies it.
    verb_only = subj_verb.split(" ", 1)[1] if " " in subj_verb else subj_verb[len(pronoun):]

    return lead + " " + verb_only + " " + obj + " ?"


question_combos = [(p, v, o) for p in PRONOUNS for v in ALL_VERBS for o in OBJECTS]
random.shuffle(question_combos)

CURATED_QUESTIONS = [
    "Comment tu t'appelles ?", "Quel âge as-tu ?", "Où habites-tu ?",
    "D'où viens-tu ?", "Quelle heure est-il ?", "Quel temps fait-il ?",
    "Qu'est-ce que tu fais ?", "Qu'est-ce que c'est ?",
    "Pourquoi est-ce que tu ris ?", "Comment ça va ?",
    "Où est la gare ?", "Où sont les toilettes ?",
    "Combien ça coûte ?", "Quel jour sommes-nous ?",
    "Quelle est la date aujourd'hui ?", "Est-ce que tu parles anglais ?",
    "Est-ce que tu as faim ?", "Est-ce que tu as soif ?",
    "Qui est-ce ?", "Qui a fait ça ?", "Que veux-tu manger ?",
    "Que préfères-tu ?", "Comment s'appelle ton frère ?",
    "Depuis quand habites-tu ici ?", "Depuis combien de temps étudies-tu le français ?",
    "À quelle heure commence le film ?", "À quelle heure finit le cours ?",
    "Quel est ton plat préféré ?", "Quelle est ta couleur préférée ?",
    "Quel est ton sport préféré ?", "As-tu des frères et sœurs ?",
    "As-tu un animal de compagnie ?", "Aimes-tu voyager ?",
    "Peux-tu m'aider, s'il te plaît ?", "Pouvez-vous répéter, s'il vous plaît ?",
    "Parlez-vous plus lentement, s'il vous plaît ?", "Où puis-je acheter des billets ?",
    "Comment on dit ça en français ?", "Que signifie ce mot ?",
    "Es-tu prêt ?", "Êtes-vous prêts ?", "Avez-vous une réservation ?",
    "Y a-t-il un restaurant près d'ici ?", "Y a-t-il une pharmacie ouverte ?",
    "Comment allez-vous aujourd'hui ?", "Où allez-vous en vacances ?",
    "Quand pars-tu en voyage ?", "Quand rentres-tu à la maison ?",
    "Comment était le film ?", "Comment s'est passée ta journée ?",
    "Pourquoi es-tu en retard ?", "Pourquoi as-tu peur ?",
    "Que fais-tu ce week-end ?", "Que fait-il dans la vie ?",
    "Où travailles-tu ?", "Où étudies-tu ?",
    "Combien de langues parles-tu ?", "Combien d'enfants avez-vous ?",
    "Qu'est-ce que tu penses de ce livre ?", "Qu'est-ce que tu penses de cette idée ?",
    "Veux-tu venir avec nous ?", "Voulez-vous un café ?",
    "Pouvez-vous m'indiquer le chemin ?", "Puis-je vous poser une question ?",
    "Est-ce que je peux vous aider ?", "Est-ce que c'est loin d'ici ?",
    "Est-ce que le train est à l'heure ?", "Est-ce que tu es libre ce soir ?",
    "Quel âge a ton frère ?", "Quelle taille fais-tu ?",
    "Où as-tu appris le français ?", "Comment as-tu trouvé ce restaurant ?",
    "Quand est-ce que tu es arrivé ?", "Pourquoi est-ce qu'elle pleure ?",
    "Que voulez-vous faire ce soir ?", "Où sont mes clés ?",
    "Où est mon téléphone ?", "Est-ce que tu as vu mon sac ?",
    "As-tu bien dormi ?", "As-tu bien mangé ?",
    "Est-ce que tout va bien ?", "Est-ce que ça te plaît ?",
    "Quel est le problème ?", "Qu'est-ce qui s'est passé ?",
    "Qui vient avec nous ?", "Qui a gagné le match ?",
    "Comment fonctionne cet appareil ?", "Comment s'écrit ton nom ?",
    "Où avez-vous grandi ?", "Quel métier fais-tu ?",
    "Quelle est ton adresse ?", "Quel est ton numéro de téléphone ?",
    "Est-ce que vous acceptez les cartes de crédit ?",
    "Est-ce qu'il y a du wifi ici ?", "Où puis-je garer ma voiture ?",
    "Quand ouvre le magasin ?", "Quand ferme la banque ?",
    "Pourquoi as-tu choisi cette université ?", "Comment se passe ton nouveau travail ?",
]

question_pool = [
    est_ce_que_question(p, v, o) for (p, v, o) in question_combos
]


# ===========================
# 5. CURATED EVERYDAY PHRASES
# ===========================

CURATED_PHRASES = [
    "Bonjour, comment allez-vous ?", "Bonsoir tout le monde.",
    "Salut, ça va ?", "Au revoir, à bientôt !", "À demain !",
    "À plus tard.", "Bonne nuit, dors bien.", "Merci beaucoup.",
    "Merci pour votre aide.", "De rien.", "Je vous en prie.",
    "S'il vous plaît.", "S'il te plaît.", "Excusez-moi.",
    "Je suis désolé.", "Je suis désolée.", "Pardon, je ne comprends pas.",
    "Enchanté de vous rencontrer.", "Ravi de faire votre connaissance.",
    "Comment vous appelez-vous ?", "Je m'appelle Camille.",
    "J'habite à Paris.", "Je viens de Lyon.", "J'ai vingt ans.",
    "Je suis étudiant.", "Je suis étudiante.", "Je parle un peu français.",
    "Je ne parle pas très bien français.", "Pouvez-vous parler plus lentement ?",
    "Je ne comprends pas.", "Pouvez-vous répéter, s'il vous plaît ?",
    "Comment dit-on cela en français ?", "Bonne chance !",
    "Bon appétit !", "Bon voyage !", "Bon week-end !",
    "Joyeux anniversaire !", "Joyeuses fêtes !", "Félicitations !",
    "Bienvenue chez nous.", "Faites comme chez vous.",
    "Il fait beau aujourd'hui.", "Il fait très chaud cet été.",
    "Il fait froid en hiver.", "Il pleut depuis ce matin.",
    "Il neige beaucoup cette semaine.", "Le ciel est bleu et dégagé.",
    "Le vent souffle fort aujourd'hui.", "Quelle belle journée !",
    "Il est huit heures du matin.", "Il est midi.",
    "Il est minuit passé.", "Il est trois heures et demie.",
    "Il est presque cinq heures.", "Nous sommes lundi.",
    "Nous sommes le premier janvier.", "C'est aujourd'hui mon anniversaire.",
    "La réunion commence à neuf heures.", "Le magasin ferme à dix-huit heures.",
    "J'ai rendez-vous chez le médecin.", "J'ai besoin d'aller à la pharmacie.",
    "Je voudrais réserver une table pour deux.", "L'addition, s'il vous plaît.",
    "C'est délicieux, merci.", "Je prendrai la même chose.",
    "Je suis allergique aux arachides.", "Je suis végétarien.",
    "Je suis végétarienne.", "Où se trouve la station de métro ?",
    "Le train part dans dix minutes.", "L'avion a du retard.",
    "Prenez la première rue à gauche.", "Continuez tout droit.",
    "Tournez à droite au feu rouge.", "C'est à côté de la banque.",
    "C'est en face de l'église.", "C'est tout près d'ici.",
    "C'est assez loin d'ici.", "Combien de temps ça prend ?",
    "J'ai perdu mon passeport.", "Pouvez-vous m'aider, s'il vous plaît ?",
    "Où est l'hôpital le plus proche ?", "Appelez une ambulance, s'il vous plaît.",
    "J'ai besoin d'un médecin.", "Ce n'est pas grave.",
    "Ne vous inquiétez pas.", "Tout va bien se passer.",
    "Prenez soin de vous.", "Faites attention, s'il vous plaît.",
    "C'est une bonne idée.", "Je suis tout à fait d'accord.",
    "Je ne suis pas d'accord.", "Tu as raison.",
    "Tu as tort.", "Ça n'a pas d'importance.",
    "Ça m'est égal.", "Peu importe.",
    "Je suis très content aujourd'hui.", "Je suis un peu fatigué.",
    "Je suis vraiment désolé du retard.", "Nous sommes ravis de vous accueillir.",
    "Elle est très gentille avec tout le monde.", "Il est toujours de bonne humeur.",
    "Ils habitent juste à côté de chez nous.", "Nous allons au cinéma ce soir.",
    "Vous parlez très bien français.", "Tu apprends vite.",
    "C'est un plaisir de travailler avec vous.", "Nous avons beaucoup appris aujourd'hui.",
    "Le cours commence dans cinq minutes.", "N'oubliez pas vos devoirs.",
    "Ouvrez votre livre à la page dix.", "Répétez après moi, s'il vous plaît.",
    "Levez la main si vous avez une question.", "Travaillez en groupe de deux.",
    "Le temps est presque écoulé.", "C'est la fin du cours.",
]


# ===========================
# ASSEMBLE, DE-DUPLICATE, SAMPLE TO TARGET COUNTS
# ===========================

TARGETS = {
    "vocab_word": 800,
    "noun_phrase": 2200,
    "declarative_sentence": 5000,
    "question": 1500,
    "curated_phrase": 500,
}

items = []
seen_text = set()


def add_unique(text, category, source_pool_used):
    if text in seen_text:
        return False
    seen_text.add(text)
    items.append({"text": text, "category": category})
    return True


# 1. vocab words
count = 0
for w in vocab_words:
    if count >= TARGETS["vocab_word"]:
        break
    if add_unique(w, "vocab_word", None):
        count += 1

# 2. noun phrases
count = 0
for (n, a, p) in noun_phrase_combos:
    if count >= TARGETS["noun_phrase"]:
        break
    text = build_noun_phrase(n, a, p)
    if add_unique(text, "noun_phrase", None):
        count += 1

# 3. declarative sentences
count = 0
for (p, v, t, o) in decl_combos:
    if count >= TARGETS["declarative_sentence"]:
        break
    text = declarative_sentence(p, v, t, o)
    if add_unique(text, "declarative_sentence", None):
        count += 1

# 4. questions (curated first, then generated fill the rest)
count = 0
for q in CURATED_QUESTIONS:
    if count >= TARGETS["question"]:
        break
    if add_unique(q, "question", None):
        count += 1
for q in question_pool:
    if count >= TARGETS["question"]:
        break
    if add_unique(q, "question", None):
        count += 1

# 5. curated phrases
count = 0
for ph in CURATED_PHRASES:
    if count >= TARGETS["curated_phrase"]:
        break
    if add_unique(ph, "curated_phrase", None):
        count += 1


# Top up to exactly 10,000 by drawing more from whichever generative
# pool (noun phrases / sentences / questions) still has unused combos,
# since those pools are large enough to cover any shortfall from the
# curated lists running out.

TOTAL_TARGET = 10000


def topup_from(pool_iterable, category, formatter):
    for combo in pool_iterable:
        if len(items) >= TOTAL_TARGET:
            return
        text = formatter(combo)
        add_unique(text, category, None)


if len(items) < TOTAL_TARGET:
    topup_from(decl_combos, "declarative_sentence", lambda c: declarative_sentence(*c))
if len(items) < TOTAL_TARGET:
    topup_from(noun_phrase_combos, "noun_phrase", lambda c: build_noun_phrase(*c))
if len(items) < TOTAL_TARGET:
    topup_from(question_combos, "question", lambda c: est_ce_que_question(*c))

items = items[:TOTAL_TARGET]

for i, item in enumerate(items):
    item["id"] = "qb-%05d" % (i + 1)

# ===========================
# VALIDATION
# ===========================

assert len(items) == TOTAL_TARGET, f"expected {TOTAL_TARGET}, got {len(items)}"
assert len(set(i["text"] for i in items)) == TOTAL_TARGET, "duplicate text found"
for item in items:
    assert item["text"].strip() == item["text"], "leading/trailing whitespace"
    assert len(item["text"]) > 0

by_category = {}
for item in items:
    by_category[item["category"]] = by_category.get(item["category"], 0) + 1

print("Total items:", len(items))
print("By category:")
for cat, n in sorted(by_category.items()):
    print(f"  {cat}: {n}")

print("\nSample items:")
for item in random.sample(items, 15):
    print(" ", item["category"], "->", item["text"])

OUT_PATH = "/tmp/claude-0/-home-user-Prononce/2bce692f-ac19-55cb-b223-31ce8fb4b2fd/scratchpad/question_bank.json"
with open(OUT_PATH, "w", encoding="utf-8") as f:
    json.dump(items, f, ensure_ascii=False, indent=2)

print("\nWrote", OUT_PATH)
