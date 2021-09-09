"""
    First to build a very simple version of the verification image.
    1. One by one char in a string of the CN formula description;
    2. Use the Baoli font for drawing text;
    3. Scale the char image a little bit;
    4. Rotate the char a little bit;
"""

import argparse
import os
import matplotlib.pyplot as plt
import numpy as np
import time
from PIL import Image, ImageDraw, ImageFont

import configures as configs


class Basic_vimage_generator():

    def __init__(self,
                 font_path='./fonts/Baoli.ttc',
                 fg_color=255,
                 bk_color=0,
                 font_size=24,
                 scale_range=configs.SCALE_RANGE,
                 rotate_range=configs.ROT_RANGE,
                 save_path='./'):
        self.font_path = font_path
        self.fg_color=fg_color
        self.bk_color = bk_color
        self.font_size = font_size
        self.scale_range = scale_range
        self.rotate_range = rotate_range
        self.save_path = save_path

    def generate(self, text_dict=None, num_imgs=100, is_save=True):
        if text_dict is None:
            raise Exception('Please sepecify the contents of text dictionary: {}'.format(text_dict))

        img_list = []
        char_list = []
        for index, char in text_dict.items():
            for i in range(num_imgs):
                char_img = self._gen_char_img(char)

                img_list.append(char_img)
                char_list.append(char)

        if is_save:
            self._save_generation(img_list, char_list)

        return img_list, char_list

    def _gen_char_img(self, char):
        """
        Set the style of a char as one, e.g.
        - font size,
        - image scale ratio
        - rotation degree,
        Then base on these style, the caller of this method can draw this char

        :return:
        """
        # create a char size image
        fnt = ImageFont.truetype(self.font_path, self.font_size)
        # use one char to create a char size
        char_size = ImageDraw.Draw(Image.new("L", (0, 0))).textsize(text='占', font=fnt)
        width, height = char_size
        # create a new image with the given char size
        base_img = Image.new("L", (width, self.font_size))
        # create a draw object
        img_draw = ImageDraw.Draw(base_img)
        # draw the char in this new image
        img_draw.text((0, (height - self.font_size) * 2), char, font=fnt, fill=self.fg_color, anchor="lt")
        # img_draw.text((0, 0), char, font=fnt, fill=self.fg_color, anchor="la")

        # scale the base image randomly
        scale_ratio = (np.random.sample() * self.scale_range) * np.random.choice([-1, 1]) + 1
        width, height = base_img.size
        new_width = int(width * scale_ratio)
        new_height = int(height * scale_ratio)

        resize_img = base_img.resize((new_width, new_height))

        # rotate the resized image randomly
        gen_img = Image.new('RGB', (new_width + 5, new_height + 5), color=(self.bk_color, self.bk_color, self.bk_color))

        # rotate the image and paste to generate background
        rotate_angle = int(np.random.sample() * np.random.choice([-1, 1]) * self.rotate_range)
        w = resize_img.rotate(rotate_angle, expand=5)
        gen_img.paste(w, (0, 0), w)

        # plt.imshow(gen_img)
        # plt.show()

        # print('Generated image size: {} of char: {}'.format(gen_img.size, char))

        return gen_img

    def _save_generation(self, img_list, char_list):
        """
        In order to train the adversary model, need to save the generated images for model training.
        :return:
        Save the image files in such directory structure as below:
        - 零
            - 图片1
            - 图片2
            ......
        - 一
            - 图片1
            - 图片2
            ......
        ......
        - 值
            - 图片1
            - 图片2
            ......
        ......
        """
        if not os.path.exists(self.save_path):
            os.makedirs(self.save_path)

        for img, char in zip(img_list, char_list):
            # check if the char folder exists
            char_path = os.path.join(self.save_path, char)
            if not os.path.exists(char_path):
                os.makedirs(char_path)

            # save the image to corresponding folder
            file_name = os.path.join(char_path, char + '{:06d}'.format(np.random.randint(1, 100000)) + '.png')
            img.save(file_name, 'PNG')


# For local test only
# if __name__ == '__main__':
#     parse = argparse.ArgumentParser('Generate basic char images')
#     parse.add_argument('--save_path', type=str,
#                        help='The path to save the generated basic char iamges')
#     parse.add_argument('--num_per_char', type=int, default=100,
#                        help='The number of images generated per char, default=100')
#     args = parse.parse_args()
#     print(args)
#
#     tic = time.time()
#     char_generator = Basic_vimage_generator(save_path=args.save_path)
#
#     text_dict = configs.DIGIT_DICT
#     char_generator.generate(text_dict, num_imgs=args.num_per_char, is_save=True)
#
#     duration = time.time() - tic
#     print('Total use {} seconds'.format(duration))
