# Text and f-strings. Run this file with: python3 radio_log.py
#
# Task 1: Write down where
# Task 2: Tidy the call sign
# Task 3: Write the crew line
# Task 4: Write the log entry

# Tonight's callout, as Ailsa took it down from the radio. Check tries other values here,
# so build on these names, not on the text itself.
hill = "Scarth Fell"
grid_ref = "NY 4127 0836"
call_sign = "  bravo two "
crew_out = 6

print("Callout on", hill)

# Task 1: Write down where
# Make a variable called location: the hill, a comma, the word grid and the grid reference,
# like this: Scarth Fell, grid NY 4127 0836
# Print it.
location = hill + ", grid " + grid_ref
print(location)

# Task 2: Tidy the call sign
# call_sign came off the radio form with spaces around it and in small letters. Make a
# variable called clean_call_sign: the same call sign without the spaces at its start and
# end, in capital letters, like this: BRAVO TWO
# Print it.
clean_call_sign = call_sign.strip().upper()
print(clean_call_sign)

# Task 3: Write the crew line
# Make a variable called crew_line: the text Crew out: followed by a space and the number in
# crew_out, like this: Crew out: 6
# Print it.
crew_line = "Crew out: " + str(crew_out)
print(crew_line)

# Task 4: Write the log entry
# Make a variable called log_entry with an f-string: the clean call sign, the word to, the
# location, the word with, the number in crew_out and the word crew, like this:
# BRAVO TWO to Scarth Fell, grid NY 4127 0836 with 6 crew
# Print it.
log_entry = f"{clean_call_sign} to {location} with {crew_out} crew"
print(log_entry)
