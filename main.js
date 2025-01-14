'use strict';

const obsidian = require('obsidian');

// 默认设置
const DEFAULT_SETTINGS = {
    autoConvert: true,
    blogFolders: [],  // 默认为空数组
    linkFormat: '@/blog/{}.md'  // 默认链接格式，{} 将被替换为文件名
};

class WikiLinkConverterPlugin extends obsidian.Plugin {
    settings;

    async onload() {
        console.log('加载 Wiki Link Converter 插件');
        await this.loadSettings();

        // 添加设置选项卡
        this.addSettingTab(new WikiLinkConverterSettingTab(this.app, this));

        // 监听文件修改事件
        this.registerEvent(
            this.app.vault.on('modify', async (file) => {
                if (this.settings.autoConvert && this.isInBlogFolders(file)) {
                    await this.convertLinksInFile(file);
                }
            })
        );

        // 监听文件创建事件
        this.registerEvent(
            this.app.vault.on('create', async (file) => {
                if (this.settings.autoConvert && this.isInBlogFolders(file)) {
                    await this.convertLinksInFile(file);
                }
            })
        );

        // 添加命令到命令面板
        this.addCommand({
            id: 'convert-wiki-links',
            name: '转换Wiki链接为自定义格式',
            callback: () => this.convertCurrentFile()
        });

        // 添加右键菜单项
        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file) => {
                menu.addItem((item) => {
                    item
                        .setTitle('转换Wiki链接')
                        .setIcon('link')
                        .onClick(async () => {
                            await this.convertLinksInFile(file);
                        });
                });
            })
        );
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
        if (!file || file.extension !== 'md') return false;
        
        // 如果包含根目录"/"，则处理所有markdown文件
        if (this.settings.blogFolders.includes('/')) return true;
        
        // 检查文件是否在任一指定文件夹中
        return this.settings.blogFolders.some(folder => 
            file.path.startsWith(folder + '/') || file.path === folder
        );
    }

    // 转换当前打开的文件
    async convertCurrentFile() {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
            await this.convertLinksInFile(activeFile);
        } else {
            new obsidian.Notice('没有打开的文件');
        }
    }

    async convertLinksInFile(file) {
        try {
            // 读取文件内容
            const content = await this.app.vault.read(file);
            
            // 转换wiki链接
            const newContent = content.replace(
                /\[\[(.*?)\]\]/g,
                (match, fileName) => {
                    // 如果链接内容为空，保持原样
                    if (!fileName.trim()) {
                        return match;
                    }
                    
                    // 移除文件扩展名（如果有）和管道符后的显示文本（如果有）
                    fileName = fileName.split('|')[0].replace(/\.md$/, '');
                    // 使用自定义格式转换链接
                    const link = this.settings.linkFormat.replace('{}', fileName);
                    return `[${fileName}](${link})`;
                }
            );

            // 如果内容有变化，保存文件
            if (content !== newContent) {
                await this.app.vault.modify(file, newContent);
                new obsidian.Notice(`已转换 ${file.basename} 中的链接`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('转换链接时出错:', error);
            new obsidian.Notice(`转换 ${file.basename} 时出错`);
            return false;
        }
    }
}

class WikiLinkConverterSettingTab extends obsidian.PluginSettingTab {
    plugin;

    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    // 获取所有文件夹
    getAllFolders() {
        const folders = new Set(['/']); // 添加根目录选项
        this.app.vault.getAllLoadedFiles().forEach(file => {
            if (file.parent) {
                folders.add(file.parent.path);
            }
        });
        return Array.from(folders).sort();
    }

    display() {
        let {containerEl} = this;
        containerEl.empty();

        containerEl.createEl('h2', {text: 'Wiki Link Converter 设置'});

        // 链接格式设置
        const linkFormatSetting = new obsidian.Setting(containerEl)
            .setName('链接格式')
            .setDesc('设置转换后的链接格式。例如：@/blog/{}.md 会生成 [文件名](@/blog/文件名.md)')
            .addText(text => {
                const settingControl = text.inputEl.parentElement;
                settingControl.style.flexDirection = 'column';
                settingControl.style.alignItems = 'flex-start';
                settingControl.addClass('dropdown-container');
                settingControl.style.marginLeft = '-14px';  // 向左移动以对齐

                text.setPlaceholder('@/blog/{}.md')
                    .setValue(this.plugin.settings.linkFormat);
                text.inputEl.style.width = '200px';

                // 创建错误信息元素
                const errorMessage = settingControl.createDiv('format-error');
                errorMessage.style.display = 'none';
                errorMessage.style.color = 'var(--text-error)';
                errorMessage.style.fontSize = '12px';
                errorMessage.style.marginTop = '4px';
                errorMessage.style.marginLeft = '4px';
                errorMessage.setText('必须包含 {} 作为文件名占位符');

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

        // 自动转换设置
        new obsidian.Setting(containerEl)
            .setName('自动转换')
            .setDesc('自动转换指定文件夹中的Wiki链接')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoConvert)
                .onChange(async (value) => {
                    this.plugin.settings.autoConvert = value;
                    await this.plugin.saveSettings();
                }));

        // 文件夹设置
        const blogFolderSetting = new obsidian.Setting(containerEl)
            .setName('文件夹')
            .setDesc('需要自动转换的文件夹路径（使用 "/" 表示整个仓库，可添加多个文件夹）')
            .addButton(button => button
                .setButtonText('添加文件夹')
                .onClick(async () => {
                    this.plugin.settings.blogFolders.push('');
                    await this.plugin.saveSettings();
                    this.display();
                }));

        // 文件夹列表
        const folderListContainer = containerEl.createDiv('setting-item-children');
        const folders = this.getAllFolders();

        this.plugin.settings.blogFolders.forEach((folder, index) => {
            const setting = new obsidian.Setting(folderListContainer)
                .setClass('setting-item');

            // 创建下拉菜单容器
            const dropdownContainer = setting.controlEl.createDiv('dropdown-container');
            
            // 添加文本输入框
            const textInput = new obsidian.TextComponent(dropdownContainer)
                .setPlaceholder('例如: 文件夹 或 /')
                .setValue(folder);

            // 添加下拉建议列表
            const dropdown = dropdownContainer.createDiv('suggestion-dropdown');
            dropdown.style.display = 'none';

            const showSuggestions = () => {
                const value = textInput.getValue().toLowerCase();
                const matches = folders.filter(f => 
                    f.toLowerCase().includes(value)
                );

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

            // 处理输入事件
            textInput.inputEl.addEventListener('input', () => {
                showSuggestions();
            });

            // 处理焦点事件
            textInput.inputEl.addEventListener('focus', () => {
                showSuggestions();
            });

            // 处理值变更事件
            textInput.onChange(async (value) => {
                this.plugin.settings.blogFolders[index] = value;
                await this.plugin.saveSettings();
            });

            // 处理失焦事件
            textInput.inputEl.addEventListener('blur', () => {
                // 延迟隐藏下拉菜单，以允许点击建议项
                setTimeout(() => {
                    dropdown.style.display = 'none';
                }, 200);
            });

            // 添加删除按钮
            setting.addButton(button => button
                .setIcon('trash')
                .setTooltip('删除')
                .onClick(async () => {
                    this.plugin.settings.blogFolders.splice(index, 1);
                    await this.plugin.saveSettings();
                    this.display();
                }));
        });

        // 添加样式
        const style = containerEl.createEl('style');
        style.textContent = `
            .dropdown-container {
                position: relative;
                margin-right: 8px;
            }
            .setting-item .dropdown-container {
                width: 200px;
            }
            .setting-item .dropdown-container input {
                box-sizing: border-box;
                width: 100%;
            }
            .suggestion-dropdown {
                position: absolute;
                top: 100%;
                left: 0;
                box-sizing: border-box;
                width: 100%;
                background-color: var(--background-primary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px;
                box-shadow: 0 2px 8px var(--background-modifier-box-shadow);
                z-index: 100;
                max-height: 200px;
                overflow-y: auto;
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
            .setting-item-children .setting-item {
                border-top: none;
                padding-top: 0;
            }
        `;
    }
}

module.exports = WikiLinkConverterPlugin;


/* nosourcemap */