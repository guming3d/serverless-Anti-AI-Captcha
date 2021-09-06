"""
    The main file to generate captcha images. Caller of this file should give required arguments for this main file to
    create caller preferred captcha images.

    The main procedure includes the 3 steps:
    1. Use the CN font and fixed number of chars to generate raw char images;
    2. Add noise to the raw images by adversarying image classification model with DeepRobust library;
    3. Generate formula and composite the nosirized char images to form the final captcha images;

    Potential options as arguments:
    1. call the basis_img_gen.py file:
        - The number of images to generate for each char
        - The path to save images, and the structure should follow the design
        - Other options
    2. call cnn_model_train.py to train a classifcation model, use cnn_model_noising.py to add noise to each char image:
        - The path to saved images, and the structure should be the same as saving procedure
        - Training-related parameters, batch_size, num_workers, model_name, epoches, lr
        - The path to save trained model, for both py files.
        - The trained model name, and the path of saved model
        - The path to save noised images
    3. call forumla_gen.py, formula_converter.py, and captch_composite.py
        - Check the configures.py for options ???
        - The path to saved noised images
        - The path to save generated captcha images
        - The number of captcha images to generated
"""

import argparse


if __name__ == '__main__':
    pass
