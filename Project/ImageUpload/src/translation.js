export function translatePhrase(phrase) {
  if (phrase == null) {
    return "";
  }

  const lang = window?.wwLib?.wwVariable?.getValue("aa44dc4c-476b-45e9-a094-16687e063342"); // idioma atual (ex: "pt-BR")
  const jsonArr = window?.wwLib?.wwVariable?.getValue("4bb37062-2a1b-4cb6-a115-ae6df0c557d2"); // array de traduções
  const allLangs = window?.wwLib?.wwVariable?.getValue("5abe8801-7f12-4c9c-b356-900431ab4491"); // lista de idiomas

  if (!Array.isArray(jsonArr) || !Array.isArray(allLangs)) {
    return String(phrase);
  }

  const isoLangs = allLangs.map((l) => l.Lang); // ["en-US", "pt-BR", ...]

  // Helper para encontrar índice de um termo existente
  function findIndexByTerm(term) {
    return jsonArr.findIndex(
      (obj) => obj.term?.trim().toLowerCase() === term.trim().toLowerCase()
    );
  }

  const part = String(phrase).trim();
  if (!part) {
    return "";
  }

  const idx = findIndexByTerm(part);

  if (idx === -1) {
    // 🔹 Não existe → cria novo registro completo
    const newEntry = { term: part, source: "FrontEnd" };

    // Preenche cada idioma com o próprio texto (ou tradução automática se quiser depois)
    isoLangs.forEach((code) => {
      // Inicialmente copia o termo original para todos os idiomas
      newEntry[code] = part;
    });

    // Adiciona ao array principal
    jsonArr.push(newEntry);

    // Retorna o texto no idioma atual (ou o termo se não houver tradução)
    return newEntry[lang] ?? part;
  } else {
    // 🔹 Já existe → retorna a tradução existente (ou o próprio termo se estiver vazio)
    const entry = jsonArr[idx];

    const value = entry[lang];

    // Se for string vazia, null ou undefined → retorna phrase
    if (value === "" || value == null) {
      return String(phrase);
    }

    return value;
  }
}
