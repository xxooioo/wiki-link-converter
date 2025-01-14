'use strict';

var obsidian = require('obsidian');

// 默认设置
const DEFAULT_SETTINGS = {
    autoConvert: true,
    blogFolders: [],  // 默认为空数组
    linkFormat: '@/blog/{}.md',  // 默认链接格式，{} 将被替换为文件名
    showSuccessNotice: true  // 默认显示成功通知
};

// 文本国际化
const TEXTS = {
    'plugin_name': {
        en: 'Wiki Link Converter Settings',
        zh: 'Wiki链接转换器设置'
    },
    'link_format': {
        en: 'Link Format',
        zh: '链接格式'
    },
    'link_format_desc': {
        en: 'Use {} as filename placeholder',
        zh: '使用 {} 作为文件名占位符'
    },
    'auto_convert': {
        en: 'Auto Convert',
        zh: '自动转换'
    },
    'auto_convert_desc': {
        en: 'Automatically convert wiki links while editing',
        zh: '编辑时自动转换Wiki链接'
    },
    'monitor_folders': {
        en: 'Monitor Folders',
        zh: '监控文件夹'
    },
    'monitor_folders_desc': {
        en: 'Folders to monitor for auto-conversion (use / for entire vault)',
        zh: '需要监控的文件夹（使用 / 表示整个仓库）'
    },
    'add_folder': {
        en: 'Add Folder',
        zh: '添加文件夹'
    },
    'delete': {
        en: 'Delete',
        zh: '删除'
    },
    'convert_command': {
        en: 'Convert Wiki Links to Custom Format',
        zh: '转换Wiki链接为自定义格式'
    },
    'convert_menu': {
        en: 'Convert Wiki Links',
        zh: '转换Wiki链接'
    },
    'convert_success': {
        en: 'Wiki links converted successfully',
        zh: 'Wiki链接转换成功'
    },
    'convert_file_success': {
        en: 'Converted links in {}',
        zh: '已转换 {} 中的链接'
    },
    'convert_error': {
        en: 'Error converting {}',
        zh: '转换 {} 时出错'
    },
    'format_error': {
        en: 'Must include {} as filename placeholder',
        zh: '必须包含 {} 作为文件名占位符'
    },
    'show_notice': {
        en: 'Show Success Notice',
        zh: '显示成功通知'
    },
    'show_notice_desc': {
        en: 'Show notification when links are converted successfully',
        zh: '链接转换成功时显示通知'
    }
};

class WikiLinkConverterPlugin extends obsidian.Plugin {
    settings;
    isZhLanguage = false;

    // 获取国际化文本
    getText(key, ...args) {
        const text = TEXTS[key][this.isZhLanguage ? 'zh' : 'en'];
        return args.length ? text.replace(/\{\}/g, () => args.shift()) : text;
    }

    async onload() {
        await this.loadSettings();
        
        // 检测语言
        this.isZhLanguage = document.documentElement.lang === 'zh';
        
        // 添加设置选项卡
        this.addSettingTab(new WikiLinkConverterSettingTab(this.app, this));

        // 添加命令
        this.addCommand({
            id: 'convert-wiki-links',
            name: this.getText('convert_command'),
            editorCallback: (editor, view) => {
                this.convertWikiLinks(editor);
            }
        });

        // 注册自动转换事件处理器
        this.registerAutoConvert();

        // 添加右键菜单
        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file) => {
                // 只对 markdown 文件显示菜单
                if (file && file.extension === 'md') {
                    menu.addItem((item) => {
                        item
                            .setTitle(this.getText('convert_menu'))
                            .setIcon('link')
                            .onClick(async () => {
                                await this.convertLinksInFile(file);
                            });
                    });
                }
            })
        );
    }

    // 统一的链接转换逻辑
    convertWikiLinksInText(text) {
        return text.replace(/\[\[(.*?)\]\]/g, (match, fileName) => {
            // 如果链接内容为空，保持原样
            if (!fileName.trim()) {
                return match;
            }
            
            // 使用自定义格式转换链接
            const link = this.settings.linkFormat.replace('{}', fileName);
            return `[${fileName}](${link})`;
        });
    }

    // 编辑器中的转换
    convertWikiLinks(editor) {
        const content = editor.getValue();
        const newContent = this.convertWikiLinksInText(content);

        if (content !== newContent) {
            editor.setValue(newContent);
            this.showNotice('convert_success');
        }
    }

    handleEditorChange(editor) {
        // 获取当前编辑的文件
        const file = this.app.workspace.getActiveFile();
        
        // 快速检查：如果不是markdown文件直接返回
        if (!file?.extension === 'md') return;

        // 获取当前光标位置和行内容
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);
        
        // 只在输入 ]] 时继续处理
        if (!line.endsWith(']]')) return;
        
        // 检查文件是否在监控的文件夹中（较耗时的操作放在最后）
        if (!this.isInBlogFolders(file)) return;
        
        this.convertWikiLinks(editor);
    }

    onunload() {
        console.log('卸载 Wiki Link Converter 插件');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        // 确保 blogFolders 是数组
        if (!Array.isArray(this.settings.blogFolders)) {
            this.settings.blogFolders = [this.settings.blogFolders].filter(Boolean);
        }
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    // 检查文件是否在文件夹中
    isInBlogFolders(file) {
        // 如果包含根目录"/"，则处理所有markdown文件
        if (this.settings.blogFolders.includes('/')) return true;
        
        // 检查文件是否在任一指定文件夹中
        const filePath = file.path;
        return this.settings.blogFolders.some(folder => 
            filePath.startsWith(folder + '/') || filePath === folder
        );
    }

    // 文件中的转换
    async convertLinksInFile(file) {
        try {
            const content = await this.app.vault.read(file);
            const newContent = this.convertWikiLinksInText(content);

            if (content !== newContent) {
                await this.app.vault.modify(file, newContent);
                this.showNotice('convert_file_success', file.basename);
            }
        } catch (error) {
            console.error('转换链接时出错:', error);
            this.showNotice('convert_error', file.basename);
        }
    }

    // 注册自动转换事件处理器
    registerAutoConvert() {
        // 如果已经注册过，先移除旧的
        if (this.autoConvertHandler) {
            this.app.workspace.off('editor-change', this.autoConvertHandler);
            this.autoConvertHandler = null;
        }

        // 如果启用了自动转换，注册新的处理器
        if (this.settings.autoConvert) {
            this.autoConvertHandler = (editor) => this.handleEditorChange(editor);
            this.registerEvent(
                this.app.workspace.on('editor-change', this.autoConvertHandler)
            );
        }
    }

    // 修改通知方法
    showNotice(key, ...args) {
        // 只有convert_success受开关控制
        if (key === 'convert_success' && !this.settings.showSuccessNotice) return;
        new obsidian.Notice(this.getText(key, ...args));
    }
}

