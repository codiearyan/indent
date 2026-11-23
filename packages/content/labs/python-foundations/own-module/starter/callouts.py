# Callouts: functions that read the lines of the callout log, for report.py and for Ailsa's
# radio desk. To try them by itself, run this file with: python3 callouts.py
#
# Task 1: Move parts_of, hill_of and hours_of here from report.py.
# Task 2: Put Ailsa's try-out lines under a main guard.
# Task 3: Write hill_hours.


def crew_of(line):
    crew = []
    for name in line.split(";")[3].split(","):
        crew.append(name.strip())
    return crew


# Ailsa's try-out lines.
print("Trying crew_of on one line:")
print(crew_of("02/03/2026; Scarth Fell; 3; Rhona, Dougie"))
