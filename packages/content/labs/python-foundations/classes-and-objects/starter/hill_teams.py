# Teams on the hill. Run this file with: python3 hill_teams.py
#
# Task 1: A team of its own
# Task 2: Each vehicle its own kit
# Task 3: Teams from the rota

# Tonight's teams as the radio desk keeps them now: a dictionary for each, the keys typed by
# hand. Look at what the second one prints.
tonight = [
    {"call_sign": "Alpha", "leader": "Kirsty"},
    {"callsign": "Bravo", "Leader": "Iain"},
]
for team in tonight:
    print(team.get("call_sign"), "is led by", team.get("leader"))

# Saturday's rota: the call sign and the leader of each team.
# Check makes teams of its own.
rota = [("Alpha", "Kirsty"), ("Bravo", "Iain"), ("Charlie", "Shona")]

# Task 1: A team of its own
# Write a class called Team. Its __init__ takes a call sign and a leader, and keeps them in the
# attributes call_sign and leader of the new object. Then make alpha = Team("Alpha", "Kirsty")
# and bravo = Team("Bravo", "Iain"), and print the leader of each.

# Task 2: Each vehicle its own kit
# Dougie wrote this class for the vehicles. Run the file: the rope he put in the van shows up in
# the Land Rover too. Change Vehicle so that every vehicle has a kit list of its own, empty when
# the vehicle is made.
class Vehicle:
    kit = []

    def __init__(self, name):
        self.name = name


van = Vehicle("Van")
land_rover = Vehicle("Land Rover")
van.kit.append("rope")
print(land_rover.name, "carries", land_rover.kit)

# Task 3: Teams from the rota
# Write a function called make_teams that takes a list of (call sign, leader) tuples and gives
# back a list of Team objects, one for each tuple, in the same order. Print the leader of each
# team it gives back for rota.
