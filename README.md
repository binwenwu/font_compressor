English | [简体中文](README.zh-CN.md)

<h1 align="center">
  <img src="https://cdn.jsdelivr.net/gh/binwenwu/picgo_02/img/icon%2017.05.53.png" alt="Clash" width="128" />
  <br>
Font Compressor
  <br>
</h1>
<h3 align="center">
A font compression software based on <a href="https://wiki.python.org/moin/PyQt">PyQt</a>.
</h3>


# Preview
![](https://cdn.jsdelivr.net/gh/binwenwu/picgo_02/img/20250518170744.png)


# Font Compressor
A Python-based font compression tool that extracts required characters from original font files based on user-provided text, generating smaller font files.

## Features

- Supports multiple font formats (.ttf, .otf, .woff, .woff2)
- Clean and intuitive graphical user interface
- Supports Chinese and English interface switching
- Preserves key font features and layout information

## Requirements

1. Python 3.6+
2. Dependencies:
   - fonttools
   - PyQt5

## Installation
> You can directly download the executable file in the release, or choose to build it yourself
1. Clone or download this repository
2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

## Usage

1. Run the program:
   ```
   python main.py
   ```
2. Select the font type (.ttf, .otf, etc.) in the interface
3. Click the "Browse" button to select the font file to compress
4. Enter or paste the text you want to preserve in the text box
5. Select the path to save the compressed font file
6. Click the "Compress Font" button to start compression
7. After compression is complete, the compressed font file will be generated in the specified path

## Technical Principle

This tool uses the subset module of the fontTools library to implement font subsetting. By analyzing the text provided by the user, it extracts the required characters and only retains the glyph data corresponding to these characters from the original font, thereby significantly reducing the size of the font file.

## Notes

- The compressed font will only contain the characters you specify; other characters will not be displayed
- It is recommended to back up the original font file before compression
- Some special fonts may have compatibility issues

## License

MIT 
