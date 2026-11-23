# Pager messages. Run this file with: python3 pager.py
#
# Task 1: Lines that fit the pager
# Task 2: The closest hill
# Task 3: A one-line summary

# Ailsa's own shorten gives the short form of a call sign that the pagers show: the first
# letter of each word. The lines below use it, and so does her radio desk. Check calls your
# functions with messages and hills of its own.
def shorten(call_sign):
    short = ""
    for word in call_sign.split():
        short = short + word[0]
    return short


hills = ["Scarth Fell", "Lowther Crag", "Cairn Dubh", "Garve Edge", "Black Knowe"]
page = "Callout to Scarth Fell, north-east ridge. Walker with an ankle injury, meet at the Lowther Crag car park"

print("From", shorten("BRAVO TWO") + ":", page)

# Task 1: Lines that fit the pager
# Write the line that imports the textwrap module. Then write a function called pager_lines
# that takes a message and a width, and gives back a list of the lines of the message, none
# wider than width, made by textwrap's wrap. Print what it gives back for page and 24.

# Task 2: The closest hill
# On the page of the difflib module, find the function that gives back the closest matches
# to a word from a list of words, and import it by itself with from. Then write a function
# called closest_hill that takes a hill as someone typed it and a list of hills, and gives
# back the closest hill, or None when no hill is close. Print what it gives back for
# "Scarth Fel" and hills.

# Task 3: A one-line summary
# Write a function called summary that takes a message and a width, and gives back the
# message cut down to fit that width by textwrap's shorten. Import it so that Ailsa's shorten
# above keeps its name and keeps working. Print what summary gives back for page and 40, then
# print shorten("ECHO ONE").
