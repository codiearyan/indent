# Lists. Run this file with: python3 call_list.py
#
# Task 1: First and last on the list
# Task 2: The hill party
# Task 3: Join the call-out list
# Task 4: The leader goes first
# Task 5: Page the next one

# The call-out list as it is on the whiteboard tonight, to try your functions on. Check calls
# your functions with lists of its own, so each function must work with the list it is given.
call_list = ["Rhona", "Dougie", "Ailsa", "Kirsty", "Iain"]

print("Call-out list:", call_list)
print("Names on it:", len(call_list))

# Task 1: First and last on the list
# Write a function called first_on_call that takes a list of names and gives back the first
# name on it. Then write a function called last_on_call that gives back the last name. Print
# what each gives back for call_list.
def first_on_call(names):
    return names[0]


def last_on_call(names):
    return names[-1]


print(first_on_call(call_list))
print(last_on_call(call_list))

# Task 2: The hill party
# Write a function called hill_party that takes a list of names and a size, and gives back a
# new list of the first size names. When the list is shorter than size, it gives back all of
# them. It leaves the list it is given as it was. Print what it gives back for call_list and 3.
def hill_party(names, size):
    return names[:size]


print(hill_party(call_list, 3))

# Task 3: Join the call-out list
# Write a function called join_list that takes a list of names and a name, and adds the name
# to the end of that same list, unless the name is on it already. It changes the list it is
# given and gives nothing back. Call it for call_list and a new name, then print call_list.
def join_list(names, name):
    if name not in names:
        names.append(name)


join_list(call_list, "Fergus")
print(call_list)

# Task 4: The leader goes first
# Write a function called leader_first that takes a list of names and the name of tonight's
# leader, who is somewhere on it, and moves the leader to the front of that same list. The
# others keep their order. Call it for call_list and "Kirsty", then print call_list.
def leader_first(names, leader):
    names.remove(leader)
    names.insert(0, leader)


leader_first(call_list, "Kirsty")
print(call_list)

# Task 5: Page the next one
# Write a function called next_to_page that takes a list of names, takes the first name off
# that same list and gives it back. When the list is empty, it gives back None and leaves the
# list as it is. Call it for call_list, print what it gives back, then print call_list.
def next_to_page(names):
    if len(names) == 0:
        return None
    return names.pop(0)


print(next_to_page(call_list))
print(call_list)
