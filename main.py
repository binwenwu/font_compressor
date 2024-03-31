#!/usr/bin/python
# coding=UTF-8

import sys
import json
import os
from fontTools import subset

'''
source_font: 全量TTF字体源文件
json_file: 字段的json文件
out_file: 导出的字体文件
'''
def generate(source_font, json_file, out_file):
    all_chars = []
    checker = {}
    with open(json_file, 'r', encoding='utf-8') as f:
        text_data = json.load(f)

        for key, value in text_data.items():
            for char in value:
                uid = ord(char)
                if uid not in checker:
                    checker[uid] = True
                    all_chars.append(char)

    #所有文本
    text = ''.join(all_chars)

    #TTF源文
    #font = TTFont(source_font)  NOTE: 这一版在源文件不变的情况下 生成的字体包md5会发生变化 改成下边这种方式
    font = subset.load_font(source_font, subset.Options())

    #挑出需要的字符
    subsetter = subset.Subsetter()
    subsetter.populate(text=text)
    subsetter.subset(font)

    # 生成输出文件
    subset.save_font(font, out_file, subset.Options())

    font.close()

if __name__ == '__main__':

    source_font = "./Milky-Han-Mono-CN-Heavy.ttf"
    json_file = "./Milky-Han-Mono-CN-Heavy.json"
    out_file = "./Milky-Han-Mono-CN-Heavy-Compress.ttf"

    generate(source_font, json_file, out_file)

