# Ailsa's log reader. Run this file with: python3 log_reader.py
#
# Task 1: One line at a time
# Task 2: Only one team's lines
# Task 3: The first mention
# Task 4: The longest and the total

# The radio log is in winter_log.txt, one call per line: the time, the call sign and a colon,
# then the message, such as "20:15 Alpha: at the bridge". The one in your workspace has ten
# lines. The whole winter's log has hundreds of thousands, too many to hold in memory at once.

# Task 1: One line at a time
# Write a generator function called log_lines that takes the path of a log file, opens it with
# encoding="utf-8", and gives its lines one at a time, each without the line end at its end.
def log_lines(path):
    with open(path, encoding="utf-8") as log:
        for line in log:
            yield line.rstrip("\n")

# Task 2: Only one team's lines
# Write a generator function called from_team that takes lines of a log, a list or a generator,
# and a call sign, and gives one at a time only the lines whose call sign is that one.
def from_team(lines, call_sign):
    for line in lines:
        if line.split()[1] == call_sign + ":":
            yield line

# Task 3: The first mention
# Write a function called first_mention that takes lines of a log and a word, and gives back the
# first line that has the word in it, or None when no line has. It reads no line after that one.
def first_mention(lines, word):
    return next((line for line in lines if word in line), None)

# Task 4: The longest and the total
# Write a function called longest_and_total that takes numbers of hours, a list or a generator
# with at least one number in it, and gives back a tuple of the largest number and the total.
def longest_and_total(hours):
    hours = list(hours)
    return max(hours), sum(hours)


# Try your functions in the lines below. They run when you run this file, and Check does not run
# them: it uses logs and numbers of its own.
if __name__ == "__main__":
    count = 0
    with open("winter_log.txt", encoding="utf-8") as log:
        for line in log:
            count = count + 1
    print(count, "lines in the log")
    lines = log_lines("winter_log.txt")
    print(next(lines))
    for line in from_team(log_lines("winter_log.txt"), "Bravo"):
        print(line)
    print(first_mention(log_lines("winter_log.txt"), "stretcher"))
    print(first_mention(log_lines("winter_log.txt"), "helicopter"))
    print(longest_and_total(n for n in [3, 7, 2]))
