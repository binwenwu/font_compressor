# character-compress
```TEXT
.
├── 1.txt
├── Milky-Han-Mono-CN-Heavy.json
├── Milky-Han-Mono-CN-Heavy.ttf
├── README.md
├── Source-KeynoteartHans-Regular.json
├── Source-KeynoteartHans-Regular.otf
└── character-compress.py

1 directory, 7 files
```
> 根据json键值内容从字体包中提取所需文字，从而实现字体包压缩
>
> 主要针对的是ttf与otf两种类型的字体包


- json文件中给出需要提取的文字/单词/句子的中英文的中英文KV对
```JSON
{
    "Data": "数据",
    "Computing": "计算",
    "Development ": "开发",
    "Application": "应用",
    "Features": "特色",
    "数据": "Data",
    "计算": "Computing",
    "开发 ": "Development",
    "应用": "Application",
    "特色": "Features"
}
```


