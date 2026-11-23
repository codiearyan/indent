# A catalogue out of order

## What you will be able to do

Money and dates are right now. The next tickets are about text, and the first is the catalogue page: every arrangement Wrenhaven sells, listed by title, so a director can find the one they want. By the end of this issue you will be able to:

- say what `sort()` compares when you give it nothing to compare with
- sort text the way a person reads it, numbers and accents included
- name the language a comparison uses, so it is the same on every computer
- test a bug that only shows on a computer set to another language

## The ticket

> **Nadia:** WH-52. The director of Sur Sangam Singers looked for Psalm 23 on our catalogue page and gave up. She says it starts with Psalm 121, and that anything with a small letter or an accent at the front is down at the very bottom, after Zephyr round. She is right. It looks like nobody ever read the page.

## What a plain sort compares

`sort()` with no compare function turns every item into text and compares it one UTF-16 code unit at a time. A code unit is a number: `V` is 86, `c` is 99, `É` is 201. So every capital comes before every small letter, and every accented letter after the whole plain alphabet:

```js
['oboe', 'Viola', 'cello', 'Alto', 'Basse', 'Ébène'].sort()
// ['Alto', 'Basse', 'Viola', 'cello', 'oboe', 'Ébène']
```

Numbers inside text are compared digit by digit too, so `'Track 10'` comes before `'Track 2'`, the same surprise you met when sorting numbers in JavaScript foundations. Turning everything to small letters first fixes the capitals and nothing else.

## Compare by the rules of a language

People sort by rules that belong to a language: in English, capitals make no difference to the order, É sorts with E and Ø with O. JavaScript has those rules built in. `Intl.Collator` makes a comparison for one language, and its `compare` method is exactly what `sort` wants:

```js
const english = new Intl.Collator('en')
['oboe', 'Viola', 'cello', 'Alto', 'Basse', 'Ébène'].sort(english.compare)
// ['Alto', 'Basse', 'cello', 'Ébène', 'oboe', 'Viola']
```

The option `numeric: true` compares numbers inside text by their value, so `'Track 2'` comes before `'Track 10'`. `a.localeCompare(b, 'en', { numeric: true })` does the same for one pair, but a collator made once is quicker on a long list.

A table of accents written by hand looks like a shortcut, and it always misses a letter: Ø and Ł have no mark that can be stripped off, and the next choir will bring a letter nobody thought of. The built-in rules know them.

## Say which language

Leave out the language, as in `localeCompare(b)` or `new Intl.Collator()`, and JavaScript uses the language the computer is set to. On most computers that sorts the way you expect, so the bug hides. Languages really do sort differently: in Swedish, Å, Ä and Ö are letters of their own that come after Z.

```js
const names = ['Zola', 'Åkesson', 'Andersson', 'Öberg', 'Olsen']
names.sort(new Intl.Collator('en').compare) // Åkesson, Andersson, Öberg, Olsen, Zola
names.sort(new Intl.Collator('sv').compare) // Andersson, Olsen, Zola, Åkesson, Öberg
```

Neither is wrong. They are different rules, and a page should not change its order because of where the computer that built it was bought. The catalogue is read in English, so the code says `'en'`.

A test cannot change the computer's language while it runs. Check runs your tests on computers set to English, Swedish and German, so a test of the next door case only has to hold titles whose English and Swedish orders differ. Every Node from the official downloads has the rules for both languages.

## Your work in this issue

Run `node src/demo.js` and read the catalogue page. Then:

1. In `src/catalogue.test.js`, write the ticket's tests and run `npx vitest run src/catalogue.test.js`. They should fail.
2. Fix `catalogueOrder()` in `src/catalogue.js`. It returns a new list and leaves the one it was handed alone.
3. Write the test for the case next door: a computer set to another language.
