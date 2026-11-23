# Find the bug. Run this file with: python3 busiest_hill.py
#
# Task 1: The smallest log that goes wrong
# Task 2: Mend busiest_hill
# Task 3: Say what must be true

# The month's callouts: the hill of each callout, in the order they came in. busiest_hill
# should give back the hill with the most callouts, and on a tie the one that came first in
# the log. For this month it gives back the wrong hill, and no error.
month = [
    "Garve Edge",
    "Scarth Fell",
    "Lowther Crag",
    "Scarth Fell",
    "Lowther Crag",
    "Scarth Fell",
    "Cairn Dubh",
    "Lowther Crag",
    "Scarth Fell",
    "Cairn Dubh",
]

print("Callouts this month:", len(month))

# Task 1: The smallest log that goes wrong
# Write a function called smallest_failing that takes nothing and gives back a list of hills,
# a log, for which busiest_hill gives back the wrong hill, and that has as few callouts as a
# log can have and still go wrong. Find it by cutting month down, one callout at a time,
# keeping each cut while the answer is still wrong. Check tries your log on busiest_hill as
# it came with the file.
def smallest_failing():
    return ["Garve Edge", "Scarth Fell", "Lowther Crag", "Scarth Fell", "Lowther Crag"]


print("Smallest log that goes wrong:", smallest_failing())

# Task 2: Mend busiest_hill
# Find the mistake in busiest_hill and mend it, so it gives back the hill with the most
# callouts, and on a tie the one that came first in the log. Print what it sees as it goes,
# with names and values, to find where it goes wrong.
def busiest_hill(hills):
    assert len(hills) > 0, "busiest_hill was given a log with no callouts"
    counts = {}
    for hill in hills:
        if hill in counts:
            counts[hill] = counts[hill] + 1
        else:
            counts[hill] = 1
    best = hills[0]
    most = counts[best]
    for hill in counts:
        if counts[hill] > most:
            best = hill
            most = counts[hill]
    return best


print("Busiest hill:", busiest_hill(month))

# Task 3: Say what must be true
# busiest_hill is never meant to be asked about a log with no callouts. Add an assert as the
# first line of busiest_hill, above, that states the list it is given is not empty, so that
# an empty list stops it right there with AssertionError.
