# Arguments and defaults. Run this file with: python3 pager.py
#
# Task 1: Routine unless it says so
# Task 2: Page the Sunday exercise
# Task 3: Tonight's leader
# Task 4: Ropes back in the store

# The team as it stands, to try your functions on. Check calls your functions with values of
# its own, and tries other values here too.
leader_on_call = "Rhona"
exercise_hill = "Lowther Crag"
exercise_crew = 6
ropes_in_store = 9
ropes_taken = 3

print("Leader on call:", leader_on_call)

# Task 1: Routine unless it says so
# Write a function called pager_message with two parameters, text and priority. It gives back
# the priority in capitals, a colon, a space and the text, like this: URGENT: Walker overdue
# When it is called without a priority, the priority is routine. Print what it gives back
# for one message with a priority and one without.
def pager_message(text, priority="routine"):
    return f"{priority.upper()}: {text}"


print(pager_message("Walker overdue on Garve Edge", "urgent"))
print(pager_message("Kit night moved to Friday"))

# Task 2: Page the Sunday exercise
# Ailsa wrote callout_page. Leave it as it is.
def callout_page(hill, crew, meet_at="the base", priority="urgent"):
    return f"{priority.upper()}: {crew} crew to {hill}, meet at {meet_at}"


# Make a variable called exercise_page by calling callout_page for Sunday's exercise: the
# hill exercise_hill, the crew exercise_crew, the default meeting place, and the priority
# routine. Print it.
exercise_page = callout_page(exercise_hill, exercise_crew, priority="routine")
print(exercise_page)

# Task 3: Tonight's leader
# Rhona says the rota prints her name every night, even when Kirsty leads. Fix leader_line
# so that it gives back the leader it is given.
def leader_line(leader):
    return "Team leader tonight: " + leader


print(leader_line(leader_on_call))

# Task 4: Ropes back in the store
# Dougie's take_ropes stops with an error. Change it so that it takes the ropes in the store
# and the ropes taken out, in that order, and gives back how many are left. Then store what
# it gives back in ropes_in_store, so that the print line below shows the new count.
def take_ropes(in_store, taken):
    return in_store - taken


ropes_in_store = take_ropes(ropes_in_store, ropes_taken)
print("Ropes in store:", ropes_in_store)
