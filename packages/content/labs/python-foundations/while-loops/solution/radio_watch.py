# Repeat with while. Run this file with: python3 radio_watch.py
#
# Task 1: Stop the countdown
# Task 2: Hours of battery
# Task 3: Search the squares
# Task 4: Call round the channels

# The night search, as Ailsa has it on the radio desk. Check tries other values here, so
# build on these names, not on the values themselves.
minutes_to_go = 5
battery = 100
drain_per_hour = 15
low_mark = 20
squares = 9
found_in = 6
channels = 8
team_channel = 3

print("Minutes to go:", minutes_to_go)

# Task 1: Stop the countdown
# Dougie wrote this countdown to the vehicle leaving, and it never stops. Run the file, press
# Ctrl+C in the terminal to stop it, then fix the loop so that it counts down from
# minutes_to_go to 1 and then prints Vehicle leaving.
minutes = minutes_to_go
while minutes > 0:
    print("Leaving in", minutes)
    minutes = minutes - 1
print("Vehicle leaving")

# Task 2: Hours of battery
# The radio's battery starts at battery and loses drain_per_hour every hour. Make a variable
# called hours: how many hours pass until the battery is below low_mark. Print it.
hours = 0
while battery >= low_mark:
    battery = battery - drain_per_hour
    hours = hours + 1
print("Hours of battery:", hours)

# Task 3: Search the squares
# Search the squares in order from square 1, printing Searching square 1 and so on, up to
# square number squares at most. When the square is found_in, print Found in square and its
# number, and stop searching.
square = 1
while square <= squares:
    print("Searching square", square)
    if square == found_in:
        print("Found in square", square)
        break
    square = square + 1

# Task 4: Call round the channels
# Print Calling on channel 1 and so on, for every channel from 1 up to channels, but skip
# team_channel: the team is already listening there.
channel = 0
while channel < channels:
    channel = channel + 1
    if channel == team_channel:
        continue
    print("Calling on channel", channel)
