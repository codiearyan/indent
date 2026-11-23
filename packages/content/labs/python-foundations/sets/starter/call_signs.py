# Sets. Run this file with: python3 call_signs.py
#
# Task 1: How many teams called in
# Task 2: The first call heard twice
# Task 3: On both rotas
# Task 4: Call signs we do not know

# Tonight's radio and the weekend rotas, to try your functions on. Check calls your functions
# with values of its own.
heard = ["Bravo two", "Alpha one", "Bravo two", "Charlie three", "Alpha one", "Delta four"]
friday = ["Rhona", "Dougie", "Kirsty", "Iain"]
saturday = ["Ailsa", "Kirsty", "Rhona", "Fergus"]
known = ["Alpha one", "Bravo two", "Charlie three"]

print("Calls heard tonight:", len(heard))

# Task 1: How many teams called in
# Write a function called different_signs that takes a list of call signs as they were heard,
# and gives back how many different call signs there are. Print what it gives back for heard.

# Task 2: The first call heard twice
# Write a function called first_repeat that takes a list of call signs as they were heard, and
# gives back the first call sign that is heard for a second time, or None when no call sign is
# heard twice. Keep the call signs heard so far in a set. Print what it gives back for heard.

# Task 3: On both rotas
# Write a function called on_both that takes two rotas, two lists of names, and gives back a set
# of the names that are on both. Print what it gives back for friday and saturday.

# Task 4: Call signs we do not know
# Write a function called unknown_signs that takes a list of call signs heard and a list of call
# signs the team knows, and gives back a list of the call signs heard that are not known, each
# once, in alphabetical order. Print what it gives back for heard and known.
