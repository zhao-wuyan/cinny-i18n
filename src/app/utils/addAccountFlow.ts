export const isAddAccountFlow = (href?: string): boolean => {
  try {
    const safeHref = href ?? (typeof window !== 'undefined' ? window.location.href : undefined);
    if (!safeHref) return false;

    const url = new URL(safeHref);
    if (url.searchParams.get('addAccount') === '1') return true;

    const fallbackHash = typeof window !== 'undefined' ? window.location.hash : '';
    const hash = (url.hash || fallbackHash).replace(/^#/, '');
    const queryIndex = hash.indexOf('?');
    if (queryIndex === -1) return false;
    const hashSearch = hash.slice(queryIndex + 1);
    return new URLSearchParams(hashSearch).get('addAccount') === '1';
  } catch {
    return false;
  }
};
