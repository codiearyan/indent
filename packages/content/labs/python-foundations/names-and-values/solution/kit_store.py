# Names and values. Run this file with: python3 kit_store.py
#
# Task 1: Name the team
# Task 2: Count the ropes
# Task 3: Take ropes out for a callout
# Task 4: Give x and y real names

# Tonight's count from the kit store. Check tries other numbers here, so build on these
# names, not on the numbers themselves.
ropes_in_store = 9
ropes_taken_out = 4

# Task 1: Name the team
# Make a variable called team_name that holds the text Brackenridge Mountain Rescue.
# Then print it.
team_name = "Brackenridge Mountain Rescue"
print(team_name)

# Task 2: Count the ropes
# Make a variable called ropes_left. It starts with the number of ropes in the store.
# Print it like this, with the number ropes_left holds: Ropes in store: 9
ropes_left = ropes_in_store
print("Ropes in store:", ropes_left)

# Task 3: Take ropes out for a callout
# ropes_taken_out ropes went out on tonight's callout. Give ropes_left a new value: the number
# of ropes left in the store. Then print it like this: Ropes after the callout: 5
ropes_left = ropes_left - ropes_taken_out
print("Ropes after the callout:", ropes_left)

# Task 4: Give x and y real names
# Nobody can tell what x and y hold. Rename x to leader_name and y to kit_officer_name,
# everywhere they appear.
leader_name = "Rhona"
kit_officer_name = "Dougie"
print("Team leader:", leader_name)
print("Kit officer:", kit_officer_name)
