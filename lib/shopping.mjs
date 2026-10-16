export const groceryUnits = ['stk','g','kg','ml','dl','l','pk','ss','ts'];

export const normalizedGroceryName = name => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('nb-NO');

// Parse only unambiguous amounts; keep unfamiliar ingredient text intact.
export function parseIngredients(text) {
  return text.split(/\r?\n/).map(line => line.trim().replace(/^[-•*]\s+/, '')).filter(Boolean).map(line => {
    const match = line.match(/^(\d+(?:[.,]\d+)?)\s*(stk|kg|ml|dl|pk|ss|ts|g|l)?\s+(.+)$/i);
    if (!match) return {name:line,quantity:1,unit:'stk'};
    const quantity = Number(match[1].replace(',', '.'));
    if (!(quantity > 0 && quantity <= 99999)) return {name:line,quantity:1,unit:'stk'};
    return {name:match[3].trim(),quantity,unit:match[2]?.toLowerCase() || 'stk'};
  });
}
