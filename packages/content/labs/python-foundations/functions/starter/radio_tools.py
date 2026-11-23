# Functions. Run this file with: python3 radio_tools.py
#
# Task 1: Tidy any call sign
# Task 2: Say the crew in words
# Task 3: Hours for any radio
# Task 4: Build a log line

# Tonight's callout, to try your functions on. Check calls your functions with values of its
# own, so each function must work with what it is given, not with these names.
call_sign = "  bravo two "
crew_out = 4
battery = 100
drain_per_hour = 15
low_mark = 20

print("Call sign as heard:", call_sign)

# Task 1: Tidy any call sign
# Write a function called clean_call_sign that takes one value, a call sign as it was
# heard, and gives back the same call sign without the spaces at its start and end, in
# capitals. Then print what it gives back for call_sign, to see it.

# Task 2: Say the crew in words
# Write a function called crew_text that takes a number of crew and gives back the text
# no crew when the number is 0, 1 crew member when it is 1, and otherwise the number and
# the words crew members, such as 4 crew members. Print what it gives back for crew_out.

# Task 3: Hours for any radio
# Write a function called battery_hours that takes a charge, a drain per hour and a low
# mark, in that order, and gives back how many hours pass until the charge is below the low
# mark. Print what it gives back for tonight's radio.

# Task 4: Build a log line
# Write a function called log_line that takes a call sign as it was heard and a number of
# crew, and gives back a line like this one: BRAVO TWO: 4 crew members out
# Build it with clean_call_sign and crew_text. Print what it gives back for tonight.
