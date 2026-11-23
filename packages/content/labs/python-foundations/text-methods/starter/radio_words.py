# Working with text. Run this file with: python3 radio_words.py
#
# Task 1: A tidy call sign
# Task 2: A grid reference without spaces
# Task 3: Does Rhona need to see it
# Task 4: The message after the colon

# Tonight's radio desk, as three people typed it, to try your functions on. Check calls your
# functions with values of its own.
typed_sign = "  bravo two\n"
typed_grid = "nn 166 712"
entries = [
    "BRAVO TWO: at the bridge, two walkers with us",
    "urgent: ECHO ONE needs a stretcher at the ford",
    "delta four: not urgent, back at the vehicle at 21:40",
    "Kilo five found the casualty",
    "radio check from the base",
]

print("Entries tonight:", len(entries))

# Task 1: A tidy call sign
# Write a function called call_sign that takes a call sign as it was typed and gives back the
# same call sign without the spaces and line end at its start and end, in capital letters.
# Print what it gives back for typed_sign.

# Task 2: A grid reference without spaces
# Write a function called grid_ref that takes a grid reference as it was typed and gives back
# the same grid reference with every space taken out, in capital letters. Print what it gives
# back for typed_grid.

# Task 3: Does Rhona need to see it
# Write a function called needs_rhona that takes one entry of the log and gives back True when
# the entry starts with the word urgent, or has the word casualty anywhere in it, whatever its
# capitals. Otherwise it gives back False. Print what it gives back for each of the entries.

# Task 4: The message after the colon
# Write a function called message_of that takes one entry and gives back its message: the text
# after the first colon, without the spaces at its start and end. An entry with no colon has
# no message: give back empty text. Print what it gives back for each of the entries.
