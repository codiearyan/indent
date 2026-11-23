# Data files. Run this file with: python3 kit_files.py
#
# Task 1: Every kind of kit
# Task 2: What is running low
# Task 3: Save the store as a CSV file
# Task 4: Save the store as JSON
# Task 5: Load the positions

# kit.csv is the kit list, with a heading row, and positions.json holds where each team was
# last heard. Check calls your functions with files of its own.
store = {"rope": 9, "radio": 6, "splint, small": 3}

print("The kit list is in kit.csv")

# Task 1: Every kind of kit
# Write the line that imports csv. Then write a function called kit_names that takes the path
# of a CSV file of kit, as text, and gives back a list of the first value of every row, the
# heading row left out. Open it with with, encoding="utf-8" and newline="". Print what it
# gives back for "kit.csv".

# Task 2: What is running low
# Write a function called low_kit that takes the path of a CSV file of kit, as text, and a
# smallest number. Read it with csv.DictReader, and give back a list of the item of every row
# whose count is less than that number, in the order of the file. Print what it gives back
# for "kit.csv" and 5.

# Task 3: Save the store as a CSV file
# Write a function called save_kit that takes the path of a file, as text, and a store, a
# dictionary of each kind of kit and how many there are. It writes the store to that file as
# CSV: a heading row of item and count, then one row for each kind, in the store's order.
# Anything the file held before is gone. Call it for "store.csv" and store.

# Task 4: Save the store as JSON
# Write the line that imports json. Then write a function called save_store that takes the
# path of a file, as text, and a store, and writes the store to that file as JSON. Anything
# the file held before is gone. Call it for "store.json" and store.

# Task 5: Load the positions
# Write a function called load_positions that takes the path of a JSON file, as text, that
# holds each call sign with its position as two numbers, and gives back a dictionary of each
# call sign and its position as a tuple (east, north). Print what it gives back for
# "positions.json".
