"""
    Converter to translate the formula tree to a Chinese string, describing the formula
"""

import numpy as np
import configures as configs
import formula_gen as fgen
from formula_gen import BT_Node
from utils import convert_num, convert_op


class Converter():

    def __init__(self, input_ftree):
        self.input_ftree = input_ftree

    def convert_2_cn(self):
        """
        Convert the input formula tree into a Chinese string to describe this formula

        :return:
            A Chinese string of the formula
        """
        formula_str = ''
        input_node = self.input_ftree.root.left

        formula_str = self._convert_ftree(input_node)

        # process absolute value
        if self.input_ftree.root.right is not None:
            formula_str = formula_str + configs.OP_MAP['abs']

        return formula_str

    def _convert_ftree(self, input_node):
        """
            Need to make some randomness of operations.
        """
        if input_node.is_leaf():
            num_cn = convert_num(input_node.value)
            return num_cn
        else:
            left_cn = self._convert_ftree(input_node.left)
            right_cn = self._convert_ftree(input_node.right)

            # make random for middle first tranversal or right first traversal
            op_unit_cn = ''
            op_cn, is_comb = convert_op(input_node.value)

            if is_comb:
                op_unit_cn = left_cn + configs.CONN_MPA['and'] + right_cn + op_cn + configs.CONN_MPA['then']
            else:
                op_unit_cn = left_cn + op_cn + right_cn + configs.CONN_MPA['then']

            # Post process
            if op_unit_cn[-1] == configs.CONN_MPA['then']:
                op_unit_cn = op_unit_cn[:-1]

            return op_unit_cn


if __name__ == '__main__':
    # for local test only
    f_tree = fgen.generate_formula()

    converter = Converter(f_tree)
    print(converter.convert_2_cn())