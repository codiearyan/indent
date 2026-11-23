# Formatting for people. Run this file with: python3 year_report.py
#
# Task 1: Hours to one decimal place
# Task 2: An incident number
# Task 3: One row of the table
# Task 4: The whole table

# This year's callouts by hill, as (hill, callouts, hours), to try your functions on. Check
# calls your functions with values of its own.
year = 2026
by_hill = [
    ("Carn Dubh", 3, 5.5),
    ("Garve Edge", 12, 31.4),
    ("Ben Vane", 1, 0.66),
]

print("Hills this year:", len(by_hill))

# Task 1: Hours to one decimal place
# Write a function called hours_text that takes a number of hours and gives back a text of that
# number with exactly one decimal place, then a space and the letter h. Print what it gives
# back for 2.67 and for 4.

# Task 2: An incident number
# Write a function called incident_id that takes a year and the number of a callout in that
# year, and gives back the incident number: the year, a dash and the callout's number padded
# with zeros to three digits. Print what it gives back for year and 7.

# Task 3: One row of the table
# Write a function called report_row that takes a hill, a number of callouts and a number of
# hours, and gives back one row of the table: the hill on the left of a column 14 wide, the
# callouts on the right of a column 6 wide, and the hours with one decimal place on the right
# of a column 8 wide. Print what it gives back for each hill in by_hill.

# Task 4: The whole table
# Write a function called report that takes a list of (hill, callouts, hours) and gives back a
# list of the lines of the table: a heading line, one row for each hill, and a total line, all
# in the same columns. Print each line of what it gives back for by_hill.
