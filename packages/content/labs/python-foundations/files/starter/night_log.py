# Reading and writing files. Run this file with: python3 night_log.py
#
# Task 1: Read the whole log
# Task 2: The log, entry by entry
# Task 3: Start a new log
# Task 4: Add an entry
# Task 5: The log for one day

# radio_log.txt is tonight's log, one entry a line, and the logs folder holds a file for each
# night, such as logs/2026-12-01.txt. Check calls your functions with files of its own.
print("Tonight's log is in radio_log.txt")

# Task 1: Read the whole log
# Write a function called log_text that takes the path of a log file, as text, and gives back
# everything in the file as one text. Open it with with and encoding="utf-8". Print what it
# gives back for "radio_log.txt".

# Task 2: The log, entry by entry
# Write a function called log_entries that takes the path of a log file, as text, and gives back
# a list of its entries: each line without the spaces and line end at its ends, blank lines
# left out. Print what it gives back for "radio_log.txt".

# Task 3: Start a new log
# Write a function called start_log that takes the path of a file, as text, and a title, and
# makes that file hold only the title on one line, with its line end. Anything the file held
# before is gone. Call it for "tonight.txt" and "Callout log, 3 December".

# Task 4: Add an entry
# Write a function called add_entry that takes the path of a log file, as text, and one entry,
# and adds the entry as a new line at the end of the file, with its line end. What the file
# held stays. Call it for "tonight.txt" and "21:02 BRAVO TWO: leaving the base", then look at
# tonight.txt.

# Task 5: The log for one day
# Write the line that imports Path from pathlib. Then write a function called day_entries that
# takes a folder, as a Path, and a day such as "2026-12-01". That day's log is the file named
# the day and .txt, in that folder. It gives back the entries of that file, as log_entries
# gives them, or an empty list when the folder has no file for that day. Print what it gives
# back for Path("logs") and "2026-12-02", and for Path("logs") and "2026-12-25".
