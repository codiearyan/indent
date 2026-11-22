# Numbers. Run this file with: python3 batteries.py
#
# Task 1: Count the batteries
# Task 2: Count the full packs
# Task 3: Count the loose batteries
# Task 4: Time the walk in

# Tonight's kit and route. Check tries other numbers here, so build on these names, not on
# the numbers themselves.
head_torches = 14
batteries_per_torch = 3
batteries_per_pack = 8
walk_in_km = 7.5
walking_speed_kmh = 3

print("Head torches to fill:", head_torches)

# Task 1: Count the batteries
# Make a variable called batteries_needed: how many batteries fill every head torch.
# Print it.
batteries_needed = head_torches * batteries_per_torch
print("Batteries needed:", batteries_needed)

# Task 2: Count the full packs
# Batteries come in packs of batteries_per_pack. Make a variable called full_packs: how many
# whole packs batteries_needed fills. Print it.
full_packs = batteries_needed // batteries_per_pack
print("Full packs:", full_packs)

# Task 3: Count the loose batteries
# Make a variable called loose_batteries: how many batteries are left over once the full
# packs are taken. Print it.
loose_batteries = batteries_needed % batteries_per_pack
print("Loose batteries:", loose_batteries)

# Task 4: Time the walk in
# Make a variable called walk_in_hours: how many hours it takes to walk walk_in_km at
# walking_speed_kmh, rounded to one decimal place. Print it.
walk_in_hours = round(walk_in_km / walking_speed_kmh, 1)
print("Hours to walk in:", walk_in_hours)
