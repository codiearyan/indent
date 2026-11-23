# Reading the arguments

## What you will be able to do

You type commands all day: `git status`, `npm test`, `ls -la`. Each of those is a small program that reads the words after its name and decides what to do. In this repo you write one yourself, in plain Node with no package, so you know what every tool you type does with your words. This first issue builds the part every tool starts with. By the end of it you can:

- split the words a tool was given into a command, its values and its flags
- read flags that take a value, in every form people type them
- say plainly what is wrong when a flag is unknown or its value is missing

## The request from Idris

Ashgrove Press is a letterpress shop with two old presses, run by Hesper. Sefton works the counter and writes the small programs the shop runs on; Idris keeps the books and checks the order files before each print run.

> **Idris:** Every morning I type the same three long commands to count the orders and find the broken lines. I copy them from a note, and when I get one letter wrong it either prints nothing or prints something that looks right and is not. Hesper wants the rest of the shop to do it too, on the days I am out. Nobody else can read those commands.

Open `morning.txt`: those are the three commands. They work, on a Unix shell, if you never mistype them. The shop wants one tool of its own, `orders`, with words people can remember: `orders count`, `orders check`. Over five issues you build it. It starts with reading what was typed.

## What a tool is given

When you type `node trim.js --width 72 notes.txt`, the shell splits the line at spaces and hands the program a list of words. Quotes keep spaces inside one word: `"my notes.txt"` arrives as one word, without its quotes. Node puts that list in `process.argv`, after two entries of its own: the path of `node` and the path of the script. So `process.argv.slice(2)` is what the person typed:

```js
['--width', '72', 'notes.txt']
```

That is all a tool gets: a list of texts, never numbers, never anything already sorted out. The meaning comes from customs every tool follows, and following them is what makes a new tool feel familiar.

## Commands, values and flags

Most tools that do more than one thing take a **command** first, like `git commit`. The other plain words are its **values**, usually names of files. Words that start with `-` are **flags**, and they change how the command works.

A flag is either a **switch**, which is on when it is there (`--quiet`), or it **takes a value** (`--width 72`). Many have a one-letter short form: `-q` means the same as `--quiet`. People put flags wherever they remember them, so `trim --quiet notes.txt` and `trim notes.txt --quiet` must mean the same thing. That rules out reading by position: a tool that expects the file at `args[1]` breaks the first time someone puts a flag first.

How does a tool know that `72` belongs to `--width`, while the word after `--quiet` is a word of its own? It cannot tell from the words. It needs a table of the flags it knows, and `src/flags.js` is that table: a flag with a `value` takes one, a flag without is a switch. Your reader takes the table as an argument, so the check can hand it tables of its own.

One more custom: a lone `-` is not a flag. It is a plain word that, by custom, means "read standard input", and in issue 4 your tool will treat it that way.

## Values, and words that look like flags

People type a value in two forms: `--width 72` and `--width=72`. The second is one word, cut at its first `=`. Only the first: in `--find=size=A5` the value is `size=A5`.

When a flag takes a value, the next word is its value, whatever it looks like. `--find -x` looks for `-x`. Guessing that `-x` must be a flag of its own would make the tool refuse a perfectly good request.

And sometimes a plain word really does start with `-`, like a file called `-notes.txt`. For that, tools agree on `--`: after it, nothing is a flag. `trim -- -notes.txt` trims that file.

## Saying what is wrong

A tool that meets a word it does not understand has two choices. It can guess, and then do something nobody asked for. Or it can stop and say exactly what it did not understand. The second is the only kind people trust, so your reader throws an `Error` with a plain message: `unknown flag --colour`, `--width needs a value`, `--quiet takes no value`.

Be careful how you ask the table. A plain object answers to names nobody put in it, such as `constructor` and `toString`, so `'constructor' in table` is `true`. `Object.hasOwn(table, name)` asks only about the table's own entries.

Node has a ready-made reader, `parseArgs` in `node:util`, and in a real project it is a good choice. Its rules differ from these in small places: it refuses a value that starts with `-` unless it is written with `=`. In this issue you write your own, so the check refuses `node:util`. Knowing what such a reader does is what lets you use one well.

## Your work in this issue

All three tasks are in `src/args.js`: first plain words and switches, then flags that take a value, then the errors. `orders.js` prints what your reader made of the words, so try it as you go:

```sh
node orders.js list --paper linen orders/press-1.txt
node orders.js -n 3 count -- -odd.txt
```

The check never uses the shop's flags. It calls your reader with tables and words of its own, for a tool of its own, and runs `node orders.js` with words you have not seen.
