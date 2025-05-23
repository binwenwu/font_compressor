[English](README.md) | 简体中文

<h1 align="center">
  <img src="https://cdn.jsdelivr.net/gh/binwenwu/picgo_02/img/icon%2017.05.53.png" alt="Clash" width="128" />
  <br>
Font Compressor
  <br>
</h1>
<h3 align="center">
一款基于 <a href="https://wiki.python.org/moin/PyQt">PyQt</a> 构建的字体压缩软件.
</h3>

# 预览
![](https://cdn.jsdelivr.net/gh/binwenwu/picgo_02/img/20250518170849.png)

# 字体压缩工具
这是一个基于Python的字体压缩工具，可以根据用户提供的文字，从原始字体文件中提取需要的字形，生成体积更小的字体文件。

## 功能特点

- 支持多种字体格式（.ttf, .otf, .woff, .woff2）
- 简洁直观的图形用户界面
- 支持中英文界面切换
- 保留字体的关键特性和布局信息

## 安装要求

1. Python 3.6+
2. 依赖库：
   - fonttools
   - PyQt5

## 安装步骤
> 您可以直接下载版本中的可执行文件，也可以选择自己构建
1. 克隆或下载此仓库
2. 安装依赖：
   ```
   pip install -r requirements.txt
   ```

## 使用方法

1. 运行程序：
   ```
   python main.py
   ```
2. 在界面上选择字体类型（.ttf, .otf等）
3. 点击"浏览"按钮选择要压缩的字体文件
4. 在文本框中输入或粘贴需要保留的文字
5. 选择压缩后字体文件的保存路径
6. 点击"压缩字体"按钮开始压缩
7. 压缩完成后，会在指定路径生成压缩后的字体文件

## 技术原理

本工具使用fontTools库的subset模块实现字体子集化。通过分析用户提供的文本，提取出所需的字符，然后从原始字体中仅保留这些字符对应的字形数据，从而大幅减小字体文件的体积。

## 注意事项

- 压缩后的字体仅包含您指定的字符，其他字符将无法显示
- 建议在压缩前备份原始字体文件
- 某些特殊字体可能存在兼容性问题

## 许可证

MIT 
