# Two names, one list. Run this file with: python3 search_board.py
#
# Task 1: What if we add a square
# Task 2: Cross off a square
# Task 3: A draft for the next team
# Task 4: Clear what was searched

# The search board for tonight, the squares still to search, to try your functions on. Check
# calls your functions with lists of its own, so each function must work with the list it is
# given.
board = ["B4", "B5", "C3", "C4", "D1", "D2"]

print("Still to search:", board)

# Task 1: What if we add a square
# Write a function called with_square that takes a list of squares and one more square, and
# gives back a new list with that square at the end. It leaves the list it is given as it was.
# Print what it gives back for board and "E7", then print board.

# Task 2: Cross off a square
# Write a function called cross_off that takes a list of squares and a square, and takes that
# square out of that same list. When the square is not on it, the list stays as it was. It
# gives nothing back. Call it for board and "C3", then print board.

# Task 3: A draft for the next team
# Write a function called draft_order that takes a list of squares and one square on it, and
# gives back a copy of the list with that square moved to the front. It leaves the list it is
# given as it was. Print what it gives back for board and "D1", then print board.

# Task 4: Clear what was searched
# Write a function called clear_searched that takes a list of squares and a list of squares
# that have been searched, and takes every searched square out of the first list, that same
# list. It gives nothing back. Call it for board and ["B4", "B5"], then print board.
