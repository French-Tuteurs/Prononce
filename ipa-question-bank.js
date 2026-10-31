// ===========================
// IPA Question Bank (fetch + decode)
// ===========================
//
// Loads the sharded practice-question bank (ipa-practice/questions/)
// built by ipa-practice/generate.py. Sharded per symbol specifically
// so a session only ever downloads the symbols it actually needs —
// the full bank is ~110,000 questions, which would be a ~28MB single
// file; a handful of per-symbol shards (each ~20KB gzipped) is not.
// Shared by both ipa-practice.js (the free-drill page) and
// ipa-path-level.js (the IPA Path level player).

let indexPromise = null;
const shardCache = {};


export async function loadIndex() {

    if (!indexPromise) {
        indexPromise = fetch("ipa-practice/questions/index.json").then(function (res) {
            return res.json();
        });
    }

    return indexPromise;

}


export async function loadShard(symbol) {

    if (shardCache[symbol]) {
        return shardCache[symbol];
    }

    const index = await loadIndex();
    const slug = index.slugs[symbol];

    if (!slug) {
        shardCache[symbol] = [];
        return [];
    }

    const res = await fetch("ipa-practice/questions/" + slug + ".json");
    const rows = await res.json();

    // Compact row: [prompt, opt0, opt1, opt2, correctIndex]. Symbol is
    // implied by the shard file, so it's added back in here.
    const items = rows.map(function (row) {
        return {
            symbol: symbol,
            prompt: row[0],
            options: [row[1], row[2], row[3]],
            correctIndex: row[4]
        };
    });

    shardCache[symbol] = items;
    return items;

}


export async function loadShards(symbols) {

    const entries = await Promise.all(symbols.map(async function (symbol) {
        return [symbol, await loadShard(symbol)];
    }));

    const result = {};
    entries.forEach(function (entry) {
        result[entry[0]] = entry[1];
    });

    return result;

}
