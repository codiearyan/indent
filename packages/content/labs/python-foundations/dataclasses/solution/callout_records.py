# Callout records. Run this file with: python3 callout_records.py
#
# Task 1: A callout record
# Task 2: A search and its teams
# Task 3: A grid reference that stays put

from dataclasses import dataclass, field

# The year's records as they are kept now: a dictionary for each callout, typed by hand.
callouts = [
    {"date": "14/03/2026", "hill": "Scarth Fell", "hours": 4},
    {"date": "02/04/2026", "hill": "Cairn Dubh", "hours": 7},
]
print(callouts[0])

# Task 1: A callout record
# Write a dataclass called Callout with three fields, in this order: date and hill, both text,
# and hours, a whole number.
@dataclass
class Callout:
    date: str
    hill: str
    hours: int

# Task 2: A search and its teams
# Write a dataclass called Search with three fields, in this order: area, text; teams, a list of
# call signs, a new empty list for each search made without one; and hours, a whole number, 0
# for a search made without it.
@dataclass
class Search:
    area: str
    teams: list = field(default_factory=list)
    hours: int = 0

# Task 3: A grid reference that stays put
# Write a dataclass called GridRef with two fields, easting and northing, both whole numbers. A
# GridRef cannot be changed once it is made. Give it a method moved(east, north) that gives back
# a new GridRef that many metres east and north of this one.
@dataclass(frozen=True)
class GridRef:
    easting: int
    northing: int

    def moved(self, east, north):
        return GridRef(self.easting + east, self.northing + north)


# Try your classes in the lines below. They run when you run this file, and Check does not run
# them: it makes records of its own.
if __name__ == "__main__":
    base = {"easting": 2817, "northing": 7234}
    print("The base is at", base["easting"], base["northing"])
    first = Callout("14/03/2026", "Scarth Fell", 4)
    print(first, first == Callout("14/03/2026", "Scarth Fell", 4))
    search = Search("Lowther Crag")
    search.teams.append("Alpha")
    print(search, Search("Garve Edge"))
    home = GridRef(2817, 7234)
    print(home, home.moved(150, -40))
