# The callout report. Run this file with: python3 report.py
#
# Task 1: Move the reading functions
# Task 2: Nothing runs on import
# Task 3: Hours on one hill
#
# Tasks 1 and 3 have work in callouts.py too, and Task 2 is all in callouts.py. Check imports
# callouts.py the way an import line does, and calls its functions with lines of its own.


month = [
    "02/03/2026; Scarth Fell; 3; Rhona, Dougie",
    "09/03/2026; Lowther Crag; 5; Ailsa, Dougie, Iain",
    "14/03/2026; Scarth Fell; 2; Rhona, Shona",
    "21/03/2026; Cairn Dubh; 6; Dougie, Iain, Kirsty",
]

# Task 1: Move the reading functions
# Move parts_of, hill_of and hours_of from above into callouts.py, so that this file no longer
# has them. Then import hill_of and hours_of here from callouts, with from.
from callouts import hill_of, hours_of

for line in month:
    print(hill_of(line), "-", hours_of(line), "hours")

# Task 3: Hours on one hill
# Once hill_hours is written in callouts.py, import it here too, and print what it gives back
# for month and "Scarth Fell".
from callouts import hill_hours

print("Scarth Fell:", hill_hours(month, "Scarth Fell"), "hours")
