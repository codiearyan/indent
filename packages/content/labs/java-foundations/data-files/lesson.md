# A data file read into records

## What you will be able to do

This issue ties the part together. A file of lines, each holding a date, a name, a count and an amount, becomes a list of records; the lines that cannot be read are refused by number while the rest are kept; and the money is added up and written back as a report. By the end of this issue you will be able to:

- turn one line of comma-separated text into a record, each part read with the right tool
- refuse a bad line with an exception that names its line number
- read a whole file, skip its header and go on past a bad line
- add up amounts as `BigDecimal` and write a report the same way on every computer

## The request from Ossian

> **Ossian:** The new till writes the day's sailings to a file at closing, one line each: the date, the boat, the passengers, the takings. The harbour office wants a report from it every evening. Mind, the till is not perfect. Last Tuesday one line said thirty instead of 30, and the old program fell over and sent nothing at all.

All three tasks are in `DayReport.java`, and the file is `sailings.csv` beside it.

## A line becomes a record

A file like this, one record per line with commas between the parts and a header first, is called comma-separated:

```
date,jam,jars,takings
2031-08-16,plum,12,28.20
```

`split(",")` cuts a line into its parts: `"2031-08-16,plum,12,28.20"` gives four. Each part is text, and each is read with the tool for its type, as the issues before showed: `LocalDate.parse` for the date, `Integer.parseInt` for a whole number, `new BigDecimal` for money. A part may carry spaces, `" plum "`, so `strip()` it first. Then a record holds the parts together:

```java
record Sale(LocalDate date, String jam, int jars, BigDecimal takings) { }
```

Count the parts before reading them. `"2031-08-16,plum,12".split(",")` has three, and asking for the fourth throws an `ArrayIndexOutOfBoundsException`. An empty part stays: `"2031-08-16,plum,,28.20"` gives four, the third empty. Empty parts at the very end are dropped: `"a,b,,".split(",")` gives two, so a line with one comma too many at its end still seems to have four parts. Hand `split` a `-1` as well and it keeps every part, the empty ones at the end too: `"a,b,,".split(",", -1)` gives four.

## Refusing a bad line

Every tool you read a part with throws when the text is wrong, and each says what it could not read, never where: `java.lang.NumberFormatException: For input string: "twelve"`. Whoever opens the file needs the line's number. So the method that reads one line catches what the tools throw and throws one exception of its own whose message names the number, with the first exception as its cause, as part 5 showed:

```java
} catch (RuntimeException e) {
    throw new IllegalArgumentException("Sale on line " + number + " cannot be read", e);
}
```

`NumberFormatException`, `DateTimeParseException` and `ArithmeticException` all extend `RuntimeException`, so one catch takes them all. A line with the wrong number of parts is refused the same way, by number.

## Reading the file

`Files.readAllLines(file, StandardCharsets.UTF_8)` gives every line, its line end gone, whatever system wrote it. The first is the header: it names the parts and is not a record, so the loop starts after it.

The file numbers its lines from 1, and the header is line 1. The list numbers its items from 0. So the item at position `i` is line `i + 1` of the file, and that is the number a person can find in an editor.

## Going on past a bad line

Where the `try` goes decides what a bad line does. Around the whole loop, the first bad line ends the loop, and every good line after it is lost: last Tuesday's report. Inside the loop, around one line, a bad line is caught, noted, and the loop goes on:

```java
for (int i = 1; i < lines.size(); i++) {
    try {
        sales.add(read(lines.get(i), i + 1));
    } catch (IllegalArgumentException e) {
        refused.add(e.getMessage());
    }
}
```

Never leave the `catch` empty: a line dropped in silence makes a total that looks right and is not, and nobody knows to look.

## Adding up and writing back

The takings add up as in the money issue: `BigDecimal.ZERO`, then `add`, never through a `double`. The report is built as in the text issue, a line at a time in a `StringBuilder` with `"\n"` after each, every amount set to two decimal places and written with `toPlainString`, so the report reads the same on a computer in any language. Then `Files.writeString(file, report, StandardCharsets.UTF_8)` replaces what the file held.

## Your work in this issue

Open `DayReport.java`, and `sailings.csv` beside it. `Sailing` is given above the tasks: use it as it is. `main` is yours: take the `//` off a group of lines once what it uses is written, and run the file with `java DayReport.java`; it writes `report.txt`. Write each class under its own `// Task` comment. Task 2 uses `Lines.parse` from Task 1, and Check runs it beside its own right `Lines`, so each task passes on its own lines. Check hands every method lines and files of its own, and runs with German formats and the line end of a Windows computer.
