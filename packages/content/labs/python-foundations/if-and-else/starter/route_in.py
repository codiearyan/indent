# Decisions with if. Run this file with: python3 route_in.py
#
# Task 1: Bridge or ford?
# Task 2: How bad is the wind?
# Task 3: Helicopter or stretcher?
# Task 4: Is there a name?

# Tonight's callout, as Rhona hears it. Check tries other values here, so build on these
# names, not on the values themselves.
river_level = 1.4
ford_limit = 0.8
wind_speed = 35
daylight = True
casualty_name = ""

print("River level:", river_level, "Wind:", wind_speed)

# Task 1: Bridge or ford?
# Make a variable called route: "bridge" when river_level is above ford_limit, "ford"
# otherwise. Print it.

# Task 2: How bad is the wind?
# Make a variable called wind_warning: "stay low" when wind_speed is 50 or more, "take care"
# when it is 30 or more, and "clear" otherwise. Print it.

# Task 3: Helicopter or stretcher?
# Print Call the helicopter when it is daylight and wind_speed is below 40. Otherwise print
# Carry the stretcher.

# Task 4: Is there a name?
# casualty_name holds the casualty's name, or empty text when the radio did not catch it, or
# None when nobody has asked yet. When it holds a name, print Casualty: and the name.
# Otherwise print Casualty: name not known
