# Clean up, whatever happens. Run this file with: python3 radio_desk.py
#
# Task 1: Back to the team's channel
# Task 2: Close the log, whatever happens
# Task 3: All of the log, or none of it

# The radio at the desk: the channel it is on and its volume. listen gives back what is heard
# on the channel the radio is on, and stops with ValueError on a channel it cannot tune to.
radio = {"channel": 4, "volume": 6}
heard = {1: "BASE: radio check", 2: "GOLF SIX: at the stile", 4: "KILO FIVE: on the ridge"}


def listen(radio):
    channel = radio["channel"]
    if channel not in heard:
        raise ValueError(f"channel {channel} cannot be tuned")
    return heard[channel]


# entry_line gives the line of the log for one entry, a time and what was said, and stops with
# ValueError for a time that is not written like 21:05. Check calls your functions with values,
# files and its own listen and entry_line.
def entry_line(entry):
    time, said = entry
    if len(time) != 5 or time[2] != ":":
        raise ValueError(f"the time {time!r} is not written like 21:05")
    return f"{time} {said}\n"


entries = [("21:05", "GOLF SIX: leaving the base"), ("21:40", "GOLF SIX: at the stile")]

print("The radio is on channel", radio["channel"])

# Task 1: Back to the team's channel
# Write a function called scan that takes the radio and a list of channels. It tunes the radio
# to each channel in turn, by changing the channel in the radio itself, and listens there. It
# gives back a list of what was heard on each, in order. Afterwards the radio is on the channel
# it was on before, whatever happens, and an error from listen still reaches the caller. Print
# what it gives back for radio and [1, 2], then the channel the radio is on.
def scan(radio, channels):
    before = radio["channel"]
    found = []
    try:
        for channel in channels:
            radio["channel"] = channel
            found.append(listen(radio))
    finally:
        radio["channel"] = before
    return found


print(scan(radio, [1, 2]))
print("The radio is on channel", radio["channel"])

# Task 2: Close the log, whatever happens
# Ailsa's write_log writes the line of each entry into a file, but when entry_line stops with
# an error, the file is never closed. Change it so that the file is closed whatever happens,
# and an error from entry_line still reaches the caller.
def write_log(path, entries):
    with open(path, "w", encoding="utf-8") as log:
        for entry in entries:
            log.write(entry_line(entry))


write_log("tonight.txt", entries)

# Task 3: All of the log, or none of it
# Write a function called save_log that takes the path of a file, as text, and a list of
# entries, and makes the file hold the line of each entry. When entry_line stops with an error,
# the file must hold exactly what it held before, or not be there if it was not there before,
# and the error must still reach the caller. Call it for "saved.txt" and entries.
def save_log(path, entries):
    lines = []
    for entry in entries:
        lines.append(entry_line(entry))
    with open(path, "w", encoding="utf-8") as log:
        log.write("".join(lines))


save_log("saved.txt", entries)
