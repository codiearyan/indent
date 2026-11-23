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
def announce(fn):
    def wrapper(*args, **kwargs):
        print("Running", fn.__name__)
        return fn(*args, **kwargs)
    return wrapper

# Task 2: Count the calls
# Write a function called count_calls that takes a function and gives back a new function that
# gives back what that function gives back for the same values, and counts how many times it was
# called in an attribute called calls, 0 before its first call. Each function count_calls gives
# back has a count of its own.
def count_calls(fn):
    def wrapper(*args, **kwargs):
        wrapper.calls = wrapper.calls + 1
        return fn(*args, **kwargs)
    wrapper.calls = 0
    return wrapper

# Task 3: Time each call
# Write a function called timed that takes a function and a clock, clock=time.monotonic, and
# gives back a new function that gives back what that function gives back for the same values.
# Each time it is called, it reads the clock before and after, and adds the seconds the call
# took to a list in an attribute called times, empty before its first call. The new function
# keeps the name of the function it wraps.
def timed(fn, clock=time.monotonic):
    def wrapper(*args, **kwargs):
        start = clock()
        result = fn(*args, **kwargs)
        wrapper.times.append(clock() - start)
        return result
    wrapper.times = []
    wrapper.__name__ = fn.__name__
    return wrapper

# Task 4: Count the pages
# page_team pages one team. Put count_calls on it, so that page_team.calls says how many pages
# were sent.
@count_calls
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
    loud_log = announce(log_call)
    print(loud_log("Alpha", "at the bridge", urgent=True))
    counted = count_calls(log_call)
    counted("Bravo", "at the car park")
    counted("Bravo", "walker found")
    print(counted.calls)
    slow = timed(log_call)
    slow("Charlie", "back at base")
    print(slow.__name__, len(slow.times))
    page_team("Alpha", urgent=True)
    print(page_team.calls)
