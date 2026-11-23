# Ailsa's call handlers. Run this file with: python3 call_handlers.py
#
# Task 1: Send to every team
# Task 2: Route a call to its handler
# Task 3: A pager that remembers its team
# Task 4: A pager for every team

# Tonight's teams on the hill, and two ways the radio desk can word a message.
teams = ["Alpha", "Bravo", "Charlie"]


def loud(text):
    return text.upper() + "!"


def plain(text):
    return text.capitalize() + "."


# The desk's handlers, one for each kind of call. Each takes the text of the call.
def medical(text):
    return "Medical: send the nearest team to " + text


def weather(text):
    return "Weather: tell every team " + text


def other(text):
    return "Noted: " + text


handlers = {"medical": medical, "weather": weather, "other": other}

# Task 1: Send to every team
# Write a function called send_to_all that takes a list of call signs and a function send. It
# calls send once for each call sign, in order, and gives back a list of what each call gave back.
def send_to_all(call_signs, send):
    sent = []
    for call_sign in call_signs:
        sent.append(send(call_sign))
    return sent

# Task 2: Route a call to its handler
# Write a function called route that takes a call, a tuple (kind, text), and a dictionary of
# handlers. It gives back what the handler for that kind gives back for the text. A kind the
# dictionary does not have goes to its handler for "other".
def route(call, handlers):
    kind, text = call
    handler = handlers.get(kind, handlers["other"])
    return handler(text)

# Task 3: A pager that remembers its team
# Write a function called make_pager that takes a call sign and gives back a new function. That
# function takes a message and gives back the call sign, a colon, a space and the message, such as
# "Alpha: at the bridge".
def make_pager(call_sign):
    def pager(message):
        return call_sign + ": " + message
    return pager

# Task 4: A pager for every team
# Write a function called pagers_for that takes a list of call signs and gives back a dictionary
# with a pager for each call sign, made as in Task 3, each pager under its own call sign.
def pagers_for(call_signs):
    pagers = {}
    for call_sign in call_signs:
        pagers[call_sign] = make_pager(call_sign)
    return pagers


# Try your functions in the lines below. They run when you run this file, and Check does not run
# them: it calls your functions with values of its own.
if __name__ == "__main__":
    print(loud("radio check"), plain("RADIO CHECK"))
    print(len(handlers), "handlers at the desk")
    print(send_to_all(teams, loud))
    print(route(("medical", "the bridge below Scarth Fell"), handlers))
    print(route(("kit", "two ropes back in the van"), handlers))
    alpha = make_pager("Alpha")
    print(alpha("at the bridge"))
    pagers = pagers_for(teams)
    print(pagers["Bravo"]("back at base"))
