"""
    For the char classification task, use 3 classic small CNN models from the DeepRobust library:
    - Vanilla CNN: copied from DeepRobust
    - LeNet: Rewrite the online version
    - AlexNet: copied from PyTorch github
    - VGG11: copied from DeepRobust
    Because our input char images are small (max 40*40 pixels) compared to popular images, e.g. ImageNet, models here
    is relatively small too. We didn't choose very deep models, like ResNet or Inception.

    To best fit all models and given that our generated char image are normally around 20~40 pixels, here we use:
    input dim: N * 32 * 32 * 3
    output dim: 30, the number of chars in the configures.py

"""

import torch as th
import torch.nn as nn
import torch.nn.functional as F


class VCNN(nn.Module):
    """
    The vanilla CNN that only has 2 layers of CNN and 2 layers of FC. Also modify the input dimensions to fit our
    char images.
    input dim = N * 32 * 32 * 3
    output dim= N * 30
    """

    def __init__(self, in_channel=3, num_classes=30):
        super(VCNN, self).__init__()

        # define two convolutional layers
        self.conv1 = nn.Conv2d(in_channels=in_channel,
                               out_channels=32,
                               kernel_size=5,
                               stride=1,
                               padding=(2, 2))
        self.conv2 = nn.Conv2d(in_channels=32,
                               out_channels=64,
                               kernel_size=3,
                               stride=1,
                               padding=(1, 1))

        # define two linear layers
        self.fc1 = nn.Linear((64 * 8 * 8), 1024)
        self.fc2 = nn.Linear(1024, num_classes)

    def forward(self, x):
        # Conv layers
        x = F.relu(self.conv1(x))                           # N * 32 * 32 * 32
        x = F.max_pool2d(x, 2, 2)                           # N * 32 * 16 * 16
        x = F.relu(self.conv2(x))                           # N * 64 * 18 * 18
        x = F.max_pool2d(x, 2, 2)                           # N * 64 * 8 * 8

        # FC layers
        x = x.view(-1, 8 * 8 * 64)
        x = F.relu(self.fc1(x))
        logits = self.fc2(x)

        # Return logits
        return logits


class LeNet(nn.Module):
    """
    Modified the official PyTorch LeNet5 codes with different dimensions to fit our char images.
    """
    def __init__(self, in_channel=3, num_classes=30):
        super(LeNet, self).__init__()
        # Feature map extractor layers
        self.feature_extractor = nn.Sequential(
            nn.Conv2d(in_channels=in_channel, out_channels=6, kernel_size=5, stride=1),         # N * 6 * 28 * 28
            nn.Tanh(),
            nn.AvgPool2d(kernel_size=2),                                                        # N * 6 * 14 * 14
            nn.Conv2d(in_channels=6, out_channels=16, kernel_size=5, stride=1),                 # N * 16 * 10 * 10
            nn.Tanh(),
            nn.AvgPool2d(kernel_size=2),                                                        # N * 16 * 5 * 5
            nn.Conv2d(in_channels=16, out_channels=120, kernel_size=5, stride=1),               # N * 120 * 1 * 1
            nn.Tanh()
        )
        # FC layers
        self.classifier = nn.Sequential(
            nn.Linear(in_features=120, out_features=84),
            nn.Tanh(),
            nn.Linear(in_features=84, out_features=num_classes),
        )

    def forward(self, x):
        # Conv layers
        x = self.feature_extractor(x)
        # Reshape to 1D
        x = th.flatten(x, 1)
        # FC layers
        logits = self.classifier(x)
        # Return logits
        return logits


class AlexNet(nn.Module):
    def __init__(self, in_channel=3, num_classes=30):
        super(AlexNet, self).__init__()

        self.feat_extractor = nn.Sequential(
            nn.Conv2d(in_channel, 64, kernel_size=7, stride=1, padding=2),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=3, stride=2),
            nn.Conv2d(64, 192, kernel_size=5, padding=2),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=3, stride=2),
            nn.Conv2d(192, 384, kernel_size=3, padding=1),
            nn.ReLU(inplace=True),
            nn.Conv2d(384, 256, kernel_size=3, padding=1),
            nn.ReLU(inplace=True),
            nn.Conv2d(256, 256, kernel_size=3, padding=1),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=3, stride=2),
        )
        self.avgpool = nn.AdaptiveAvgPool2d((6, 6))
        self.classifier = nn.Sequential(
            nn.Dropout(),
            nn.Linear(256 * 6 * 6, 4096),
            nn.ReLU(inplace=True),
            nn.Dropout(),
            nn.Linear(4096, 4096),
            nn.ReLU(inplace=True),
            nn.Linear(4096, num_classes),
        )

    def forward(self, x):
        x = self.feat_extractor(x)
        x = self.avgpool(x)
        x = th.flatten(x, 1)
        x = self.classifier(x)
        return x


class VGG(nn.Module):
    """
    Modify the VGG11 model with different dimensions to fit out char images
    """
    cfg = {
        'VGG11': [64, 'M', 128, 'M', 256, 256, 'M', 512, 512, 'M', 512, 512, 'M'],
        'VGG13': [64, 64, 'M', 128, 128, 'M', 256, 256, 'M', 512, 512, 'M', 512, 512, 'M'],
        'VGG16': [64, 64, 'M', 128, 128, 'M', 256, 256, 256, 'M', 512, 512, 512, 'M', 512, 512, 512, 'M'],
        'VGG19': [64, 64, 'M', 128, 128, 'M', 256, 256, 256, 256, 'M', 512, 512, 512, 512, 'M', 512, 512, 512, 512,
                  'M'],
    }

    def __init__(self, in_channel=3, vgg_name='VGG11', num_classes=30):
        super(VGG, self).__init__()
        self.features = self._make_layers(in_channel=in_channel, vgg_name=vgg_name)
        self.classifier = nn.Linear(512, num_classes)

    def _make_layers(self, in_channel=3, vgg_name='VGG11'):
        layers = []
        in_channels = in_channel
        cfg = self.cfg[vgg_name]
        for x in cfg:
            if x == 'M':
                layers += [nn.MaxPool2d(kernel_size=2, stride=2)]
            else:
                layers += [nn.Conv2d(in_channels, x, kernel_size=3, padding=1),
                           nn.BatchNorm2d(x),
                           nn.ReLU(inplace=True)]
                in_channels = x
        layers += [nn.AvgPool2d(kernel_size=1, stride=1)]
        return nn.Sequential(*layers)

    def forward(self, x):

        x = self.features(x)
        x = x.view(x.size(0), -1)
        logits = self.classifier(x)

        return logits


# For local test only
if __name__ == '__main__':
    # model = VCNN()
    # model = LeNet()
    # model = AlexNet()
    model = VGG(3, 'VGG11')

    inputs = th.ones(4, 3, 32, 32)
    out = model(inputs)
    print(out.shape)