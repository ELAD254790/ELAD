# Shared timeline for picture + sound  (seconds)
BPM = 128.0
BEAT = 60.0 / BPM
DROP = 17.6
DUR = 60.0
FPS = 30
W, H = 1080, 1920

def b(n):  # time of beat n after the drop
    return DROP + n * BEAT

SC = {
    'A': (0.0, 4.2),          # hook - 40 seconds
    'B': (4.2, 8.2),          # pain - stopped asking
    'C': (8.2, 14.2),         # fear - glass door at night
    'D': (14.2, DROP),        # turn - she opens the door
    'E': (DROP, b(15)),       # 01' from zero  (tablet)
    'F': (b(15), b(30)),      # 15' fixture board
    'G': (b(30), b(45)),      # 30' never alone (curl)
    'H': (b(45), b(61)),      # 45' stamina
    'I': (b(61), b(77)),      # 90' back in the game
    'J': (b(77), DUR),        # close
}

# trainer voice-over: (file, start, text)
VO = [
    ('vo1', 14.60, 'בדיוק בשביל זה, אנחנו פה.'),
    ('vo2', 18.20, 'לא צריך לדעת כלום. אנחנו מראים לך כל מכשיר, כל תנועה.'),
    ('vo3', 25.30, 'תוכנית שבנויה סביב המשפחה שלך. לא במקומה.'),
    ('vo4', 32.20, 'ואתה אף פעם לא לבד. אני לידך, בכל אימון.'),
    ('vo5', 39.60, 'חודש אחרי חודש. הדופק יורד, והזמן עולה.'),
    ('vo6', 54.10, 'הוא לא צריך אבא מושלם. הוא צריך אבא שמשחק איתו.'),
    ('vo7', 58.45, 'בוא לאימון היכרות.'),
]

# key sfx hit times used by both picture and sound
BALL_HOOK = [0.10, 0.62, 1.12]        # kid kicks before freeze
FREEZE = 1.40
BALL_ECHO = [4.5, 5.7, 6.9, 8.1]       # kid kicking alone at the wall
BALL_MATCH = 8.15                      # ball hits wall -> match cut
TAGS_C = [9.2, 10.0, 10.8]             # ??? tags appear
DOOR = 14.2
WHISTLE = 17.05
E_FLIPS = [b(3), b(6), b(9)]           # ? -> check flips
F_ROWS = [b(15) + b(0) - DROP + BEAT * (2 + i) for i in range(6)]
H_STEPS = [b(45) + BEAT * 4 * i for i in range(4)]
GOAL = b(61)
LOGO_HIT = b(77)
SILENCE_LINE = 56.25                   # second sentence in silence
