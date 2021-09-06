"""
    Functions to generate mathematics formulas for the verification images

"""

import os
import argparse
import numpy as np
import configures as configs
from utils import gen_base_num, gen_an_op


class BT_Node():
    """
    The basic binary tree node.
    """
    def __init__(self, value):
        self.left = None
        self.right = None
        self.value = value

    def is_leaf(self):
        if self.left is None and self.right is None:
            return True
        else:
            return False


class Formula_Tree():

    def __init__(self):
        self.root = BT_Node(None)

    def reset(self):
        self.root = BT_Node(None)

    def add_op_unit(self, left_node, op_node, right_node):
        "It is known that the tree is empty and need to add the 1st op unit"
        op_node.left = left_node
        op_node.right = right_node

        # insert this op node to the root
        self.root.left = op_node

        # compute the result and save to the root's value
        result = self._compute(left_node.value, op_node.value, right_node.value)

        # set the result to root as value
        self.root.value = result

    def add_op(self, op_node, right_node):
        "It is known that the tree has existing ops already"

        # insert the new op node to be the first left node of root
        op_node.right = right_node

        first_left = self.root.left
        op_node.left = first_left

        self.root.left = op_node

        # update the root' value as the latest result
        result = self._compute(self.root.value, op_node.value, right_node.value)
        self.root.value = result

    def is_valid(self):
        """
        Here the logic is odd and need later on to do an abs operation. But just leave this method for other
        validation rules.

        :return:
        """
        if (self.root.value is not None) and abs(self.root.value) < configs.RESULT_MAX:
            return True
        else:
            return False

    def is_empty(self):
        if self.root.value is None:
            return True
        else:
            return False

    def post_process(self):
        if self.is_valid():
            if self.root.value < 0:
                self.root.value = abs(self.root.value)
                self.root.right = BT_Node('abs')

    def output_formula(self):
        """
        Output the formula as a string. The basic idea is a middle traversal.
        :return:
        """
        formula_str = []
        self._mid_traversal(self.root.left, formula_str)

        return formula_str

    def get_result(self):
        return self.root.value

    def _compute(self, left_num, op_str, right_num):
        if op_str == '+':
            result = int(left_num) + int(right_num)
        elif op_str == '-':
            result = int(left_num) - int(right_num)
        elif op_str == '*':
            result = int(left_num) * int(right_num)
        else:
            raise Exception('Only support +, -, and * ...')

        return result

    def _mid_traversal(self, node, formula_str):
        if node is None:
            return

        if node.left is not None:
            self._mid_traversal(node.left, formula_str)

        formula_str.append(str(node.value))

        if node.right is not None:
            self._mid_traversal(node.right, formula_str)


def generate_formula(save_path=None):
    """

    :param args:
    :return:
    """
    # Step 0: pre process
    num_ops = np.random.randint(1, configs.NUM_OPS_MAX)

    # Step 1: for loop to generate the formula
    formula_tree = Formula_Tree()

    while not formula_tree.is_valid():
        formula_tree.reset()

        for i in range(num_ops):

            if formula_tree.is_empty():
                # create two numbers and one op
                op_nums = gen_base_num(2)
                op_str = gen_an_op()
                left_node = BT_Node(op_nums[0])
                op_node = BT_Node(op_str)
                right_node = BT_Node(op_nums[1])

                formula_tree.add_op_unit(left_node, op_node, right_node)
            else:
                # create two numbers and one op
                op_nums = gen_base_num(1)
                op_str = gen_an_op()
                op_node = BT_Node(op_str)
                right_node = BT_Node(op_nums[0])

                formula_tree.add_op(op_node, right_node)

    # Step 3: post proces the formula result
    formula_tree.post_process()

    # print(formula_tree.output_formula())

    # Step 3: save formula to local disk as a file
    # use formula string as file name and formula result as the content
    file_name = ''.join(formula_tree.output_formula())

    if save_path is not None:
        with open(os.path.join(save_path, file_name + '.txt'), 'x') as f:
            f.write(str(formula_tree.output_formula()) + '\t' + str(formula_tree.get_result()))

    # Step 4: return the formula binary tree
    return formula_tree


if __name__ == '__main__':
    parser = argparse.ArgumentParser('Mathematical formula generation program')
    parser.add_argument("--save_path", type=str, default='../data4test')

    args = parser.parse_args()
    print(args)

    generate_formula(args.save_path)