# Names cut in half

## What you will be able to do

The catalogue reads in order now. The last ticket is about the names themselves: the code that prints a choir's name on a parcel label, counts its letters and checks whether a new sign-up is a choir the shop already knows. By the end of this issue you will be able to:

- say what `length` and `slice` really count in a JavaScript string
- tell a code unit, a code point and a character a person sees apart
- cut, count and compare text by what a person sees
- test text in more than one alphabet

## The ticket

> **Kwame:** WH-57. Ängsö's parcel of printed copies came back. The label said "Ängsö Kammarko", the last ö had lost its dots, and their name fits the label easily. Their secretary had signed up again, pasting the name from their letterhead, and now they have two accounts, because the system says her "Ängsö Kammarkör" is not ours. It looks exactly like ours. And the form says the name has 18 letters. I count 15.

## What a string counts

A JavaScript string is a list of UTF-16 code units, numbers from 0 to 65535. `length` counts them and `slice` cuts between them. For plain English letters one code unit is one character, so the difference never shows. Outside them it shows in two ways.

An accent can be written two ways. `é` can be one code unit, or a plain `e` followed by a separate accent mark that the screen draws on top. Both look the same, and they are different strings:

```js
'é'.length // 1
'e\u0301'.length // 2: an e and a mark
'e\u0301' === 'é' // false
'Noe\u0308l'.slice(0, 3) // 'Noe': the dots are cut off
```

Text pasted from a document, or typed on some keyboards, often arrives with separate marks. `normalize('NFC')` joins each letter and its mark into one code unit wherever a joined form exists, and `normalize('NFD')` splits them apart. Two names put into the same form can be compared with `===`. Do not go further than that: stripping the accents or ignoring capitals turns Renée into Renee, which is another person.

Some characters take two code units on their own. JavaScript was made when 65536 numbers seemed enough, so every character past them, such as the treble clef 𝄞, is stored as a pair:

```js
'𝄞'.length // 2
'𝄞 Chorus'.slice(0, 1) // '\ud834', half a character, drawn as �
[...'𝄞'].length // 1: spreading a string walks code points
```

Spreading a string with `[...text]` walks code points, so it keeps 𝄞 whole. It still splits a letter from its separate mark, a flag (two code points) and an emoji with a skin tone.

## What a person sees

What a reader calls one character, Unicode calls a grapheme. `Intl.Segmenter` splits text into them:

```js
const graphemes = new Intl.Segmenter('en', { granularity: 'grapheme' })
Array.from(graphemes.segment('Noe\u0308l 𝄞'), (part) => part.segment)
// ['N', 'o', 'ë', 'l', ' ', '𝄞']
```

Count that list and you have the number a person counts. Slice it and join it, and no character is ever cut in half. The rules for which code points belong together come with Node itself; the names in this issue use accents, characters past 65535, flags and skin tones, which every version of Node the app runs on splits the same way.

Two quick fixes are worth knowing so you can spot them. Cutting one character short leaves room for a broken half and also cuts names that fitted. Joining accents first and then cutting code units fixes this ticket and nothing else.

## The case next door

The ticket is about accents. Next door are names in other alphabets with characters that have no accent and still take two code units, such as 𠮷, used in some Japanese family names. The `'next door'` block is for that test.

## Your work in this issue

Run `node src/demo.js` and read the labels. Then:

1. In `src/names.test.js`, write the ticket's tests and run `npx vitest run src/names.test.js`. They should fail.
2. Fix `fitName()`, `nameLength()` and `sameName()` in `src/names.js`.
3. Write the test for the case next door.
