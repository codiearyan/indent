# True, False and None. Run this file with: python3 ready_to_go.py
#
# Task 1: Is there enough crew?
# Task 2: Is the radio on the team channel?
# Task 3: Ready to go?
# Task 4: Is the casualty's name known?

# The team as it stands tonight. Check tries other values here, so build on these names,
# not on the values themselves.
crew_ready = 5
crew_needed = 4
radio_channel = 6
team_channel = 6
stretcher_packed = True
casualty_name = None

print("Crew ready:", crew_ready)

# Task 1: Is there enough crew?
# Make a variable called enough_crew: True when crew_ready is crew_needed or more, False
# otherwise. Print it.
enough_crew = crew_ready >= crew_needed
print("Enough crew:", enough_crew)

# Task 2: Is the radio on the team channel?
# Make a variable called on_channel: True when radio_channel is the same as team_channel,
# False otherwise. Print it.
on_channel = radio_channel == team_channel
print("On the team channel:", on_channel)

# Task 3: Ready to go?
# Make a variable called ready_to_go: True only when there is enough crew, the radio is on
# the team channel and the stretcher is packed. Print it.
ready_to_go = enough_crew and on_channel and stretcher_packed
print("Ready to go:", ready_to_go)

# Task 4: Is the casualty's name known?
# casualty_name is None until someone gives the team a name. Make a variable called
# name_known: False when casualty_name is None, True when it holds a name. Print it.
name_known = casualty_name is not None
print("Name known:", name_known)
