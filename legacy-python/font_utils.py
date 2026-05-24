from fontTools.ttLib import TTFont
from fontTools.subset import Subsetter, Options

def compress_font(input_path, output_path, text):
    """
    根据提供的文本压缩字体文件
    
    参数:
        input_path (str): 输入字体文件路径
        output_path (str): 输出字体文件路径
        text (str): 需要保留的字符集
    
    返回:
        bool: 操作成功返回True
    """
    # 加载字体
    font = TTFont(input_path)
    
    # 创建子集选项
    options = Options()
    options.layout_features = ['*']  # 保留所有布局特性
    options.name_IDs = ['*']  # 保留所有名称记录
    options.notdef_outline = True  # 保留.notdef字形轮廓
    options.recalc_bounds = True  # 重新计算边界
    options.recalc_timestamp = True  # 重新计算时间戳
    
    # 创建子集器
    subsetter = Subsetter(options=options)
    
    # 获取唯一字符
    unique_chars = set(text)
    
    # 添加字符到子集
    subsetter.populate(unicodes=[ord(char) for char in unique_chars])
    
    # 应用子集
    subsetter.subset(font)
    
    # 保存结果
    font.save(output_path)
    
    return True 