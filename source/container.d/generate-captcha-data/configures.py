"""
    File to contain constants of basic configurations

"""

# Constants of formula generation
NUM_DIGIT_MAX = 3
RESULT_MAX = 10000

OP_CANDIDATE = ['+', '-', '*']
IS_ABS = True
NUM_OPS_MAX = 3

# Constants of text converter
NUM_MAP = {
    0: '零',
    1: '一',
    2: '二',
    3: '三',
    4: '四',
    5: '五',
    6: '六',
    7: '七',
    8: '八',
    9: '九'
}

DIGIT_MAP = {
    0: '',
    1: '十',
    2: '百',
    3: '千',
    4: '万',
    5: '十万',
    6: '百万',
    7: '千万',
    8: '亿'
}

OP_MAP = {
    '+': ['加', '加上','的和'],
    '-': ['减', '减去','的差'],
    '*': ['乘', '乘上','乘以','的积'],
    'abs': '的绝对值'
}

CONN_MPA = {
    'and': '与',
    'then': '再'
}

# Constants of Character variant
ROT_RANGE = 10                       # in degree
SCALE_RANGE = 0.5                   # in percentage

# Constants of verification images
BK_WIDTH = 500                      # in pixel
BK_HEIGHT = 50                      # in pixel
X_RANGE = 10                        # in pixel
Y_RANGE = 5                         # in pixel

# TODO: Constants of visible noise lines
NUM_BARS = 12

# Constants of Chinese chararacters for OCR. Here just build a dictionary to match all CN chars above.
DIGIT_DICT = {
    0: '零',
    1: '一',
    2: '二',
    3: '三',
    4: '四',
    5: '五',
    6: '六',
    7: '七',
    8: '八',
    9: '九',
    10: '十',
    11: '百',
    12: '千',
    13: '万',
    14: '亿',
    15: '加',
    16: '上',
    17: '的',
    18: '和',
    19: '减',
    20: '去',
    21: '差',
    22: '乘',
    23: '以',
    24: '积',
    25: '绝',
    26: '对',
    27: '值',
    28: '与',
    29: '再'
}

CHAR_DICT = {
    '零': 0,
    '一': 1,
    '二': 2,
    '三': 3,
    '四': 4,
    '五': 5,
    '六': 6,
    '七': 7,
    '八': 8,
    '九': 9,
    '十': 10,
    '百': 11,
    '千': 12,
    '万': 13,
    '亿': 14,
    '加': 15,
    '上': 16,
    '的': 17,
    '和': 18,
    '减': 19,
    '去': 20,
    '差': 21,
    '乘': 22,
    '以': 23,
    '积': 24,
    '绝': 25,
    '对': 26,
    '值': 27,
    '与': 28,
    '再': 29
}

# Constants for authorization
SECRETE_PHRASE = 'AWS GCR CAPTCHA SOLUTION'
PADDING = '#'
CUSTOMER_MAP = {
    'test_account': 'f0eeb0d35c0b014bb7141e80b9089e7e'
}
