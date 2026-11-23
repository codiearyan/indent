# Raise an error. Run this file with: python3 kit_orders.py
#
# Task 1: Refuse a bad order
# Task 2: A kind that is not on the list
# Task 3: Note it, then pass it on

# The kit store: how many of each kind are on the shelves. weights is what one of each kind
# weighs, in kilograms. Check calls your functions with values of its own.
store = {"rope": 9, "radio": 6, "splint": 3}
weights = {"rope": 4.5, "radio": 0.75, "splint": 0.5, "stretcher": 9.5}

print("Kinds in the store:", len(store))

# Task 1: Refuse a bad order
# Write a function called take_out that takes the store, a kind and a count. It takes that
# many of the kind out of the store, by lowering its count in the store itself, and gives
# back how many are left. Before it changes anything, it refuses an order it cannot fill:
# a count less than 1 raises ValueError with a message that names the count, and a count
# more than the store holds raises ValueError with a message that names the kind and how
# many the store holds. Print what it gives back for store, "splint" and 2. Then call it for
# store, "splint" and 5 inside a try, and print the message of the error in the except.

# Task 2: A kind that is not on the list
# Dougie's weight_of gives back None for a kind that is not on the list, and the code that
# adds up a pack stops much later, far from the cause. Change it so that a kind that is not
# on the list raises ValueError with a message that names the kind. Leave the lines under it
# as they are.
def weight_of(weights, kind):
    if kind in weights:
        return weights[kind]
    return None


print(weight_of(weights, "rope"))
try:
    print(weight_of(weights, "ropes"))
except ValueError as error:
    print("Refused:", error)

# Task 3: Note it, then pass it on
# Write a function called weigh_pack that takes the weights, a list of kinds and a list of
# problems. It gives back the weight of the kinds, added up, using weight_of. When weight_of
# raises ValueError, it adds the message of the error to the list of problems, then raises
# the same error again, so the caller still stops. Any other error is not noted. Print what
# it gives back for weights, ["rope", "radio"] and an empty list.
