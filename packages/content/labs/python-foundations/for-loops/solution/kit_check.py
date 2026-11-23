# Repeat with for. Run this file with: python3 kit_check.py
#
# Task 1: Number the radios
# Task 2: Rope for the lower
# Task 3: Spell the stencils
# Task 4: Count the stencils

# Thursday's kit check, as Dougie wrote it down. Check tries other values here, so build on
# these names, not on the values themselves.
radios = 6
pitches = 4
first_pitch = 20
longer_by = 5
stretcher_label = "Team stretcher"

print("Radios out:", radios)

# Task 1: Number the radios
# Print one line for each radio, from the first radio up to the last, like this:
# Radio 1 checked
for number in range(1, radios + 1):
    print("Radio", number, "checked")

# Task 2: Rope for the lower
# The first pitch of the lower is first_pitch metres long, and each pitch after it is
# longer_by metres longer than the one before. Make a variable called total_rope: the metres
# of rope for all the pitches together. Print it.
total_rope = 0
pitch = first_pitch
for count in range(pitches):
    total_rope = total_rope + pitch
    pitch = pitch + longer_by
print("Rope for the lower:", total_rope)

# Task 3: Spell the stencils
# Print each letter of stretcher_label on its own line, in capitals, and skip the spaces.
for letter in stretcher_label:
    if letter != " ":
        print(letter.upper())

# Task 4: Count the stencils
# Make a variable called stencils: how many letters stretcher_label has, not counting the
# spaces. Print it.
stencils = 0
for letter in stretcher_label:
    if letter != " ":
        stencils = stencils + 1
print("Stencils to cut:", stencils)
