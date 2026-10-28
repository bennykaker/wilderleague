// A stable shuffle keeps the grid still while typing, casting or loading more.
// Change the seed on entry; give each role its own mix. Never mutate the catalogue.
export function shuffleSuggestions<T>(items:readonly T[],seed:number):T[]{
 const result=[...items];let state=seed>>>0
 function random(){state+=0x6D2B79F5;let n=state;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return ((n^(n>>>14))>>>0)/4294967296}
 for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}
 return result
}
