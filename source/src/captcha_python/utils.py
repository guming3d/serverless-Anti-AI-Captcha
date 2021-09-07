"""
    Various utility functions for different files
"""

import secrets
import codecs
import numpy as np
import base64

import scrypt
from Crypto.Cipher import AES

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


def check_customer(customer_name, encrypted_name):
    # Get the key
    if configs.CUSTOMER_MAP.get(customer_name) is None:
        return False, ''
    else:
        hex_key_str = configs.CUSTOMER_MAP.get(customer_name)
        key = bytes.fromhex(hex_key_str)

    # Decrypt the encrpted name with the given customer_name
    decrypt_customer_name = decrypt_fn(key, encrypted_name)

    if decrypt_customer_name == customer_name:
        return True, key
    else:
        return False, ''


def encrypt_fn(key, text):
    # Padding text to be 16 chars long, or times of 16
    while len(text) % 16 != 0:
        text += configs.PADDING
    pad_text = str.encode(text)

    # Encrypt the text with ECB mode by the given key
    aes = AES.new(key, AES.MODE_ECB)
    encrypt_aes = aes.encrypt(pad_text)
    encrypt_text = str(base64.encodebytes(encrypt_aes), encoding='utf-8')

    return encrypt_text


def decrypt_fn(key, encrypt_text):
    # decrypt text
    aes = AES.new(key, AES.MODE_ECB)
    base64_decrypted = base64.decodebytes(encrypt_text.encode(encoding='utf-8'))
    decrypted_text = str(aes.decrypt(base64_decrypted), encoding='utf-8')

    # remove the padding chars '#'
    text = decrypted_text.replace(configs.PADDING, '')

    return text


def generate_customer_key(customer_name):
    # get a salt
    salt = secrets.token_bytes(32)
    phrase = customer_name + configs.SECRETE_PHRASE

    raw_key = scrypt.hash(phrase, salt, N=2048, r=8, p=1, buflen=16)
    # print(raw_key)
    key = raw_key.hex()

    return key


if __name__ == '__main__':
    # for test only
    # test_key = generate_customer_key('test_account')
    # print(test_key)
    # print(bytes.fromhex(test_key))

    key = bytes.fromhex(configs.CUSTOMER_MAP['test_account'])

    encrypt_text = encrypt_fn(key, 'test_account')
    print(encrypt_text)
    text = decrypt_fn(key, encrypt_text)
    print(text)
