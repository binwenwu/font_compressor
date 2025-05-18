class I18N:
    def __init__(self):
        self.current_language = 'en'  # 默认使用英文
        self.translations = {
            'zh': {
                'app_title': '字体压缩工具',
                'language': '语言:',
                'font_type': '字体类型:',
                'select_font': '选择字体文件:',
                'no_file_selected': '未选择文件',
                'browse': '浏览...',
                'input_text': '输入需要保留的文字:',
                'text_placeholder': '在此输入或粘贴您需要保留的文字...',
                'output_path': '输出路径:',
                'no_path_selected': '未选择路径',
                'compress': '压缩字体',
                'select_font_file': '选择字体文件',
                'select_output_dir': '选择输出目录',
                'error': '错误',
                'success': '成功',
                'error_no_font': '请选择字体文件',
                'error_no_text': '请输入需要保留的文字',
                'error_no_output': '请选择输出路径',
                'error_compress': '压缩过程中出错',
                'success_message': '字体压缩成功！已保存到: {output_path}'
            },
            'en': {
                'app_title': 'Font Compressor',
                'language': 'Language:',
                'font_type': 'Font Type:',
                'select_font': 'Select Font File:',
                'no_file_selected': 'No file selected',
                'browse': 'Browse...',
                'input_text': 'Input text to preserve:',
                'text_placeholder': 'Type or paste the text you want to preserve...',
                'output_path': 'Output Path:',
                'no_path_selected': 'No path selected',
                'compress': 'Compress Font',
                'select_font_file': 'Select Font File',
                'select_output_dir': 'Select Output Directory',
                'error': 'Error',
                'success': 'Success',
                'error_no_font': 'Please select a font file',
                'error_no_text': 'Please input text to preserve',
                'error_no_output': 'Please select an output path',
                'error_compress': 'Error during compression',
                'success_message': 'Font compressed successfully! Saved to: {output_path}'
            }
        }
    
    def get(self, key, lang=None):
        """获取指定键的翻译文本"""
        language = lang if lang else self.current_language
        return self.translations.get(language, {}).get(key, key)
    
    def set_language(self, language):
        """设置当前语言"""
        if language in self.translations:
            self.current_language = language 