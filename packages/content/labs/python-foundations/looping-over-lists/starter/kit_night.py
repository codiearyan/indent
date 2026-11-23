# Looping over a list. Run this file with: python3 kit_night.py
#
# Task 1: The coldest night on the tops
# Task 2: What the vehicle carries
# Task 3: Heaviest bag first
# Task 4: A numbered kit list
# Task 5: Ropes long enough

# Kit night at the base, to try your functions on. Check calls your functions with lists of its
# own, so each function must work with the list it is given.
summit_readings = [3, -2, 1, -5, 0, 2]
bag_weights = [14, 9, 18, 11]
kit = ["rope", "stretcher", "first aid bag", "radio"]
rope_lengths = [50, 30, 60, 45, 70]

print("Summit readings:", summit_readings)
print("Bag weights:", bag_weights)

# Task 1: The coldest night on the tops
# Write a function called coldest that takes a list of temperature readings, with at least one
# reading in it, and gives back the lowest. Find it with a for loop, by hand, not with min.
# Print what it gives back for summit_readings.

# Task 2: What the vehicle carries
# Write a function called load_line that takes a list of bag weights, two or more, and gives
# back a line like this one, with the number of bags, the total, the lightest and the heaviest:
# 4 bags, 52 kg in all, from 9 to 18 kg
# Print what it gives back for bag_weights.

# Task 3: Heaviest bag first
# Write a function called heaviest_first that takes a list of bag weights and gives back a new
# list of the same weights, from the heaviest to the lightest. It leaves the list it is given
# as it was. Print what it gives back for bag_weights, then print bag_weights.

# Task 4: A numbered kit list
# Write a function called kit_lines that takes a list of kit and gives back a new list of
# lines, each with its number from 1, a full stop, a space and the item, like 1. rope
# It leaves the list it is given as it was. Print each line it gives back for kit.

# Task 5: Ropes long enough
# Write a function called long_enough that takes a list of rope lengths and the length a lower
# needs, and gives back a new list of the lengths that are at least that long, in the order they
# came in. Write it as a list comprehension. Print what it gives back for rope_lengths and 50.
