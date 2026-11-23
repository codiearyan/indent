# Catch an error. Run this file with: python3 log_totals.py
#
# Task 1: A number, or a fallback
# Task 2: One callout from the log
# Task 3: Hours, and what could not be read
# Task 4: A night's log, if there is one

# Ailsa's callout log, typed in by many hands: a hill, a semicolon and the hours spent there.
# Some of the hours are not whole numbers. radio_log.txt is tonight's radio log. Check calls
# your functions with values and files of its own.
entries = ["Scarth Fell; 3", "Garve Edge; two", "Lowther Crag; 4", "Cairn Dubh; 2.5"]

print("Entries in the log:", len(entries))

# Task 1: A number, or a fallback
# Write a function called whole_number that takes a text and a fallback. It gives back the
# whole number in the text, or the fallback when the text is not a whole number. Any other
# error, such as being given None instead of a text, must reach the caller. Print what it
# gives back for "3" and for "two", with 0 as the fallback.
def whole_number(text, fallback):
    try:
        return int(text)
    except ValueError:
        return fallback


print(whole_number("3", 0))
print(whole_number("two", 0))

# Task 2: One callout from the log
# Write a function called callout_of that takes one entry and gives back a tuple of its hill,
# without spaces at its ends, and its hours as a whole number, or None for hours that are not
# a whole number. An entry without exactly one semicolon must stop with the error Python
# gives when it takes the entry apart. Print what it gives back for "Scarth Fell; 3" and for
# "Garve Edge; two".
def callout_of(entry):
    hill, hours = entry.split(";")
    try:
        number = int(hours)
    except ValueError:
        number = None
    return (hill.strip(), number)


print(callout_of("Scarth Fell; 3"))
print(callout_of("Garve Edge; two"))

# Task 3: Hours, and what could not be read
# Write a function called log_hours that takes a list of entries and gives back a tuple of
# two things: the hours that can be read, added up, and a list with a text for each entry
# whose hours cannot be read: the entry, a colon, a space and the message of the error. An
# entry without exactly one semicolon must stop with its error, as in Task 2. Print what it
# gives back for entries.
def log_hours(entries):
    total = 0
    problems = []
    for entry in entries:
        hill, hours = entry.split(";")
        try:
            number = int(hours)
        except ValueError as error:
            problems.append(f"{entry}: {error}")
        else:
            total = total + number
    return (total, problems)


print(log_hours(entries))

# Task 4: A night's log, if there is one
# Write a function called night_text that takes the path of a log file, as text, and gives
# back everything in the file, or empty text when there is no file at that path. Any other
# error must reach the caller. Print what it gives back for "radio_log.txt" and for
# "tonight.txt".
def night_text(path):
    try:
        with open(path, encoding="utf-8") as log:
            return log.read()
    except FileNotFoundError:
        return ""


print(night_text("radio_log.txt"))
print(night_text("tonight.txt"))
