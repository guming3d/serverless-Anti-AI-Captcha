"""
    The final step to composite the adv char images to one image, and then
    add visible noises to form the final captcha image.

    2021/08/17: James extend this method to include the 1st and 2nd steps to form a real time generation component.

"""

import argparse
import os.path
import numpy as np
import configures as configs
import matplotlib.pyplot as plt

from PIL import Image, ImageDraw
from tqdm import tqdm

from utils import encrypt_fn

from formula_gen import generate_formula
from formula_converter import Converter


class Captcha_Compositor():

    def __init__(self,
                 width=configs.BK_WIDTH,
                 height=configs.BK_HEIGHT,
                 bk_color='b',
                 adv_img_path='./data/adv_images_path'):
        self.width = width
        self.height = height
        self.adv_img_path = adv_img_path

        if bk_color == 'b':
            self.bk_color = (0, 0, 0)
        elif bk_color == 'w':
            self.bk_color = (255, 255, 255)
        elif bk_color == 'g':
            self.bk_color = (128, 128, 128)
        else:
            raise Exception('Only support b=black, w=white, and g=gray back ground color options. ')

        # TODO: set the random variables for the visible bar noises

    def generate_captcha(self, cn_algorithm_str=None, is_display=False):

        bk_img = self._gen_background()

        basic_img, right_edge = self._composite(bk_img, cn_algorithm_str)

        captcha_img = self._add_bar_noise(basic_img, right_edge)

        if is_display:
            plt.imshow(captcha_img)
            plt.show()

        return captcha_img

    def _gen_background(self):
        # bk_img = Image.effect_noise((self.width, self.height), sigma=1.)
        bk_img = Image.new('RGB', (self.width, self.height), color=self.bk_color)

        return bk_img

    def _composite(self, bk_img, cn_algorithm_str=None):
        # Set initial X, Y position
        W, H = bk_img.size
        X = 0

        for char in cn_algorithm_str:
            adv_img_path = os.path.join(self.adv_img_path, char)
            char_img = self._pick_one_img(adv_img_path)

            w, h = char_img.size
            X, Y = self._set_position(w, h, X, W, H)

            bk_img.paste(char_img, (X, Y))
            X = X + w

        return bk_img, X

    def _add_bar_noise(self, basic_img, right_edge):
        W, H = basic_img.size

        img_draw = ImageDraw.Draw(basic_img)
        num_bars = np.random.randint(int(configs.NUM_BARS / 4), configs.NUM_BARS)

        for num in range(num_bars):

            X_0 = np.random.randint(0, right_edge)
            Y_0 = np.random.randint(0, H)
            lenght = int(W * 0.1)
            X_1 = X_0 + np.random.randint(lenght)
            Y_1 = Y_0 + np.random.randint(-lenght, lenght)
            width = np.random.randint(0, 5)
            # img_draw.line([(Xs[0], Ys[0]), (Xs[1], Ys[1])], fill='white', width=width)
            img_draw.line([(X_0, Y_0), (X_1, Y_1)], fill='white', width=width)

        return  basic_img

    def _pick_one_img(self, img_path):
        imgs = os.listdir(img_path)
        num_imgs = len(imgs)
        rand_num = np.random.randint(0, num_imgs)

        img_path = os.path.join(img_path, imgs[rand_num])
        img = Image.open(img_path)

        return img

    def _set_position(self, w, h, X, W, H):
        # set X value
        X = np.random.randint(-configs.X_RANGE, configs.X_RANGE) + X
        # handle corner cases
        if X < 0:
            X = 0
        elif X > W:
            X = W - w

        # set Y value
        Y = np.random.randint(-configs.Y_RANGE, configs.Y_RANGE) + int(H / 2)
        Y = Y - int(h / 2)
        # handle corner cases
        if Y < 0:
            Y = 0
        elif Y > H:
            Y = H - h

        return X, Y


def save_captcha(captcha_img, formula, answer, save_path, customer_key):
    """
    Save the captcha image and answer to local disk in the same folder structure.
    The file name of the captcha image include 2 parts: hashcode of the image + '_' + answer

    :param captcha_img:
    :param formula
    :param answer:
    :param save_path:
    :param customer_key:
    :return:
    """
    # create file name
    hashcode = hash(str(np.asarray(captcha_img).tolist()))

    encrypted_answer = encrypt_fn(customer_key, str(answer))
    file_name = str(hashcode) + '_' + encrypted_answer + '.png'
    file_path = os.path.join(save_path, file_name)

    # save image
    captcha_img.save(file_path, 'PNG')


# if __name__ == '__main__':
#     parser = argparse.ArgumentParser("Captch image composition codes.")
#     parser.add_argument('--image_path', type=str, default='../outputs/adv_img',
#                         help='The adv image path, defaut=../outputs/adv_img')
#     parser.add_argument('--save_path', type=str, default='../outputs/captcha',
#                         help='The save captcha path, default=../outputs/captcha')
#     parser.add_argument('--num_captcha', type=int, default=8000,
#                         help='The number of captcha images to generate. Default=8000')
#     parser.add_argument('--is_save', type=int, default=1,
#                         help='If save the genrated captcha image to local disk, 0=not save, 1=save, default=1')
#
#     args = parser.parse_args()
#     print(args)
#
#     if not os.path.exists(args.save_path):
#         os.mkdir(args.save_path)
#
#     compositor = Captcha_Compositor(adv_img_path=args.image_path)
#
#     for num in tqdm(range(args.num_captcha)):
#         # Step 1 generate a formula-answer pair
#         f_tree = generate_formula()
#         answer = f_tree.get_result()
#
#         # Step 2 convert to Chinese
#         converter = Converter(f_tree)
#         cn_formula_str = converter.convert_2_cn()
#
#         # Step 3 Generate the captcha image
#         captcha_img = compositor.generate_captcha(cn_formula_str)
#
#         # Step 4 Save to save path
#         if args.is_save:
#             save_captcha(captcha_img, cn_formula_str, answer, args.save_path)
#
#             # Step 5 output logs
#             if (num + 1) % 100 == 0:
#                 print('Generate {} captcha images, and save to {}'.format(num, args.save_path))
