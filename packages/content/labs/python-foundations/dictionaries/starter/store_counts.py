# Dictionaries. Run this file with: python3 store_counts.py
#
# Task 1: How many are in the store
# Task 2: Sign kit out
# Task 3: Count what came back
# Task 4: Running low
# Task 5: Hours on one hill

# The store tonight, to try your functions on: each kind of kit and how many there are. Check
# calls your functions with values of its own.
store = {"rope": 9, "stretcher": 2, "radio": 6, "head torch": 14}
returned = ["rope", "radio", "rope", "splint", "rope"]
callouts = [
    {"hill": "Carn Dubh", "hours": 3, "crew": 8},
    {"hill": "Garve Edge", "hours": 5, "crew": 6},
    {"hill": "Carn Dubh", "hours": 2, "crew": 4},
]

print("Ropes in the store:", store["rope"])

# Task 1: How many are in the store
# Write a function called in_store that takes the store and the name of a kind of kit, and
# gives back how many there are, or 0 when that kind is not in the store at all. It leaves the
# store as it was. Print what it gives back for store and "radio", and for store and "flare".

# Task 2: Sign kit out
# Write a function called take_out that takes the store, a kind of kit that is in it and how
# many are signed out. It lowers the count in that same store, and when none are left the kind
# comes out of the store. It gives nothing back. Call it for store, "stretcher" and 2, then
# print store.

# Task 3: Count what came back
# Write a function called count_items that takes a list of kit as it came back off the hill and
# gives back a new dictionary of each kind and how many times it is on the list. It leaves the
# list as it was. Print what it gives back for returned.

# Task 4: Running low
# Write a function called running_low that takes the store and a smallest number, and gives back
# a list of the kinds with fewer than that many, in the store's order. It leaves the store as it
# was. Print what it gives back for store and 7.

# Task 5: Hours on one hill
# Write a function called hours_on that takes a list of callouts, each a dictionary with a hill,
# hours and crew, and the name of a hill. It gives back the hours of all the callouts on that
# hill added up. Print what it gives back for callouts and "Carn Dubh".
