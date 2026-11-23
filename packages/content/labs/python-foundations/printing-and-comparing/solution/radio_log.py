# The radio log. Run this file with: python3 radio_log.py
#
# Task 1: A call that prints
# Task 2: The same call twice
# Task 3: Calls in order of time
# Task 4: A log you can ask


# One call on the radio: its time as "HH:MM" text, always two digits each side, the call sign of
# the team that called, and what they said.
class Call:
    def __init__(self, time, call_sign, message):
        self.time = time
        self.call_sign = call_sign
        self.message = message

    # Task 1: A call that prints
    # Write __str__, which gives back the call as one line of the log, such as
    # 21:40 Alpha: at the bridge
    # and __repr__, which gives back the Python that makes the call, such as
    # Call('21:40', 'Alpha', 'at the bridge')
    def __str__(self):
        return f"{self.time} {self.call_sign}: {self.message}"

    def __repr__(self):
        return f"Call({self.time!r}, {self.call_sign!r}, {self.message!r})"

    # Task 2: The same call twice
    # Write __eq__: a call is equal to another call with the same time and the same call sign,
    # whatever the message. A call is never equal to something that is not a call.
    def __eq__(self, other):
        if not isinstance(other, Call):
            return NotImplemented
        return self.time == other.time and self.call_sign == other.call_sign

    # Task 3: Calls in order of time
    # Write __lt__: a call is less than a call that came later, so that sorted() puts a list of
    # calls in order of time, the earliest first.
    def __lt__(self, other):
        return self.time < other.time


# Every call of the night, in the order they were typed in.
class Log:
    def __init__(self):
        self.calls = []

    def add(self, call):
        self.calls.append(call)

    # Task 4: A log you can ask
    # Write __len__, which gives back how many calls the log holds, and __contains__, which says
    # whether a call sign is in the log: "Alpha" in log is True once Alpha has called.
    def __len__(self):
        return len(self.calls)

    def __contains__(self, call_sign):
        for call in self.calls:
            if call.call_sign == call_sign:
                return True
        return False


# Try your methods in the lines below. They run when you run this file, and Check does not run
# them: it makes calls and logs of its own.
if __name__ == "__main__":
    night = [
        Call("21:40", "Alpha", "at the bridge"),
        Call("19:05", "Bravo", "leaving the car park"),
        Call("21:40", "Alpha", "at the bridge, all well"),
        Call("20:15", "Charlie", "on the ridge"),
    ]
    print(night[0])
    print(night)
    print(night[0] == night[2], night[0] == night[1])
    for call in sorted(night):
        print(call)
    log = Log()
    for call in night:
        log.add(call)
    print(len(log), "Charlie" in log, "Delta" in log)
