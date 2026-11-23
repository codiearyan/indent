# Tuples and unpacking. Run this file with: python3 grid_refs.py
#
# Task 1: High and low on the route
# Task 2: Move a position
# Task 3: Send each team to its square
# Task 4: When we last heard them

# Tonight's route and radio log, to try your functions on. A grid reference is a tuple of two
# numbers: how far east, then how far north. Check calls your functions with values of its own.
route_heights = [240, 515, 760, 610, 330]
casualty = (312, 845)
teams = ["Team A", "Team B", "Team C"]
squares = ["C4", "D1", "B5"]
radio_log = [("21:05", "Bravo two"), ("21:20", "Alpha one"), ("21:40", "Bravo two")]

print("Casualty at", casualty)

# Task 1: High and low on the route
# Write a function called height_range that takes a list of heights, and gives back two values,
# the lowest and then the highest, as a tuple. Print what it gives back for route_heights.
def height_range(heights):
    return min(heights), max(heights)


print(height_range(route_heights))

# Task 2: Move a position
# Write a function called moved that takes a grid reference and how far to go east and north,
# and gives back the new grid reference, a new tuple. Print what it gives back for casualty,
# 4 east and -2 north.
def moved(point, east, north):
    easting, northing = point
    return (easting + east, northing + north)


print(moved(casualty, 4, -2))

# Task 3: Send each team to its square
# Write a function called team_lines that takes a list of teams and a list of squares, the same
# length, and gives back a list of lines that pair them in order, like Team A to C4
# Print each line it gives back for teams and squares.
def team_lines(teams, squares):
    lines = []
    for team, square in zip(teams, squares):
        lines.append(f"{team} to {square}")
    return lines


for line in team_lines(teams, squares):
    print(line)

# Task 4: When we last heard them
# Write a function called last_heard that takes a radio log, a list of (time, call sign) tuples
# in the order they came, and a call sign. It gives back the time of the last call from that
# call sign, or None when it never called. Print what it gives back for radio_log and "Bravo two".
def last_heard(log, call_sign):
    last = None
    for time, heard in log:
        if heard == call_sign:
            last = time
    return last


print(last_heard(radio_log, "Bravo two"))
