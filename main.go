package main

import (
	"encoding/json"
	"fmt"
	"image/color"
	"io/ioutil"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/layout"
	"fyne.io/fyne/v2/theme"
	"fyne.io/fyne/v2/widget"
)

// Project represents a project configuration
type Project struct {
	Name        string `json:"name"`
	WindowsPath string `json:"windows_path"`
	MacPath     string `json:"mac_path"`
	Command     string `json:"command"`
	WinShell    string `json:"win_shell"` // wsl, powershell, cmd
	MacShell    string `json:"mac_shell"` // iterm2, default
	WslShell    string `json:"wsl_shell"` // zsh, bash, sh
}

func main() {
	myApp := app.NewWithID("com.haier.devrunner")

	// 在程序启动时自动查找可用字体并加载
	var fontRes fyne.Resource
	if runtime.GOOS == "windows" {
		winDir := os.Getenv("WINDIR")
		fonts := []string{
			"LXGWWenKaiMono-Regular.ttf",
			"LXGWWenKai-Regular.ttf",
			"simhei.ttf",
			"simkai.ttf",
			"simfang.ttf",
		}
		for _, f := range fonts {
			path := filepath.Join(winDir, "Fonts", f)
			if _, err := os.Stat(path); err == nil {
				res, _ := fyne.LoadResourceFromPath(path)
				fontRes = res
				break
			}
		}
	}

	// 设置自定义主题
	if fontRes != nil {
		myApp.Settings().SetTheme(&customTheme{font: fontRes})
	}

	myWindow := myApp.NewWindow("项目管理器")

	projects, err := loadProjects("projects.json")
	if err != nil {
		log.Printf("Failed to load projects: %v", err)
		projects = []Project{} // Fallback to empty
	}

	// Header: 干练浅色页眉
	titleLabel := canvas.NewText("DASHBOARD", color.NRGBA{R: 0x0f, G: 0x17, B: 0x2a, A: 0xff}) // Slate 900
	titleLabel.TextSize = 20
	titleLabel.TextStyle = fyne.TextStyle{Bold: true}

	subTitle := canvas.NewText("WORKSPACE", color.NRGBA{R: 0x25, G: 0x63, B: 0xeb, A: 0xff}) // Blue 600
	subTitle.TextSize = 10
	subTitle.TextStyle = fyne.TextStyle{Bold: true}
	
	headerContent := container.NewVBox(titleLabel, subTitle)
	header := container.NewPadded(container.NewHBox(layout.NewSpacer(), headerContent, layout.NewSpacer()))

	projectsList := container.NewVBox()

	var selectedProjects = make(map[int]bool)
	var checks []*widget.Check

	for i, p := range projects {
		idx := i
		project := p
		check := widget.NewCheck("", func(b bool) {
			selectedProjects[idx] = b
		})
		checks = append(checks, check)

		onLaunch := func() {
			err := launchProject(project)
			if err != nil {
				fyne.CurrentApp().SendNotification(&fyne.Notification{
					Title:   "启动失败",
					Content: fmt.Sprintf("无法启动 %s: %v", project.Name, err),
				})
			} else {
				fyne.CurrentApp().SendNotification(&fyne.Notification{
					Title:   "已启动",
					Content: fmt.Sprintf("成功启动项目: %s", project.Name),
				})
			}
		}

		// 传入索引以实现颜色交替
		card := createProjectCard(project, check, onLaunch, idx)
		projectsList.Add(container.NewPadded(card))
	}

	// 移除了全选和清空按钮

	// 底部按钮美化：全宽且带有 Indigo 渐变感
	batchBtn := widget.NewButtonWithIcon("一键批量启动选中项目", theme.MediaPlayIcon(), func() {
		count := 0
		for i, selected := range selectedProjects {
			if selected && i < len(projects) {
				_ = launchProject(projects[i])
				count++
			}
		}
		if count > 0 {
			fyne.CurrentApp().SendNotification(&fyne.Notification{
				Title:   "批量启动",
				Content: fmt.Sprintf("已尝试启动 %d 个项目", count),
			})
		}
	})
	batchBtn.Importance = widget.HighImportance

	footer := container.NewPadded(container.NewMax(batchBtn))

	mainLayout := container.NewBorder(
		container.NewPadded(header),
		container.NewPadded(footer),
		nil,
		nil,
		container.NewPadded(container.NewVScroll(projectsList)),
	)

	myWindow.SetContent(mainLayout)
	myWindow.Resize(fyne.NewSize(600, 500))
	myWindow.ShowAndRun()
}

