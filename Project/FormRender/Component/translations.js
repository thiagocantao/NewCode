export function translateTerm(term) {
  if (term == null) {
    return '';
  }

  const source = typeof term === 'string' ? term : String(term);

  try {
    const translated = window.translateText?.(source);
    if (translated !== undefined && translated !== null && translated !== '') {
      return translated;
    }
  } catch (error) {
    console.warn('[FormRender] Translation error:', error);
  }

  return source;
}
