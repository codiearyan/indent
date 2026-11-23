# Dougie's callout handlers. Run this file with: python3 base_handlers.py
#
# Task 1: Say what runs
# Task 2: Count the calls
# Task 3: Time each call
# Task 4: Count the pages

import time


# One of the base's handlers: it takes what the desk hands it and gives back a line for the log.
def log_call(call_sign, message, urgent=False):
    line = call_sign + ": " + message
    if urgent:
        line = line + " (urgent)"
    return line


# Task 1: Say what runs
# Write a function called announce that takes a function and gives back a new function. The new
# function takes whatever values it is called with, prints Running and the name of the function
# it wraps, such as "Running log_call", and gives back what that function gives back for the
# same values.

# Task 2: Count the calls
# Write a function called count_calls that takes a function and gives back a new function that
# gives back what that function gives back for the same values, and counts how many times it was
# called in an attribute called calls, 0 before its first call. Each function count_calls gives
# back has a count of its own.

# Task 3: Time each call
# Write a function called timed that takes a function and a clock, clock=time.monotonic, and
# gives back a new function that gives back what that function gives back for the same values.
# Each time it is called, it reads the clock before and after, and adds the seconds the call
# took to a list in an attribute called times, empty before its first call. The new function
# keeps the name of the function it wraps.

# Task 4: Count the pages
# page_team pages one team. Put count_calls on it, so that page_team.calls says how many pages
# were sent.
def page_team(call_sign, urgent=False):
    if urgent:
        return "Urgent page to " + call_sign
    return "Page to " + call_sign


# Try your functions in the lines below. They run when you run this file, and Check does not run
# them: it wraps functions of its own.
if __name__ == "__main__":
    print(log_call("Alpha", "at the bridge"))
    print(log_call("Bravo", "stretcher needed", urgent=True))
    print(page_team("Charlie"))
