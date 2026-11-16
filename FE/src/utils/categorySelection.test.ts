import {MAP_CATEGORY,validCategories,selectedCategories} from './categorySelection';
const available=['Sport','Nauka','Igrice',MAP_CATEGORY];
test('two categories are sufficient; one, duplicates and unknown categories are rejected',()=>{
  expect(validCategories(['Igrice',MAP_CATEGORY],available)).toBe(true);
  expect(validCategories(['Igrice'],available)).toBe(false);
  expect(validCategories(['Igrice','Igrice'],available)).toBe(false);
  expect(validCategories(['Igrice','unknown'],available)).toBe(false);
  expect(validCategories(available,available)).toBe(true);
});
test('every confirmed subject is included, the map is last, and unchosen subjects are not filled in',()=>{
  for(let i=0;i<30;i++){
    expect(selectedCategories(available,[['Igrice',MAP_CATEGORY],['Igrice',MAP_CATEGORY]])).toEqual(['Igrice',MAP_CATEGORY]);
    const selected=selectedCategories(available,[['Igrice',MAP_CATEGORY],['Igrice','Sport']]);
    expect(selected).toEqual(['Igrice','Sport',MAP_CATEGORY]);
    expect(selected).not.toContain('Nauka');
  }
});
