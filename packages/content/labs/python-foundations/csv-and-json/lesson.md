# Data files: CSV and JSON

## What you will be able to do

The log lives in files now, one entry a line. Dougie's kit list has more to it: every row has an item, a count and a place, and the spreadsheet he keeps it in saves it as a CSV file. The store and the teams' positions need saving too, with their numbers and lists kept as they are. In this issue you read and write the two kinds of data file that programs swap most. By the end of it you will be able to:

- read the rows of a CSV file, as lists or as dictionaries by their headings
- write rows to a CSV file, quotes and all
- save a dictionary as JSON and load it back
- say what comes back as text, and what JSON turns a tuple and a key into

## The request from Dougie

> **Dougie:** The kit list is a spreadsheet and I save it as kit.csv. I want the names off it, what is running low, and the store written back in the same shape. Ailsa wants the store and the teams' last positions saved somewhere the laptop can load again tomorrow.

All five tasks are in `kit_files.py`. The kit list is `kit.csv`, and the positions are in `positions.json`.

## Reading rows

A CSV file is text: one row a line, with a comma between the values, and usually a heading row first. A value with a comma of its own is put in quotes, `"Hall, upstairs"`, so splitting each line at its commas goes wrong. The `csv` module knows the rules. Bring it in with `import csv`, which makes the module's tools ready to use, then:

```python
import csv

with open("rooms.csv", encoding="utf-8", newline="") as rooms:
    rows = list(csv.reader(rooms))
print(rows)
```

For a file with `room,seats` and two rooms under it this prints `[['room', 'seats'], ['Main hall', '120'], ['Hall, upstairs', '30']]`. Each row is a list, the heading row is the first, and every value is text, the numbers too. `rows[1:]` is the rows without the heading.

`newline=""` is what Python's documentation asks for whenever a file is opened for `csv`: the module handles the line ends itself. Without it, a value with a line end inside its quotes is read wrongly, and on Windows every row written is followed by an empty one.

## Rows as dictionaries

`csv.DictReader` uses the heading row as keys and gives each row after it as a dictionary:

```python
with open("rooms.csv", encoding="utf-8", newline="") as rooms:
    for room in csv.DictReader(rooms):
        print(room["room"], int(room["seats"]) > 50)
```

This prints `Main hall True`, then `Hall, upstairs False`. Each value is found by its heading, so it does not matter which column it is in. The count is still text until `int()` turns it into a number: `room["seats"] > 50` stops with `TypeError: '>' not supported between instances of 'str' and 'int'`. And comparing two texts goes letter by letter, so `"120" < "50"` is `True`.

## Writing rows

`csv.writer` writes lists as rows, puts quotes where a value needs them, and ends each row:

```python
with open("rooms.csv", "w", encoding="utf-8", newline="") as rooms:
    writer = csv.writer(rooms)
    writer.writerow(["room", "seats"])
    writer.writerow(["Hall, upstairs", 30])
```

The file now holds `room,seats` and `"Hall, upstairs",30`. A number is written as its digits. `writerow` takes one row as a list; given a text instead, it writes each letter as a value of its own.

## JSON

JSON is a way of writing lists, dictionaries, texts and numbers as text that almost any program can read. The `json` module writes a value into an open file with `json.dump`, and reads one back with `json.load`:

```python
import json

hall = {"rooms": ["Main hall", "Annexe"], "door": (3, 1), 4: "kitchen"}
with open("hall.json", "w", encoding="utf-8") as saved:
    json.dump(hall, saved)
with open("hall.json", encoding="utf-8") as saved:
    print(json.load(saved))
```

This prints `{'rooms': ['Main hall', 'Annexe'], 'door': [3, 1], '4': 'kitchen'}`. Look at what changed: JSON has no tuples, so the tuple came back as a list, and every key of a JSON object is text, so the key `4` came back as `'4'`. Turn them back yourself where it matters.

`json.dumps`, with an s, gives back the JSON as a text and writes nothing anywhere. Text made with `str()` of a dictionary is not JSON either, because JSON wants double quotes. A file that holds no JSON, an empty one for instance, stops `json.load` with a `JSONDecodeError`.

## Your work in this issue

Open `kit_files.py`, `kit.csv` and `positions.json`. Check makes files of its own in a copy of your workspace and gives each function its path. Write the import lines where the tasks say. Run `python3 kit_files.py` after each task, and open `store.csv` and `store.json` in the editor to see what Tasks 3 and 4 wrote.
