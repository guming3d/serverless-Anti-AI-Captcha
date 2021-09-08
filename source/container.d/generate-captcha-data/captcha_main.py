"""
    The main file to generate captcha images. Caller of this file should give required arguments for this main file to
    create caller preferred captcha images.

    The main procedure includes the 3 steps:
    1. Use the CN font and fixed number of chars to generate raw char images;
    2. Add noise to the raw images by adversarying image classification model with DeepRobust library;
    3. Generate formula and composite the nosirized char images to form the final captcha images;

    Potential options as arguments:
    0. Overall customer arguments
        - Raw customer name string
        - Encrypted customer name to check if AES Key is correct for this customer
    1. call the basis_img_gen.py file:
        # The number of images to generate for each char: Internal para, no need for external setting
        # The path to save images, and the structure should follow the design: Internal para, no need for external setting
        # Use data folder structure as inner para, DELETE ANY PREVIOUS RESULTS BEFORE THE NEXT RUN
        - Other options
    2. call cnn_model_train.py to train a classification model, use cnn_model_noising.py to add noise to each char image:
        - The path to saved images, and the structure should be the same as saving procedure
        - Training-related parameters, batch_size, num_workers, model_name, epoches, lr
        - The path to save trained model, for both py files.
        - The trained model name, and the path of saved model
        - The path to save noised images
    3. call forumla_gen.py, formula_converter.py, and captch_composite.py
        - Check the configures.py for options
        - The path to saved noised images
        - The path to save generated captcha images
        - The number of captcha images to generated
"""

import argparse
import os
import shutil
import torch as th
from tqdm import tqdm

import configures as configs
from utils import check_customer
from basis_img_gen import Basic_vimage_generator
from cnn_model_train import train
from cnn_model_noising import noising
from captcha_composite import Captcha_Compositor, save_captcha
from formula_gen import generate_formula
from formula_converter import Converter


def main(args):
    # Step 0: environment check and setting up
    args.device = "cuda:0" if th.cuda.is_available() else "cpu"
    print("Use device {}".format(args.device))

    args.font_path = './fonts/Baoli.ttc'
    args.raw_char_images_path = './data/raw_char_images'
    args.adv_char_images_path = './data/adv_char_images'
    args.captcha_images_path = './data/captcha_images'
    args.trained_models_path = './data/trained_models'

    if os.path.exists(args.raw_char_images_path):
        shutil.rmtree(args.raw_char_images_path)
        os.mkdir(args.raw_char_images_path)

    if os.path.exists(args.adv_char_images_path):
        shutil.rmtree(args.adv_char_images_path)
        os.mkdir(args.adv_char_images_path)

    if os.path.exists(args.captcha_images_path):
        shutil.rmtree(args.captcha_images_path)
        os.mkdir(args.captcha_images_path)

    if os.path.exists(args.trained_models_path):
        shutil.rmtree(args.trained_models_path)
        os.mkdir(args.trained_models_path)

    # Step 1: Char image generation
    char_generator = Basic_vimage_generator(font_path=args.font_path,
                                            save_path=args.raw_char_images_path)

    text_dict = configs.DIGIT_DICT
    char_generator.generate(text_dict, num_imgs=args.num_per_char, is_save=True)

    # Step 2: Add noise to each raw char image
    # Train an image classification
    args.saved_model_name = train(args)

    # Add noise to images
    noising(args)

    # Step 3: Generate captcha images
    compositor = Captcha_Compositor(adv_img_path=args.adv_char_images_path)

    for num in tqdm(range(args.num_captcha_image)):
        # Step 1 generate a formula-answer pair
        f_tree = generate_formula()
        answer = f_tree.get_result()

        # Step 2 convert to Chinese
        converter = Converter(f_tree)
        cn_formula_str = converter.convert_2_cn()

        # Step 3 Generate the captcha image
        captcha_img = compositor.generate_captcha(cn_formula_str)

        # Step 4 Save to save path
        save_captcha(captcha_img, cn_formula_str, answer, args.captcha_images_path, args.key)

        # Step 5 output logs
        if (num + 1) % 100 == 0:
            print('Generate {} captcha images ...'.format(num))


if __name__ == '__main__':
    parse = argparse.ArgumentParser('Arithmetic formula-based captcha generation program')
    parse.add_argument('--customer_name', type=str, default=None, required=True,
                       help='The name string of customer used in registration')
    parse.add_argument('--encrypted_name', type=str, default=None, required=True,
                       help='The encrypted customer name, using given Key to do AES encryption for raw customer name')
    # parse.add_argument('--is_regenerate_char', type=int, default=1, required=True,
    #                    help='If need to regenerate new char images, 1 for yes, 0 for no, default=1')
    # parse.add_argument('--adv_char_images_path', type=str, default=None,
    #                    help='External adv char images path. If require to regenerate, must provide this argument. And'
    #                         'should be an S3 location, starting with s3:. Default=None')
    parse.add_argument('--num_per_char', type=int, default=100,
                       help='The number of images generated per char, default=100')
    parse.add_argument('--model_name', type=str, default='VGG',
                       help='The name of CNN model for image classification, default=VGG')
    parse.add_argument('--adv_model_name', type=str, default='deepfool',
                       help='The name of adversary model name, default=deepfool')
    parse.add_argument('--num_captcha_image', type=int, default=10000,
                       help='The total number of captcha images to generate, default=10000')
    # parse.add_argument('--output_path', type=str, default=None, required=True,
    #                    help='The file path to copy captcha images to. If use S3, should start with s3:, else consider'
    #                         'it as a local file path. Default is None, means not copy')

    args = parse.parse_args()
    # print(args)

    # Security check first
    is_valid_customer, key = check_customer(args.customer_name, args.encrypted_name)
    if not is_valid_customer:
        raise Exception('Incorrect customer name or encryption ...')
        sys.exit(2)
    else:
        args.key = key

    # Pass security check
    main(args)