// createProjectCard 干练专业风格卡片
func createProjectCard(p Project, check *widget.Check, onLaunch func(), index int) fyne.CanvasObject {
	// 专业蓝色系
	accentColor := color.NRGBA{R: 0x25, G: 0x63, B: 0xeb, A: 0xff} // Blue 600
	if index%2 == 0 {
		accentColor = color.NRGBA{R: 0x05, G: 0x96, B: 0x69, A: 0xff} // Emerald 600
	}

	// 背景：纯白卡片
	bg := canvas.NewRectangle(color.White)
	bg.StrokeColor = color.NRGBA{R: 0xe2, G: 0xe8, B: 0xf0, A: 0xff} // Slate 200
	bg.StrokeWidth = 1
	bg.CornerRadius = 4 // 极小圆角

	// 左侧指示条
	indicator := canvas.NewRectangle(accentColor)
	indicator.SetMinSize(fyne.NewSize(3, 0))
	indicator.CornerRadius = 1

	// 文字
	typeLabel := canvas.NewText("PROJECT", accentColor)
	typeLabel.TextSize = 9
	typeLabel.TextStyle = fyne.TextStyle{Bold: true}

	nameLabel := canvas.NewText(p.Name, color.NRGBA{R: 0x0f, G: 0x17, B: 0x2a, A: 0xff})
	nameLabel.TextSize = 18
	nameLabel.TextStyle = fyne.TextStyle{Bold: true}

	pathLabel := canvas.NewText(p.WindowsPath, color.NRGBA{R: 0x64, G: 0x74, B: 0x8b, A: 0xff}) // Slate 500
	pathLabel.TextSize = 10

	textContainer := container.NewVBox(typeLabel, nameLabel, pathLabel)

	// 启动按钮
	runBtn := widget.NewButtonWithIcon("", theme.MediaPlayIcon(), onLaunch)
	runBtn.Importance = widget.LowImportance

	rightSide := container.NewHBox(layout.NewSpacer(), container.NewCenter(runBtn))
	leftSide := container.NewHBox(indicator, layout.NewSpacer(), check)
	
	content := container.NewPadded(
		container.NewBorder(nil, nil, leftSide, rightSide, textContainer),
	)

	return container.NewStack(bg, content)
}

// --- 自定义主题实现 ---

type customTheme struct {
	font fyne.Resource
}

func (t *customTheme) Color(name fyne.ThemeColorName, variant fyne.ThemeVariant) color.Color {
	switch name {
	case theme.ColorNameBackground:
		return color.NRGBA{R: 0xff, G: 0xff, B: 0xff, A: 0xff} // 纯白背景
	case theme.ColorNameInputBackground:
		return color.NRGBA{R: 0xf8, G: 0xfa, B: 0xfc, A: 0xff} // Slate 50
	case theme.ColorNameButton:
		return color.NRGBA{R: 0x25, G: 0x63, B: 0xeb, A: 0xff} // Blue 600
	case theme.ColorNamePrimary:
		return color.NRGBA{R: 0x25, G: 0x63, B: 0xeb, A: 0xff} // Blue 600
	case theme.ColorNameForeground:
		return color.NRGBA{R: 0x0f, G: 0x17, B: 0x2a, A: 0xff} // Slate 900
	case theme.ColorNameDisabled:
		return color.NRGBA{R: 0xe2, G: 0xe8, B: 0xf0, A: 0xff} // Slate 200
	}
	return theme.LightTheme().Color(name, variant)
}

func (t *customTheme) Font(style fyne.TextStyle) fyne.Resource {
	// 强制所有样式使用同一个字体资源，避免 Italic/Bold 报错
	return t.font
}

