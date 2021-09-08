import os

import torch as th
from PIL import Image
from torch.utils.data import Dataset


class CharImageDataset(Dataset):
    """
    Char image dataset, which is stored in the data path with the folder structure as:
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
    """
    def __init__(self, char_map, data_path='../data4test', transform=None):
        # set image to label mapping
        self.char_map = char_map
        # get the information of all data
        self.data_path = data_path
        self.data_info, self.num_classes = self.get_data_info(self.data_path, self.char_map)
        # set the transform methods
        self.transform = transform

    def __getitem__(self, index):
        img_path, label_digit = self.data_info[index]
        img = Image.open(img_path)

        if self.transform is not None:
            img = self.transform(img)
        else:
            img = th.Tensor(img)

        return img, label_digit

    def __len__(self):
        return len(self.data_info)

    def get_classes(self):
        return self.num_classes

    # @staticmethod
    def get_data_info(self, data_path, char_map):
        # data info is a list of tuples. Each tuple has two elements: one is the image path, another is the label digit
        data_info = []
        num_classes = 1

        for root, dirs, files in os.walk(data_path):
            for sub_dir in dirs:
                num_classes += 1

                img_names = os.listdir(os.path.join(root, sub_dir))
                label_digit = char_map[sub_dir]

                for img in img_names:
                    img_path = os.path.join(root, sub_dir, img)
                    data_info.append((img_path, label_digit))

        return data_info, num_classes

