# Callouts: functions that read the lines of the callout log, for report.py and for Ailsa's
# radio desk. To try them by itself, run this file with: python3 callouts.py
#
# Task 1: Move parts_of, hill_of and hours_of here from report.py.
# Task 2: Put Ailsa's try-out lines under a main guard.
# Task 3: Write hill_hours.


def parts_of(line):
    parts = []
    for part in line.split(";"):
        parts.append(part.strip())
    return parts


def hill_of(line):
    return parts_of(line)[1]


def hours_of(line):
    return int(parts_of(line)[2])


def crew_of(line):
    crew = []
    for name in line.split(";")[3].split(","):
        crew.append(name.strip())
    return crew


def hill_hours(lines, hill):
    total = 0
    for line in lines:
        if hill_of(line) == hill:
            total = total + hours_of(line)
    return total


# Ailsa's try-out lines.
if __name__ == "__main__":
    print("Trying crew_of on one line:")
    print(crew_of("02/03/2026; Scarth Fell; 3; Rhona, Dougie"))
