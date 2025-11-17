export function translatePhrase(phrase) {
    if (phrase == null) {
        return '';
    }

    const lang = window?.wwLib?.wwVariable?.getValue("aa44dc4c-476b-45e9-a094-16687e063342"); // idioma atual (ex: "pt-BR")
  const jsonArr = window?.wwLib?.wwVariable?.getValue("4bb37062-2a1b-4cb6-a115-ae6df0c557d2"); // array de traduções
  const allLangs = window?.wwLib?.wwVariable?.getValue("5abe8801-7f12-4c9c-b356-900431ab4491"); // lista de idiomas

    if (!Array.isArray(jsonArr) || !Array.isArray(allLangs)) {
        return String(phrase);
    }

    const isoLangs = allLangs.map(langEntry => langEntry.Lang);

    function findIndexByTerm(term) {
        return jsonArr.findIndex(
            obj => obj.term?.trim().toLowerCase() === term.trim().toLowerCase()
        );
    }

    const part = String(phrase).trim();
    if (!part) {
        return '';
    }

    const idx = findIndexByTerm(part);

    if (idx === -1) {
        const newEntry = { term: part, source: 'FrontEnd' };

        isoLangs.forEach(code => {
            newEntry[code] = part;
        });

        jsonArr.push(newEntry);

        return newEntry[lang] ?? part;
    } else {
        const entry = jsonArr[idx];

        const value = entry[lang];

        if (value === '' || value == null) {
            return String(phrase);
        }

        return value;
    }
}

export function translateText(text) {
    if (text == null) return '';
    const value = typeof text === 'string' ? text : String(text);

    try {
        const translated = translatePhrase(value);
        if (translated !== undefined && translated !== null && translated !== '') {
            return translated;
        }
    } catch (error) {
        console.warn('TranslatePhrase error:', error);
    }

    try {
        const legacy = window.translateText?.(value);
        if (legacy !== undefined && legacy !== null && legacy !== '') {
            return legacy;
        }
    } catch (error) {
        console.warn('Translation error:', error);
    }

    return value;
}