class WikiLinkConverterSettingTab extends obsidian.PluginSettingTab {
    plugin;

    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        let {containerEl} = this;
        containerEl.empty();

        containerEl.createEl('h2', {text: this.plugin.isZhLanguage ? 'Wiki链接转换器设置' : 'Wiki Link Converter Settings'});

        // 链接格式设置
        new obsidian.Setting(containerEl)
            .setName(this.plugin.isZhLanguage ? '链接格式' : 'Link Format')
            .setDesc(this.plugin.isZhLanguage ? '使用 {} 作为文件名占位符' : 'Use {} as filename placeholder')
            .addText(text => {
                const settingControl = text.inputEl.parentElement;
                settingControl.style.position = 'relative';  // 添加相对定位
                
                text.setPlaceholder('@/blog/{}.md')
                    .setValue(this.plugin.settings.linkFormat);
                text.inputEl.style.width = '200px';

                // 创建错误信息元素
                const errorMessage = document.createElement('div');
                errorMessage.className = 'format-error';
                errorMessage.style.display = 'none';
                errorMessage.textContent = this.plugin.getText('format_error');
                settingControl.appendChild(errorMessage);

                // 添加失焦事件监听
                text.inputEl.addEventListener('blur', async () => {
                    const value = text.getValue();
                    errorMessage.style.display = !value.includes('{}') ? 'block' : 'none';
                });

                // 添加获得焦点事件监听
                text.inputEl.addEventListener('focus', () => {
                    errorMessage.style.display = 'none';
                });

                // 值变更事件
                text.onChange(async (value) => {
                    this.plugin.settings.linkFormat = value;
                    await this.plugin.saveSettings();
                });
            });

        // 显示成功通知设置
        new obsidian.Setting(containerEl)
            .setName(this.plugin.getText('show_notice'))
            .setDesc(this.plugin.getText('show_notice_desc'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showSuccessNotice)
                .onChange(async (value) => {
                    this.plugin.settings.showSuccessNotice = value;
                    await this.plugin.saveSettings();
                }));

