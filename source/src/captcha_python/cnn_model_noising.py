"""
    Use adversary techiques to add noise to char images against classification models
"""

import argparse
import os.path

import numpy as np
import torch as th
import matplotlib
from PIL import Image
import matplotlib.pyplot as plt
matplotlib.rcParams['font.family'] = ['Baoli SC']

from torch.utils.data import DataLoader
from deeprobust.image.attack.deepfool import DeepFool
from torchvision import transforms
from dataset import CharImageDataset
from cnn_models.models import VCNN, LeNet, AlexNet, VGG
import configures as configs


def char_transformer():
    transformings = transforms.Compose([
        transforms.Resize((32, 32)),
        transforms.ToTensor()
    ])
    return transformings


def noising(args, is_display=False, is_save=True):

    # 1. Process dataset
    chardata = CharImageDataset(data_path=args.raw_char_images_path,
                                char_map=configs.CHAR_DICT,
                                transform=char_transformer())
    num_classes = chardata.get_classes()

    adv_dataloader = DataLoader(dataset=chardata,
                                batch_size=1,
                                shuffle=True,
                                num_workers=0)

    # 2. Reload trained models
    if args.model_name == 'VCNN':
        model = VCNN(num_classes=num_classes)
    elif args.model_name == 'LeNet':
        model = LeNet(num_classes=num_classes)
    elif args.model_name == 'AlexNet':
        model = AlexNet(num_classes=num_classes)
    elif args.model_name == 'VGG':
        model = VGG(num_classes=num_classes)
    else:
        raise Exception('Only support VCNN, LeNet, AlexNet, and VGG...')

    model_path = os.path.join(args.trained_models_path, args.saved_model_name)
    model_stat = th.load(model_path, map_location=args.device)
    model.load_state_dict(model_stat)
    model = model.to(args.device)

    # 3. Define adversary method
    adversary = DeepFool(model, device=args.device)

    # 4. Loop through all images to add adversary noise
    advimg_list = []
    label_list = []

    for i, (img, label) in enumerate(adv_dataloader):
        # for test and debug only
        # if i > 0:
        #     break

        # add noise to image
        adv_img = adversary.generate(img.float(), label)
        adv_img = th.clamp(adv_img, 0., 1.)
        pred = model(adv_img)

        ori_img_np = img.numpy()[0]
        adv_img_np = adv_img.detach().numpy()[0]

        ori_label = configs.DIGIT_DICT[label.numpy()[0]]
        adv_label = configs.DIGIT_DICT[th.argmax(pred, dim=-1).detach().numpy()[0]]

        if is_display:
            display_images(ori_img_np, ori_label, adv_img_np, adv_label)

        # special operation to convert numpy array to Pillow
        adv_img_PIL = Image.fromarray(np.uint8((adv_img_np * 255).transpose(1, 2, 0)), 'RGB')

        advimg_list.append(adv_img_PIL)
        label_list.append(ori_label)

        if ((i + 1) % 10) == 0:
            print('Noising and saving {} char images ...'.format(i))
            if is_save:
                save_advimg(args.adv_char_images_path, advimg_list, label_list)

            advimg_list = []
            label_list = []

    if len(advimg_list) > 0:
        save_advimg(args.adv_char_images_path, advimg_list, label_list)


def save_advimg(save_path, img_list, label_list):
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
    if not os.path.exists(save_path):
        os.makedirs(save_path)

    for img, char in zip(img_list, label_list):
        # check if the char folder exists
        char_path = os.path.join(save_path, char)
        if not os.path.exists(char_path):
            os.makedirs(char_path)

        # save the image to corresponding folder
        file_name = os.path.join(char_path, char + '_adv_{:06d}'.format(np.random.randint(1, 100000)) + '.png')
        img.save(file_name, 'PNG')


def display_images(ori_img, ori_label, adv_img, adv_label):
    # reverse channel from 1st to the last
    ori_img = ori_img.transpose(1, 2, 0)
    adv_img = adv_img.transpose(1, 2, 0)

    # below operation is only work for 1 channel gray images
    # ori_img = np.concatenate([ori_img, ori_img, ori_img], axis=-1)
    # adv_img = np.concatenate([adv_img, adv_img, adv_img], axis=-1)

    plt.rc('font', size=16)

    # set suplot grid
    plt.subplot(1, 2, 1)
    plt.imshow(ori_img)
    plt.xlabel('True label: {}'.format(ori_label))
    plt.subplot(1, 2, 2)
    plt.imshow(adv_img)
    plt.xlabel('Adv label: {}'.format(adv_label))

    dif = (ori_img - adv_img) ** 2
    sqe = np.sqrt(dif).sum()
    plt.suptitle('MSE of ori vs adv: {:4f}'.format(sqe))

    plt.show()


# if __name__ == '__main__':
#     parser = argparse.ArgumentParser("Add noises to char image classification models")
#     parser.add_argument('--data_path', type=str, default='../data4test',
#                         help='The train data path, defaut=../data4test')
#     parser.add_argument('--gpu', type=int, default=-1,
#                         help='The GPU device ID, default=-1, using CPU')
#     parser.add_argument('--model_name', type=str, default='VGG',
#                         help='The name of CNN model, options: VCNN, LeNet, AlexNet, VGG, default=VGG')
#     parser.add_argument('--model_path', type=str, default='../outputs/models/VGG_047408.pth',
#                         help='The save model path, default=../outputs/models')
#     parser.add_argument('--save_path', type=str, default='../outputs/adv_img',
#                         help='The save model path, default=../outputs/adv_img')
#
#     args = parser.parse_args()
#     print(args)
#     noising(args, is_display=True)
