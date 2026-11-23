# Callout numbers. Run this file with: python3 callout_numbers.py
#
# Task 1: How many radio legs
# Task 2: Which search square
# Task 3: Average and middle hours
# Task 4: The duty rota
# Task 5: Drivers for the week

# A position is (east, north), in metres from the base: west and south of the base are below
# 0. Check calls your functions with values of its own, and with seeds of its own.
base = (0, 0)
team = (2400, -1800)
hours = [3, 5, 2, 6, 4, 12]
volunteers = ["Rhona", "Dougie", "Ailsa", "Iain", "Shona", "Kirsty"]

print("Team at", team, "from the base")

# Task 1: How many radio legs
# Write the line that imports math. Then write a function called radio_legs that takes two
# positions and how far a hand radio reaches, in metres, and gives back how many people it
# takes, standing in a line, to pass a message from one position to the other: the straight
# distance between them divided by the reach, rounded up. Print what it gives back for base,
# team and 1500.

# Task 2: Which search square
# Write a function called square_of that takes a position and the size of a search square, in
# metres, and gives back the square it is in as a tuple (east, north): each part divided by the
# size, rounded down. Print what it gives back for team and 1000.

# Task 3: Average and middle hours
# Write the line that imports statistics. Then write a function called hours_summary that
# takes a list of hours and gives back a tuple of their mean and their median. Print what it
# gives back for hours.

# Task 4: The duty rota
# Write the line that imports random. Then write a function called duty_rota that takes a list
# of volunteers and a seed, and gives back a new list of the same volunteers in a shuffled
# order, the same order every time for the same seed. Leave the list it is given as it was.
# Print what it gives back for volunteers and 7.

# Task 5: Drivers for the week
# Write a function called drivers that takes a list of volunteers, a number of nights and a
# seed, and gives back a list of one volunteer for each night, each drawn by chance from the
# whole list, so the same volunteer may drive more than once. The same seed gives the same
# drivers every time. Print what it gives back for volunteers, 7 and 3.