        // 自动转换设置
        new obsidian.Setting(containerEl)
            .setName(this.plugin.isZhLanguage ? '自动转换' : 'Auto Convert')
            .setDesc(this.plugin.isZhLanguage ? '编辑时自动转换Wiki链接' : 'Automatically convert wiki links while editing')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoConvert)
                .onChange(async (value) => {
                    this.plugin.settings.autoConvert = value;
                    await this.plugin.saveSettings();
                    // 重新注册事件处理器
                    this.plugin.registerAutoConvert();
                }));

        // 文件夹设置
        const blogFolderSetting = new obsidian.Setting(containerEl)
            .setName(this.plugin.isZhLanguage ? '监控文件夹' : 'Monitor Folders')
            .setDesc(this.plugin.isZhLanguage ? '需要监控的文件夹（使用 / 表示整个仓库）' : 'Folders to monitor for auto-conversion (use / for entire vault)')
            .addButton(button => button
                .setButtonText(this.plugin.isZhLanguage ? '添加文件夹' : 'Add Folder')
                .onClick(async () => {
                    if (!this.plugin.settings.blogFolders) {
                        this.plugin.settings.blogFolders = [];
                    }
                    this.plugin.settings.blogFolders.push('');
                    await this.plugin.saveSettings();
                    this.display();
                }));

        // 文件夹列表容器
        const folderListContainer = containerEl.createDiv('setting-item-children');
        folderListContainer.style.paddingLeft = '40px';

        // 获取所有文件夹
        const folders = this.getAllFolders();

        // 显示现有的文件夹
        if (this.plugin.settings.blogFolders && this.plugin.settings.blogFolders.length > 0) {
            this.plugin.settings.blogFolders.forEach((folder, index) => {
                const folderSetting = new obsidian.Setting(folderListContainer)
                    .addText(text => text
                        .setPlaceholder('/')
                        .setValue(folder)
                        .onChange(async (value) => {
                            this.plugin.settings.blogFolders[index] = value;
                            await this.plugin.saveSettings();
                        }))
                    .addButton(button => button
                        .setIcon('trash')
                        .setTooltip(this.plugin.isZhLanguage ? '删除' : 'Delete')
                        .onClick(async () => {
                            this.plugin.settings.blogFolders.splice(index, 1);
                            await this.plugin.saveSettings();
                            this.display();
                        }));

                // 添加文件夹自动补全
                const textInput = folderSetting.components[0];
                const inputEl = textInput.inputEl;
                const inputContainer = inputEl.parentElement;
                
                // 创建一个新的容器来包裹输入框和下拉菜单
                const wrapperDiv = document.createElement('div');
                wrapperDiv.style.position = 'relative';
                inputEl.parentElement.appendChild(wrapperDiv);
                wrapperDiv.appendChild(inputEl);
                
                // 创建下拉菜单容器
                const dropdown = wrapperDiv.createDiv('suggestion-dropdown');
                dropdown.style.display = 'none';

                // 显示建议
                const showSuggestions = () => {
                    const value = inputEl.value.toLowerCase();
                    // 根据输入内容过滤文件夹
                    const matches = value === '' ? 
                        folders : // 如果输入为空，显示所有文件夹
                        folders.filter(f => f.toLowerCase().includes(value)); // 否则只显示匹配的文件夹

                    if (matches.length > 0) {
                        dropdown.empty();
                        dropdown.style.display = 'block';
                        matches.forEach(match => {
                            const item = dropdown.createDiv('suggestion-item');
                            item.setText(match);
                            item.onClickEvent(() => {
                                textInput.setValue(match);
                                dropdown.style.display = 'none';
                                this.plugin.settings.blogFolders[index] = match;
                                this.plugin.saveSettings();
                            });
                        });
                    } else {
                        dropdown.style.display = 'none';
                    }
                };

                // 输入事件
                inputEl.addEventListener('input', showSuggestions);
                
                // 获得焦点时立即显示所有文件夹
                inputEl.addEventListener('focus', () => {
                    showSuggestions();
                });

                // 失去焦点时延迟隐藏下拉菜单
                inputEl.addEventListener('blur', () => {
                    setTimeout(() => {
                        dropdown.style.display = 'none';
                    }, 200);
                });
            });
        }

        // 添加样式
        const style = containerEl.createEl('style');
        style.textContent = `
            .setting-item-children {
                margin-top: 8px;
            }
            .setting-item-children .setting-item {
                border: none;
                padding-top: 8px;
            }
            .suggestion-dropdown {
                position: absolute;
                top: 32px;
                left: 0;
                width: 200px;
                max-height: 200px;
                overflow-y: auto;
                background-color: var(--background-primary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px;
                box-shadow: 0 2px 8px var(--background-modifier-box-shadow);
                z-index: 1000;
            }
            .suggestion-item {
                padding: 6px 8px;
                cursor: pointer;
                text-align: left;
                white-space: normal;
                word-break: break-all;
                line-height: 1.4;
            }
            .suggestion-item:hover {
                background-color: var(--background-modifier-hover);
            }
            .setting-item input[type='text'] {
                width: 200px;
            }
            .format-error {
                position: absolute;
                top: 55%;
                right: calc(50% + 10px);
                transform: translateY(-50%);
                color: var(--text-error);
                font-size: 12px;
                white-space: nowrap;
                z-index: 1;
            }
        `;
    }

    getAllFolders() {
        const folders = new Set(['/']); // 添加根目录选项
        this.app.vault.getAllLoadedFiles().forEach(file => {
            if (file.parent) {
                folders.add(file.parent.path);
            }
        });
        return Array.from(folders).sort();
    }
}

module.exports = WikiLinkConverterPlugin;


/* nosourcemap */