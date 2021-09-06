"""
    Model training and saving file for char image classification.

"""

import os
import argparse
import numpy as np
import torch as th
import torchvision.transforms as transforms
from torch.utils.data import DataLoader

from dataset import CharImageDataset
from cnn_models.models import VCNN, LeNet, AlexNet, VGG
import configures as configs


def char_transformer():
    transformings = transforms.Compose([
        transforms.Resize((32, 32)),
        transforms.ToTensor()
    ])
    return transformings


def train(args):
    # 0. Mis part
    device = "cuda:{}".format(args.gpu) and th.cuda.is_available() if args.gpu >= 0 else "cpu"
    print("Use device {}".format(device))

    # 1. Process dataset
    chardata = CharImageDataset(char_map=configs.CHAR_DICT, transform=char_transformer())
    num_classes = chardata.get_classes()

    tr_dataloader = DataLoader(dataset=chardata,
                               batch_size=args.batch_size,
                               shuffle=True,
                               num_workers=args.num_worker)

    # 2. Define models
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

    model = model.to(device)

    # 3. Define training components
    loss_fn = th.nn.CrossEntropyLoss().to(device)
    optim = th.optim.Adam(model.parameters(), lr=args.lr)

    # 4. Train loop
    patience = 0
    for epoch in range(args.epoches):
        model.train()
        for i, (img, labels) in enumerate(tr_dataloader):
            logits = model(img)

            tr_loss = loss_fn(logits, labels)
            tr_acc = (th.argmax(logits, dim=-1) == labels).sum() / labels.shape[0]

            optim.zero_grad()
            tr_loss.backward()
            optim.step()

        print('In epoch {:03d}, training loss: {:.6f}, and train acc: {:.6f}'.format(epoch, tr_loss, tr_acc))

        if tr_acc == 1.0:
            patience += 1
            if patience > 10:
                break

    # Save the trained model for adversary training
    model_stat = model.state_dict()
    model_name = os.path.join(args.save_path, args.model_name + '_{:06d}'.format(np.random.randint(0, 100000)) + '.pth')
    th.save(model_stat, model_name)


if __name__ == '__main__':
    parser = argparse.ArgumentParser("Char image classification training codes")
    parser.add_argument('--data_path', type=str, default='../data4test',
                        help='The train data path, defaut=../data4test')
    parser.add_argument('--gpu', type=int, default=-1,
                        help='The GPU device ID, default=-1, using CPU')
    parser.add_argument('--batch_size', type=int, default=256,
                        help='The size of mini-batch, default=256')
    parser.add_argument('--num-worker', type=int, default=0,
                        help='The number of dataloader workers, default=0')
    parser.add_argument('--model_name', type=str, default='VGG',
                        help='The name of CNN model, options: VCNN, LeNet, AlexNet, VGG, default=VGG')
    parser.add_argument('--epoches', type=int, default=100,
                        help='The max number of training epoches, default=100')
    parser.add_argument('--lr', type=float, default=0.001,
                        help='Learning rate of training, default=1e-3')
    parser.add_argument('--save_path', type=str, default='../outputs/models',
                        help='The save model path, default=../outputs/models')

    args = parser.parse_args()
    print(args)
    train(args)