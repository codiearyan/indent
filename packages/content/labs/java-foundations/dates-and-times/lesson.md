# Dates and times with java.time

## What you will be able to do

The timetable kept its times as plain numbers. That works until a pass runs from 31 January, a crossing lands after midnight, or the computer printing it speaks another language. Java has a package for this, `java.time`. By the end of this issue you will be able to:

- make a `LocalDate`, a `LocalTime` and a `LocalDateTime` from parts and from text
- add days and months, and say what the end of a month does
- measure the gap between two with `Period`, `Duration` and `ChronoUnit`
- write a date out in a language you choose, and know when a time zone matters

## The request from Ossian

> **Ossian:** We are selling season passes now: one month, three, six. People keep asking how many days theirs has left, and I keep counting on my fingers. A pass bought on 31 January ran out on the 2nd of March by my count, and the man was not pleased. And the printed timetable needs the day at the top, written out, and no boats on a Sunday.

All three tasks are in `SeasonPass.java`.

## Three types, made from parts or from text

A `LocalDate` is a day: year, month and day of the month. A `LocalTime` is a time of day. A `LocalDateTime` is both. Each is made from its parts, biggest first, or read from text written the standard way, year-month-day and hour:minute:

```java
LocalDate market = LocalDate.of(2031, 8, 16);
LocalTime opens = LocalTime.parse("09:30");
LocalDateTime start = LocalDateTime.of(market, opens);    // 2031-08-16T09:30
```

Like a `String` or a `BigDecimal`, they never change. A date that does not exist is refused, and a text that is not written the standard way is refused, with a message that quotes it:

```
java.time.DateTimeException: Invalid date 'APRIL 31'
java.time.format.DateTimeParseException: Text '2031-02-30' could not be parsed: Invalid date 'FEBRUARY 30'
java.time.format.DateTimeParseException: Text '9:30' could not be parsed at index 0
```

The last one wants `09:30`: two digits for the hour.

## Adding to a date

`plusDays`, `plusMonths` and their kind add; `minus...` take away. Months are not all one length, so adding a month keeps the day of the month when it can, and otherwise lands on the last day of the shorter month: 31 January plus one month is 28 February, or the 29th in a leap year. Adding 30 days to 31 January gives 2 March, which is a different question.

`LocalDate.now()` reads the computer's clock. Read it once, in `main`, and hand the date to the methods that need it: then each can be tried on any day you like.

## The gap between two

Three tools measure a gap, each in its own units:

```java
LocalDate from = LocalDate.of(2031, 1, 20);
LocalDate to = LocalDate.of(2031, 3, 4);
Period.between(from, to)              // P1M12D: 1 month and 12 days
Period.between(from, to).getDays()    // 12, the days part only
ChronoUnit.DAYS.between(from, to)     // 43, the whole gap in days
```

A `Period` holds years, months and days apart, the way people say a gap. `ChronoUnit.DAYS.between` counts the whole gap in one unit, and gives back a `long`, below 0 when the second comes first.

A `Duration` is a gap in hours, minutes and seconds: `Duration.between(start, end).toMinutes()` for two `LocalDateTime`s, even across midnight. Between two `LocalDate`s it has nothing to measure, since a date has no time of day, and throws `java.time.temporal.UnsupportedTemporalTypeException: Unsupported unit: Seconds`.

## The day of the week

`market.getDayOfWeek()` gives back a `DayOfWeek`, an enum from `MONDAY` to `SUNDAY`, so `day.getDayOfWeek() == DayOfWeek.SATURDAY` reads as it means. Its `getValue()` counts from Monday as 1 to Sunday as 7: never 0, and not from Sunday.

## Writing a date out

A date prints as `2031-08-16`. For anything else, a `DateTimeFormatter` follows a pattern of letters:

| Letter | Means                      | Letter | Means                            |
| ------ | -------------------------- | ------ | -------------------------------- |
| `d`    | day of the month           | `M`    | month: `M` 8, `MM` 08, `MMM` Aug, `MMMM` August |
| `E`    | day: `EEE` Sat, `EEEE` Saturday | `u` or `y` | year                      |
| `H`    | hour, 0 to 23              | `m`    | minute                           |

Small `m` is minutes, so a date written with `mm` throws `Unsupported field: MinuteOfHour`. Capital `Y` is the year a week belongs to, which differs from the calendar's year in the last days of December: 31 December 2029 comes out as 2030.

Names of days and months come from a language. `DateTimeFormatter.ofPattern("EEE d MMM uuuu")` follows the computer's: on one set to German it writes them in German. Give it the language, `DateTimeFormatter.ofPattern("EEE d MMM uuuu", Locale.UK)`, and it writes `Sat 16 Aug 2031` everywhere. Then `market.format(formatter)` gives back the text.

## Time zones, in one rule

These types have no time zone: 09:30 is 09:30 wherever the computer is, which is right for a timetable on one quay. When places or the clocks going forward matter, `ZonedDateTime` holds a date and time with its zone, as in `Europe/London`. Older code uses `java.util.Date` and `Calendar`, which `java.time` replaces.

## Your work in this issue

Open `SeasonPass.java`. `main` is yours: take the `//` off a group of lines once what it uses is written, and run the file with `java SeasonPass.java`. Write each class under its own `// Task` comment. Check hands every method dates years away from today, and runs with German formats and a far time zone.
