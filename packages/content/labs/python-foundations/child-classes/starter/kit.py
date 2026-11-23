# Kit of every kind. Run this file with: python3 kit.py
#
# Task 1: A rope is kit
# Task 2: A rope's own label
# Task 3: Only the ropes
# Task 4: Ready for the hill


# Every piece of kit has a name and a weight in kilos, a label for the kit sheet, and says
# whether it is ready to go out.
class Kit:
    def __init__(self, name, kg):
        self.name = name
        self.kg = kg

    def label(self):
        return f"{self.name} ({self.kg} kg)"

    def ready(self):
        return True


# A battery is kit with a charge, in percent. It is ready when it is at least half full.
class Battery(Kit):
    def __init__(self, name, kg, charge):
        super().__init__(name, kg)
        self.charge = charge

    def ready(self):
        return self.charge >= 50


# Task 1: A rope is kit
# Make Rope a class built on Kit. Its __init__ takes a name, a weight in kilos and a length in
# metres. It hands the name and the weight to Kit's __init__ with super(), and keeps the length
# in the attribute metres.
class Rope:
    """A rope: kit with a length."""

    # Task 2: A rope's own label
    # Give Rope a label method of its own. It gives back Kit's label for the rope, then a comma, a
    # space and the length, such as
    # static line (4.5 kg), 50 m
    # It gets Kit's label with super() and adds to it.


# Task 3: Only the ropes
# Write a function called ropes_in that takes a list of kit and gives back a list of the ropes in
# it, in the same order: every Rope, and every kind of rope built on Rope.

# Task 4: Ready for the hill
# Write an exception class called NotReady, built on Exception. Then write a function called
# check_kit that takes a list of kit and asks each item, with its own ready method, whether it is
# ready. It raises NotReady with a message that names the first item that is not ready. When every
# item is ready, it gives back the total weight of the list.


# Try your code in the lines below. They run when you run this file, and Check does not run them:
# it makes kit of its own.
if __name__ == "__main__":
    store = [
        Kit("first aid kit", 2.25),
        Battery("radio battery", 0.5, 35),
        Kit("map", 0.25),
    ]
    for item in store:
        print(item.label(), "ready" if item.ready() else "not ready")
