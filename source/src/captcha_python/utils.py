"""
    Various utility functions for different files
"""

import math
import numpy as np

import configures as configs


def gen_base_num(num_of_num=1):
    """
        Within the range set in configuration, generate a number list with the given number of of numbers.
        This function only return hundreds and tens number.

    :param num_of_num: The number of numbers to be generation
    :return: a list with generated tens or hundreds
    """

    nums = []
    for i in range(num_of_num):

        num = np.random.randint(1, 10)
        digit = np.random.randint(1, configs.NUM_DIGIT_MAX)

        anum = num * (10 ** digit)

        nums.append(anum)

    return nums


def gen_an_op():
    "Randomly pick one ops from the candidate list"

    return np.random.choice(configs.OP_CANDIDATE, 1)[0]


def convert_num(input_num):
    "Convert the input number into Chinese. Assume the input number is smaller than 1000."
    max_digit = 4

    if input_num > 10 ** max_digit:
        raise Exception('Can only process numbers that less than 1000...')

    num = input_num
    out_str = []

    for i in range(max_digit, -1, -1):
        digit = num // (10**i)
        cn_num = configs.NUM_MAP[digit]

        # process 0
        if digit == 0:
            if not out_str:
                continue
            else:
                if out_str[-1] == configs.NUM_MAP[0]:
                    continue
                else:
                    out_str.append(cn_num)
        else:
            out_str.append(cn_num)
            cn_digit = configs.DIGIT_MAP[i]
            out_str.append(cn_digit)

        # reduce the number to the next digit
        num = num - digit * (10 ** i)

    # post process the CN string
    if out_str[-1] == configs.NUM_MAP[0]:
        out_str.pop(-1)

    return ''.join(out_str)


def convert_op(input_op):
    "convert operation symble to chinese terms, and identify if an ordered or final combination."

    op_cn_candidates = configs.OP_MAP[input_op]

    length = len(op_cn_candidates)
    choice = np.random.randint(length)

    is_comb = False
    if choice == (length - 1):
        is_comb = True

    return op_cn_candidates[choice], is_comb


if __name__ == '__main__':
    # for test only
    input_num = 50
    print(convert_num(input_num))