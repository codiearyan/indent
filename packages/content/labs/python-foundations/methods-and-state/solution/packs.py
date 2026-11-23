# Packs for the hill. Run this file with: python3 packs.py
#
# Task 1: Add an item
# Task 2: What the pack weighs
# Task 3: Take an item out
# Task 4: A pack without one item

# A pack belongs to one volunteer, who can carry up to `limit` kilos. Its items are a
# dictionary of each item's name and its weight in kilos.
class Pack:
    def __init__(self, owner, limit):
        self.owner = owner
        self.limit = limit
        self.items = {}

    # Task 1: Add an item
    # Write a method add(name, kg) that puts the item into this pack's items: its name as the
    # key and its weight as the value. It refuses a weight that is not above 0 with a ValueError
    # whose message names the weight, and an item that would take the pack over its limit with a
    # ValueError whose message names the item and the limit. A refused item leaves the pack as
    # it was.
    def add(self, name, kg):
        if kg <= 0:
            raise ValueError(f"{name} must weigh more than 0 kg, not {kg}")
        if sum(self.items.values()) + kg > self.limit:
            raise ValueError(f"{name} would take the pack over its limit of {self.limit} kg")
        self.items[name] = kg

    # Task 2: What the pack weighs
    # Write weight, the total of the weights in items, as a property: read as pack.weight, with
    # no round brackets, and worked out from items every time it is read.
    @property
    def weight(self):
        return sum(self.items.values())

    # Task 3: Take an item out
    # Write a method remove(name) that takes the item out of this pack and gives back its weight.
    # An item that is not in the pack raises ValueError with a message that names it.
    def remove(self, name):
        if name not in self.items:
            raise ValueError(f"{name} is not in the pack")
        return self.items.pop(name)

    # Task 4: A pack without one item
    # Write a method without(name) that gives back a new Pack for the same owner and limit,
    # holding every item of this pack but that one. This pack stays as it was.
    def without(self, name):
        lighter = Pack(self.owner, self.limit)
        for item, kg in self.items.items():
            if item != name:
                lighter.items[item] = kg
        return lighter


# Try your methods in the lines below. They run when you run this file, and Check does not run
# them: it makes packs of its own.
if __name__ == "__main__":
    iain = Pack("Iain", 12)
    print(iain.owner, "can carry", iain.limit, "kg and has", iain.items)
    iain.add("rope", 4.5)
    iain.add("first aid kit", 2.25)
    iain.add("stove", 1.5)
    print(iain.items, iain.weight)
    try:
        iain.add("tent", 4.5)
    except ValueError as error:
        print(error)
    print(iain.remove("stove"), iain.items)
    lighter = iain.without("rope")
    print(lighter.items, iain.items)
