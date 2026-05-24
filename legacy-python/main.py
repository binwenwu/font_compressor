import sys
import os
from PyQt5.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                            QHBoxLayout, QLabel, QComboBox, QPushButton, 
                            QTextEdit, QFileDialog, QMessageBox)
from PyQt5.QtCore import Qt
from font_utils import compress_font
from i18n import I18N

class FontCompressorApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.i18n = I18N()
        self.init_ui()
        
    def init_ui(self):
        # 设置窗口属性
        self.setWindowTitle(self.i18n.get('app_title'))
        self.setGeometry(300, 300, 600, 500)
        
        # 创建中心部件
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # 创建主布局
        main_layout = QVBoxLayout(central_widget)
        
        # 语言切换部分
        lang_layout = QHBoxLayout()
        lang_label = QLabel(self.i18n.get('language'))
        self.lang_combo = QComboBox()
        self.lang_combo.addItems(['中文', 'English'])
        self.lang_combo.setCurrentIndex(1)  # 默认选择英文
        self.lang_combo.currentIndexChanged.connect(self.change_language)
        lang_layout.addWidget(lang_label)
        lang_layout.addWidget(self.lang_combo)
        lang_layout.addStretch()
        main_layout.addLayout(lang_layout)
        
        # 字体类型选择部分
        font_type_layout = QHBoxLayout()
        font_type_label = QLabel(self.i18n.get('font_type'))
        self.font_type_combo = QComboBox()
        self.font_type_combo.addItems(['.ttf', '.otf', '.woff', '.woff2'])
        font_type_layout.addWidget(font_type_label)
        font_type_layout.addWidget(self.font_type_combo)
        main_layout.addLayout(font_type_layout)
        
        # 字体文件选择部分
        font_file_layout = QHBoxLayout()
        font_file_label = QLabel(self.i18n.get('select_font'))
        self.font_file_path = QLabel(self.i18n.get('no_file_selected'))
        font_file_btn = QPushButton(self.i18n.get('browse'))
        font_file_btn.clicked.connect(self.select_font_file)
        font_file_layout.addWidget(font_file_label)
        font_file_layout.addWidget(self.font_file_path)
        font_file_layout.addWidget(font_file_btn)
        main_layout.addLayout(font_file_layout)
        
        # 文本输入部分
        text_label = QLabel(self.i18n.get('input_text'))
        main_layout.addWidget(text_label)
        
        self.text_edit = QTextEdit()
        self.text_edit.setPlaceholderText(self.i18n.get('text_placeholder'))
        main_layout.addWidget(self.text_edit)
        
        # 输出路径选择部分
        output_layout = QHBoxLayout()
        output_label = QLabel(self.i18n.get('output_path'))
        self.output_path = QLabel(self.i18n.get('no_path_selected'))
        output_btn = QPushButton(self.i18n.get('browse'))
        output_btn.clicked.connect(self.select_output_path)
        output_layout.addWidget(output_label)
        output_layout.addWidget(self.output_path)
        output_layout.addWidget(output_btn)
        main_layout.addLayout(output_layout)
        
        # 压缩按钮
        self.compress_btn = QPushButton(self.i18n.get('compress'))
        self.compress_btn.clicked.connect(self.compress_font_file)
        self.compress_btn.setStyleSheet("background-color: #4CAF50; color: white; font-weight: bold; padding: 10px;")
        main_layout.addWidget(self.compress_btn)
        
    def select_font_file(self):
        font_type = self.font_type_combo.currentText()
        file_filter = f"Font files (*{font_type})"
        file_path, _ = QFileDialog.getOpenFileName(
            self, self.i18n.get('select_font_file'), "", file_filter
        )
        if file_path:
            self.font_file_path.setText(file_path)
    
    def select_output_path(self):
        dir_path = QFileDialog.getExistingDirectory(
            self, self.i18n.get('select_output_dir')
        )
        if dir_path:
            self.output_path.setText(dir_path)
    
    def compress_font_file(self):
        # 获取输入
        font_path = self.font_file_path.text()
        if font_path == self.i18n.get('no_file_selected'):
            self.show_error(self.i18n.get('error_no_font'))
            return
            
        text = self.text_edit.toPlainText()
        if not text:
            self.show_error(self.i18n.get('error_no_text'))
            return
            
        output_dir = self.output_path.text()
        if output_dir == self.i18n.get('no_path_selected'):
            self.show_error(self.i18n.get('error_no_output'))
            return
            
        # 获取字体类型和生成输出文件名
        font_type = self.font_type_combo.currentText()
        input_filename = os.path.basename(font_path)
        output_filename = f"compressed_{input_filename}"
        output_path = os.path.join(output_dir, output_filename)
        
        try:
            # 调用压缩函数
            compress_font(font_path, output_path, text)
            self.show_success(self.i18n.get('success_message').format(output_path=output_path))
        except Exception as e:
            self.show_error(f"{self.i18n.get('error_compress')}: {str(e)}")
    
    def show_error(self, message):
        QMessageBox.critical(self, self.i18n.get('error'), message)
    
    def show_success(self, message):
        QMessageBox.information(self, self.i18n.get('success'), message)
    
    def change_language(self, index):
        lang = 'zh' if index == 0 else 'en'
        self.i18n.set_language(lang)
        self.update_ui_texts()
    
    def update_ui_texts(self):
        # 更新所有UI元素的文本
        self.setWindowTitle(self.i18n.get('app_title'))
        
        # 直接查找和更新所有QLabel
        for label in self.findChildren(QLabel):
            if label == self.font_file_path:
                if label.text() in [self.i18n.get('no_file_selected', 'zh'), self.i18n.get('no_file_selected', 'en')]:
                    label.setText(self.i18n.get('no_file_selected'))
                continue
            elif label == self.output_path:
                if label.text() in [self.i18n.get('no_path_selected', 'zh'), self.i18n.get('no_path_selected', 'en')]:
                    label.setText(self.i18n.get('no_path_selected'))
                continue
            
            # 对比当前标签文本与已知翻译，找到对应的key
            for key, text_zh in self.i18n.translations['zh'].items():
                text_en = self.i18n.translations['en'].get(key, '')
                if label.text() in [text_zh, text_en]:
                    label.setText(self.i18n.get(key))
                    break
        
        # 更新所有按钮文本
        for button in self.findChildren(QPushButton):
            if button == self.compress_btn:
                button.setText(self.i18n.get('compress'))
                continue
            
            # 对比当前按钮文本与已知翻译，找到对应的key
            for key, text_zh in self.i18n.translations['zh'].items():
                text_en = self.i18n.translations['en'].get(key, '')
                if button.text() in [text_zh, text_en]:
                    button.setText(self.i18n.get(key))
                    break
        
        # 更新占位符文本
        self.text_edit.setPlaceholderText(self.i18n.get('text_placeholder'))


def main():
    app = QApplication(sys.argv)
    window = FontCompressorApp()
    window.show()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main() 