func (t *customTheme) Icon(name fyne.ThemeIconName) fyne.Resource {
	return theme.DefaultTheme().Icon(name)
}

func (t *customTheme) Size(name fyne.ThemeSizeName) float32 {
	switch name {
	case theme.SizeNamePadding:
		return 4 // 极限全局边距
	case theme.SizeNameInnerPadding:
		return 2 // 极限内部边距
	case theme.SizeNameScrollBar:
		return 6
	}
	return theme.DefaultTheme().Size(name)
}

func loadProjects(filename string) ([]Project, error) {
	data, err := ioutil.ReadFile(filename)
	if err != nil {
		return nil, err
	}
	var projects []Project
	err = json.Unmarshal(data, &projects)
	return projects, err
}

func launchProject(p Project) error {
	var cmd *exec.Cmd
	path := p.WindowsPath
	if runtime.GOOS == "darwin" {
		path = p.MacPath
	}

	// Expand ~ to user home directory on Mac/Unix
	if strings.HasPrefix(path, "~") {
		home, _ := os.UserHomeDir()
		path = strings.Replace(path, "~", home, 1)
	}

	switch runtime.GOOS {
	case "windows":
		switch p.WinShell {
		case "wsl":
			sh := p.WslShell
			if sh == "" {
				sh = "zsh"
			}
			// 使用 -lic 标志启动 shell (Login + Interactive)
			// 确保 WSL 能够加载 .zshrc 或 .bashrc 中的环境变量（如 GOPATH/bin），否则会找不到 air, go 等命令
			batContent := fmt.Sprintf("@echo off\r\ntitle %s\r\nwsl.exe --cd \"%s\" %s -lic \"%s\"\r\npause\r\n", p.Name, path, sh, p.Command)
			batFile, err := os.CreateTemp("", "start-dev-*.bat")
			if err != nil {
				log.Printf("ERROR: Failed to create temp bat file: %v", err)
				return err
			}
			batFile.WriteString(batContent)
			batFile.Close()
			log.Printf("Launching WSL via bat: %s", batFile.Name())
			// 使用 "" 作为标题占位符，确保第二个参数被视为程序路径
			// 这种方式最稳健，不会触发 cmd 的引号转义逻辑错误
			cmd = exec.Command("cmd", "/c", "start", "", batFile.Name())
		case "powershell":
			psCmd := fmt.Sprintf("Set-Location '%s'; %s", path, p.Command)
			escapedPsCmd := strings.ReplaceAll(psCmd, "'", "''")
			psCommand := fmt.Sprintf("Start-Process powershell -ArgumentList '-NoExit', '-Command', '%s'", escapedPsCmd)
			log.Printf("Launching PowerShell: %s", psCommand)
			cmd = exec.Command("powershell", "-Command", psCommand)
		default: // cmd
			cmdStr := fmt.Sprintf("cd /d %s && %s", path, p.Command)
			escapedCmdStr := strings.ReplaceAll(cmdStr, "'", "''")
			psCommand := fmt.Sprintf("Start-Process cmd -ArgumentList '/k', '%s'", escapedCmdStr)
			log.Printf("Launching CMD: %s", psCommand)
			cmd = exec.Command("powershell", "-Command", psCommand)
		}
	case "darwin":
		switch p.MacShell {
		case "iterm2":
			script := fmt.Sprintf(`
				tell application "iTerm"
					create window with default profile
					tell current session of current window
						write text "cd %s"
						write text "%s"
					end tell
				end tell`, path, p.Command)
			cmd = exec.Command("osascript", "-e", script)
		default: // default Terminal.app
			script := fmt.Sprintf(`tell application "Terminal" to do script "cd %s && %s"`, path, p.Command)
			cmd = exec.Command("osascript", "-e", script)
		}
	default:
		return fmt.Errorf("unsupported platform: %s", runtime.GOOS)
	}

	err := cmd.Start()
	if err != nil {
		log.Printf("ERROR: Failed to start command for %s: %v", p.Name, err)
		return err
	}
	log.Printf("SUCCESS: Started %s (PID: %d)", p.Name, cmd.Process.Pid)
	return nil
}
